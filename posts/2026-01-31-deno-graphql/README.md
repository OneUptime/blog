# How to Build GraphQL APIs with Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, GraphQL, API, TypeScript

Description: A comprehensive guide to building type-safe, performant GraphQL APIs using Deno with Oak framework, including schema design, resolvers, authentication, and testing.

---

GraphQL has revolutionized how we build and consume APIs by providing a flexible query language that lets clients request exactly the data they need. Combined with Deno, a modern, secure runtime for JavaScript and TypeScript, you get a powerful stack for building robust APIs. In this guide, we will walk through building a complete GraphQL API with Deno from scratch.

## Why Deno for GraphQL?

Deno brings several advantages to GraphQL development. First, it has built-in TypeScript support without any configuration. Second, it features a secure-by-default permission system. Third, it provides a modern standard library with no node_modules folder. Finally, it offers native ES modules and top-level await support.

These features make Deno an excellent choice for building GraphQL APIs where type safety and security are paramount.

## Prerequisites

Before we begin, make sure you have Deno installed on your system.

This command installs Deno on macOS or Linux:

```bash
curl -fsSL https://deno.land/install.sh | sh
```

Verify the installation by checking the version:

```bash
deno --version
```

## Project Setup

Let us create a new project directory and set up our GraphQL API structure.

Create the following directory structure for your project:

```
graphql-api/
├── deps.ts
├── main.ts
├── schema/
│   ├── typeDefs.ts
│   └── resolvers.ts
├── models/
│   └── types.ts
├── middleware/
│   └── auth.ts
├── loaders/
│   └── dataLoader.ts
└── tests/
    └── api_test.ts
```

## Understanding GraphQL Basics

GraphQL operates on three main concepts: queries for reading data, mutations for modifying data, and subscriptions for real-time updates. Unlike REST APIs where endpoints return fixed data structures, GraphQL lets clients specify exactly what fields they need.

A GraphQL API is defined by a schema that describes the types of data available and the operations that can be performed. The schema serves as a contract between the client and server.

## Setting Up Dependencies

We will use Oak as our HTTP framework and graphql-deno for GraphQL functionality.

Create a deps.ts file to centralize all external dependencies:

```typescript
// deps.ts
// Oak framework for HTTP server
export { Application, Router, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// GraphQL core library
export {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLBoolean,
  GraphQLEnumType,
} from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";

// For JWT authentication
export { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// For password hashing
export { hash, compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
```

## Defining Types

Let us define TypeScript interfaces for our data models. We will build a simple blog API with users and posts.

Create the types file with interfaces that match our GraphQL schema:

```typescript
// models/types.ts
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  text: string;
  postId: string;
  authorId: string;
  createdAt: Date;
}

// Context type for resolvers
export interface GraphQLContext {
  user: User | null;
  loaders: DataLoaders;
}

export interface DataLoaders {
  userLoader: DataLoader<string, User>;
  postLoader: DataLoader<string, Post>;
}

// Generic DataLoader interface
export interface DataLoader<K, V> {
  load(key: K): Promise<V | null>;
  loadMany(keys: K[]): Promise<(V | null)[]>;
}
```

## Creating the GraphQL Schema

The schema is the heart of your GraphQL API. It defines types, queries, mutations, and subscriptions.

Define the type definitions using GraphQL's schema definition language style with JavaScript objects:

```typescript
// schema/typeDefs.ts
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLBoolean,
  GraphQLSchema,
  GraphQLEnumType,
} from "../deps.ts";

// Enum for post status
const PostStatusEnum = new GraphQLEnumType({
  name: "PostStatus",
  values: {
    DRAFT: { value: "draft" },
    PUBLISHED: { value: "published" },
    ARCHIVED: { value: "archived" },
  },
});

// User type definition
const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: "User",
  description: "A user in the system",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: GraphQLString },
    posts: {
      type: new GraphQLList(PostType),
      description: "Posts authored by this user",
      resolve: async (parent, _args, context) => {
        return context.loaders.postLoader.loadMany(
          posts.filter((p) => p.authorId === parent.id).map((p) => p.id)
        );
      },
    },
  }),
});

// Post type definition
const PostType: GraphQLObjectType = new GraphQLObjectType({
  name: "Post",
  description: "A blog post",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    published: { type: GraphQLBoolean },
    author: {
      type: UserType,
      description: "The author of this post",
      resolve: async (parent, _args, context) => {
        return context.loaders.userLoader.load(parent.authorId);
      },
    },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  }),
});

// Comment type definition
const CommentType = new GraphQLObjectType({
  name: "Comment",
  description: "A comment on a post",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    text: { type: new GraphQLNonNull(GraphQLString) },
    author: {
      type: UserType,
      resolve: async (parent, _args, context) => {
        return context.loaders.userLoader.load(parent.authorId);
      },
    },
    post: {
      type: PostType,
      resolve: async (parent, _args, context) => {
        return context.loaders.postLoader.load(parent.postId);
      },
    },
    createdAt: { type: GraphQLString },
  }),
});

// Input types for mutations
const CreatePostInput = new GraphQLInputObjectType({
  name: "CreatePostInput",
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    published: { type: GraphQLBoolean },
  },
});

const UpdatePostInput = new GraphQLInputObjectType({
  name: "UpdatePostInput",
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
    published: { type: GraphQLBoolean },
  },
});

export { UserType, PostType, CommentType, CreatePostInput, UpdatePostInput, PostStatusEnum };
```

## Implementing Resolvers

Resolvers are functions that determine how to fetch the data for each field in your schema.

Create resolvers that handle the business logic for queries and mutations:

```typescript
// schema/resolvers.ts
import { GraphQLContext, User, Post } from "../models/types.ts";
import { hash, compare, create, verify } from "../deps.ts";

// In-memory data store (replace with database in production)
let users: User[] = [
  {
    id: "1",
    username: "john_doe",
    email: "john@example.com",
    password: "$2a$10$hashed_password_here",
    createdAt: new Date(),
  },
];

let posts: Post[] = [
  {
    id: "1",
    title: "Introduction to GraphQL",
    content: "GraphQL is a query language for APIs...",
    authorId: "1",
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// JWT secret key for authentication
const JWT_SECRET = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

// Query resolvers handle read operations
export const queryResolvers = {
  // Fetch a single user by ID
  user: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<User | null> => {
    return users.find((u) => u.id === args.id) || null;
  },

  // Fetch all users with optional pagination
  users: async (
    _parent: unknown,
    args: { limit?: number; offset?: number },
    _context: GraphQLContext
  ): Promise<User[]> => {
    const { limit = 10, offset = 0 } = args;
    return users.slice(offset, offset + limit);
  },

  // Fetch a single post by ID
  post: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Post | null> => {
    return posts.find((p) => p.id === args.id) || null;
  },

  // Fetch all published posts
  posts: async (
    _parent: unknown,
    args: { published?: boolean; limit?: number; offset?: number },
    _context: GraphQLContext
  ): Promise<Post[]> => {
    let result = posts;
    
    if (args.published !== undefined) {
      result = result.filter((p) => p.published === args.published);
    }
    
    const { limit = 10, offset = 0 } = args;
    return result.slice(offset, offset + limit);
  },

  // Get currently authenticated user
  me: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<User | null> => {
    return context.user;
  },
};

// Mutation resolvers handle write operations
export const mutationResolvers = {
  // Register a new user
  register: async (
    _parent: unknown,
    args: { username: string; email: string; password: string }
  ): Promise<{ user: User; token: string }> => {
    // Check if user already exists
    const existingUser = users.find(
      (u) => u.email === args.email || u.username === args.username
    );
    
    if (existingUser) {
      throw new Error("User with this email or username already exists");
    }

    // Hash the password before storing
    const hashedPassword = await hash(args.password);
    
    const newUser: User = {
      id: String(users.length + 1),
      username: args.username,
      email: args.email,
      password: hashedPassword,
      createdAt: new Date(),
    };
    
    users.push(newUser);

    // Generate JWT token
    const token = await create(
      { alg: "HS512", typ: "JWT" },
      { userId: newUser.id, exp: Date.now() / 1000 + 60 * 60 * 24 },
      JWT_SECRET
    );

    return { user: newUser, token };
  },

  // User login
  login: async (
    _parent: unknown,
    args: { email: string; password: string }
  ): Promise<{ user: User; token: string }> => {
    const user = users.find((u) => u.email === args.email);
    
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const validPassword = await compare(args.password, user.password);
    
    if (!validPassword) {
      throw new Error("Invalid credentials");
    }

    const token = await create(
      { alg: "HS512", typ: "JWT" },
      { userId: user.id, exp: Date.now() / 1000 + 60 * 60 * 24 },
      JWT_SECRET
    );

    return { user, token };
  },

  // Create a new post (requires authentication)
  createPost: async (
    _parent: unknown,
    args: { input: { title: string; content: string; published?: boolean } },
    context: GraphQLContext
  ): Promise<Post> => {
    if (!context.user) {
      throw new Error("Authentication required");
    }

    const newPost: Post = {
      id: String(posts.length + 1),
      title: args.input.title,
      content: args.input.content,
      authorId: context.user.id,
      published: args.input.published || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    posts.push(newPost);
    return newPost;
  },

  // Update an existing post (requires authentication and ownership)
  updatePost: async (
    _parent: unknown,
    args: { id: string; input: { title?: string; content?: string; published?: boolean } },
    context: GraphQLContext
  ): Promise<Post> => {
    if (!context.user) {
      throw new Error("Authentication required");
    }

    const postIndex = posts.findIndex((p) => p.id === args.id);
    
    if (postIndex === -1) {
      throw new Error("Post not found");
    }

    const post = posts[postIndex];
    
    if (post.authorId !== context.user.id) {
      throw new Error("You can only update your own posts");
    }

    const updatedPost: Post = {
      ...post,
      ...args.input,
      updatedAt: new Date(),
    };
    
    posts[postIndex] = updatedPost;
    return updatedPost;
  },

  // Delete a post (requires authentication and ownership)
  deletePost: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<boolean> => {
    if (!context.user) {
      throw new Error("Authentication required");
    }

    const postIndex = posts.findIndex((p) => p.id === args.id);
    
    if (postIndex === -1) {
      throw new Error("Post not found");
    }

    if (posts[postIndex].authorId !== context.user.id) {
      throw new Error("You can only delete your own posts");
    }

    posts.splice(postIndex, 1);
    return true;
  },
};

export { users, posts, JWT_SECRET };
```

