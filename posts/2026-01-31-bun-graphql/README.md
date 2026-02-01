# How to Build GraphQL APIs with Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, GraphQL, API, TypeScript

Description: Learn how to build fast, type-safe GraphQL APIs using Bun runtime with schemas, resolvers, subscriptions, authentication, and DataLoader patterns.

---

GraphQL has revolutionized how we build APIs by giving clients the power to request exactly the data they need. Combined with Bun, the incredibly fast JavaScript runtime, you can create high-performance GraphQL APIs that handle thousands of requests with minimal latency. This guide walks you through building a production-ready GraphQL API from scratch using Bun.

## Why Bun for GraphQL?

Bun offers several advantages for building GraphQL APIs:

- **Speed**: Bun starts up to 4x faster than Node.js and handles HTTP requests with lower latency
- **Built-in TypeScript support**: No need for transpilation steps
- **Native package management**: Install dependencies faster with Bun's built-in package manager
- **Web-standard APIs**: Bun implements fetch, WebSocket, and other web APIs natively
- **Hot reloading**: Built-in watch mode for development

## Setting Up Your Project

Start by creating a new directory and initializing your Bun project.

```bash
mkdir bun-graphql-api
cd bun-graphql-api
bun init -y
```

Install the required dependencies for your GraphQL server.

```bash
bun add graphql graphql-yoga @graphql-tools/schema dataloader
```

The `graphql-yoga` package provides a batteries-included GraphQL server that works seamlessly with Bun. It handles parsing, validation, and execution of GraphQL operations out of the box.

## Creating Your First GraphQL Server

Let's start with a basic GraphQL server setup. Create the main entry file that will bootstrap your API.

```typescript
// src/index.ts
import { createServer } from "http";
import { createYoga } from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";

// Build the executable schema from type definitions and resolvers
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Create the Yoga GraphQL server instance
const yoga = createYoga({
  schema,
  graphiql: true, // Enable GraphiQL playground in development
});

// Create HTTP server and start listening
const server = Bun.serve({
  port: 4000,
  fetch: yoga,
});

console.log(`GraphQL API running at http://localhost:${server.port}/graphql`);
```

## Defining Your GraphQL Schema

The schema is the contract between your API and its clients. It defines the types, queries, mutations, and subscriptions available. Create a schema file with your type definitions.

```typescript
// src/schema.ts
export const typeDefs = /* GraphQL */ `
  # Custom scalar for handling dates
  scalar DateTime

  # User type represents a registered user in the system
  type User {
    id: ID!
    email: String!
    username: String!
    createdAt: DateTime!
    posts: [Post!]!
  }

  # Post type represents a blog post created by a user
  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
    comments: [Comment!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Comment type for user comments on posts
  type Comment {
    id: ID!
    text: String!
    author: User!
    post: Post!
    createdAt: DateTime!
  }

  # Input type for creating new posts
  input CreatePostInput {
    title: String!
    content: String!
    published: Boolean = false
  }

  # Input type for updating existing posts
  input UpdatePostInput {
    title: String
    content: String
    published: Boolean
  }

  # Authentication payload returned after login
  type AuthPayload {
    token: String!
    user: User!
  }

  # Query type defines all read operations
  type Query {
    me: User
    user(id: ID!): User
    users: [User!]!
    post(id: ID!): Post
    posts(published: Boolean): [Post!]!
  }

  # Mutation type defines all write operations
  type Mutation {
    signup(email: String!, username: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
    addComment(postId: ID!, text: String!): Comment!
  }

  # Subscription type for real-time updates
  type Subscription {
    postCreated: Post!
    commentAdded(postId: ID!): Comment!
  }
`;
```

## Building Resolvers

Resolvers are functions that handle the actual data fetching and manipulation for each field in your schema. Create a resolvers file that implements the logic for your API.

```typescript
// src/resolvers.ts
import { GraphQLError } from "graphql";
import { pubsub, POST_CREATED, COMMENT_ADDED } from "./pubsub";
import { db } from "./database";
import { hashPassword, verifyPassword, generateToken } from "./auth";

