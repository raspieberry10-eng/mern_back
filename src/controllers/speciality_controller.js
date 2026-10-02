import { prisma } from "../client/client.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

export const getSpecialities = asyncHandler(async (req, res) => {
    const specialities = await prisma.speciality.findMany({
        orderBy: { speciality_id: "asc" },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, "Specialities fetched successfully", specialities));
});

export const createSpeciality = asyncHandler(async (req, res) => {
    const specialityType = req.body.speciality_type;
    if (typeof specialityType !== "string" || !specialityType.trim() || specialityType.trim().length > 475) {
        throw new ApiError(400, "speciality_type is required and must be no longer than 475 characters");
    }

    const speciality = await prisma.speciality.create({
        data: { speciality_type: specialityType.trim() },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, "Speciality created successfully", speciality));
});