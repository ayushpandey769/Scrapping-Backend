import { User } from "../Models/userData.models.js";
import { Post } from "../Models/postData.models.js";
import { scrapeUserPosts } from "../utils/scrapeUserPosts.js";
import { saveUserAndPosts } from "../utils/saveUserAndPosts.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { VerificationError } from "../utils/browserStore.js";

export const userScrapper = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new apiError(
        400,
        "email and password are required in request body"
      );
    }

    // Check if user with this email already exists in database
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const postsCount = await Post.countDocuments({
        user: existingUser._id,
      });

      console.log(`✅ User with email ${email} already exists in database`);

      return res.status(200).json(
        new apiResponse(
          200,
          {
            username: existingUser.username,
            email: existingUser.email,
            postsScraped: postsCount,
            fromCache: true,
          },
          "User already exists, fetched from database"
        )
      );
    }

    console.log(`🚀 Starting scrape for logged-in user...`);

    // Scrape the logged-in user's posts (profileUrl will be auto-detected)
    const result = await scrapeUserPosts(
      email,
      password
      // Using default parameters: scrolls=50, maxPosts=Infinity
    );

    const username = result.username;

    // Check if user already exists in database by username (edge case)
    const existingUserByUsername = await User.findOne({ username });

    if (existingUserByUsername) {
      const postsCount = await Post.countDocuments({
        user: existingUserByUsername._id,
      });

      console.log(`✅ User ${username} already exists in database`);

      return res.status(200).json(
        new apiResponse(
          200,
          {
            username,
            email: existingUserByUsername.email,
            postsScraped: postsCount,
            fromCache: true,
          },
          "User already exists, fetched from database"
        )
      );
    }

    console.log(`💾 Saving ${result.posts.length} posts to database...`);

    await saveUserAndPosts(result.username, result.posts, email, password);

    console.log(`✅ Successfully saved data for ${result.username}`);

    return res.status(200).json(
      new apiResponse(
        200,
        {
          username: result.username,
          email: email,
          postsScraped: result.posts.length,
          fromCache: false,
        },
        "User scraped and saved successfully"
      )
    );
  } catch (err) {
    console.error("❌ Scraping error:", err?.message || err);

    // Handle Verification Required
    if (err instanceof VerificationError) {
      return res.status(202).json(
        new apiResponse(
          202,
          {
            email: req.body.email,
            verificationRequired: true,
            message: "LinkedIn requires email verification code"
          },
          "Verification PIN code required"
        )
      );
    }

    // Check if it's a login-related error
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";

    // If error message contains login/authentication keywords, use 401 status
    if (
      message.toLowerCase().includes("login failed") ||
      message.toLowerCase().includes("incorrect email or password") ||
      message.toLowerCase().includes("authentication") ||
      message.toLowerCase().includes("credentials")
    ) {
      statusCode = 401;
    }

    return res.status(statusCode).json(
      new apiError(
        statusCode,
        message,
        err.errors || []
      )
    );
  }
};
