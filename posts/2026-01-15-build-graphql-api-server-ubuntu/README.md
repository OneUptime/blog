# How to Build a GraphQL API Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, NodeJS, Ubuntu, Apollo Server, API, PostgreSQL, Prisma, Authentication, WebSockets, DevOps

Description: A comprehensive guide to building a production-ready GraphQL API server on Ubuntu with Node.js, covering schema design, resolvers, authentication, subscriptions, and deployment.

---

GraphQL has transformed how developers build APIs by providing a flexible query language that lets clients request exactly the data they need. Unlike REST APIs with fixed endpoints, GraphQL exposes a single endpoint where clients define the shape of their responses. This guide walks through building a production-ready GraphQL API server on Ubuntu using Node.js and Apollo Server.

## What is GraphQL and Why Use It Over REST?

GraphQL is a query language for APIs developed by Facebook in 2012 and open-sourced in 2015. It provides several advantages over traditional REST APIs.

### Key Benefits of GraphQL

**Single Endpoint**: Instead of multiple REST endpoints (`/users`, `/users/:id/posts`, `/posts/:id/comments`), GraphQL uses one endpoint that handles all queries.

**No Over-fetching or Under-fetching**: Clients request exactly the fields they need. A mobile app might request minimal user data while a web dashboard requests complete profiles.

**Strong Typing**: GraphQL schemas define exact types for all data, enabling better tooling, documentation, and error checking.

**Self-documenting**: The schema serves as documentation. Tools like GraphQL Playground let developers explore the API interactively.

**Efficient Data Loading**: Related data can be fetched in a single request, reducing network round trips.

The following comparison shows how fetching user data with their posts differs between REST and GraphQL.

```bash
# REST: Multiple requests needed
GET /users/123
GET /users/123/posts
GET /posts/456/comments

# GraphQL: Single request
POST /graphql
{
  user(id: "123") {
    name
    email
    posts {
      title
      comments {
        content
      }
    }
  }
}
```

## Prerequisites

Before building the GraphQL server, ensure your Ubuntu system has Node.js installed. We will use Node.js 20 LTS for stability and long-term support.

### Installing Node.js on Ubuntu

The following commands install Node.js 20 using the NodeSource repository, which provides up-to-date Node.js packages for Ubuntu.

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y curl gnupg ca-certificates

# Add NodeSource repository for Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Installing PostgreSQL

PostgreSQL will serve as our database. The following commands install PostgreSQL and create a database for the API.

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create a database and user for the GraphQL API
sudo -u postgres psql << EOF
CREATE USER graphql_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE graphql_api OWNER graphql_user;
GRANT ALL PRIVILEGES ON DATABASE graphql_api TO graphql_user;
EOF
```

## Project Setup with Apollo Server

Apollo Server is the most popular GraphQL server implementation for Node.js. It provides excellent developer experience with built-in tooling and middleware support.

### Initializing the Project

Create a new project directory and initialize it with npm. The following commands set up the project structure and install required dependencies.

```bash
# Create project directory
mkdir -p ~/graphql-api-server
cd ~/graphql-api-server

# Initialize npm project
npm init -y

# Install core dependencies
npm install @apollo/server graphql express cors

# Install development dependencies
npm install -D typescript @types/node @types/express ts-node nodemon

# Initialize TypeScript configuration
npx tsc --init
```

### Project Structure

Organize the project with a clear directory structure that separates concerns. This structure scales well as the API grows.

```bash
# Create directory structure
mkdir -p src/{schema,resolvers,models,middleware,utils,dataloaders}

# Create main files
touch src/index.ts src/schema/index.ts src/resolvers/index.ts
```

The project structure looks like this:

```
graphql-api-server/
├── src/
│   ├── index.ts              # Application entry point
│   ├── schema/               # GraphQL type definitions
│   │   ├── index.ts
│   │   ├── user.ts
│   │   └── post.ts
│   ├── resolvers/            # Query and mutation resolvers
│   │   ├── index.ts
│   │   ├── user.ts
│   │   └── post.ts
│   ├── models/               # Database models
│   ├── middleware/           # Authentication and other middleware
│   ├── utils/                # Utility functions
│   └── dataloaders/          # DataLoader instances
├── prisma/
│   └── schema.prisma         # Database schema
├── package.json
└── tsconfig.json
```

### TypeScript Configuration

Update the TypeScript configuration for Node.js compatibility. The following configuration enables modern JavaScript features and proper module resolution.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Basic Server Setup

Create the main application file that initializes Apollo Server with Express. This setup provides flexibility for adding middleware and custom routes.

```typescript
// src/index.ts
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

// Define the context type for type safety across resolvers
interface Context {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

async function startServer() {
  // Create Express app and HTTP server
  const app = express();
  const httpServer = http.createServer(app);

  // Initialize Apollo Server with schema and plugins
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    // Plugin to ensure proper shutdown of HTTP server
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    // Enable introspection for development (disable in production)
    introspection: process.env.NODE_ENV !== 'production',
  });

  // Start Apollo Server
  await server.start();

  // Apply middleware to Express
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      // Context function runs for every request
      context: async ({ req }) => {
        // Authentication logic will be added here
        return {};
      },
    })
  );

  // Health check endpoint for monitoring
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Start listening
  const PORT = process.env.PORT || 4000;
  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
}

