import { Router } from "express";
import { User } from "../Models/userData.models.js";
import { Post } from "../Models/postData.models.js";
import { userScrapper } from "../Controllers/userScrapper.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";

import { submitVerification } from "../Controllers/verificationController.js";

const router = Router();

router.post("/scrape", userScrapper);
router.post("/submit-verification", submitVerification);

router.get("/posts/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });

    if (!user) {
      throw new apiError(404, "User not found in database");
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "username")
      .sort({ createdAt: -1 });

    return res.status(200).json(
      new apiResponse(
        200,
        {
          username: user.username,
          postCount: posts.length,
          posts: posts,
        },
        "Posts fetched successfully"
      )
    );
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error";

    return res.status(statusCode).json(
      new apiError(statusCode, message, error.errors || [])
    );
  }
});

export default router;
