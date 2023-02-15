import mongoose from "mongoose";

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  subreddits: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subreddit" }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  // comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
});

export default mongoose.model("User", schema);