startServer().catch(console.error);
```

## Schema Definition

GraphQL schemas define the structure of your API using types, queries, and mutations. The schema serves as a contract between the client and server.

### Type Definitions

Define the core types for your API. The following schema defines User and Post types with their relationships.

```typescript
// src/schema/user.ts
export const userTypeDefs = `#graphql
  # Enum for user roles
  enum UserRole {
    USER
    ADMIN
    MODERATOR
  }

  # User type representing a registered user
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String
    lastName: String
    role: UserRole!
    posts: [Post!]!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }

  # Input type for creating a new user
  input CreateUserInput {
    email: String!
    username: String!
    password: String!
    firstName: String
    lastName: String
  }

  # Input type for updating user information
  input UpdateUserInput {
    username: String
    firstName: String
    lastName: String
  }

  # Authentication response with token and user
  type AuthPayload {
    token: String!
    user: User!
  }
`;
```

```typescript
// src/schema/post.ts
export const postTypeDefs = `#graphql
  # Post status enum
  enum PostStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  # Post type representing a blog post or article
  type Post {
    id: ID!
    title: String!
    content: String!
    excerpt: String
    status: PostStatus!
    author: User!
    comments: [Comment!]!
    tags: [String!]!
    viewCount: Int!
    createdAt: String!
    updatedAt: String!
    publishedAt: String
  }

  # Comment type for post comments
  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
    createdAt: String!
  }

  # Input for creating a post
  input CreatePostInput {
    title: String!
    content: String!
    excerpt: String
    status: PostStatus
    tags: [String!]
  }

  # Input for updating a post
  input UpdatePostInput {
    title: String
    content: String
    excerpt: String
    status: PostStatus
    tags: [String!]
  }

  # Input for creating a comment
  input CreateCommentInput {
    postId: ID!
    content: String!
  }

  # Pagination input
  input PaginationInput {
    page: Int = 1
    limit: Int = 10
  }

  # Paginated posts response
  type PostConnection {
    posts: [Post!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  # Pagination metadata
  type PageInfo {
    currentPage: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }
`;
```

### Root Schema with Queries and Mutations

Combine all type definitions and define the root Query and Mutation types. These are the entry points for all GraphQL operations.

```typescript
// src/schema/index.ts
import { userTypeDefs } from './user';
import { postTypeDefs } from './post';

// Root schema combining all type definitions
export const typeDefs = `#graphql
  ${userTypeDefs}
  ${postTypeDefs}

  # Root Query type - all read operations
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(pagination: PaginationInput): [User!]!

    # Post queries
    post(id: ID!): Post
    posts(pagination: PaginationInput, status: PostStatus): PostConnection!
    postsByAuthor(authorId: ID!, pagination: PaginationInput): PostConnection!
    searchPosts(query: String!, pagination: PaginationInput): PostConnection!
  }

  # Root Mutation type - all write operations
  type Mutation {
    # Authentication mutations
    register(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    # User mutations
    updateUser(input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Post mutations
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
    publishPost(id: ID!): Post!

    # Comment mutations
    createComment(input: CreateCommentInput!): Comment!
    deleteComment(id: ID!): Boolean!
  }

  # Root Subscription type - real-time updates
  type Subscription {
    postCreated: Post!
    postUpdated(id: ID): Post!
    commentAdded(postId: ID!): Comment!
  }
`;
```

## Database Integration with Prisma

Prisma is a modern database toolkit that provides type-safe database access. It generates a client based on your schema, ensuring type safety throughout your application.

### Installing Prisma

Install Prisma and initialize it with PostgreSQL. The following commands set up Prisma in your project.

```bash
# Install Prisma CLI and client
npm install prisma @prisma/client

# Initialize Prisma with PostgreSQL
npx prisma init --datasource-provider postgresql
```

### Prisma Schema

Define your database schema in the Prisma schema file. This schema maps directly to your database tables.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  password  String
  firstName String?
  lastName  String?
  role      UserRole @default(USER)

  posts     Post[]
  comments  Comment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([username])
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

// Post model
model Post {
  id          String     @id @default(uuid())
  title       String
  content     String
  excerpt     String?
  status      PostStatus @default(DRAFT)
  tags        String[]
  viewCount   Int        @default(0)

  author      User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId    String

  comments    Comment[]

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  publishedAt DateTime?

  @@index([authorId])
  @@index([status])
  @@index([createdAt])
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// Comment model
model Comment {
  id        String   @id @default(uuid())
  content   String

  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String

  createdAt DateTime @default(now())

  @@index([postId])
  @@index([authorId])
}
```

### Environment Configuration

Create a `.env` file with the database connection string. Keep this file out of version control.

```bash
# .env
DATABASE_URL="postgresql://graphql_user:your_secure_password@localhost:5432/graphql_api?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NODE_ENV="development"
PORT=4000
```

### Generate and Migrate

Generate the Prisma client and run migrations to create the database tables.

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Optionally seed the database
npx prisma db seed
```

### Prisma Client Instance

Create a shared Prisma client instance to use throughout the application. This ensures connection pooling works correctly.

```typescript
// src/utils/prisma.ts
import { PrismaClient } from '@prisma/client';