export const resolvers = {
  // Query resolvers handle read operations
  Query: {
    // Return the currently authenticated user
    me: (_: unknown, __: unknown, context: Context) => {
      if (!context.userId) {
        return null;
      }
      return db.users.findById(context.userId);
    },

    // Find a user by their ID
    user: (_: unknown, args: { id: string }) => {
      return db.users.findById(args.id);
    },

    // Return all users
    users: () => {
      return db.users.findAll();
    },

    // Find a post by ID
    post: (_: unknown, args: { id: string }) => {
      return db.posts.findById(args.id);
    },

    // Return posts with optional published filter
    posts: (_: unknown, args: { published?: boolean }) => {
      if (args.published !== undefined) {
        return db.posts.findByPublished(args.published);
      }
      return db.posts.findAll();
    },
  },

  // Mutation resolvers handle write operations
  Mutation: {
    // Register a new user account
    signup: async (
      _: unknown,
      args: { email: string; username: string; password: string }
    ) => {
      // Check if user already exists
      const existingUser = await db.users.findByEmail(args.email);
      if (existingUser) {
        throw new GraphQLError("Email already registered", {
          extensions: { code: "USER_EXISTS" },
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(args.password);
      const user = await db.users.create({
        email: args.email,
        username: args.username,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = generateToken(user.id);

      return { token, user };
    },

    // Authenticate an existing user
    login: async (_: unknown, args: { email: string; password: string }) => {
      const user = await db.users.findByEmail(args.email);
      if (!user) {
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "INVALID_CREDENTIALS" },
        });
      }

      const validPassword = await verifyPassword(args.password, user.password);
      if (!validPassword) {
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "INVALID_CREDENTIALS" },
        });
      }

      const token = generateToken(user.id);
      return { token, user };
    },

    // Create a new post
    createPost: async (
      _: unknown,
      args: { input: CreatePostInput },
      context: Context
    ) => {
      requireAuth(context);

      const post = await db.posts.create({
        ...args.input,
        authorId: context.userId,
      });

      // Publish event for subscriptions
      pubsub.publish(POST_CREATED, { postCreated: post });

      return post;
    },

    // Update an existing post
    updatePost: async (
      _: unknown,
      args: { id: string; input: UpdatePostInput },
      context: Context
    ) => {
      requireAuth(context);

      const post = await db.posts.findById(args.id);
      if (!post) {
        throw new GraphQLError("Post not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Ensure user owns this post
      if (post.authorId !== context.userId) {
        throw new GraphQLError("Not authorized to update this post", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return db.posts.update(args.id, args.input);
    },

    // Delete a post by ID
    deletePost: async (
      _: unknown,
      args: { id: string },
      context: Context
    ) => {
      requireAuth(context);

      const post = await db.posts.findById(args.id);
      if (!post || post.authorId !== context.userId) {
        throw new GraphQLError("Not authorized", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      await db.posts.delete(args.id);
      return true;
    },

    // Add a comment to a post
    addComment: async (
      _: unknown,
      args: { postId: string; text: string },
      context: Context
    ) => {
      requireAuth(context);

      const comment = await db.comments.create({
        postId: args.postId,
        authorId: context.userId,
        text: args.text,
      });

      // Publish event for subscriptions
      pubsub.publish(COMMENT_ADDED, {
        commentAdded: comment,
        postId: args.postId,
      });

      return comment;
    },
  },

  // Subscription resolvers for real-time updates
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.subscribe(POST_CREATED),
    },
    commentAdded: {
      subscribe: (_: unknown, args: { postId: string }) => {
        return pubsub.subscribe(COMMENT_ADDED, {
          filter: (payload) => payload.postId === args.postId,
        });
      },
    },
  },

  // Field resolvers for nested data
  User: {
    posts: (parent: User, _: unknown, context: Context) => {
      return context.loaders.postsByAuthor.load(parent.id);
    },
  },

  Post: {
    author: (parent: Post, _: unknown, context: Context) => {
      return context.loaders.users.load(parent.authorId);
    },
    comments: (parent: Post, _: unknown, context: Context) => {
      return context.loaders.commentsByPost.load(parent.id);
    },
  },

  Comment: {
    author: (parent: Comment, _: unknown, context: Context) => {
      return context.loaders.users.load(parent.authorId);
    },
    post: (parent: Comment, _: unknown, context: Context) => {
      return context.loaders.posts.load(parent.postId);
    },
  },
};

// Helper function to check authentication
function requireAuth(context: Context): asserts context is AuthenticatedContext {
  if (!context.userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}
```

## Implementing Authentication

Authentication is critical for protecting sensitive operations. Create an authentication module that handles JWT tokens and password hashing.

```typescript
// src/auth.ts
import { sign, verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "7d";

// Hash a password using Bun's built-in password API
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

// Verify a password against its hash
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// Generate a JWT token for a user
export function generateToken(userId: string): string {
  return sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify and decode a JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    return verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Extract user ID from request headers
export function getUserFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  return payload?.userId || null;
}
```

## Setting Up Context with DataLoader

Context is created for each request and contains authentication info plus DataLoader instances. DataLoader batches and caches database queries to prevent the N+1 problem.

```typescript
// src/context.ts
import DataLoader from "dataloader";
import { getUserFromRequest } from "./auth";
import { db } from "./database";

// Define the shape of your request context
export interface Context {
  userId: string | null;
  loaders: {
    users: DataLoader<string, User>;
    posts: DataLoader<string, Post>;
    postsByAuthor: DataLoader<string, Post[]>;
    commentsByPost: DataLoader<string, Comment[]>;
  };
}

// Create a new context for each request
export function createContext(request: Request): Context {
  const userId = getUserFromRequest(request);

  return {
    userId,
    loaders: {
      // Batch load users by ID
      users: new DataLoader(async (ids: readonly string[]) => {
        const users = await db.users.findByIds([...ids]);
        const userMap = new Map(users.map((u) => [u.id, u]));
        return ids.map((id) => userMap.get(id) || null);
      }),

      // Batch load posts by ID
      posts: new DataLoader(async (ids: readonly string[]) => {
        const posts = await db.posts.findByIds([...ids]);
        const postMap = new Map(posts.map((p) => [p.id, p]));
        return ids.map((id) => postMap.get(id) || null);
      }),

      // Batch load posts by author ID
      postsByAuthor: new DataLoader(async (authorIds: readonly string[]) => {
        const posts = await db.posts.findByAuthorIds([...authorIds]);
        const postsByAuthor = new Map<string, Post[]>();
        
        for (const post of posts) {
          const existing = postsByAuthor.get(post.authorId) || [];
          existing.push(post);
          postsByAuthor.set(post.authorId, existing);
        }
        
        return authorIds.map((id) => postsByAuthor.get(id) || []);
      }),

      // Batch load comments by post ID
      commentsByPost: new DataLoader(async (postIds: readonly string[]) => {
        const comments = await db.comments.findByPostIds([...postIds]);
        const commentsByPost = new Map<string, Comment[]>();
        
        for (const comment of comments) {
          const existing = commentsByPost.get(comment.postId) || [];
          existing.push(comment);
          commentsByPost.set(comment.postId, existing);
        }
        
        return postIds.map((id) => commentsByPost.get(id) || []);
      }),
    },
  };
}
```

Update your server to use the context factory.

```typescript
// src/index.ts (updated)
import { createYoga } from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { createContext } from "./context";

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema,
  // Create fresh context for each request
  context: ({ request }) => createContext(request),
  graphiql: {
    defaultQuery: `
      query GetPosts {
        posts(published: true) {
          id
          title
          author {
            username
          }
        }
      }
    `,
  },
});

const server = Bun.serve({
  port: 4000,
  fetch: yoga,
});

console.log(`GraphQL API running at http://localhost:${server.port}/graphql`);
```

## Implementing Subscriptions

Subscriptions enable real-time updates via WebSocket connections. Create a pub/sub system for broadcasting events.

```typescript
// src/pubsub.ts
import { createPubSub } from "graphql-yoga";

// Event type constants
export const POST_CREATED = "POST_CREATED";
export const COMMENT_ADDED = "COMMENT_ADDED";

// Define event payload types
interface PubSubEvents {
  [POST_CREATED]: [{ postCreated: Post }];
  [COMMENT_ADDED]: [{ commentAdded: Comment; postId: string }];
}

// Create typed pub/sub instance
export const pubsub = createPubSub<PubSubEvents>();
```

Enable WebSocket support in your server for subscription operations.

```typescript
// src/index.ts (with WebSocket support)
import { createYoga } from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { createContext } from "./context";

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema,
  context: ({ request }) => createContext(request),
});

// Bun natively supports WebSocket upgrades
const server = Bun.serve({
  port: 4000,
  fetch: yoga.fetch,
  websocket: yoga.websocket,
});

console.log(`GraphQL API with subscriptions at http://localhost:${server.port}/graphql`);
```

## Error Handling

Proper error handling improves the developer experience and helps clients handle failures gracefully. Create a custom error handling plugin.

```typescript
// src/plugins/errorHandler.ts
import { Plugin } from "graphql-yoga";
import { GraphQLError } from "graphql";

// Custom error codes for client handling
export const ErrorCodes = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

// Map error codes to HTTP status codes
const codeToStatus: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
};

