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
  upVotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  downVotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

postSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const model = mongoose.model("Post", postSchema);
export const schema = model.schema;
export default model;
