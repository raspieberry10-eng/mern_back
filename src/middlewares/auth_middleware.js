import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { prisma } from "../client/client.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const authentication = asyncHandler(async (req, res, next) => {
    const token =
        req.header("Authorization")?.replace("Bearer ", "") ||
        req.cookies?.accessToken;

    if (!token) {
        return res
            .status(401)
            .json(new ApiResponse(401, "Authorization: You are not authorized."));
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Session expired. Please login again.");
        }
        throw new ApiError(401, "Invalid token. Please login again.");
    }

    // Find User of Given Token Credentials
    const user = await prisma.user.findFirst({
        where: {
            user_email: decodedToken.user_email,
        },
    });

    if (!user) {
        throw new ApiError(401, "User Not Found");
    }

    req.user = user;
    next();
});

export default authentication;