// Plugin to format and log errors consistently
export function errorHandlerPlugin(): Plugin {
  return {
    onExecute() {
      return {
        onExecuteDone({ result }) {
          if ("errors" in result && result.errors) {
            for (const error of result.errors) {
              // Log server errors for debugging
              const code = error.extensions?.code as string;
              if (code === ErrorCodes.INTERNAL_ERROR || !code) {
                console.error("GraphQL Error:", {
                  message: error.message,
                  path: error.path,
                  stack: error.originalError?.stack,
                });
              }
            }
          }
        },
      };
    },
  };
}

// Helper to create consistent errors
export function createError(
  message: string,
  code: keyof typeof ErrorCodes,
  details?: Record<string, unknown>
): GraphQLError {
  return new GraphQLError(message, {
    extensions: {
      code,
      http: { status: codeToStatus[code] },
      ...details,
    },
  });
}
```

Add input validation to your mutations for better error messages.

```typescript
// src/validation.ts
import { createError, ErrorCodes } from "./plugins/errorHandler";

// Validate email format
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError("Invalid email format", "VALIDATION_ERROR", {
      field: "email",
    });
  }
}

// Validate password strength
export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw createError(
      "Password must be at least 8 characters",
      "VALIDATION_ERROR",
      { field: "password" }
    );
  }
}

