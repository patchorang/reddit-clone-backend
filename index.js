import * as dotenv from "dotenv";
dotenv.config();

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import mongoose from "mongoose";
import Post from "./models/post.js";
import User from "./models/user.js";
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
  type Post {
    title: String!
    body: String
    subreddit: String!
    numUpvotes: Int!
    numDownvotes: Int!
    id: ID!
  }

  type User {
    username: String!
    posts: [Post]
    upvotes: [Post]
    downvotes: [Post]
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    me: User
  }

  type Query {
    posts: [Post]
  }
  
  type Mutation {
    createPost(
      title: String!
      body: String
      subreddit: String!
    ): Post
  }

  type Mutation {
    downvotePost (
      id: ID!
    ): Post
  }

  type Mutation {
    upvotePost (
      id: ID!
    ): Post
  }

  type Mutation {
    createUser(
      username: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
  }
`;

const resolvers = {
  Query: {
    posts: async () => {
      return Post.find({});
    },
    me: (root, args, context) => {
      return context.currentUser;
    },
  },

  Mutation: {
    createPost: async (root, args, context) => {
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new Error("not authorized");
      }
      const post = new Post({ ...args, numUpvotes: 1, numDownvotes: 0 });
      const user = await User.findById(context.currentUser.id).populate(
        "posts"
      );
      const newPost = await post.save();
      user.posts = user.posts.concat(newPost.id);
      user.save();
      return newPost;
    },
    downvotePost: async (root, args) => {
      const post = await Post.findById(args.id);
      post.numDownvotes = post.numDownvotes + 1;
      return post.save();
    },
    upvotePost: async (root, args) => {
      const post = await Post.findById(args.id);
      post.numUpvotes = post.numUpvotes + 1;
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
        throw new UserInputError("Wrong creds");
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, "SECRET") };
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
