import { default as _, default as pkg } from "lodash";
import { prisma } from "../client/client.js";
import { cookieOptions } from "../config/CookieOption.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { comparePassword } from "../utils/ComparePassword.js";
import generateOTP from "../utils/GenerateOtp.js";
import { generateToken } from "../utils/GenerateTokens.js";
import { hashPassword } from "../utils/HashPassword.js";
import { mail } from "../utils/Mail.js";
import {
 
    signUpValidator, otpVerifyValidator, loginValidator,otpResendValidator, forgetPasswordValidator, otpConfirmvalidator,
    changePasswordValidator
} from "../validator/object.schema.validator.js";
const { now } = _;
const { parseInt } = pkg;
export const signup = asyncHandler(async (req, res)=>
{
try 
{
    const value = signUpValidator(req.body, res, "signup");
    const {name, email, password, is_social} = value;
    const user = await prisma.user.findFirst(
        {
            where:
            {
                user_email:email
            }
        }
    );
if(user)
{
    return res
    .status(402)
    .json( new ApiResponse(402, "SignUp : User already exists"));
}
const hashedPassword = is_social === 1 ? null : await hashPassword(password);
const newuser = await prisma.user.create(
    {
       data:
       {
        user_name:name,
        user_email:email,
        user_password:is_social === 1 ? null : hashedPassword,
        user_issocial:is_social,
        user_isverify:is_social === 1 ? 1 : 0,
    
        user_createdat: new Date(now())
    } 
    }
);
const currentuser = await prisma.user.findFirst(
    {
        where:
        {
            user_email:newuser?.user_email
        }
    }
);

const {accessToken}= generateToken(currentuser);
if(!currentuser)
{
    return res
    .status(401)
    .json(new ApiResponse(401, "SignUp : User not created"));
}

if(is_social === 1)
{
    currentuser.accesstoken = accessToken;
    await prisma.loginstatus.create(
        {
            data:
            {
                loginstatus_isactive:1,
                loginstatus_createdat: new Date(now()),
                user_user_id:newuser?.user_id
            }
        }
    );
    return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, "SignUp : User created successfully", currentuser));
}

const otp = generateOTP();
const userotp = await prisma.otp.findFirst(
    {
        where:
        {
            user_user_id: newuser?.user_id
        }
    });
if(userotp)
{
    await prisma.otp.update(
        {
            where:
            {
                user_user_id:newuser?.user_id
            },
            data:
            {
                otp_number:parseInt(otp,10),
                otp_createdat:new Date(now())
            }
        }
    );
}

else 
{
    await prisma.otp.create(
        {
            data:
            {
                user_user_id:newuser?.user_id,
                otp_number:parseInt(otp, 10),
                otp_createdat: new Date(now())
            }
        }
    );
}
await mail(currentuser.user_email, otp);
await prisma.loginstatus.create(
    {
        data:
        {
            loginstatus_isactive:1,
            loginstatus_createdat: new Date(now()),
            user_user_id:newuser?.user_id
        }
    }
);
return res
.status(200)
.cookie("accessToken", accessToken, cookieOptions)
.json(new ApiResponse(200, "SignUp : User created successfully", { accessToken }));
}
catch(err)
{
    throw new ApiError(403, err?.message || "SignUp : Something went wrong");
}
})
export const verifyotp = asyncHandler(async(req, res)=>
{
try 
{
const {user_id, user_email}=req.user;
const {otpcode}=otpVerifyValidator(req.body, res, "otpverify");
if(!otpcode || !user_id || !user_email)
    {
        return res.status(400).json(new ApiResponse(400, "otp, user_id, user_email is required"));
    }
    const user = await prisma.user.findFirst(
        {
            where
            :
            {
                user_email:user_email
            }
        }
    );
    if(!user)
        {
            return res
            .status(404)
            .json(new ApiResponse(404, "OtpVerify : User not found"));
        }
        const userOtp = await prisma.otp.findFirst({
            where:{
                user_user_id: user.user_id
            }
        });
        if(userOtp.otp_number !== otpcode){
            return res
            .status(402)
            .json(new ApiResponse(401, "OtpVerify : Your otp is wrong"));
        }
        const verification= await prisma.user.findFirst
        (
            {
                where:
                {
                    user_isverify:1,
    user_id:user_id
    
                }
            }
        );
        if(verification)
        {
            return res
            .status(200)
            .json(new ApiResponse(200, "OtpVerify : User Already Verified"));  
        }
          
        const updatedUser = await prisma.user.update(
            {
                data:
                {
                    user_isverify:  1,
                    user_modifiedat : new Date()
                },
                where:
                {
                    user_id:user_id,
                    user_email:user_email
                }
            }
        );  
        const {accessToken}=generateToken(updatedUser);
        if(updatedUser.user_isverify!==1)
            {
                return res
                .status(401)
                .json(new ApiResponse(401, "OtpVerify : User Email Not Verified"));
            }
            return res
            .status(200)
            .json(new ApiResponse(200, "OtpVerify : User Email Verified",accessToken));
}
catch(err)
{
    throw new ApiError(403, err?.message|| "Otp verify: Something went wrong");
}



});
export const login = asyncHandler(async(req, res)=>
{
    try
{
    const value = loginValidator(req.body, res, "login");
    const {email, password, is_social}=value;
    const user = await prisma.user.findFirst(
        {
            where:
            {
                user_email:email
            }
        }
    );
    if(!user)
    {
        return res.status(400).json(new ApiResponse(400, "This email is not registered"))
    }


    if(user.user_deletedat !== null)
        {
            return res
            .status(405)
            .json(new ApiResponse(405, "Login : User is Deleted", {
             
            }));
        }
        if(is_social === 1)
        {
            if(user.user_issocial !== 1)
            {
                return res.status(401).json(new ApiResponse(401, "Login : User is not social"));
            }

            const { accessToken } = generateToken(user);
            await prisma.loginstatus.updateMany(
                {
                    where:
                    {
                        user_user_id:user.user_id
                    },
                    data:
                    {
                        loginstatus_isactive:1,
                        loginstatus_modifiedat: new Date(now())
                    }
                }
            );
            user.accesstoken = accessToken;

            return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .json(new ApiResponse(200, "Login : You are successfully logined", user));
        }

        if(user.user_issocial===is_social)
            {
            
            if(!user)
                {
                    return res
                    .status(404)
                    .json(new ApiResponse(404, "Login : User not found"));
                }
                const isPasswordValid = await comparePassword(password, user.user_password, res);
                if(!isPasswordValid)
                    {
                        return res
                        .status(401)
                        .json(new ApiResponse(401, "Login : User Password Mismatched"));
                    }
            
                    const { accessToken } = generateToken(user);
               
                  
                        await prisma.loginstatus.updateMany(
                            {
                                where:
                                {
                                    user_user_id:user.user_id
                                },
                                data:
                                {
                                    loginstatus_isactive:1,
                                    loginstatus_modifiedat: new Date(now())
                                }
                            }
                        );
                    user.accesstoken = accessToken;
            
                    return res
                    .status(200)
                    .cookie("accessToken", accessToken, cookieOptions)
                    .json(new ApiResponse(200, "Login : You are successfully logined", user));
            
                }
                else
                return res.status(401).json(new ApiResponse(401, "user not social"));

}
catch(err)
{
    throw new ApiError(403, err?.message||"Login: Something went wrong");
}

})