// Create a single Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
```

## Resolvers Implementation

Resolvers are functions that fetch the data for each field in your schema. They connect your GraphQL operations to your data sources.

### User Resolvers

Implement resolvers for user-related operations including queries and mutations.

```typescript
// src/resolvers/user.ts
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { Context } from '../types';

// Install required packages: npm install bcryptjs jsonwebtoken
// npm install -D @types/bcryptjs @types/jsonwebtoken

export const userResolvers = {
  Query: {
    // Get currently authenticated user
    me: async (_parent: unknown, _args: unknown, context: Context) => {
      // Check if user is authenticated
      if (!context.user) {
        return null;
      }

      return prisma.user.findUnique({
        where: { id: context.user.id },
      });
    },

    // Get user by ID
    user: async (_parent: unknown, args: { id: string }) => {
      const user = await prisma.user.findUnique({
        where: { id: args.id },
      });

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return user;
    },

    // Get paginated list of users
    users: async (
      _parent: unknown,
      args: { pagination?: { page: number; limit: number } }
    ) => {
      const page = args.pagination?.page || 1;
      const limit = Math.min(args.pagination?.limit || 10, 100);
      const skip = (page - 1) * limit;

      return prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    // Register a new user
    register: async (
      _parent: unknown,
      args: {
        input: {
          email: string;
          username: string;
          password: string;
          firstName?: string;
          lastName?: string;
        };
      }
    ) => {
      const { email, username, password, firstName, lastName } = args.input;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        throw new GraphQLError('User with this email or username already exists', {
          extensions: { code: 'USER_EXISTS' },
        });
      }

      // Hash password with bcrypt (12 rounds)
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user in database
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          firstName,
          lastName,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return { token, user };
    },

    // Login existing user
    login: async (
      _parent: unknown,
      args: { email: string; password: string }
    ) => {
      const { email, password } = args;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return { token, user };
    },

    // Update user profile
    updateUser: async (
      _parent: unknown,
      args: {
        input: {
          username?: string;
          firstName?: string;
          lastName?: string;
        };
      },
      context: Context
    ) => {
      // Require authentication
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return prisma.user.update({
        where: { id: context.user.id },
        data: args.input,
      });
    },
  },

  // Field resolvers for User type
  User: {
    // Resolve posts for a user
    posts: async (parent: { id: string }) => {
      return prisma.post.findMany({
        where: { authorId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Resolve comments for a user
    comments: async (parent: { id: string }) => {
      return prisma.comment.findMany({
        where: { authorId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },
  },
};
```

### Post Resolvers

Implement resolvers for post-related operations including CRUD and pagination.

```typescript
// src/resolvers/post.ts
import { GraphQLError } from 'graphql';
import prisma from '../utils/prisma';
import { Context } from '../types';
import { pubsub, EVENTS } from '../utils/pubsub';

export const postResolvers = {
  Query: {
    // Get single post by ID
    post: async (_parent: unknown, args: { id: string }) => {
      const post = await prisma.post.findUnique({
        where: { id: args.id },
      });

      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Increment view count
      await prisma.post.update({
        where: { id: args.id },
        data: { viewCount: { increment: 1 } },
      });

      return post;
    },

    // Get paginated posts with optional status filter
    posts: async (
      _parent: unknown,
      args: {
        pagination?: { page: number; limit: number };
        status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      }
    ) => {
      const page = args.pagination?.page || 1;
      const limit = Math.min(args.pagination?.limit || 10, 100);
      const skip = (page - 1) * limit;

      // Build where clause
      const where = args.status ? { status: args.status } : { status: 'PUBLISHED' as const };

      // Execute count and find in parallel
      const [totalCount, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        posts,
        totalCount,
        pageInfo: {
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },

    // Search posts by title or content
    searchPosts: async (
      _parent: unknown,
      args: {
        query: string;
        pagination?: { page: number; limit: number };
      }
    ) => {
      const page = args.pagination?.page || 1;
      const limit = Math.min(args.pagination?.limit || 10, 100);
      const skip = (page - 1) * limit;

      const where = {
        status: 'PUBLISHED' as const,
        OR: [
          { title: { contains: args.query, mode: 'insensitive' as const } },
          { content: { contains: args.query, mode: 'insensitive' as const } },
        ],
      };

      const [totalCount, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        posts,
        totalCount,
        pageInfo: {
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
  },

  Mutation: {
    // Create a new post
    createPost: async (
      _parent: unknown,
      args: {
        input: {
          title: string;
          content: string;
          excerpt?: string;
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          tags?: string[];
        };
      },
      context: Context
    ) => {
      // Require authentication
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const { title, content, excerpt, status, tags } = args.input;

      const post = await prisma.post.create({
        data: {
          title,
          content,
          excerpt,
          status: status || 'DRAFT',
          tags: tags || [],
          authorId: context.user.id,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
        },
      });

      // Publish event for subscriptions
      if (post.status === 'PUBLISHED') {
        pubsub.publish(EVENTS.POST_CREATED, { postCreated: post });
      }

      return post;
    },

    // Update an existing post
    updatePost: async (
      _parent: unknown,
      args: {
        id: string;
        input: {
          title?: string;
          content?: string;
          excerpt?: string;
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          tags?: string[];
        };
      },
      context: Context
    ) => {
      // Require authentication
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Find the post and verify ownership
      const existingPost = await prisma.post.findUnique({
        where: { id: args.id },
      });

      if (!existingPost) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check ownership or admin role
      if (existingPost.authorId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new GraphQLError('Not authorized to update this post', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // Build update data
      const updateData: Record<string, unknown> = { ...args.input };

      // Set publishedAt if publishing for the first time
      if (args.input.status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }

      const post = await prisma.post.update({
        where: { id: args.id },
        data: updateData,
      });

      // Publish update event
      pubsub.publish(EVENTS.POST_UPDATED, { postUpdated: post });

      return post;
    },

    // Delete a post
    deletePost: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      // Require authentication
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const post = await prisma.post.findUnique({
        where: { id: args.id },
      });

      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check ownership or admin role
      if (post.authorId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new GraphQLError('Not authorized to delete this post', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      await prisma.post.delete({
        where: { id: args.id },
      });

      return true;
    },
  },

  // Field resolvers for Post type
  Post: {
    // Resolve author for a post
    author: async (parent: { authorId: string }) => {
      return prisma.user.findUnique({
        where: { id: parent.authorId },
      });
    },

    // Resolve comments for a post
    comments: async (parent: { id: string }) => {
      return prisma.comment.findMany({
        where: { postId: parent.id },
        orderBy: { createdAt: 'asc' },
      });
    },
  },
};
```

### Combining Resolvers

Merge all resolvers into a single object for Apollo Server.

```typescript
// src/resolvers/index.ts
import { userResolvers } from './user';
import { postResolvers } from './post';
import { commentResolvers } from './comment';

// Deep merge resolvers
export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...postResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...postResolvers.Mutation,
    ...commentResolvers.Mutation,
  },
  Subscription: {
    ...postResolvers.Subscription,
    ...commentResolvers.Subscription,
  },
  User: userResolvers.User,
  Post: postResolvers.Post,
  Comment: commentResolvers.Comment,
};
```

## Authentication and Authorization

Secure your GraphQL API with JWT-based authentication and role-based authorization.

### Authentication Middleware

Create middleware that extracts and validates JWT tokens from request headers.

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Extract user from JWT token in Authorization header
export async function getUser(token?: string): Promise<JwtPayload | null> {
  if (!token) {
    return null;
  }

  // Remove 'Bearer ' prefix if present
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  try {
    // Verify and decode the token
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET!) as JwtPayload;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

// Authentication directive implementation
export function requireAuth(context: { user?: JwtPayload }) {
  if (!context.user) {
    throw new GraphQLError('You must be logged in to perform this action', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
}

// Authorization helper for role-based access
export function requireRole(context: { user?: JwtPayload }, allowedRoles: string[]) {
  requireAuth(context);

  if (!allowedRoles.includes(context.user!.role)) {
    throw new GraphQLError('You do not have permission to perform this action', {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });
  }
}
```

### Context with Authentication

Update the server context to include the authenticated user.

```typescript
// src/index.ts (updated context)
import { getUser } from './middleware/auth';

// ... in the expressMiddleware configuration
expressMiddleware(server, {
  context: async ({ req }) => {
    // Extract token from Authorization header
    const token = req.headers.authorization;

    // Get user from token (returns null if invalid)
    const user = await getUser(token);

    return {
      user,
      // Add request for IP logging
      ip: req.ip,
    };
  },
})
```

### Authorization Patterns

Implement common authorization patterns in your resolvers.

```typescript
// src/utils/authorization.ts
import { GraphQLError } from 'graphql';
import { Context } from '../types';

// Check if user owns a resource
export function checkOwnership(
  context: Context,
  resourceOwnerId: string,
  allowAdmin = true
) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const isOwner = context.user.id === resourceOwnerId;
  const isAdmin = allowAdmin && context.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new GraphQLError('Not authorized to access this resource', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

// Permission checking with custom rules
interface PermissionRule {
  action: string;
  resource: string;
  condition?: (context: Context, resource: unknown) => boolean;
}

const permissions: Record<string, PermissionRule[]> = {
  USER: [
    { action: 'read', resource: 'post' },
    { action: 'create', resource: 'post' },
    { action: 'create', resource: 'comment' },
    {
      action: 'update',
      resource: 'post',
      condition: (ctx, post: { authorId: string }) => ctx.user?.id === post.authorId,
    },
  ],
  MODERATOR: [
    { action: 'read', resource: 'post' },
    { action: 'create', resource: 'post' },
    { action: 'update', resource: 'post' },
    { action: 'delete', resource: 'comment' },
  ],
  ADMIN: [
    { action: '*', resource: '*' }, // Full access
  ],
};

export function checkPermission(
  context: Context,
  action: string,
  resource: string,
  resourceData?: unknown
) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const userPermissions = permissions[context.user.role] || [];

  const hasPermission = userPermissions.some((perm) => {
    // Check for wildcard permissions
    if (perm.action === '*' && perm.resource === '*') return true;
    if (perm.action !== action && perm.action !== '*') return false;
    if (perm.resource !== resource && perm.resource !== '*') return false;

    // Check custom condition if present
    if (perm.condition && resourceData) {
      return perm.condition(context, resourceData);
    }

    return true;
  });

  if (!hasPermission) {
    throw new GraphQLError(`Not authorized to ${action} ${resource}`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}
```

## Subscriptions for Real-time Data

GraphQL subscriptions enable real-time updates using WebSockets. When data changes, the server pushes updates to subscribed clients.

### Setting Up WebSocket Server

Install the required packages and configure WebSocket support.

```bash
# Install WebSocket packages
npm install graphql-ws ws
npm install -D @types/ws
```

### Subscription Server Configuration

Update the server to support both HTTP and WebSocket connections.

```typescript
// src/index.ts (updated for subscriptions)
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { getUser } from './middleware/auth';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Create executable schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Set up WebSocket server with context
  const serverCleanup = useServer(
    {
      schema,
      // Context for subscriptions
      context: async (ctx) => {
        // Extract token from connection params
        const token = ctx.connectionParams?.authorization as string;
        const user = await getUser(token);
        return { user };
      },
      // Called when client connects
      onConnect: async (ctx) => {
        console.log('Client connected for subscriptions');
        // Can reject connections here
        return true;
      },
      // Called when client disconnects
      onDisconnect: (ctx, code, reason) => {
        console.log('Client disconnected', { code, reason });
      },
    },
    wsServer
  );

  // Create Apollo Server with both HTTP and WS plugins
  const server = new ApolloServer({
    schema,
    plugins: [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization;
        const user = await getUser(token);
        return { user };
      },
    })
  );

  const PORT = process.env.PORT || 4000;
  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
  console.log(`WebSocket subscriptions ready at ws://localhost:${PORT}/graphql`);
}

startServer().catch(console.error);
```

### PubSub Implementation

Create a PubSub instance for publishing and subscribing to events.

```typescript
// src/utils/pubsub.ts
import { PubSub } from 'graphql-subscriptions';

// Create PubSub instance
// Note: For production, use Redis-based PubSub for horizontal scaling
export const pubsub = new PubSub();

// Event names as constants to prevent typos
export const EVENTS = {
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  COMMENT_ADDED: 'COMMENT_ADDED',
} as const;
```

### Subscription Resolvers

Implement subscription resolvers that listen for events.

```typescript
// src/resolvers/post.ts (subscription section)
import { pubsub, EVENTS } from '../utils/pubsub';
import { withFilter } from 'graphql-subscriptions';

export const postSubscriptions = {
  Subscription: {
    // Subscribe to all new posts
    postCreated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.POST_CREATED]),
    },

    // Subscribe to updates for a specific post
    postUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.POST_UPDATED]),
        (payload, variables) => {
          // If no ID specified, receive all updates
          if (!variables.id) return true;
          // Otherwise, filter to specific post
          return payload.postUpdated.id === variables.id;
        }
      ),
    },

    // Subscribe to new comments on a post
    commentAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.COMMENT_ADDED]),
        (payload, variables) => {
          return payload.commentAdded.postId === variables.postId;
        }
      ),
    },
  },
};

// Publishing events in mutations
// In createPost mutation:
pubsub.publish(EVENTS.POST_CREATED, { postCreated: post });

// In createComment mutation:
pubsub.publish(EVENTS.COMMENT_ADDED, { commentAdded: comment });
```

### Redis PubSub for Production

For production deployments with multiple server instances, use Redis-based PubSub.

```typescript
// src/utils/pubsub-redis.ts
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

// Create Redis clients for pub and sub
const options = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    // Reconnect after increasing delay
    return Math.min(times * 50, 2000);
  },
};

