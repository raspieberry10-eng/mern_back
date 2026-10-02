import joi from "joi";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const validator = (schema) => (payload, res, funcName = "API",) =>{
    
    const {value, error} = schema.validate(payload);
    
    if(error?.details.length > 0)
    {
        let errorMessage = error.details.map(item => item.message);

        if(res)
        {
            return res.status(401).json(new ApiResponse (401, `${funcName} : Fields are incorrect or Empty`, errorMessage));
        }
        
        throw new ApiError (401, JSON.stringify(error?.details) || `${funcName} : Fields are incorrect or Empty`);
    }
    else
    {
        return value;
    }
};

// Authentication Controller : API Payload Schema 

const signupSchema = joi
  .object({
    name: joi
      .string()
      .trim()
      .min(0)
      .max(20)
      .lowercase()
      .required(),

    email: joi
      .string()
      .trim()
      .email()
      .min(6)
      .max(50)
      .lowercase()
      .required(),

    password: joi
      .string()
      .trim()
      .min(8)
      .max(20)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$"))
      .when("is_social", { is: 1, then: joi.optional(), otherwise: joi.required() })
      .messages({
        "string.pattern.base":
          "Password must be at least 8 characters long and include one capital letter, one small letter, one number, and one symbol.",
      }),

    is_social: joi
      .number()
      .integer()
      .required(),
  })
  .options({ abortEarly: false });

const loginSchema = joi
  .object({
    email: joi
      .string()
      .trim()
      .email()
      .min(6)
      .max(50)
      .lowercase()
      .required(),

    password: joi
      .string()
      .trim()
      .min(8)
      .max(20)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$"))
      .when("is_social", { is: 1, then: joi.optional(), otherwise: joi.required() })
      .messages({
        "string.pattern.base":
          "Password must be at least 8 characters long and include one capital letter, one small letter, one number, and one symbol.",
      }),

    is_social: joi
      .number()
      .integer()
      .required(),
  })
  .options({ abortEarly: false });

const comparePasswordSchema = joi
.object({
    password : joi.string().trim().min(8).max(20).required(),
    hashedPassword : joi.string().trim().required()
}).options({abortEarly: false});

const otpVerifySchema = joi.object({
    otpcode: joi.number().integer().required()  // Corrected usage of .required() function
  }).options({ abortEarly: false }); 

const otpResendSchema = joi
.object({
    email :  joi.string().trim().email().min(6).max(50).lowercase(),
});

const forgetPasswordSchema = joi
.object({
    email : joi.string().trim().email().min(6).max(50).lowercase(),
    
}).options({abortEarly: false});
const otpConfirmSchema = joi
    .object({
        otpcode: joi.number().integer().required(),
    })
    .options({ abortEarly: false });

    const changePasswordSchema = joi
    .object({
        email : joi.string().trim().email().min(6).max(50).lowercase(),
         password: joi
      .string()
      .trim()
      .min(8)
      .max(20)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$"))
      .required()
      .messages({
        "string.pattern.base":
          "Password must be at least 8 characters long and include one capital letter, one small letter, one number, and one symbol.",
      }),
    }).options({abortEarly: false});

    
export const signUpValidator = validator(signupSchema);
export const loginValidator = validator(loginSchema);
export const comparePasswordValidator = validator(comparePasswordSchema);
export const otpVerifyValidator = validator(otpVerifySchema);
export const otpResendValidator = validator(otpResendSchema);
export const otpConfirmvalidator=validator(otpConfirmSchema);
export const forgetPasswordValidator = validator(forgetPasswordSchema);
export const changePasswordValidator=validator(changePasswordSchema);
