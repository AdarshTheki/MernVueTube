import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, removeOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

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
        // secure: true,
    };

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
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
        // secure: true,
    };

    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User ⭐ Logged Out ⭐ Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res, _) => {
    try {
        const incomingRefreshToken =
            req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(401, "❌ Un-Authorize Access Token Request");
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
            // secure: true,
        };
        const { accessToken, newRefreshToken } = await generateToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { user, accessToken, refreshToken: newRefreshToken },
                    "⭐ Access Token ⭐ successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "❌ Invalid Access Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res, _) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError(401, "❌ Old Password is Invalid");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "⭐ Password Change ⭐ Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res, _) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "⭐ Get Current User ⭐ Successfully"
            )
        );
});

const updateAccountDetails = asyncHandler(async (req, res, _) => {
    const { fullName, email } = req.body;

    if (!(fullName || email)) {
        throw new ApiError(401, "❌ All Fields are Required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, email } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Account Details ⭐ Updated ⭐ Successfully"
            )
        );
});

const updateUserAvatar = asyncHandler(async (req, res, _) => {
    // multer used to get avatar file
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(401, "❌ Error While Avatar file is Missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(401, "❌ Error While Uploading on Avatar");
    }

    // TODO: delete old image - assignment

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Avatar Image ⭐ Updated ⭐ successfully"
            )
        );
});

const updateUserCoverImage = asyncHandler(async (req, res, _) => {
    // multer used to get avatar file
    const coverImageLocalPath = req?.file?.path;
    console.log(coverImageLocalPath)
    if (!coverImageLocalPath) {
        throw new ApiError(401, "❌ Error While coverImage file is Missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(401, "❌ Error While Uploading on coverImage");
    }

    // TODO: delete old image - assignment

    const user = await User.findById(req.user?._id).select("-password");

    if (user?.coverImage && user?.coverImage?.publicId) {
        const deleteCoverImage = await removeOnCloudinary(
            user?.coverImage?.publicId
        );
        if (!deleteCoverImage) {
            throw new ApiError(401, "Old Cover Image Not Deleted");
        }
    }

    user.coverImage = coverImage.url;
    await user.save();

    // const user = await User.findByIdAndUpdate(
    //     req.user?._id,
    //     { $set: { coverImage: coverImage.url } },
    //     { new: true }
    // ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "CoverImage ⭐ Updated ⭐ successfully")
        );
});

const getUserChannelProfile = asyncHandler(async (req, res, _) => {
    const { username } = req.params;

    if (username?.trim()) {
        throw new ApiError(401, "username is missing!");
    }

    const channel = await User.aggregate([
        // Match the user with the given username
        {
            $match: {
                username: username?.toLowerCase(),
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
                foreignField: "subscribe",
                as: "subscribedTo",
            },
        },
        // To calculate the number of subscribers and channels, and check if the current user is subscribed
        {
            $addFields: {
                subscribersCount: { $size: "subscribers" },
                channelsCount: { $size: "subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req?.user?._id, "$subscribers.subscribe"] },
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
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "⭐ User channel ⭐ fetched successfully"
            )
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
};
