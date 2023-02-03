import mongoose from "mongoose";

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
});

export default mongoose.model("User", schema);
