# How to Build a GraphQL API with MongoDB and Apollo Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GraphQL, Apollo, Mongoose, Node

Description: Learn how to build a GraphQL API backed by MongoDB using Apollo Server 4 and Mongoose, with resolvers, mutations, and context-based auth.

---

Apollo Server 4 combined with MongoDB via Mongoose gives you a powerful GraphQL backend. This guide covers schema definition, resolvers, mutations, and passing a MongoDB-connected context to every resolver.

## Installing Dependencies

```bash
npm install @apollo/server graphql mongoose graphql-tag jsonwebtoken
```

## Defining the Mongoose Model

```javascript
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [String],
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', postSchema);
```

## Defining the GraphQL Schema

```javascript
const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Post {
    id: ID!
    title: String!
    body: String!
    authorId: ID!
    tags: [String!]!
    published: Boolean!
    createdAt: String!
  }

  type Query {
    posts(limit: Int, offset: Int): [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createPost(title: String!, body: String!, tags: [String!]): Post!
    publishPost(id: ID!): Post
    deletePost(id: ID!): Boolean!
  }
`;
```

## Writing Resolvers

```javascript
const Post = require('./models/Post');
const { ObjectId } = require('mongoose').Types;

const resolvers = {
  Query: {
    posts: async (_, { limit = 20, offset = 0 }) => {
      return Post.find({ published: true })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
    },
    post: async (_, { id }) => {
      if (!ObjectId.isValid(id)) throw new Error('Invalid ID');
      return Post.findById(id).lean();
    },
  },

  Mutation: {
    createPost: async (_, { title, body, tags = [] }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      return Post.create({ title, body, tags, authorId: userId });
    },

    publishPost: async (_, { id }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      return Post.findOneAndUpdate(
        { _id: id, authorId: userId },
        { $set: { published: true } },
        { new: true }
      );
    },

    deletePost: async (_, { id }, { userId }) => {
      const result = await Post.deleteOne({ _id: id, authorId: userId });
      return result.deletedCount === 1;
    },
  },

  Post: {
    id: (post) => post._id.toString(),
    createdAt: (post) => post.createdAt.toISOString(),
  },
};
```

## Starting Apollo Server

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const server = new ApolloServer({ typeDefs, resolvers });

await mongoose.connect(process.env.MONGODB_URI);

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userId = payload.sub;
      } catch (e) {
        // Invalid token - context userId stays null
      }
    }

    return { userId };
  },
  listen: { port: 4000 },
});

console.log(`GraphQL server running at ${url}`);
```

## Example Queries

```graphql
# Fetch recent posts
query {
  posts(limit: 10, offset: 0) {
    id
    title
    tags
    createdAt
  }
}

# Create a post (requires auth header)
mutation {
  createPost(title: "Hello World", body: "My first post", tags: ["intro"]) {
    id
    title
  }
}
```

## Summary

Apollo Server 4 with Mongoose makes it straightforward to expose MongoDB data through GraphQL. Pass authentication context to every resolver to enforce ownership rules, use `.lean()` for read queries to improve performance, and define field resolvers for computed fields like `id` and `createdAt` to handle ObjectId serialization cleanly.