export const resendotp = asyncHandler(async(req, res)=>
{
    try 
    {
        const value = await otpResendValidator(req.body, res, "resendotp");
        const { email } = value;
        const otpcode = generateOTP();
        const user = await prisma.user.findFirst({
          where: {
            user_email: email,
          },
        });
    
        if (!user) {
          return res.status(404).json(new ApiResponse(404, "ResendOTP : User not found"));
        }
    
        const findotp = await prisma.otp.findFirst({
          where: {
            user_user_id: user.user_id,
          },
        });
    
        if (!findotp) {
          return res.status(404).json(new ApiResponse(404, "ResendOTP : OTP not found"));
        }
    
        const updatedUser = await prisma.otp.update({
  where: {
    otp_id: findotp.otp_id,   // ✅ sirf primary key kaafi hai
  },
  data: {
    otp_number: parseInt(otpcode, 10),
    otp_modifiedat: new Date(now()),
  },
});;
    
        if (!updatedUser) {
          return res.status(401).json(new ApiResponse(404, "ResendOTP : Otp Resend failed"));
        }
    
        await mail(user.user_email, otpcode);
    
        return res.status(200).json(new ApiResponse(200, "ResendOTP : Otp Resend Successfully"));
    }
    catch(err)
    {
        throw new ApiError(403, err?.message || "Resend otp: Something went wrong");
    }
})
export const forgetPassword = asyncHandler(async(req, res)=>
{
try 
{
    const value = await forgetPasswordValidator(req.body, res, "forgetpassword");
    const {email}=value;
    const otpcode = generateOTP();
    const findUser = await prisma.user.findFirst(
        {
            where:
            {
                user_email:email
            }
        }
    );
    if(!findUser)
    {
        return res.status(404).json(new ApiResponse(404, "Forget Password : User not found"));
    }
const accessToken=generateToken(findUser);
    const findotp = await prisma.otp.findFirst({
        where: {
          user_user_id: findUser.user_id,
        },
      });
    
      if (!findotp) {
        return res.status(404).json(new ApiResponse(404, "ForgetOTP : OTP  not found"));
      }
    const updatedotp = await prisma.otp.update({
  where: {
    otp_id: findotp.otp_id,
  },
  data: {
    otp_number: parseInt(otpcode, 10),
    otp_modifiedat: new Date(),
  },
});;
      
  if (!updatedotp) {
    return res.status(401).json(new ApiResponse(404, "ResendOTP : Otp Resend failed"));
  }
  await mail(findUser.user_email, otpcode);

  return res.status(200).json(new ApiResponse(200, "Forget Password : Otp Resend Successfully", accessToken));
}
catch(err)
{
    throw new ApiError(403, err?.message || "Forget Password: Something went wrong");
}
});
export const confirmotp = asyncHandler(async(req, res)=>
{
    try 
    {
        const {user_id, user_email}= req.user;
        const {otpcode} = otpConfirmvalidator(req.body, res, "confirmotp");
        const user = await prisma.user.findFirst(
            {
                where:
                {
                    user_email:user_email
                }
            }
        );
        if(!user)
        {
            return res
            .status(404)
            .json(new ApiResponse(404, "OtpVerify : User not found"));
        }
        const userOtp = await prisma.otp.findFirst({
            where:{
                user_user_id: user.user_id
            }
        });
        
        if(userOtp.otp_number !== otpcode){
            return res
            .status(402)
            .json(new ApiResponse(401, "OtpVerify : Your otp is wrong"));
        }

        const checkverification= await prisma.user.findFirst
    (
        {
            where:
            {
                user_isverify:1,
user_id:user_id

            }
        }
    );
    if(checkverification)
    {
        return res
        .status(200)
        .json(new ApiResponse(200, "OtpVerify : User Already Verified"));  
    }


        
        const updatedUser = await prisma.user.update(
            {
                data:
                {
                    user_isverify:  1,
                    user_modifiedat : new Date()
                },
                where:
                {
                    user_id:user_id,
                    user_email:user_email
                }
            }
        );
        
        if(updatedUser.user_isverify!==1)
        {
            return res
            .status(401)
            .json(new ApiResponse(401, "OtpVerify : User Email Not Verified"));
        }
        return res
        .status(200)
        .json(new ApiResponse(200, "Confirm OTP : User Confirm Otp Verified",));
    }
    catch(err)
    {
        throw new ApiError(403, err?.message || "Confirm Otp, Something went wrong");
    }
})
export const changepassword = asyncHandler(async(req, res)=>
    {
        try
        {
    const value =changePasswordValidator(req.body, res, "changepassword");
    const { password}=value;
    const {user_email}=req.user;
    
    if(!user_email || !password)
    {
        return res.status(400).json(new ApiResponse(400, "email and password is required"));
    }
    
    
    const findUser = await prisma.user.findFirst(
        {
            where:
            {
                user_email:user_email
            }
        }
    );
    if(!findUser)
    {
        return res.status(404).json(new ApiResponse(404, "Change Password : User not found"));
    }
    const hashedPassword= await hashPassword(password);
    
    let accessToken = "";
    const updatedUser = await prisma.user.update(
        {
            where:
            {
                user_id:findUser.user_id
            },
            data:
            {
                user_password:hashedPassword,
              
                user_modifiedat:new Date(now())
            },
            select:
            {
                user_id:true,
                user_name:true,
                user_email:true,
                user_isverify:true,
                user_password:true,
           
            }
        }
    );
    if(!updatedUser)
        {
            return res.status(402).json(new ApiResponse(402, "ForgetPassword : User's password is not updated"));
        }
    
         accessToken = generateToken(updatedUser)?.accessToken;
         return res
         .status(200)
         .cookie("accessToken", accessToken, cookieOptions)
         .json(new ApiResponse(200, "ForgetPassword : Success", {
             accessToken
         }));
    
        }
        catch(err)
        {
            throw new ApiError(403, err?.message || "Change Password: Something went wrong");
        }
    })

    export const userlogout = asyncHandler(async(req, res)=>
        {
        try
        {
            const {user_id} = req.user;
        const findUser = await prisma.loginstatus.findFirst(
            {
                where:
                {
                    user_user_id:user_id
                }
            }
        );
            const userlogin = await prisma.loginstatus.update({
    where: {
        loginstatus_id: findUser.loginstatus_id,
    },
    data: {
        loginstatus_isactive: 0,
        loginstatus_modifiedat: new Date(),
    },
});;
        if(userlogin.loginstatus_isactive !==0)
        {
            return res
            .status(401)
            .json(new ApiResponse(
                401,
                "UserLogout : User logout failed"
            ));
        }
        return res
        .status(200)
        .clearCookie("accessToken")
        .json(new ApiResponse(
            200,
            "UserLogout : User successfully Logout"
        ));
        
        }
        catch(err)
        {
            throw new ApiError(403, err?.message || "User Logout: Something went wrong" );
        }
        });