## Implementing the DataLoader Pattern

The DataLoader pattern prevents the N+1 query problem by batching and caching database requests.

Create a DataLoader implementation for efficient data fetching:

```typescript
// loaders/dataLoader.ts
import { User, Post, DataLoader } from "../models/types.ts";
import { users, posts } from "../schema/resolvers.ts";

// Generic DataLoader factory function
function createDataLoader<K extends string, V extends { id: K }>(
  batchFn: (keys: K[]) => Promise<Map<K, V>>
): DataLoader<K, V> {
  const cache = new Map<K, Promise<V | null>>();
  const batch: K[] = [];
  let batchScheduled = false;

  const executeBatch = async () => {
    const currentBatch = [...batch];
    batch.length = 0;
    batchScheduled = false;

    const results = await batchFn(currentBatch);
    
    for (const key of currentBatch) {
      const value = results.get(key) || null;
      cache.set(key, Promise.resolve(value));
    }
  };

  const scheduleBatch = () => {
    if (!batchScheduled) {
      batchScheduled = true;
      queueMicrotask(executeBatch);
    }
  };

  return {
    load: (key: K): Promise<V | null> => {
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const promise = new Promise<V | null>((resolve) => {
        batch.push(key);
        scheduleBatch();
        
        queueMicrotask(() => {
          cache.get(key)?.then(resolve);
        });
      });

      cache.set(key, promise);
      return promise;
    },

    loadMany: async (keys: K[]): Promise<(V | null)[]> => {
      return Promise.all(keys.map((key) => {
        if (cache.has(key)) {
          return cache.get(key)!;
        }
        batch.push(key);
        scheduleBatch();
        return cache.get(key) || Promise.resolve(null);
      }));
    },
  };
}

// Create user loader that batches user fetches
export function createUserLoader(): DataLoader<string, User> {
  return createDataLoader(async (ids: string[]) => {
    console.log(`Batch loading users: ${ids.join(", ")}`);
    const result = new Map<string, User>();
    
    for (const id of ids) {
      const user = users.find((u) => u.id === id);
      if (user) {
        result.set(id, user);
      }
    }
    
    return result;
  });
}

// Create post loader that batches post fetches
export function createPostLoader(): DataLoader<string, Post> {
  return createDataLoader(async (ids: string[]) => {
    console.log(`Batch loading posts: ${ids.join(", ")}`);
    const result = new Map<string, Post>();
    
    for (const id of ids) {
      const post = posts.find((p) => p.id === id);
      if (post) {
        result.set(id, post);
      }
    }
    
    return result;
  });
}
```

