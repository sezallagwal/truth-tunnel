import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {


    try {
        
        const { username, email, password } = await request.json();
        // const existingUserVerifiedByUsername = await UserModel.findOne({
        //     username,
        //     isVerified: true
        // });
        const existingUserVerifiedByUsername = await db.user.findUnique({
            where: {
                username,
                isVerified: true
            }
        })
        if (existingUserVerifiedByUsername) {
            return new Response(JSON.stringify({
                success: false,
                message: "Username already taken"
            }), {
                status: 400
            });
        }

        // const existingUserByEmail = await UserModel.findOne({ email });
        const existingUserByEmail = await db.user.findUnique({ where: { email } })

        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

        if (existingUserByEmail) {
            if (existingUserByEmail.isVerified) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "User already exists with this email."
                }), { status: 400 });
            } else {
                const hashPassword = await bcrypt.hash(password, 10);
                // existingUserByEmail.password = hashPassword;
                // existingUserByEmail.verifyCode = verifyCode;
                // existingUserByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000);
                await db.user.update({
                    where: {
                        email,
                    },
                    data: {
                        password: hashPassword,
                        verifyCode,
                        verifyCodeExpiry: new Date(Date.now() + 3600000)
                    }
                })
            }
        } else {
            const hashPassword = await bcrypt.hash(password, 10);
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 1);

            // const newUser = new UserModel({
            //     username,
            //     email,
            //     password: hashPassword,
            //     verifyCode,
            //     verifyCodeExpiry: expiryDate,
            //     isVerified: false,
            //     isAcceptingMessage: true,
            //     messages: []
            // });

            // await newUser.save();
            await db.user.create({
                data: {
                    username,
                    email,
                    password: hashPassword,
                    verifyCode,
                    verifyCodeExpiry: expiryDate,
                    isVerified: false,
                    isAcceptingMessage: true,

                }
            })
        }

        // Send verification email
        const emailResponse = await sendVerificationEmail(email, username, verifyCode);

        if (!emailResponse.success) {
            return new Response(JSON.stringify({
                success: false,
                message: emailResponse.message
            }), { status: 500 });
        }

        return new Response(JSON.stringify({
            success: true,
            message: "User registered successfully, Please verify your email."
        }), { status: 201 });

    } catch (error) {
        console.error("Error registering user", error);
        return new Response(JSON.stringify({
            success: false,
            message: "Error registering user"
        }), {
            status: 500
        });
    }
}
