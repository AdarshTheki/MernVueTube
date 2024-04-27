import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, removeOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Generate New Access/Refresh Token
const generateToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        // Generate access and refresh tokens by user method
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Users :: Something wrong wrong while generating and access token"
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
        throw new ApiError(400, "Users :: All fields are required");
    }

    // Check if a user with the same username or email already exists
    const exitsUser = await User.findOne({ $or: [{ username }, { email }] });
    if (exitsUser) {
        throw new ApiError(409, "Users :: Email or UserName already exists");
    }

    // Upload avatar and cover image to Cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Users :: Avatar file is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Users :: Avatar file is required");
    }

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files?.coverImage) &&
        req.files?.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Create a new user object and save it to the database
    const user = await User.create({
        fullName,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username?.toLowerCase(),
    });

    // Find the newly created user and exclude password and refreshToken fields
    const createdUser = await User.findById(user?._id).select(
        "-password -refreshToken"
    );

    // Check if the user was created successfully
    if (!createdUser) {
        throw new ApiError(
            400,
            "Users :: Something want wrong while registering the user"
        );
    }

    // Return a successful response with the created user
    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "Users :: Create New User"));
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

    if (!username && !email) {
        throw new ApiError(400, "Users :: UserName or Email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "Users :: User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Users :: Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, { httpOnly: true })
        .cookie("accessToken", accessToken, { httpOnly: true })
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "Users :: Logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res, _) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }, // this filed remove from document
        },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("refreshToken", { httpOnly: true })
        .clearCookie("accessToken", { httpOnly: true })
        .json(new ApiResponse(200, {}, "User :: Logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res, _) => {
    try {
        const incomingRefreshToken =
            req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(
                401,
                "Users :: Un-Authorize Access Token Request"
            );
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Users :: Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(
                401,
                "Users :: Refresh Token is Expired or Used"
            );
        }

        const { accessToken, newRefreshToken } = await generateToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, { httpOnly: true })
            .cookie("refreshToken", newRefreshToken, { httpOnly: true })
            .json(
                new ApiResponse(
                    200,
                    { user, accessToken, refreshToken: newRefreshToken },
                    "Users :: Access Token successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "Users :: Invalid Access Token"
        );
    }
});

const changeCurrentPassword = asyncHandler(async (req, res, _) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError(401, "Users :: Old Password is Invalid");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Users :: Password Change"));
});

const getCurrentUser = asyncHandler(async (req, res, _) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Users :: Get Current User"));
});

const updateAccountDetails = asyncHandler(async (req, res, _) => {
    const { fullName, email } = req.body;

    if (!(fullName || email)) {
        throw new ApiError(401, "Users :: All Fields are Required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, email } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Users :: Account Updated"));
});

const updateUserAvatar = asyncHandler(async (req, res, _) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(401, "Users :: Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(401, "Users :: Not uploaded on avatar");
    }

    const user = await User.findById(req.user?._id).select("-password");

    if (user?.avatar && user.avatar?.publicId) {
        const deleteAvatar = await removeOnCloudinary(user?.avatar?.publicId);
        if (!deleteAvatar) {
            throw new ApiError(401, "Users :: Old avatar image is not deleted");
        }
    }

    user.avatar = avatar.url;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Users :: Avatar image Updated"));
});

const updateUserCoverImage = asyncHandler(async (req, res, _) => {
    const coverImageLocalPath = req?.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(
            401,
            "Users :: Error While coverImage file is Missing"
        );
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(401, "Users :: Error While Uploading on coverImage");
    }

    const user = await User.findById(req.user?._id).select("-password");

    if (user?.coverImage && user?.coverImage?.publicId) {
        const deleteCoverImage = await removeOnCloudinary(
            user?.coverImage?.publicId
        );
        if (!deleteCoverImage) {
            throw new ApiError(401, "Users :: Old Cover Image Not Deleted");
        }
    }

    user.coverImage = coverImage.url;
    await user.save({ validateBeforeSave: false });

    // const user = await User.findByIdAndUpdate(
    //     req.user?._id,
    //     { $set: { coverImage: coverImage.url } },
    //     { new: true }
    // ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Users :: Cover image Updated"));
});

const getUserChannelProfile = asyncHandler(async (req, res, _) => {
    const { username } = req?.params;

    if (!username) {
        throw new ApiError(401, "Users :: username is missing!");
    }

    const channel = await User.aggregate([
        // Match the user with the given username
        {
            $match: {
                username: { $exists: true, $eq: username?.toLowerCase() },
            },
        },
        // To count the number of subscribers for the channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        // To check if the current user is subscribed to the channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        // To calculate the number of subscribers and channels, and check if the current user is subscribed
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelsCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                subscribersCount: 1,
                channelsCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                subscribers: 1,
                subscribedTo: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Users :: channel does not exists");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User :: User channel"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Users :: User Id is missing");
    }
    const user = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    { $addFields: { owner: { $first: "$owner" } } },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, user[0].watchHistory, "Users :: watch history")
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