## Authentication Middleware

Secure your GraphQL API by implementing JWT-based authentication middleware.

Create middleware that extracts and validates JWT tokens from requests:

```typescript
// middleware/auth.ts
import { Context, verify } from "../deps.ts";
import { User } from "../models/types.ts";
import { users, JWT_SECRET } from "../schema/resolvers.ts";

// Extract user from JWT token in Authorization header
export async function extractUser(ctx: Context): Promise<User | null> {
  const authHeader = ctx.request.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = await verify(token, JWT_SECRET);
    const userId = payload.userId as string;
    
    return users.find((u) => u.id === userId) || null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

// Middleware to add authentication context
export async function authMiddleware(
  ctx: Context,
  next: () => Promise<unknown>
): Promise<void> {
  const user = await extractUser(ctx);
  ctx.state.user = user;
  await next();
}

// Helper to require authentication in resolvers
export function requireAuth(user: User | null): asserts user is User {
  if (!user) {
    throw new Error("Authentication required. Please provide a valid token.");
  }
}

// Helper to check resource ownership
export function requireOwnership(
  user: User,
  resourceOwnerId: string,
  resourceType: string
): void {
  if (user.id !== resourceOwnerId) {
    throw new Error(`You do not have permission to modify this ${resourceType}`);
  }
}
```

## Implementing Subscriptions

GraphQL subscriptions enable real-time updates using WebSockets.

Create a subscription handler for real-time post updates:

```typescript
// schema/subscriptions.ts
import { Post } from "../models/types.ts";

// Simple pub/sub implementation for subscriptions
class PubSub {
  private subscribers: Map<string, Set<(data: unknown) => void>> = new Map();

  subscribe<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    
    this.subscribers.get(event)!.add(callback as (data: unknown) => void);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(callback as (data: unknown) => void);
    };
  }

  publish<T>(event: string, data: T): void {
    const callbacks = this.subscribers.get(event);
    
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }
}

export const pubsub = new PubSub();

// Subscription events
export const EVENTS = {
  POST_CREATED: "POST_CREATED",
  POST_UPDATED: "POST_UPDATED",
  POST_DELETED: "POST_DELETED",
};

// Subscription resolvers
export const subscriptionResolvers = {
  postCreated: {
    subscribe: () => {
      const asyncIterator = {
        [Symbol.asyncIterator]() {
          return this;
        },
        next(): Promise<{ value: { postCreated: Post }; done: boolean }> {
          return new Promise((resolve) => {
            const unsubscribe = pubsub.subscribe<Post>(
              EVENTS.POST_CREATED,
              (post) => {
                unsubscribe();
                resolve({ value: { postCreated: post }, done: false });
              }
            );
          });
        },
      };
      return asyncIterator;
    },
  },

  postUpdated: {
    subscribe: (_parent: unknown, args: { postId?: string }) => {
      const asyncIterator = {
        [Symbol.asyncIterator]() {
          return this;
        },
        next(): Promise<{ value: { postUpdated: Post }; done: boolean }> {
          return new Promise((resolve) => {
            const unsubscribe = pubsub.subscribe<Post>(
              EVENTS.POST_UPDATED,
              (post) => {
                if (!args.postId || post.id === args.postId) {
                  unsubscribe();
                  resolve({ value: { postUpdated: post }, done: false });
                }
              }
            );
          });
        },
      };
      return asyncIterator;
    },
  },
};

// Helper to publish events when posts are modified
export function publishPostCreated(post: Post): void {
  pubsub.publish(EVENTS.POST_CREATED, post);
}

export function publishPostUpdated(post: Post): void {
  pubsub.publish(EVENTS.POST_UPDATED, post);
}
```

## Error Handling

Proper error handling is crucial for a production GraphQL API.

Create custom error classes and error formatting utilities:

