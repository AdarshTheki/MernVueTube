import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, removeOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;
    //TODO: get all videos based on query, sort, pagination

    // Validate and sanitize query parameters
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Filter by user Id if provided
    if (!userId) {
        throw new ApiError(401, "userId is missing");
    }

    const videoQuery = await Video.findById(userId);
});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    console.log(title, description);

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    // Get the video file from the request
    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    if (!videoFileLocalPath) {
        throw new ApiError(401, "videoFile file not define");
    }

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(401, "thumbnail file not define");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile.url) {
        throw new ApiError(401, "videoFile fail Uploading");
    }
    if (!thumbnail.url) {
        throw new ApiError(401, "thumbnail fail Uploading");
    }

    const video = await Video.create({
        title,
        description,
        thumbnail: thumbnail?.url,
        videoFile: videoFile?.url,
        duration: Math.round() * 200 || 200,
    });

    const newVideo = await Video.findById(video._id);

    if (!newVideo) {
        throw new ApiError(401, "publish new video failed");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, newVideo, "⭐ publish new video ⭐ success")
        );
});

export { publishVideo };
