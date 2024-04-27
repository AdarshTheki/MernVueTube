import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    try {
        if (!isValidObjectId(req.user?._id)) {
            throw new ApiError(400, "Playlists :: Invalid user ID");
        }

        if (!name || !description) {
            throw new ApiError(
                401,
                "Playlists :: Invalid name or description"
            );
        }

        const playlist = new Playlist({
            name,
            description,
            owner: req.user._id,
        });

        await playlist.save({ validateBeforeSave: false });

        res.status(200).json(
            new ApiResponse(200, playlist, "Playlists :: Created successfully")
        );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Playlists :: Internal Error"
        );
    }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    try {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Playlists :: Invalid params of user ID");
        }

        const playlists = await Playlist.find({ owner: userId });

        res.status(200).json(
            new ApiResponse(
                200,
                playlists,
                "Playlists :: Fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Playlists :: Internal errors"
        );
    }
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    try {
        if (!isValidObjectId(playlistId)) {
            throw new ApiError(
                400,
                "Playlists :: Invalid params of playlist ID"
            );
        }

        const playlist = await Playlist.find({ _id: playlistId }).populate(
            "videos"
        );

        res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Playlists :: fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Playlists :: Internal errors"
        );
    }
});

const toggleVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    try {
        if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
            throw new ApiError(404, "Playlists :: playlist or video not found");
        }

        const playlist = await Playlist.findOne({
            _id: playlistId,
            owner: req.user?._id,
        });

        if (!playlist) {
            throw new ApiError(401, "Playlists :: playlist does not exist");
        }

        const index = playlist.videos.indexOf(videoId);
        if (index !== -1) {
            playlist.videos.splice(index, 1);
        } else {
            playlist.videos.push(videoId);
        }

        await playlist.save({ validateBeforeSave: false });

        res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Playlists :: Video toggled in playlist successfully"
            )
        );
    } catch (error) {
        throw new Error(
            500,
            error?.message || "Playlists :: Video already exists in playlist"
        );
    }
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    try {
        if (!isValidObjectId(playlistId)) {
            throw new ApiError(
                400,
                "Playlists :: Invalid params of playlist ID"
            );
        }

        const playlist = await Playlist.findOneAndDelete({
            $and: [{ _id: playlistId }, { owner: req.user?._id }],
        });

        if (!playlist) {
            throw new ApiError(
                404,
                "Playlists :: un-authorized user for this playlist"
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Playlists :: deleted successfully"
            )
        );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Playlists :: Internal errors"
        );
    }
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    try {
        if (!isValidObjectId(playlistId)) {
            throw new ApiError(
                401,
                "Playlists :: Invalid params of playlist ID"
            );
        }

        if (!name || !description) {
            throw new ApiError(401, "Playlists :: Invalid name or description");
        }

        const playlist = await Playlist.findOneAndUpdate(
            {
                $and: [{ _id: playlistId }, { owner: req.user?._id }],
            },
            { name, description }
        );

        if (!playlist) {
            throw new ApiError(
                404,
                "Playlists :: Un-Authorized user for this playlist"
            );
        }

        res.status(200).json(
            new ApiResponse(200, playlist, "Playlists :: Updated successfully")
        );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Playlists :: Internal errors"
        );
    }
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    deletePlaylist,
    updatePlaylist,
    toggleVideoToPlaylist
};