```typescript
// utils/errors.ts

// Base GraphQL error with extensions
export class GraphQLError extends Error {
  extensions: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    extensions: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "GraphQLError";
    this.extensions = { code, ...extensions };
  }
}

// Authentication error
export class AuthenticationError extends GraphQLError {
  constructor(message = "You must be logged in to perform this action") {
    super(message, "UNAUTHENTICATED");
  }
}

// Authorization error
export class ForbiddenError extends GraphQLError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN");
  }
}

// Validation error with field details
export class ValidationError extends GraphQLError {
  constructor(message: string, field: string) {
    super(message, "VALIDATION_ERROR", { field });
  }
}

// Not found error
export class NotFoundError extends GraphQLError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, "NOT_FOUND", { resource, id });
  }
}

// Format errors for GraphQL response
export function formatError(error: Error): {
  message: string;
  extensions?: Record<string, unknown>;
} {
  if (error instanceof GraphQLError) {
    return {
      message: error.message,
      extensions: error.extensions,
    };
  }

  // Log unexpected errors but hide details from client
  console.error("Unexpected error:", error);
  
  return {
    message: "An unexpected error occurred",
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  };
}
```

## Building the Complete Schema

Now let us assemble all the pieces into a complete GraphQL schema.

Create the main schema file that combines types, queries, and mutations:

```typescript
// schema/index.ts
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLBoolean,
} from "../deps.ts";
import { UserType, PostType, CreatePostInput, UpdatePostInput } from "./typeDefs.ts";
import { queryResolvers, mutationResolvers } from "./resolvers.ts";

// Define the root query type
const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    user: {
      type: UserType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: queryResolvers.user,
    },
    users: {
      type: new GraphQLList(UserType),
      args: {
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: queryResolvers.users,
    },
    post: {
      type: PostType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: queryResolvers.post,
    },
    posts: {
      type: new GraphQLList(PostType),
      args: {
        published: { type: GraphQLBoolean },
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: queryResolvers.posts,
    },
    me: {
      type: UserType,
      resolve: queryResolvers.me,
    },
  },
});

// Define authentication response type
const AuthPayloadType = new GraphQLObjectType({
  name: "AuthPayload",
  fields: {
    user: { type: UserType },
    token: { type: new GraphQLNonNull(GraphQLString) },
  },
});

// Define the root mutation type
const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    register: {
      type: AuthPayloadType,
      args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: mutationResolvers.register,
    },
    login: {
      type: AuthPayloadType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: mutationResolvers.login,
    },
    createPost: {
      type: PostType,
      args: { input: { type: new GraphQLNonNull(CreatePostInput) } },
      resolve: mutationResolvers.createPost,
    },
    updatePost: {
      type: PostType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: { type: new GraphQLNonNull(UpdatePostInput) },
      },
      resolve: mutationResolvers.updatePost,
    },
    deletePost: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: mutationResolvers.deletePost,
    },
  },
});

// Create and export the complete schema
export const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
});
```

## Main Application Entry Point

Finally, let us create the main application file that ties everything together.

Create the main server file with the Oak framework and GraphQL endpoint:

```typescript
// main.ts
import { Application, Router, graphql } from "./deps.ts";
import { schema } from "./schema/index.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { createUserLoader, createPostLoader } from "./loaders/dataLoader.ts";
import { GraphQLContext } from "./models/types.ts";
import { formatError } from "./utils/errors.ts";

const app = new Application();
const router = new Router();

// Apply authentication middleware
app.use(authMiddleware);

// GraphQL endpoint
router.post("/graphql", async (ctx) => {
  const body = await ctx.request.body().value;
  const { query, variables, operationName } = body;

  // Create fresh data loaders for each request
  const loaders = {
    userLoader: createUserLoader(),
    postLoader: createPostLoader(),
  };

  // Build context with authenticated user and loaders
  const context: GraphQLContext = {
    user: ctx.state.user || null,
    loaders,
  };

  try {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: context,
    });

    // Format any errors
    if (result.errors) {
      result.errors = result.errors.map((error) => formatError(error));
    }

    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { errors: [formatError(error)] };
  }
});

// GraphQL Playground or GraphiQL for development
router.get("/graphql", (ctx) => {
  ctx.response.headers.set("Content-Type", "text/html");
  ctx.response.body = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>GraphQL Playground</title>
      <link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" />
    </head>
    <body style="margin: 0;">
      <div id="graphiql" style="height: 100vh;"></div>
      <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
      <script>
        const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
        ReactDOM.render(
          React.createElement(GraphiQL, { fetcher }),
          document.getElementById('graphiql')
        );
      </script>
    </body>
    </html>
  `;
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
const PORT = parseInt(Deno.env.get("PORT") || "8000");
console.log(`GraphQL server running on http://localhost:${PORT}/graphql`);

