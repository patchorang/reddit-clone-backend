import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  body: {
    type: String,
    required: true,
  },
  parentPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  upVotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  downVotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
  },
  edited: {
    type: Boolean,
    default: false,
  },
});

commentSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const model = mongoose.model("Comment", commentSchema);
export const schema = model.schema;
export default model;