// Redis PubSub requires separate connections for publisher and subscriber
export const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});
```

## Error Handling

Proper error handling improves API reliability and debugging. GraphQL provides structured error responses with custom extensions.

### Custom Error Classes

Create custom error classes for different error types.

```typescript
// src/utils/errors.ts
import { GraphQLError } from 'graphql';

// Base class for application errors
export class AppError extends GraphQLError {
  constructor(
    message: string,
    code: string,
    statusCode = 500,
    extensions?: Record<string, unknown>
  ) {
    super(message, {
      extensions: {
        code,
        http: { status: statusCode },
        ...extensions,
      },
    });
  }
}

// Not found error (404)
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
  }
}

// Authentication error (401)
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHENTICATED', 401);
  }
}

// Authorization error (403)
export class ForbiddenError extends AppError {
  constructor(message = 'Not authorized to perform this action') {
    super(message, 'FORBIDDEN', 403);
  }
}

// Validation error (400)
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
  }
}

// Rate limit error (429)
export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(
      'Too many requests. Please try again later.',
      'RATE_LIMITED',
      429,
      { retryAfter }
    );
  }
}
```

### Error Formatting Plugin

Create an Apollo Server plugin to format and log errors consistently.

```typescript
// src/plugins/errorLogging.ts
import { ApolloServerPlugin } from '@apollo/server';

