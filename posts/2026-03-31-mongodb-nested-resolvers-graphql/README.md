# How to Handle Nested Resolvers with MongoDB in GraphQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GraphQL, Resolver, Apollo, DataLoader

Description: Learn how to structure nested GraphQL resolvers that efficiently fetch related MongoDB documents across multiple levels of nesting without N+1 queries.

---

Nested resolvers let GraphQL clients traverse relationships by requesting fields like `post.author.posts`. Each nested field triggers its own resolver, so efficient MongoDB access requires careful design. This guide covers patterns for two-level and three-level nesting with DataLoader.

## Schema with Multiple Nesting Levels

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts(limit: Int): [Post!]!
}

type Post {
  id: ID!
  title: String!
  body: String!
  author: User!
  comments(limit: Int): [Comment!]!
  tagList: [Tag!]!
}

type Comment {
  id: ID!
  body: String!
  author: User!
  post: Post!
}

type Tag {
  id: ID!
  name: String!
}

type Query {
  user(id: ID!): User
  post(id: ID!): Post
}
```

## Mongoose Models

```javascript
const postSchema = new mongoose.Schema({
  title: String,
  body: String,
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
  body: String,
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
```

## Setting Up DataLoaders for All Relationships

```javascript
const DataLoader = require('dataloader');

function createLoaders() {
  return {
    user: new DataLoader(async (ids) => {
      const users = await User.find({ _id: { $in: ids } }).lean();
      const map = new Map(users.map((u) => [u._id.toString(), u]));
      return ids.map((id) => map.get(id.toString()) || null);
    }),

    post: new DataLoader(async (ids) => {
      const posts = await Post.find({ _id: { $in: ids } }).lean();
      const map = new Map(posts.map((p) => [p._id.toString(), p]));
      return ids.map((id) => map.get(id.toString()) || null);
    }),

    postsByAuthor: new DataLoader(async (authorIds) => {
      const posts = await Post.find({ authorId: { $in: authorIds } }).lean();
      const map = new Map();
      for (const post of posts) {
        const key = post.authorId.toString();
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(post);
      }
      return authorIds.map((id) => map.get(id.toString()) || []);
    }),

    commentsByPost: new DataLoader(async (postIds) => {
      const comments = await Comment.find({ postId: { $in: postIds } }).lean();
      const map = new Map();
      for (const comment of comments) {
        const key = comment.postId.toString();
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(comment);
      }
      return postIds.map((id) => map.get(id.toString()) || []);
    }),

    tagsByIds: new DataLoader(async (tagIdArrays) => {
      const allIds = [...new Set(tagIdArrays.flat().map(String))];
      const tags = await Tag.find({ _id: { $in: allIds } }).lean();
      const tagMap = new Map(tags.map((t) => [t._id.toString(), t]));
      return tagIdArrays.map((ids) => ids.map((id) => tagMap.get(id.toString())).filter(Boolean));
    }),
  };
}
```

## Resolver Map

```javascript
const resolvers = {
  Query: {
    user: (_, { id }) => User.findById(id).lean(),
    post: (_, { id }) => Post.findById(id).lean(),
  },

  User: {
    id: (u) => u._id.toString(),
    posts: (user, { limit = 10 }, { loaders }) =>
      loaders.postsByAuthor.load(user._id.toString()).then((posts) => posts.slice(0, limit)),
  },

  Post: {
    id: (p) => p._id.toString(),
    author: (post, _, { loaders }) => loaders.user.load(post.authorId.toString()),
    comments: (post, { limit = 20 }, { loaders }) =>
      loaders.commentsByPost.load(post._id.toString()).then((c) => c.slice(0, limit)),
    tagList: (post, _, { loaders }) => loaders.tagsByIds.load(post.tagIds),
  },

  Comment: {
    id: (c) => c._id.toString(),
    author: (comment, _, { loaders }) => loaders.user.load(comment.authorId.toString()),
    post: (comment, _, { loaders }) =>
      loaders.post.load(comment.postId.toString()),
  },
};
```

## Passing Loaders via Context

```javascript
await startStandaloneServer(server, {
  context: async () => ({
    loaders: createLoaders(),
  }),
});
```

## Guarding Against Deep Nesting Abuse

Prevent clients from requesting arbitrarily deep queries:

```javascript
const depthLimit = require('graphql-depth-limit');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5)],
});
```

## Summary

Nested resolvers in GraphQL work best when every relationship is resolved through a DataLoader. Create all loaders at the start of each request and pass them via context. Use `postsByAuthor` and `commentsByPost` loaders that batch by parent ID to handle one-to-many relationships efficiently, and always cap nesting depth to prevent expensive runaway queries.
