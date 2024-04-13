import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Invalid video ID");
    }
    try {
        const commentData = await Comment.find({ video: videoId })
            .limit(10)
            .skip((page - 1) * limit);

        if (commentData.length === 0) {
            throw new ApiError(404, "video comments not found!!");
        }

        res.status(200).json(
            new ApiResponse(
                200,
                commentData,
                "videos comments fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(
            500,
            error.message || "Something went wrong. Like not updated!!"
        );
    }
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Invalid video ID");
    }

    if (!content) {
        throw new ApiError(401, "Invalid content");
    }

    try {
        const commentData = await Comment.create({
            video: videoId,
            owner: req.user?._id,
            content,
        });

        if (!commentData) {
            throw new ApiError(404, "Invalid new comments");
        }

        res.status(200).json(
            new ApiResponse(200, commentData, "New comment successfully added.")
        );
    } catch (error) {
        throw new ApiError(500, "Error while adding comment.");
    }
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(401, "Invalid video ID");
    }

    if (!content) {
        throw new ApiError(401, "Invalid content");
    }

    try {
        const commentData = await Comment.findOneAndUpdate(
            {
                _id: commentId,
                owner: req.user?._id,
            },
            { content },
            { new: true }
        );

        if (!commentData) {
            throw new ApiError(404, "Invalid update comments");
        }

        res.status(200).json(
            new ApiResponse(200, commentData, "updating comment successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error while updating comment.");
    }
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Invalid comment ID");
    }

    try {
        const commentData = await Comment.findOneAndDelete({
            _id: commentId,
            owner: req.user?._id,
        });

        if (!commentData) {
            throw new ApiError(404, "Invalid delete comments");
        }

        res.status(200).json(
            new ApiResponse(200, {}, "successfully delete comment")
        );
    } catch (error) {
        throw new ApiError(500, "Error while deleting comment.");
    }
});

export { getVideoComments, addComment, updateComment, deleteComment };