export const errorLoggingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    return {
      async didEncounterErrors(requestContext) {
        const { errors, request, contextValue } = requestContext;

        for (const error of errors) {
          // Extract error details
          const errorDetails = {
            message: error.message,
            code: error.extensions?.code,
            path: error.path?.join('.'),
            operation: request.operationName,
            variables: request.variables,
            userId: (contextValue as { user?: { id: string } }).user?.id,
            timestamp: new Date().toISOString(),
          };

          // Log based on error type
          if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
            // Log full error with stack trace for internal errors
            console.error('Internal server error:', {
              ...errorDetails,
              stack: error.originalError?.stack,
            });
          } else {
            // Log minimal info for client errors
            console.warn('Client error:', errorDetails);
          }
        }
      },
    };
  },
};
```

### Error Handling in Resolvers

Apply consistent error handling patterns in resolvers.

```typescript
// src/resolvers/post.ts (with error handling)
import {
  NotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors';

export const postResolvers = {
  Mutation: {
    createPost: async (_parent: unknown, args: { input: CreatePostInput }, context: Context) => {
      // Authentication check
      if (!context.user) {
        throw new AuthenticationError();
      }

      const { title, content } = args.input;

      // Validation
      if (title.length < 5) {
        throw new ValidationError('Title must be at least 5 characters', 'title');
      }

      if (content.length < 50) {
        throw new ValidationError('Content must be at least 50 characters', 'content');
      }

      try {
        const post = await prisma.post.create({
          data: {
            ...args.input,
            authorId: context.user.id,
          },
        });
        return post;
      } catch (error) {
        // Handle Prisma errors
        if (error.code === 'P2002') {
          throw new ValidationError('A post with this title already exists', 'title');
        }
        throw error;
      }
    },

    updatePost: async (_parent: unknown, args: { id: string; input: UpdatePostInput }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError();
      }

      const post = await prisma.post.findUnique({
        where: { id: args.id },
      });

      if (!post) {
        throw new NotFoundError('Post', args.id);
      }

      if (post.authorId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new ForbiddenError('You can only edit your own posts');
      }

      return prisma.post.update({
        where: { id: args.id },
        data: args.input,
      });
    },
  },
};
```

## DataLoader for N+1 Problem

The N+1 problem occurs when fetching related data triggers multiple database queries. DataLoader batches these queries for efficiency.

### Understanding the N+1 Problem

Consider fetching posts with their authors. Without DataLoader:

```graphql
query {
  posts {          # 1 query to fetch posts
    title
    author {       # N queries to fetch each author
      name
    }
  }
}
# Result: 1 + N database queries
```

With DataLoader, all author IDs are collected and fetched in a single batch query.

### Implementing DataLoader

Create DataLoader instances for your data types.

```typescript
// src/dataloaders/index.ts
import DataLoader from 'dataloader';
import prisma from '../utils/prisma';

