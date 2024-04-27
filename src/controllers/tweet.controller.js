import { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    try {
        if (!isValidObjectId(req?.user?._id)) {
            return res.status(400).json({
                error: "Tweets :: Invalid user ID",
            });
        }

        const user = await User.findById(req?.user?._id);
        if (!user) {
            throw new ApiError(404, "Tweets :: User not found");
        }

        const newTweet = await Tweet.create({
            content,
            owner: req?.user?._id,
        });

        return res
            .status(201)
            .json(new ApiResponse(200, "Tweets :: Tweet created:", newTweet));
    } catch (error) {
        res.status(500).json(
            new ApiResponse(
                500,
                error?.message || "Tweets :: Internal Server Error"
            )
        );
    }
});

const getUserTweets = asyncHandler(async ({ params }, res) => {
    const { userId } = params;
    try {
        if (!isValidObjectId(userId)) {
            throw new ApiError(404, "Tweets :: Invalid user ID");
        }

        const tweets = await Tweet.find({ owner: userId }).populate(
            "owner",
            "username"
        );
        res.status(200).json(
            new ApiResponse(200, tweets, "Tweets :: Tweets retrieved:")
        );
    } catch (error) {
        res.status(500).json(
            new ApiResponse(
                500,
                error?.message || "Tweets :: Internal Server Error"
            )
        );
    }
});

const updateTweet = asyncHandler(async ({ params, body, user }, res) => {
    const { content } = body;
    const { tweetId } = params;
    try {
        if (!isValidObjectId(user?._id)) {
            throw new ApiError(401, "Tweets :: Invalid user ID");
        }

        if (!isValidObjectId(tweetId) || !content) {
            throw new ApiError(
                401,
                "Tweets :: Invalid tweet ID or content undefine"
            );
        }

        const tweet = await Tweet.findById(tweetId);

        if (!tweet) {
            throw new ApiError(401, "Tweets :: Tweet not found");
        }

        if (!tweet.owner === user?._id) {
            throw new ApiError(
                402,
                "Tweets :: You are not Author of this tweet"
            );
        }

        tweet.content = content;
        await tweet.save({ validateBeforeSave: false });

        res.status(200).json(
            new ApiResponse(200, tweet, "Tweets :: update success")
        );
    } catch (error) {
        throw new ApiError(404, error?.message || "Tweets :: Internal Error");
    }
});

const deleteTweet = asyncHandler(async (req, res) => {
    try {
        const { tweetId } = req.params;

        if (!isValidObjectId(tweetId)) {
            throw new ApiError(401, "Tweets :: Invalid Tweet ID");
        }

        await Tweet.findByIdAndDelete({ _id: tweetId });

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Tweets :: Deleted successfully"));
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Tweets :: Internal Server Error"
        );
    }
});

export { createTweet, updateTweet, deleteTweet, getUserTweets };
