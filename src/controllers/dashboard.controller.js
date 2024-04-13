import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Subscription } from "../models/subscriptions.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    try {
        const userId = req.user?._id;

        const subscriptionCount = await Subscription.countDocuments({
            owner: userId,
        });
        const videoCount = await Video.countDocuments({
            owner: userId,
        });
        const likesCount = await Like.countDocuments({
            owner: userId,
        });
        const videoViews = await Video.aggregate([
            { $match: { owner: userId } },
            { $group: { _id: null, totalViews: { $sum: "$view" } } },
        ]);
        const totalViews = videoViews.length > 0 ? videoViews[0].totalViews : 0;

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    totalSubscriptions: subscriptionCount,
                    totalVideos: videoCount,
                    totalLikes: likesCount,
                    totalVideoViews: totalViews,
                },
                "successfully fetching videos, subscribe, subscribeTo, likes and views stats"
            )
        );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Something went wrong. Please try again later."
        );
    }
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    try {
        const videosData = await Video.find({ owner: req.user?._id });

        if (videosData.length === 0) {
            return res
                .status(404)
                .json(
                    new ApiResponse(
                        200,
                        {},
                        "No videos found for this channel."
                    )
                );
        }

        res.status(200).json(
            new ApiResponse(200, videosData, "Videos fetched successfully.")
        );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Something went wrong. Please try again later."
        );
    }
});

export { getChannelStats, getChannelVideos };
