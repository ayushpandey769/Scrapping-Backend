import { User } from "../Models/userData.models.js";
import { Post } from "../Models/postData.models.js";

export async function saveUserAndPosts(username, posts, email, password) {
  const user = await User.findOneAndUpdate(
    { username },
    { username, email, password },
    { upsert: true, new: true }
  );

  for (const post of posts) {
    await Post.findOneAndUpdate(
      { urn: post.urn },
      {
        urn: post.urn,
        user: user._id,
        description: post.description,
        images: post.images ?? [],
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
      },
      { upsert: true, new: true }
    );
  }
}
