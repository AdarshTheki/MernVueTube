import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.headers["Authorization"]?.replace("Bearer ", "") ||
            "";

        // console.log("middleware accessToken: ", token);

        if (!token) {
            throw new ApiError(
                401,
                "auth middleware :: Un-Authorization Request ! Please Login User"
            );
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid Access Token ! Please Login User");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "auth middleware :: Authentication invalid internal error"
        );
    }
});