// Install DataLoader: npm install dataloader

// User loader - batches user fetches by ID
export function createUserLoader() {
  return new DataLoader<string, User | null>(async (userIds) => {
    // Fetch all users in a single query
    const users = await prisma.user.findMany({
      where: {
        id: { in: [...userIds] },
      },
    });

    // Create a map for O(1) lookup
    const userMap = new Map(users.map((user) => [user.id, user]));

    // Return users in the same order as input IDs
    return userIds.map((id) => userMap.get(id) || null);
  });
}

// Post loader - batches post fetches
export function createPostLoader() {
  return new DataLoader<string, Post | null>(async (postIds) => {
    const posts = await prisma.post.findMany({
      where: {
        id: { in: [...postIds] },
      },
    });

    const postMap = new Map(posts.map((post) => [post.id, post]));
    return postIds.map((id) => postMap.get(id) || null);
  });
}

// Posts by author loader - batch fetch posts for multiple authors
export function createPostsByAuthorLoader() {
  return new DataLoader<string, Post[]>(async (authorIds) => {
    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: [...authorIds] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group posts by author ID
    const postsByAuthor = new Map<string, Post[]>();
    authorIds.forEach((id) => postsByAuthor.set(id, []));

    posts.forEach((post) => {
      const authorPosts = postsByAuthor.get(post.authorId);
      if (authorPosts) {
        authorPosts.push(post);
      }
    });

    return authorIds.map((id) => postsByAuthor.get(id) || []);
  });
}

