
import { prisma } from "../client/client.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
export const getDoctors = asyncHandler(async (req, res) => {
    try {
        const doctors = await prisma.doctors.findMany({
            include: {
                speciality: true,
            },
        });

        if (!doctors || doctors.length === 0) {
            return res
                .status(404)
                .json(new ApiResponse(404, "Get Doctors: No doctors found"));
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                "Doctors with speciality",
                doctors
            ));

    } catch (err) {
        throw new ApiError(403, err?.message || "Get Doctors: Something went wrong");
    }
});

export const createDoctor = asyncHandler(async (req, res) => {
    const {
        doctors_full_name,
        doctors_intials,
        doctors_rating,
        doctors_review_count,
        doctors_years_experience,
        doctors_next_available_at,
        doctors_pic_url,
        doctors_isactive,
        speciality_speciality_id,
    } = req.body;

    const specialityId = Number(speciality_speciality_id);
    if (typeof doctors_full_name !== "string" || !doctors_full_name.trim() || doctors_full_name.trim().length > 495 || !Number.isInteger(specialityId) || specialityId < 1) {
        throw new ApiError(400, "doctors_full_name and a valid speciality_speciality_id are required");
    }
    if (doctors_intials !== undefined && doctors_intials !== null && (typeof doctors_intials !== "string" || doctors_intials.length > 495)) {
        throw new ApiError(400, "doctors_intials must be a string no longer than 495 characters");
    }
    if (doctors_pic_url !== undefined && doctors_pic_url !== null && typeof doctors_pic_url !== "string") {
        throw new ApiError(400, "doctors_pic_url must be a string");
    }

    const speciality = await prisma.speciality.findUnique({
        where: { speciality_id: specialityId },
    });
    if (!speciality) {
        throw new ApiError(404, "Speciality not found");
    }

    const optionalIntegers = {
        doctors_rating,
        doctors_review_count,
        doctors_years_experience,
        doctors_isactive,
    };
    const numericValues = {};
    for (const [field, value] of Object.entries(optionalIntegers)) {
        if (value !== undefined && value !== null) {
            const parsedValue = Number(value);
            if (!Number.isInteger(parsedValue)) {
                throw new ApiError(400, `${field} must be an integer`);
            }
            numericValues[field] = parsedValue;
        }
    }

    if (numericValues.doctors_isactive !== undefined && ![0, 1].includes(numericValues.doctors_isactive)) {
        throw new ApiError(400, "doctors_isactive must be 0 or 1");
    }

    let nextAvailableAt = null;
    if (doctors_next_available_at) {
        nextAvailableAt = new Date(doctors_next_available_at);
        if (Number.isNaN(nextAvailableAt.getTime())) {
            throw new ApiError(400, "Invalid doctors_next_available_at");
        }
    }

    const doctor = await prisma.doctors.create({
        data: {
            doctors_full_name: doctors_full_name.trim(),
            doctors_intials: doctors_intials?.trim() || null,
            doctors_rating: numericValues.doctors_rating ?? null,
            doctors_review_count: numericValues.doctors_review_count ?? null,
            doctors_years_experience: numericValues.doctors_years_experience ?? null,
            doctors_next_available_at: nextAvailableAt,
            doctors_pic_url: doctors_pic_url || null,
            doctors_isactive: numericValues.doctors_isactive ?? 1,
            doctors_createdtat: new Date(),
            speciality_speciality_id: specialityId,
        },
        include: { speciality: true },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, "Doctor created successfully", doctor));
});