export const getUser = asyncHandler(async(req, res)=>
            {
            try
            {
            const {user_id}=req.user;
            const userdetail = await prisma.user.findMany(
                {
                    where:
                    {
                        user_id:user_id
                    }
                }
            );
            if(!userdetail)
            {
                return res
                .status(404)
                .json(new ApiResponse(404, "Get detail : User not found"));
            }
            
            return res
                .status(200)
                .json(new ApiResponse(
                    200,
                    "User detail",userdetail
                ));
            
            }
            catch(err)
            {
                throw new ApiError(403, err?.message || "Get User Detail: Something went wrong");
            }
            })
export const updateProfile = asyncHandler(async (req, res) => {
    try {
        const { user_id } = req.user;
        const {
            name,
            gender,
            age,
            phone,
            address,
            blood,
            allergies,
            emergency
        } = req.body;

        const finduser = await prisma.user.findFirst({
            where: { user_id: user_id }
        });

        if (!finduser) {
            return res.status(404).json(new ApiResponse(404, "Update Profile: User not found"));
        }

        const updatedprofile = await prisma.user.update({
            where: { user_id: user_id },
            data: {
                user_name: name ?? finduser.user_name,
                user_gender: gender ?? finduser.user_gender,
                user_age: age ?? finduser.user_age,
                user_phone: phone ?? finduser.user_phone,
                user_address: address ?? finduser.user_address,
                user_blood: blood ?? finduser.user_blood,
                user_allergies: allergies ?? finduser.user_allergies,
                user_emergency: emergency ?? finduser.user_emergency,
                user_modifiedat: new Date()
            }
        });

        return res.status(200).json(new ApiResponse(200, "Profile updated successfully", updatedprofile));

    } catch (err) {
        throw new ApiError(403, err?.message || "Update Profile: Something went wrong");
    }
});

export const deleteAccount = asyncHandler(async (req, res) => {
    try {
        const { user_id } = req.user;

        const finduser = await prisma.user.findFirst({
            where: {
                user_id: user_id,
                user_deletedat: null
            }
        });

        if (!finduser) {
            return res.status(404).json(new ApiResponse(404, "Delete Account: User not found"));
        }

        const deletedUser = await prisma.user.update({
            where: { user_id: user_id },
            data: {
                user_deletedat: new Date(),
                user_modifiedat: new Date()
            }
        });

        if (!deletedUser) {
            return res.status(401).json(new ApiResponse(401, "Delete Account: Account deletion failed"));
        }

        return res
            .status(200)
            .clearCookie("accessToken")
            .json(new ApiResponse(200, "Delete Account: Account deleted successfully"));

    } catch (err) {
        throw new ApiError(403, err?.message || "Delete Account: Something went wrong");
    }
});