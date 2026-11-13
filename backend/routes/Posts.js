import express from "express";
import { getAllPosts, createPost, getPostImage } from "../controllers/Posts.js";

const router = express.Router();

router.get("/", getAllPosts);
router.post("/", createPost);
router.get("/:id/image", getPostImage);

export default router;