// Comments by post loader
export function createCommentsByPostLoader() {
  return new DataLoader<string, Comment[]>(async (postIds) => {
    const comments = await prisma.comment.findMany({
      where: {
        postId: { in: [...postIds] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const commentsByPost = new Map<string, Comment[]>();
    postIds.forEach((id) => commentsByPost.set(id, []));

    comments.forEach((comment) => {
      const postComments = commentsByPost.get(comment.postId);
      if (postComments) {
        postComments.push(comment);
      }
    });

    return postIds.map((id) => commentsByPost.get(id) || []);
  });
}

// Factory function to create all loaders
export function createLoaders() {
  return {
    userLoader: createUserLoader(),
    postLoader: createPostLoader(),
    postsByAuthorLoader: createPostsByAuthorLoader(),
    commentsByPostLoader: createCommentsByPostLoader(),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
```

### Adding Loaders to Context

Create new loader instances for each request to ensure proper batching.

```typescript
// src/index.ts (updated context with loaders)
import { createLoaders } from './dataloaders';

// Updated context type
interface Context {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  loaders: ReturnType<typeof createLoaders>;
}

// In expressMiddleware configuration
expressMiddleware(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization;
    const user = await getUser(token);

    return {
      user,
      // Create fresh loaders for each request
      // This ensures batching works within a single request
      loaders: createLoaders(),
    };
  },
})
```

### Using DataLoader in Resolvers

Update field resolvers to use DataLoader instead of direct database queries.

```typescript
// src/resolvers/post.ts (with DataLoader)
export const postResolvers = {
  // ... queries and mutations

  Post: {
    // Use DataLoader for author field
    author: async (parent: { authorId: string }, _args: unknown, context: Context) => {
      // This call is batched with other author fetches
      return context.loaders.userLoader.load(parent.authorId);
    },

    // Use DataLoader for comments field
    comments: async (parent: { id: string }, _args: unknown, context: Context) => {
      // This call is batched with other comment fetches
      return context.loaders.commentsByPostLoader.load(parent.id);
    },
  },
};

// src/resolvers/user.ts (with DataLoader)
export const userResolvers = {
  // ... queries and mutations

  User: {
    // Use DataLoader for posts field
    posts: async (parent: { id: string }, _args: unknown, context: Context) => {
      return context.loaders.postsByAuthorLoader.load(parent.id);
    },
  },
};
```

## Production Deployment with PM2

PM2 is a production process manager for Node.js that provides load balancing, monitoring, and automatic restarts.

### Installing PM2

Install PM2 globally on your Ubuntu server.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Build for Production

Compile TypeScript and prepare the application for production.

```bash
# Install production dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Generate Prisma client for production
npx prisma generate
```

### PM2 Ecosystem Configuration

Create a PM2 ecosystem file for managing your application.

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'graphql-api',
      script: './dist/index.js',

      // Cluster mode for load balancing across CPU cores
      instances: 'max',
      exec_mode: 'cluster',

      // Automatically restart on memory threshold
      max_memory_restart: '500M',

      // Environment variables for production
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },

      // Logging configuration
      log_file: '/var/log/graphql-api/combined.log',
      out_file: '/var/log/graphql-api/out.log',
      error_file: '/var/log/graphql-api/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Merge logs from all cluster instances
      merge_logs: true,

      // Graceful shutdown timeout
      kill_timeout: 5000,

      // Wait for ready signal before considering app started
      wait_ready: true,
      listen_timeout: 10000,

      // Restart on file changes (disable in production)
      watch: false,

      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100,
    },
  ],
};
```

### PM2 Commands

Common PM2 commands for managing your application.

```bash
# Start application with ecosystem file
pm2 start ecosystem.config.js --env production

# View running processes
pm2 list

# View logs in real-time
pm2 logs graphql-api

# Monitor CPU and memory usage
pm2 monit

# Restart application
pm2 restart graphql-api

# Reload with zero-downtime (cluster mode)
pm2 reload graphql-api

# Stop application
pm2 stop graphql-api

# Delete from PM2 process list
pm2 delete graphql-api

# Save current process list for auto-restart on reboot
pm2 save

# Setup startup script to start PM2 on system boot
pm2 startup systemd
```

### Graceful Shutdown

Implement graceful shutdown in your application to handle SIGTERM signals.

```typescript
// src/index.ts (graceful shutdown)
async function startServer() {
  // ... server setup

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('Received shutdown signal, closing connections...');

    // Stop accepting new connections
    httpServer.close(() => {
      console.log('HTTP server closed');
    });

    // Close database connections
    await prisma.$disconnect();
    console.log('Database connections closed');

    // Notify PM2 that shutdown is complete
    if (process.send) {
      process.send('ready');
    }

    process.exit(0);
  };

  // Handle shutdown signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Notify PM2 that app is ready
  if (process.send) {
    process.send('ready');
  }
}
```

### Nginx Reverse Proxy

Configure Nginx as a reverse proxy for your GraphQL server.

```nginx
# /etc/nginx/sites-available/graphql-api
upstream graphql_servers {
    # PM2 cluster instances
    server 127.0.0.1:4000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # GraphQL endpoint
    location /graphql {
        proxy_pass http://graphql_servers;
        proxy_http_version 1.1;

        # WebSocket support for subscriptions
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://graphql_servers;
        proxy_http_version 1.1;
    }
}
```

```bash
# Enable the site and restart Nginx
sudo ln -s /etc/nginx/sites-available/graphql-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Logging

Proper monitoring and logging are essential for maintaining a healthy production API.

### Structured Logging

Implement structured logging with Winston for better searchability and analysis.

```typescript
// src/utils/logger.ts
import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Create format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create format for production (JSON for log aggregation)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // File transport for production
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: '/var/log/graphql-api/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: '/var/log/graphql-api/combined.log',
          }),
        ]
      : []),
  ],
});

export default logger;
```

### Request Logging Plugin

Create a plugin to log all GraphQL operations.

```typescript
// src/plugins/requestLogging.ts
import { ApolloServerPlugin } from '@apollo/server';
import logger from '../utils/logger';

export const requestLoggingPlugin: ApolloServerPlugin = {
  async requestDidStart(requestContext) {
    const startTime = Date.now();
    const { request } = requestContext;

    return {
      async willSendResponse(responseContext) {
        const duration = Date.now() - startTime;
        const { response, contextValue } = responseContext;
        const context = contextValue as { user?: { id: string } };

        logger.http('GraphQL request', {
          operationName: request.operationName,
          operation: request.query?.slice(0, 100),
          variables: request.variables,
          duration: `${duration}ms`,
          userId: context.user?.id,
          hasErrors: !!response.body.singleResult?.errors?.length,
        });
      },
    };
  },
};
```

### Metrics Collection

Collect metrics for monitoring API performance.

```typescript
// src/utils/metrics.ts
import { Counter, Histogram, Registry } from 'prom-client';