// Validate post content
export function validatePostInput(input: { title?: string; content?: string }): void {
  if (input.title !== undefined && input.title.length < 3) {
    throw createError(
      "Title must be at least 3 characters",
      "VALIDATION_ERROR",
      { field: "title" }
    );
  }
  
  if (input.content !== undefined && input.content.length < 10) {
    throw createError(
      "Content must be at least 10 characters",
      "VALIDATION_ERROR",
      { field: "content" }
    );
  }
}
```

## Testing Your GraphQL API

Write tests for your resolvers to ensure they work correctly. Create a test file using Bun's built-in test runner.

```typescript
// src/__tests__/resolvers.test.ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { graphql } from "graphql";
import { typeDefs } from "../schema";
import { resolvers } from "../resolvers";
import { createContext } from "../context";

const schema = makeExecutableSchema({ typeDefs, resolvers });

describe("GraphQL Resolvers", () => {
  describe("Query.posts", () => {
    test("returns published posts when filtered", async () => {
      const query = `
        query {
          posts(published: true) {
            id
            title
            published
          }
        }
      `;

      const mockRequest = new Request("http://localhost/graphql");
      const context = createContext(mockRequest);
      
      const result = await graphql({
        schema,
        source: query,
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.posts).toBeDefined();
      
      // All returned posts should be published
      for (const post of result.data?.posts || []) {
        expect(post.published).toBe(true);
      }
    });
  });

  describe("Mutation.createPost", () => {
    test("requires authentication", async () => {
      const mutation = `
        mutation {
          createPost(input: { title: "Test", content: "Test content" }) {
            id
          }
        }
      `;

      const mockRequest = new Request("http://localhost/graphql");
      const context = createContext(mockRequest);
      
      const result = await graphql({
        schema,
        source: mutation,
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });
  });
});
```

Run your tests with Bun's test command.

```bash
bun test
```

## Best Practices Summary

When building GraphQL APIs with Bun, follow these best practices to ensure your API is performant, maintainable, and secure:

1. **Use DataLoader for batching**: Always use DataLoader for nested field resolvers to prevent N+1 query problems. Create new DataLoader instances per request to ensure proper caching boundaries.

2. **Validate inputs early**: Validate user inputs at the resolver level before performing any database operations. Return clear, actionable error messages with field-specific details.

3. **Implement proper authentication**: Use JWT tokens with reasonable expiration times. Always verify tokens in the context factory and make the user ID available throughout the request lifecycle.

4. **Use typed resolvers**: Define TypeScript interfaces for your context, arguments, and return types. This catches errors at compile time rather than runtime.

5. **Handle errors consistently**: Create custom error classes with standardized error codes. Log server errors but return safe messages to clients.

6. **Structure your schema logically**: Group related types together. Use input types for complex mutation arguments. Add descriptions to types and fields for documentation.

7. **Optimize subscriptions**: Filter subscription events on the server side to reduce unnecessary WebSocket traffic. Use connection-level authentication for subscriptions.

8. **Test your resolvers**: Write unit tests for resolver logic. Use integration tests to verify the full request lifecycle including authentication and authorization.

9. **Enable query complexity limits**: Protect against expensive queries by implementing depth limiting and complexity analysis. GraphQL Yoga supports these features through plugins.

10. **Monitor performance**: Track resolver execution times and database query counts. Use Bun's built-in performance APIs for profiling.

## Conclusion

Building GraphQL APIs with Bun combines the flexibility of GraphQL with the raw performance of the Bun runtime. The combination of TypeScript support, fast startup times, and native Web APIs makes Bun an excellent choice for GraphQL servers.

In this guide, you learned how to set up a GraphQL server with graphql-yoga, define schemas with types and operations, implement resolvers with proper authentication, use DataLoader to optimize database queries, handle real-time updates with subscriptions, and implement comprehensive error handling.

The patterns shown here scale well from small APIs to large production systems. As your API grows, consider adding features like query complexity analysis, persisted queries, and caching layers. Bun's performance characteristics make it well-suited for high-traffic GraphQL APIs where every millisecond counts.

Start building your GraphQL API today and experience the developer productivity boost that comes from having a type-safe, self-documenting API that gives clients exactly the data they need.
