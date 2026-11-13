import mongoose from "mongoose";
import Post from "../modules/Posts.js";
import { createError } from "../errors.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DATA_URI = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;

// GET /api/post → всички публикации, най-новите първи
export const getAllPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({}).sort({ createdAt: -1 }).limit(500);
    return res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// POST /api/post  { post: { name, prompt, photo: "data:image/jpeg;base64,..." } }
export const createPost = async (req, res, next) => {
  try {
    const { name, prompt, photo } = req.body?.post || {};
    if (!name?.trim()) return next(createError(400, "Author name is required."));
    if (!prompt?.trim()) return next(createError(400, "Prompt is required."));

    const match = typeof photo === "string" ? photo.match(DATA_URI) : null;
    if (!match) return next(createError(400, "Generate an image before posting."));

    const data = Buffer.from(match[2], "base64");
    if (!data.length) return next(createError(400, "The image is empty."));
    if (data.length > MAX_IMAGE_BYTES) return next(createError(413, "The image is too large."));

    const newPost = await Post.create({
      name: name.trim(),
      prompt: prompt.trim(),
      image: { data, contentType: match[1] === "image/jpg" ? "image/jpeg" : match[1], size: data.length },
    });

    return res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    next(error);
  }
};

// GET /api/post/:id/image → самата снимка (кешира се от браузъра)
export const getPostImage = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return next(createError(400, "Invalid id."));
    const post = await Post.findById(req.params.id).select("+image.data image.contentType");
    if (!post?.image?.data) return next(createError(404, "Image not found."));

    res.set({
      "Content-Type": post.image.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return res.send(post.image.data);
  } catch (error) {
    next(error);
  }
};