// Create a registry for metrics
export const registry = new Registry();

// Request counter
export const requestCounter = new Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation', 'status'],
  registers: [registry],
});

// Request duration histogram
export const requestDuration = new Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'GraphQL request duration in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [registry],
});

// Error counter
export const errorCounter = new Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation', 'code'],
  registers: [registry],
});

// Active subscriptions gauge
export const activeSubscriptions = new Counter({
  name: 'graphql_active_subscriptions',
  help: 'Number of active GraphQL subscriptions',
  registers: [registry],
});
```

### Metrics Plugin

Create a plugin to collect metrics for each request.

```typescript
// src/plugins/metricsPlugin.ts
import { ApolloServerPlugin } from '@apollo/server';
import { requestCounter, requestDuration, errorCounter } from '../utils/metrics';

export const metricsPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const startTime = Date.now();
    let operationName = 'unknown';

    return {
      async didResolveOperation(context) {
        operationName = context.request.operationName || 'anonymous';
      },

      async willSendResponse(context) {
        const duration = (Date.now() - startTime) / 1000;
        const hasErrors = !!context.response.body.singleResult?.errors?.length;

        // Record request
        requestCounter.inc({
          operation: operationName,
          status: hasErrors ? 'error' : 'success',
        });

        // Record duration
        requestDuration.observe({ operation: operationName }, duration);
      },

      async didEncounterErrors(context) {
        for (const error of context.errors) {
          errorCounter.inc({
            operation: operationName,
            code: (error.extensions?.code as string) || 'UNKNOWN',
          });
        }
      },
    };
  },
};
```

### Metrics Endpoint

Expose a metrics endpoint for Prometheus scraping.

```typescript
// In src/index.ts
import { registry } from './utils/metrics';

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});
```

## Troubleshooting

Common issues and their solutions when running a GraphQL server.

### Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if the port is in use
sudo lsof -i :4000

# Check PM2 processes
pm2 list

# View PM2 logs for errors
pm2 logs graphql-api --lines 100
```

### Performance Issues

```bash
# Check memory usage
pm2 monit

# Check database connection pool
# Add to your Prisma configuration
# DATABASE_URL="postgresql://...?connection_limit=5"

# Enable query logging in Prisma
# In src/utils/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Debugging GraphQL Queries

```bash
# Enable debug mode in Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart() {
        return {
          async executionDidStart() {
            return {
              willResolveField({ info }) {
                const start = Date.now();
                return () => {
                  const duration = Date.now() - start;
                  if (duration > 100) {
                    console.log(`Slow resolver: ${info.parentType}.${info.fieldName} took ${duration}ms`);
                  }
                };
              },
            };
          },
        };
      },
    },
  ],
});
```

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Database not running | Start PostgreSQL service |
| `P2002` | Unique constraint violation | Check for duplicate data |
| `UNAUTHENTICATED` | Missing or invalid token | Verify Authorization header |
| `N+1 queries` | Missing DataLoader | Implement DataLoader for field resolvers |
| `WebSocket connection failed` | Nginx not configured | Enable WebSocket support in Nginx |

### Health Check Script

Create a health check script to verify all components are working.

```bash
#!/bin/bash
# health-check.sh

echo "Checking GraphQL API health..."

# Check HTTP endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "HTTP endpoint: OK"
else
    echo "HTTP endpoint: FAILED (status: $HTTP_STATUS)"
fi

# Check GraphQL endpoint
GQL_RESPONSE=$(curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}')

if echo "$GQL_RESPONSE" | grep -q "__typename"; then
    echo "GraphQL endpoint: OK"
else
    echo "GraphQL endpoint: FAILED"
fi

# Check database connection
if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "Database connection: OK"
else
    echo "Database connection: FAILED"
fi

# Check PM2 process
if pm2 list | grep -q "graphql-api.*online"; then
    echo "PM2 process: OK"
else
    echo "PM2 process: FAILED"
fi
```

## Summary

Building a production-ready GraphQL API server on Ubuntu involves several key components:

1. **Schema Design**: Define types, queries, mutations, and subscriptions that model your domain
2. **Resolvers**: Implement business logic with proper authentication and authorization
3. **Database Integration**: Use Prisma for type-safe database access
4. **Real-time Updates**: Enable subscriptions with WebSockets for live data
5. **Error Handling**: Create consistent error responses with proper status codes
6. **Performance**: Use DataLoader to solve the N+1 problem
7. **Deployment**: Use PM2 for process management with Nginx as reverse proxy
8. **Monitoring**: Implement structured logging and metrics collection

GraphQL provides a powerful foundation for building flexible, efficient APIs. The patterns and practices covered in this guide will help you build and maintain scalable GraphQL services.

---

Looking for a way to monitor your GraphQL API in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring, including endpoint health checks, performance metrics, and alerting. With OneUptime, you can track your GraphQL API's response times, error rates, and availability across all your resolvers. Set up custom alerts based on latency thresholds or error patterns, and use the built-in dashboards to visualize your API's performance over time. OneUptime integrates seamlessly with your existing logging and metrics infrastructure, giving you complete visibility into your GraphQL server's health.
