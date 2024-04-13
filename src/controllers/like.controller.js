import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    let data, action;

    try {
        const videoData = await Like.findOneAndDelete({
            likedBy: req.user?._id,
            video: videoId,
        }).lean();

        if (videoData) {
            action = "Un-liked";
        } else {
            data = await Like.create({
                video: videoId,
                likedBy: req.user?._id,
            });
            action = "Liked";
        }

        res.status(201).json(
            new ApiResponse(201, data || {}, `${action} successfully`)
        );
    } catch (error) {
        throw new ApiError(
            500,
            error.message || "Something went wrong. Like not updated!!"
        );
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    let data, action;

    try {
        const commentData = await Like.findOneAndDelete({
            likedBy: req.user?._id,
            comment: commentId,
        }).lean();

        if (commentData) {
            action = "Un-liked";
        } else {
            data = await Like.create({
                likedBy: req.user?._id,
                comment: commentId,
            });
            action = "Liked";
        }

        res.status(201).json(
            new ApiResponse(201, data || {}, `${action} successfully`)
        );
    } catch (error) {
        throw new ApiError(
            500,
            error.message || "Something went wrong. Like not updated!!"
        );
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    let data, action;

    try {
        const tweetData = await Like.findOneAndDelete({
            likedBy: req.user?._id,
            tweet: tweetId,
        }).lean();

        if (tweetData) {
            action = "Un-liked";
        } else {
            data = await Like.create({
                likedBy: req.user?._id,
                tweet: tweetId,
            });
            action = "Liked";
        }

        res.status(201).json(
            new ApiResponse(201, data || {}, `${action} successfully`)
        );
    } catch (error) {
        throw new ApiError(
            500,
            error.message || "Something went wrong. Like not updated!!"
        );
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    try {
        const likedVideos = await Like.find({
            likedBy: req.user?._id,
        }).populate({
            path: "video",
            select: "title videoFile thumbnail duration views",
        });

        res.status(200).json(
            new ApiResponse(
                200,
                likedVideos,
                `Liked videos fetched successfully`
            )
        );
    } catch (error) {
        throw new ApiError(
            500,
            error.message || "Something went wrong. Like not updated!!"
        );
    }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
