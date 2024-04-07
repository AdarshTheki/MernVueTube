import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

// Generate Access and Refresh Token
const generateToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "❌ something wrong wrong while generating and access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res, _) => {
    /*
    - get user detail from frontend
    - validation - not empty
    - check if user already exists : username, email
    - check images, check avatar
    - upload them to cloudinary, avatar
    - create user Object - create entry in DB
    - remove password and refresh token field from response
    - check for user creation
    - return response
    */

    // Get user details from the frontend request body
    const { fullName, email, password, username } = req.body;

    // Validate that all fields are not empty
    if (
        [fullName, email, password, username].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "❌ All fields are required");
    }

    // Check if a user with the same username or email already exists
    const exitsUser = await User.findOne({ $or: [{ username }, { email }] });
    if (exitsUser) {
        throw new ApiError(
            409,
            "❌ User with email or username already exists"
        );
    }

    // Upload avatar and cover image to Cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "❌ Avatar file is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "❌ Avatar file is required");
    }

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Create a new user object and save it to the database
    const user = await User.create({
        fullName,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    // Find the newly created user and exclude password and refreshToken fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // Check if the user was created successfully
    if (!createdUser) {
        throw new ApiError(
            400,
            "❌ Something want wrong while registering the user"
        );
    }

    // Return a successful response with the created user
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                createdUser,
                "⭐ Create New User ⭐ Successfully"
            )
        );
});

const loginUser = asyncHandler(async (req, res, _) => {
    /*
    - req body -> data
    - check username / email
    - find the user
    - password check
    - accessToken / refreshToken generate
    - send secure cookies
    */

    const { email, password, username } = req.body;
    console.log(req.body);

    if (!username && !email) {
        throw new ApiError(400, "❌ username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "❌ User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "❌ Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User ⭐ Logged In ⭐ Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res, _) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User ⭐ Logged Out ⭐ Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res, _) => {
    try {
        const incomingRefreshToken =
            req.cookies.refreshToken || req.body.refreshToken;
        if (!incomingRefreshToken) {
            throw new ApiError(401, "❌ Un-Authorize Request");
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "❌ Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "❌ Refresh Token is Expired or Used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };
        const { accessToken, newRefreshToken } = await generateToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "⭐ Access Token ⭐ successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "❌ Invalid Access Token");
    }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
