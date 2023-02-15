import * as dotenv from "dotenv";
dotenv.config();

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import mongoose from "mongoose";
import Post from "./models/post.js";
import User from "./models/user.js";
import Comment from "./models/comment.js";
import Subreddit from "./models/subreddit.js";
import jwt from "jsonwebtoken";

const MONGODB_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connecting to MongoDB", error.message);
  });

const typeDefs = `#graphql

  type Subreddit {
    id: ID!,
    name: String!,
    description: String
  }

  type Post {
    title: String!
    body: String
    subreddit: String!
    upVotedBy: [ID]
    downVotedBy: [ID]
    id: ID!
    comments: [Comment]
  }

  type User {
    username: String!
    posts: [Post]
    subreddits: [Subreddit]
    id: ID!
  }

  type Token {
    value: String!
  }

  type Comment {
    body: String!
    parentPost: ID!
    upVotedBy: [ID]
    downVotedBy: [ID]
    parentComment: ID
    id: ID!
    edited: Boolean
  }

  type Query {
    me: User
    user(userId: ID): User
    posts(subreddit: String): [Post]
    post(id: ID!): Post
    subreddit(name: String): Subreddit
  }

  # Post mutations
  type Mutation {
    createPost(
      title: String!
      body: String
      subreddit: String!
    ): Post
    downvotePost (
      id: ID!
    ): Post
    upvotePost (
      id: ID!
    ): Post
  }

  # Comment mutations
  type Mutation {
    createComment(
      body: String
      parentPost: ID!
      parentComment: ID
    ): Comment
    editComment(
      body: String!
      id: ID!
    ): Comment
    # downvoteComment (
    #   id: ID!
    # ): Comment
    # upvoteComment (
    #   id: ID!
    # ): Comment
  }

  # User mutations
  type Mutation {
    createUser(
      username: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
    joinSubreddit(name: String!): User
    leaveSubreddit(name: String!): User
  }
`;

const resolvers = {
  Query: {
    posts: async (root, args) => {
      if (args.subreddit && args.subreddit !== "all") {
        return Post.find({ subreddit: args.subreddit });
      }
      return Post.find({});
    },
    post: async (root, args) => {
      return Post.findById(args.id);
    },
    me: (root, args, context) => {
      return context.currentUser;
    },
    user: async (root, args) => {
      if (args.userId) {
        return User.findById(args.userId);
      }
      return null;
    },
    subreddit: async (root, args) => {
      if (args.name) {
        return Subreddit.findOne({ name: args.name });
      }
      return null;
    },
  },

  Post: {
    comments: async (root) => {
      const comments = await Comment.find({ parentPost: root.id });
      return comments;
    },
  },

  User: {
    subreddits: async (root) => {
      const user = await User.findById(root.id)
        .select("subreddits")
        .populate("subreddits");
      return user.subreddits;
    },
    posts: async (root) => {
      const user = await User.findById(root.id)
        .select("posts")
        .populate("posts");
      return user.posts;
    },
  },

  Mutation: {
    createComment: async (root, args, context) => {
      // const currentUser = context.currentUser;
      // if (!currentUser) {
      //   throw new Error("not authorized");
      // }

      const comment = new Comment({
        ...args,
        upVotedBy: [], // add currentUser.id back in
        upVotedBy: [],
      });
      // const user = await User.findById(currentUser.id).populate("comments");
      const newComment = await comment.save();
      // user.comments = user.comments.concat(newComment.id);
      // user.save();
      return newComment;
    },
    editComment: async (root, args) => {
      let commentToEdit = await Comment.findById(args.id);
      if (!commentToEdit) {
        throw new Error("Comment not found");
      }
      commentToEdit.body = args.body;
      commentToEdit.edited = true;
      return commentToEdit.save();
    },
    createPost: async (root, args, context) => {
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new Error("not authorized");
      }
      const post = new Post({
        ...args,
        upVotedBy: [currentUser.id],
        upVotedBy: [],
      });
      const user = await User.findById(currentUser.id).populate("posts");
      const newPost = await post.save();
      user.posts = user.posts.concat(newPost.id);
      user.save();
      return newPost;
    },
    downvotePost: async (root, args, context) => {
      const currentUserId = context.currentUser.id;
      const post = await Post.findById(args.id);
      const alreadyDownVoted = post.downVotedBy.find(
        (p) => p.toString() === currentUserId
      );

      // if already up downvoted, remove the downvote and continue
      if (alreadyDownVoted) {
        post.downVotedBy = post.downVotedBy.filter((p) => {
          return p.toString() !== currentUserId;
        });
        return post.save();
      }

      // if not already downvoted, add the downvote and remove any upvote
      post.downVotedBy = post.downVotedBy.concat(currentUserId);

      //remove downvote by this user
      post.upVotedBy = post.upVotedBy.filter((p) => {
        return p.toString() !== currentUserId;
      });
      return post.save();
    },
    upvotePost: async (root, args, context) => {
      const currentUserId = context.currentUser.id;
      const post = await Post.findById(args.id);
      const alreadyUpvoted = post.upVotedBy.find(
        (p) => p.toString() === currentUserId
      );

      // if already up voted, remove the upvote and continue
      if (alreadyUpvoted) {
        post.upVotedBy = post.upVotedBy.filter((p) => {
          return p.toString() !== currentUserId;
        });
        return post.save();
      }

      // if not already upvoted, add the upvote and remove any downvote
      post.upVotedBy = post.upVotedBy.concat(currentUserId);

      //remove downvote by this user
      post.downVotedBy = post.downVotedBy.filter((p) => {
        return p.toString() !== currentUserId;
      });

      return post.save();
    },
    createUser: async (root, args) => {
      const user = new User({ username: args.username });
      return user.save().catch((error) => {
        throw new UserInputError(error.message, { invalidArgs: args });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== "secret") {
        throw new Error("Wrong creds");
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, "SECRET") };
    },
    joinSubreddit: async (root, args, context) => {
      const currentUserId = context.currentUser.id;
      const subreddit = await Subreddit.findOne({ name: args.name });
      const user = await User.findById(currentUserId);
      if (user.subreddits.indexOf(subreddit.id.toString())) {
        user.subreddits = user.subreddits.concat(subreddit.id.toString());
      }
      return user.save();
    },
    leaveSubreddit: async (root, args, context) => {
      const currentUserId = context.currentUser.id;
      const subreddit = await Subreddit.findOne({ name: args.name });
      const user = await User.findById(currentUserId);
      user.subreddits = user.subreddits.filter(
        (s) => s.toString() !== subreddit.id
      );
      return user.save();
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      const decodedToken = jwt.verify(auth.substring(7), "SECRET");
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  },
  listen: { port: 4000 },
});

console.log(`🚀 Server listening at: ${url}`);
