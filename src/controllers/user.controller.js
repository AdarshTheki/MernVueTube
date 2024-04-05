import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "Ok Server!!!!",
    // });

    // get user detail from frontend
    // validation - not empty
    // check if user already exists : username, email
    // check images, check avatar
    // upload them to cloudinary, avatar
    // create user Object - create entry in DB
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const { fullName, email, password, username } = req.body;

    // if (fullName === "") {
    //     throw new ApiError(400, "fullName is required!");
    // }
    if (
        [fullName, email, password, username].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check user already exists: username/email
    const exitsUser = User.findOne({ $or: [{ username }, { email }] });
    if (exitsUser) {
        throw new ApiError(409, "User with email or username");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // create user Object - create entry with DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            400,
            "Something want wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "created user successfully"));
});

export { registerUser };
