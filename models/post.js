import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
  },
  subreddit: {
    type: String,
    required: true,
  },
  numUpvotes: {
    type: Number,
    required: true,
  },
  numDownvotes: {
    type: Number,
    required: true,
  },
});

const model = mongoose.model("Post", postSchema);
export const schema = model.schema;
export default model;
