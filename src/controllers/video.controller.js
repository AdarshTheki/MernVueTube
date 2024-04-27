import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
// import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, removeOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async ({ query }, res) => {
    try {
        const {
            page = 1,
            limit = 5,
            q: searchQuery = "",
            sortBy = "createdAt",
            sortType = "desc",
            userId,
        } = query;
        // Sort stage
        const sortStage = {};
        sortStage[sortBy] = sortType === "asc" ? -1 : 1;

        let pipeline;
        if (!isValidObjectId(userId)) {
            pipeline = {
                $match: {
                    $or: [
                        { title: { $regex: searchQuery, $options: "i" } },
                        { description: { $regex: searchQuery, $options: "i" } },
                    ],
                },
            };
        } else {
            pipeline = {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                },
            };
        }
        // Execute aggregation pipeline
        const videos = await Video.aggregate([
            pipeline,
            { $sort: sortStage },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
        ]);
        if (!videos || videos.length === 0) {
            throw new ApiError(401, "Videos :: Video not found");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, videos, "Videos :: get video"));
    } catch (error) {
        throw new ApiError(
            500,
            "videos :: " + error?.message || "Videos :: Video not found"
        );
    }
});

const publishVideo = asyncHandler(async ({ body, files, user }, res) => {
    try {
        const { title, description } = body;
        if (!title || !description) {
            throw new ApiError(
                400,
                "Videos :: title & description are required"
            );
        }

        // Get the video file from the request
        const videoFileLocalPath = files?.videoFile[0]?.path;
        const thumbnailLocalPath = files?.thumbnail[0]?.path;

        if (!videoFileLocalPath || !thumbnailLocalPath) {
            throw new ApiError(
                401,
                "Videos :: videoFile or thumbnail are required"
            );
        }

        const videoFile = await uploadOnCloudinary(videoFileLocalPath);
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!videoFile?.url || !thumbnail?.url) {
            throw new ApiError(
                401,
                "Videos :: videoFile or thumbnail fail to uploaded"
            );
        }

        const video = await Video.create({
            title,
            description,
            thumbnail: thumbnail?.url,
            videoFile: videoFile?.url,
            duration: Math.floor(Math.random() * 200) + 1,
            owner: user?._id,
        });

        if (!video) {
            throw new ApiError(401, "Videos :: publish new video failed");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, video, "Videos :: publish new video"));
    } catch (error) {
        throw new ApiError(
            500,
            "videos :: " + error?.message ||
                "Videos :: publish new video failed"
        );
    }
});

const getVideoById = asyncHandler(async ({ params }, res) => {
    try {
        const { videoId } = params;
        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Videos :: Invalid video ID");
        }
        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(401, "Videos :: video does not exits");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, video, "Videos :: get video by id"));
    } catch (error) {
        throw new ApiError(
            500,
            "Videos :: " + error || "Videos :: Internal Server Error"
        );
    }
});

const deleteVideo = asyncHandler(async ({ params, user }, res) => {
    try {
        const { videoId } = params;
        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Videos :: Invalid video ID");
        }
        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(404, "Videos :: video does not exits");
        }
        if (video.owner.toString() !== user?._id) {
            throw new ApiError(403, "Videos :: unauthorized video!");
        }

        // remove avatar or coverImage
        const deleteAvatar = await removeOnCloudinary(user?.avatar);
        const deleteCoverImage = await removeOnCloudinary(user?.coverImage);

        if (!deleteAvatar || !deleteCoverImage) {
            throw new ApiError(
                401,
                "Videos :: avatar or coverImage is not deleted"
            );
        }

        await video.remove();

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Video :: deleted successfully"));
    } catch (error) {
        throw new ApiError(
            500,
            "Videos :: " + error || "Videos :: Internal Server Error"
        );
    }
});

const updateVideo = asyncHandler(async ({ params }, res) => {
    try {
        const { videoId, title, description, thumbnail, userId } = params;
        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Videos :: Invalid video ID");
        }

        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(404, "Videos :: video not exits");
        }
        // Check if the authenticated user is the owner of the video
        if (video.owner.toString() !== userId) {
            throw new ApiError(403, "Videos :: unauthorized owner");
        }

        const thumbnailUrl = await uploadOnCloudinary(thumbnail);

        video.title = title;
        video.description = description;
        video.thumbnail = thumbnailUrl;

        await video.save({ validateBeforeSave: false });

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Video :: video updated"));
    } catch (error) {
        throw new ApiError(
            500,
            "Videos :: " + error.message || "Videos :: Internal Server Error"
        );
    }
});

const togglePublishStatus = asyncHandler(async ({ params }, res) => {
    try {
        const { videoId } = params;
        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Videos :: Invalid video ID");
        }
        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(401, "Videos :: video not found");
        }
        video.isPublished = !video.isPublished;
        await video.save();

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    `Videos :: New status: ${video.isPublished ? "Published" : "Unpublished"}`,
                    video
                )
            );
    } catch (error) {
        throw new ApiError(
            500,
            "Videos :: " + error?.message || "Videos :: Internal Server Error"
        );
    }
});

export {
    publishVideo,
    getAllVideos,
    getVideoById,
    deleteVideo,
    updateVideo,
    togglePublishStatus,
};