await app.listen({ port: PORT });
```

## Testing Your GraphQL API

Testing is essential for maintaining a reliable API. Deno provides built-in testing capabilities.

Create integration tests for your GraphQL API:

```typescript
// tests/api_test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { graphql } from "../deps.ts";
import { schema } from "../schema/index.ts";
import { createUserLoader, createPostLoader } from "../loaders/dataLoader.ts";

// Helper to execute GraphQL queries in tests
async function executeQuery(
  query: string,
  variables?: Record<string, unknown>,
  user?: { id: string } | null
) {
  const context = {
    user,
    loaders: {
      userLoader: createUserLoader(),
      postLoader: createPostLoader(),
    },
  };

  return graphql({
    schema,
    source: query,
    variableValues: variables,
    contextValue: context,
  });
}

Deno.test("Query: users returns list of users", async () => {
  const query = `
    query {
      users {
        id
        username
        email
      }
    }
  `;

  const result = await executeQuery(query);
  
  assertExists(result.data);
  assertEquals(Array.isArray(result.data.users), true);
});

Deno.test("Query: post returns single post by id", async () => {
  const query = `
    query GetPost($id: ID!) {
      post(id: $id) {
        id
        title
        content
        published
      }
    }
  `;

  const result = await executeQuery(query, { id: "1" });
  
  assertExists(result.data);
  assertExists(result.data.post);
  assertEquals(result.data.post.id, "1");
});

Deno.test("Mutation: createPost requires authentication", async () => {
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        title
      }
    }
  `;

  const result = await executeQuery(mutation, {
    input: { title: "Test Post", content: "Test content" },
  });

  assertExists(result.errors);
  assertEquals(result.errors[0].message, "Authentication required");
});

Deno.test("Mutation: createPost succeeds with authentication", async () => {
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        title
        content
      }
    }
  `;

  const result = await executeQuery(
    mutation,
    { input: { title: "New Post", content: "New content" } },
    { id: "1" }
  );

  assertExists(result.data);
  assertExists(result.data.createPost);
  assertEquals(result.data.createPost.title, "New Post");
});

Deno.test("Query: me returns null when not authenticated", async () => {
  const query = `
    query {
      me {
        id
        username
      }
    }
  `;

  const result = await executeQuery(query);
  
  assertExists(result.data);
  assertEquals(result.data.me, null);
});
```

Run the tests with the following command:

```bash
deno test --allow-all tests/
```

## Best Practices Summary

When building GraphQL APIs with Deno, follow these proven practices to ensure your API is maintainable, secure, and performant.

**Schema Design**: Keep your schema focused and avoid deeply nested types. Use input types for mutations to group related arguments. Define clear, consistent naming conventions across your schema.

**Performance**: Always implement the DataLoader pattern to prevent N+1 queries. Use pagination for list queries to avoid returning excessive data. Consider implementing query complexity analysis to prevent expensive queries.

**Security**: Never expose sensitive data like passwords in your schema. Validate all inputs thoroughly before processing. Implement rate limiting to prevent abuse. Use HTTPS in production environments.

**Error Handling**: Create custom error types with meaningful codes and messages. Log errors server-side while returning safe messages to clients. Include field-level validation errors to help clients fix issues.

**Testing**: Write tests for all resolvers, especially mutations. Test authentication and authorization logic thoroughly. Use integration tests to verify the complete request flow.

**Type Safety**: Leverage TypeScript interfaces that mirror your GraphQL types. Use strict typing in resolvers to catch errors at compile time. Generate types from your schema when possible.

**Code Organization**: Separate concerns into distinct modules for schema, resolvers, middleware, and utilities. Keep resolvers thin by delegating business logic to service layers. Use dependency injection for better testability.

## Conclusion

Building GraphQL APIs with Deno provides an excellent developer experience thanks to TypeScript support, modern module system, and security features. Throughout this guide, we covered the essential components of a production-ready GraphQL API: schema definition with types and input objects, resolver implementation for queries and mutations, authentication using JWT tokens, the DataLoader pattern for efficient data fetching, real-time subscriptions, comprehensive error handling, and testing strategies.

The combination of GraphQL's flexible query language and Deno's secure runtime creates a powerful foundation for building APIs that can scale with your application's needs. Start with the patterns shown here, adapt them to your specific requirements, and continue exploring advanced features like field-level permissions, query caching, and schema stitching as your API grows.

Remember that GraphQL is not just about technology but also about providing a better developer experience for API consumers. Focus on creating intuitive, well-documented schemas that make it easy for clients to discover and use your API effectively.
