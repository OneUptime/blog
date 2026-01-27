# How to Use Express with GraphQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Express, Node.js, GraphQL, Apollo Server, API, Backend, TypeScript

Description: Learn how to build GraphQL APIs with Express.js using Apollo Server, including schema design, resolvers, authentication, error handling, and production best practices.

---

> GraphQL provides a complete and understandable description of the data in your API, gives clients the power to ask for exactly what they need, and makes it easier to evolve APIs over time.

Building a GraphQL API with Express.js gives you the flexibility of GraphQL's query language combined with Express's middleware ecosystem. This guide covers everything from basic setup to production-ready patterns.

## Setting Up Apollo Server with Express

### Installation

```bash
npm install express @apollo/server graphql cors body-parser
npm install --save-dev @types/node @types/express typescript
```

### Basic Server Setup

```javascript
// server.js
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const bodyParser = require('body-parser');

// Define your GraphQL schema
const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

// Define resolvers for the schema
const resolvers = {
  Query: {
    hello: () => 'Hello, GraphQL!',
  },
};

async function startServer() {
  const app = express();

  // Create Apollo Server instance
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // Start Apollo Server before applying middleware
  await server.start();

  // Apply middleware - order matters
  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(server)
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/graphql`);
  });
}

startServer();
```

## Defining GraphQL Schema

### Type Definitions

```javascript
// schema.js
const typeDefs = `#graphql
  # Custom scalar for dates
  scalar DateTime

  # User type with fields
  type User {
    id: ID!
    email: String!
    name: String!
    posts: [Post!]!
    createdAt: DateTime!
  }

  # Post type with author relationship
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

  type Comment {
    id: ID!
    text: String!
    author: User!
    post: Post!
    createdAt: DateTime!
  }

  # Input types for mutations
  input CreateUserInput {
    email: String!
    name: String!
    password: String!
  }

  input CreatePostInput {
    title: String!
    content: String!
    published: Boolean
  }

  input UpdatePostInput {
    title: String
    content: String
    published: Boolean
  }

  # Pagination input
  input PaginationInput {
    page: Int
    limit: Int
  }

  # Paginated response
  type PaginatedPosts {
    posts: [Post!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type Query {
    # Single item queries
    user(id: ID!): User
    post(id: ID!): Post
    me: User

    # List queries with pagination
    users(pagination: PaginationInput): [User!]!
    posts(pagination: PaginationInput, published: Boolean): PaginatedPosts!
  }

  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    login(email: String!, password: String!): AuthPayload!

    # Post mutations
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!

    # Comment mutations
    addComment(postId: ID!, text: String!): Comment!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Subscription {
    postCreated: Post!
    commentAdded(postId: ID!): Comment!
  }
`;

module.exports = typeDefs;
```

## Writing Resolvers

### Basic Resolvers

```javascript
// resolvers.js
const { GraphQLScalarType, Kind } = require('graphql');

// Custom DateTime scalar
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value) {
    // Convert Date to ISO string for response
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value) {
    // Convert incoming string to Date
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    // Fetch single user by ID
    user: async (_, { id }, { dataSources }) => {
      return dataSources.userAPI.getUser(id);
    },

    // Fetch current user from context
    me: async (_, __, { user, dataSources }) => {
      if (!user) return null;
      return dataSources.userAPI.getUser(user.id);
    },

    // Fetch single post by ID
    post: async (_, { id }, { dataSources }) => {
      return dataSources.postAPI.getPost(id);
    },

    // Fetch paginated posts
    posts: async (_, { pagination, published }, { dataSources }) => {
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;

      const [posts, totalCount] = await Promise.all([
        dataSources.postAPI.getPosts({ offset, limit, published }),
        dataSources.postAPI.getPostCount({ published }),
      ]);

      return {
        posts,
        totalCount,
        hasNextPage: offset + posts.length < totalCount,
      };
    },
  },

  Mutation: {
    // Create new user
    createUser: async (_, { input }, { dataSources }) => {
      const { email, name, password } = input;

      // Check if user exists
      const existing = await dataSources.userAPI.getUserByEmail(email);
      if (existing) {
        throw new Error('Email already registered');
      }

      return dataSources.userAPI.createUser({ email, name, password });
    },

    // Create new post
    createPost: async (_, { input }, { user, dataSources, pubsub }) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      const post = await dataSources.postAPI.createPost({
        ...input,
        authorId: user.id,
      });

      // Publish event for subscriptions
      pubsub.publish('POST_CREATED', { postCreated: post });

      return post;
    },

    // Update existing post
    updatePost: async (_, { id, input }, { user, dataSources }) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      const post = await dataSources.postAPI.getPost(id);
      if (!post) {
        throw new Error('Post not found');
      }

      // Check ownership
      if (post.authorId !== user.id) {
        throw new Error('Not authorized to update this post');
      }

      return dataSources.postAPI.updatePost(id, input);
    },

    // Delete post
    deletePost: async (_, { id }, { user, dataSources }) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      const post = await dataSources.postAPI.getPost(id);
      if (!post) {
        throw new Error('Post not found');
      }

      if (post.authorId !== user.id) {
        throw new Error('Not authorized to delete this post');
      }

      await dataSources.postAPI.deletePost(id);
      return true;
    },
  },

  // Field resolvers for relationships
  User: {
    // Fetch posts for a user
    posts: async (user, _, { dataSources }) => {
      return dataSources.postAPI.getPostsByAuthor(user.id);
    },
  },

  Post: {
    // Fetch author for a post
    author: async (post, _, { dataSources }) => {
      return dataSources.userAPI.getUser(post.authorId);
    },

    // Fetch comments for a post
    comments: async (post, _, { dataSources }) => {
      return dataSources.commentAPI.getCommentsByPost(post.id);
    },
  },

  Comment: {
    author: async (comment, _, { dataSources }) => {
      return dataSources.userAPI.getUser(comment.authorId);
    },
    post: async (comment, _, { dataSources }) => {
      return dataSources.postAPI.getPost(comment.postId);
    },
  },
};

module.exports = resolvers;
```

## Context and Authentication

### Setting Up Context

```javascript
// context.js
const jwt = require('jsonwebtoken');
const { UserAPI } = require('./datasources/UserAPI');
const { PostAPI } = require('./datasources/PostAPI');
const { CommentAPI } = require('./datasources/CommentAPI');

// Verify JWT token and extract user
function getUser(token) {
  if (!token) return null;

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    // Invalid token - return null, don't throw
    return null;
  }
}

// Context function called for every request
async function createContext({ req }) {
  // Get token from Authorization header
  const token = req.headers.authorization || '';
  const user = getUser(token);

  // Return context object available in all resolvers
  return {
    user,
    dataSources: {
      userAPI: new UserAPI(),
      postAPI: new PostAPI(),
      commentAPI: new CommentAPI(),
    },
  };
}

module.exports = { createContext, getUser };
```

### Using Context in Server

```javascript
// server.js
const { createContext } = require('./context');

async function startServer() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(server, {
      // Pass context function
      context: createContext,
    })
  );

  app.listen(PORT);
}
```

### Authentication Middleware

```javascript
// auth.js
const { GraphQLError } = require('graphql');

// Directive-based authentication
function authDirective(directiveName) {
  return {
    authDirectiveTypeDefs: `directive @${directiveName} on FIELD_DEFINITION`,

    authDirectiveTransformer: (schema) => {
      // Transform schema to add auth checks
      return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

          if (authDirective) {
            const { resolve = defaultFieldResolver } = fieldConfig;

            fieldConfig.resolve = async function (source, args, context, info) {
              if (!context.user) {
                throw new GraphQLError('Authentication required', {
                  extensions: { code: 'UNAUTHENTICATED' },
                });
              }
              return resolve(source, args, context, info);
            };
          }
          return fieldConfig;
        },
      });
    },
  };
}

// Simple auth check helper
function requireAuth(context) {
  if (!context.user) {
    throw new GraphQLError('You must be logged in', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
  return context.user;
}

module.exports = { authDirective, requireAuth };
```

## Error Handling in GraphQL

### Custom Error Classes

```javascript
// errors.js
const { GraphQLError } = require('graphql');

// Not found error
class NotFoundError extends GraphQLError {
  constructor(resource, id) {
    super(`${resource} with ID ${id} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        http: { status: 404 },
        resource,
        id,
      },
    });
  }
}

// Validation error
class ValidationError extends GraphQLError {
  constructor(message, field) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        http: { status: 400 },
        field,
      },
    });
  }
}

// Authorization error
class ForbiddenError extends GraphQLError {
  constructor(message = 'Not authorized') {
    super(message, {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });
  }
}

module.exports = { NotFoundError, ValidationError, ForbiddenError };
```

### Error Formatting

```javascript
// server.js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Log error for debugging
    console.error('GraphQL Error:', {
      message: formattedError.message,
      path: formattedError.path,
      code: formattedError.extensions?.code,
    });

    // Hide internal errors in production
    if (process.env.NODE_ENV === 'production') {
      // Keep custom errors with codes
      if (formattedError.extensions?.code) {
        return formattedError;
      }

      // Mask unexpected errors
      return {
        message: 'Internal server error',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };
    }

    // Return full error in development
    return formattedError;
  },
});
```

## DataLoader for N+1 Prevention

The N+1 problem occurs when fetching related data causes multiple database queries. DataLoader batches and caches requests.

### Setting Up DataLoader

```javascript
// dataloaders.js
const DataLoader = require('dataloader');

// Create DataLoader for users
function createUserLoader(userAPI) {
  return new DataLoader(async (userIds) => {
    // Batch fetch all users at once
    const users = await userAPI.getUsersByIds(userIds);

    // Return users in same order as input IDs
    const userMap = new Map(users.map((user) => [user.id, user]));
    return userIds.map((id) => userMap.get(id) || null);
  });
}

// Create DataLoader for posts by author
function createPostsByAuthorLoader(postAPI) {
  return new DataLoader(async (authorIds) => {
    // Batch fetch posts for all authors
    const posts = await postAPI.getPostsByAuthorIds(authorIds);

    // Group posts by author ID
    const postsByAuthor = new Map();
    posts.forEach((post) => {
      const authorPosts = postsByAuthor.get(post.authorId) || [];
      authorPosts.push(post);
      postsByAuthor.set(post.authorId, authorPosts);
    });

    // Return posts arrays in same order as input IDs
    return authorIds.map((id) => postsByAuthor.get(id) || []);
  });
}

// Create all loaders
function createLoaders(dataSources) {
  return {
    userLoader: createUserLoader(dataSources.userAPI),
    postsByAuthorLoader: createPostsByAuthorLoader(dataSources.postAPI),
  };
}

module.exports = { createLoaders };
```

### Using DataLoader in Context

```javascript
// context.js
const { createLoaders } = require('./dataloaders');

async function createContext({ req }) {
  const token = req.headers.authorization || '';
  const user = getUser(token);

  const dataSources = {
    userAPI: new UserAPI(),
    postAPI: new PostAPI(),
    commentAPI: new CommentAPI(),
  };

  // Create loaders per request to prevent caching across requests
  const loaders = createLoaders(dataSources);

  return {
    user,
    dataSources,
    loaders,
  };
}
```

### Using DataLoader in Resolvers

```javascript
// resolvers.js
const resolvers = {
  Post: {
    // Use DataLoader instead of direct fetch
    author: async (post, _, { loaders }) => {
      return loaders.userLoader.load(post.authorId);
    },
  },

  User: {
    posts: async (user, _, { loaders }) => {
      return loaders.postsByAuthorLoader.load(user.id);
    },
  },
};
```

## Subscriptions for Real-Time Data

### Setting Up Subscriptions

```javascript
// server.js
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');

// Create PubSub instance for publishing events
const pubsub = new PubSub();

async function startServer() {
  const app = express();

  // Create executable schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Set up WebSocket server with graphql-ws
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // Get auth token from connection params
        const token = ctx.connectionParams?.authorization || '';
        const user = getUser(token);
        return { user, pubsub };
      },
      onConnect: async (ctx) => {
        console.log('Client connected');
      },
      onDisconnect: async (ctx) => {
        console.log('Client disconnected');
      },
    },
    wsServer
  );

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      // Graceful shutdown
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
    cors(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        ...await createContext({ req }),
        pubsub,
      }),
    })
  );

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/graphql`);
    console.log(`Subscriptions at ws://localhost:${PORT}/graphql`);
  });
}
```

### Subscription Resolvers

```javascript
// resolvers.js
const resolvers = {
  Subscription: {
    // Subscribe to new posts
    postCreated: {
      subscribe: (_, __, { pubsub }) => {
        return pubsub.asyncIterator(['POST_CREATED']);
      },
    },

    // Subscribe to comments on a specific post
    commentAdded: {
      subscribe: (_, { postId }, { pubsub }) => {
        return pubsub.asyncIterator([`COMMENT_ADDED_${postId}`]);
      },
    },
  },

  Mutation: {
    createPost: async (_, { input }, { user, dataSources, pubsub }) => {
      const post = await dataSources.postAPI.createPost({
        ...input,
        authorId: user.id,
      });

      // Publish event to subscribers
      pubsub.publish('POST_CREATED', { postCreated: post });

      return post;
    },

    addComment: async (_, { postId, text }, { user, dataSources, pubsub }) => {
      const comment = await dataSources.commentAPI.createComment({
        postId,
        text,
        authorId: user.id,
      });

      // Publish to post-specific channel
      pubsub.publish(`COMMENT_ADDED_${postId}`, { commentAdded: comment });

      return comment;
    },
  },
};
```

## File Uploads

### Setting Up File Uploads

```javascript
// server.js
const { graphqlUploadExpress } = require('graphql-upload');

// Add upload scalar to schema
const typeDefs = `#graphql
  scalar Upload

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }

  type Mutation {
    uploadFile(file: Upload!): File!
    uploadAvatar(file: Upload!): User!
  }
`;
```

### Upload Resolver

```javascript
// resolvers.js
const { GraphQLUpload } = require('graphql-upload');
const { createWriteStream, mkdir } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const resolvers = {
  Upload: GraphQLUpload,

  Mutation: {
    uploadFile: async (_, { file }, { user }) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      // Await the file upload
      const { createReadStream, filename, mimetype, encoding } = await file;

      // Generate unique filename
      const uniqueFilename = `${uuidv4()}-${filename}`;
      const uploadDir = path.join(__dirname, '../uploads');
      const filePath = path.join(uploadDir, uniqueFilename);

      // Ensure upload directory exists
      await mkdir(uploadDir, { recursive: true });

      // Stream file to disk
      await new Promise((resolve, reject) => {
        const stream = createReadStream();
        const writeStream = createWriteStream(filePath);

        stream.pipe(writeStream);
        stream.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return {
        filename: uniqueFilename,
        mimetype,
        encoding,
        url: `/uploads/${uniqueFilename}`,
      };
    },

    uploadAvatar: async (_, { file }, { user, dataSources }) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      const { createReadStream, filename, mimetype } = await file;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.');
      }

      // Upload to storage (e.g., S3, local disk)
      const avatarUrl = await uploadToStorage(createReadStream(), filename);

      // Update user record
      return dataSources.userAPI.updateUser(user.id, { avatarUrl });
    },
  },
};
```

### Express Middleware for Uploads

```javascript
// server.js
const { graphqlUploadExpress } = require('graphql-upload');

app.use(
  '/graphql',
  cors(),
  graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }), // 10MB max
  bodyParser.json(),
  expressMiddleware(server, { context: createContext })
);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

## Testing GraphQL Endpoints

### Unit Testing Resolvers

```javascript
// resolvers.test.js
const { createTestClient } = require('apollo-server-testing');
const { ApolloServer } = require('@apollo/server');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

describe('Post Resolvers', () => {
  let server;
  let mockPostAPI;
  let mockUserAPI;

  beforeEach(() => {
    // Create mock data sources
    mockPostAPI = {
      getPost: jest.fn(),
      createPost: jest.fn(),
      getPosts: jest.fn(),
    };

    mockUserAPI = {
      getUser: jest.fn(),
    };

    server = new ApolloServer({
      typeDefs,
      resolvers,
    });
  });

  it('should fetch a post by ID', async () => {
    const mockPost = {
      id: '1',
      title: 'Test Post',
      content: 'Test content',
      authorId: 'user-1',
    };

    mockPostAPI.getPost.mockResolvedValue(mockPost);

    const response = await server.executeOperation(
      {
        query: `
          query GetPost($id: ID!) {
            post(id: $id) {
              id
              title
              content
            }
          }
        `,
        variables: { id: '1' },
      },
      {
        contextValue: {
          dataSources: { postAPI: mockPostAPI, userAPI: mockUserAPI },
          user: null,
        },
      }
    );

    expect(response.body.singleResult.errors).toBeUndefined();
    expect(response.body.singleResult.data.post).toEqual({
      id: '1',
      title: 'Test Post',
      content: 'Test content',
    });
    expect(mockPostAPI.getPost).toHaveBeenCalledWith('1');
  });

  it('should require auth for createPost', async () => {
    const response = await server.executeOperation(
      {
        query: `
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              id
              title
            }
          }
        `,
        variables: {
          input: { title: 'New Post', content: 'Content' },
        },
      },
      {
        contextValue: {
          dataSources: { postAPI: mockPostAPI },
          user: null, // No authenticated user
        },
      }
    );

    expect(response.body.singleResult.errors).toBeDefined();
    expect(response.body.singleResult.errors[0].message).toContain('Authentication required');
  });
});
```

### Integration Testing

```javascript
// integration.test.js
const request = require('supertest');
const { createTestServer } = require('./test-utils');

describe('GraphQL API Integration', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    app = await createTestServer();

    // Create test user and get token
    const res = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation {
            createUser(input: {
              email: "test@example.com"
              name: "Test User"
              password: "password123"
            }) {
              id
            }
          }
        `,
      });

    const loginRes = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation {
            login(email: "test@example.com", password: "password123") {
              token
            }
          }
        `,
      });

    authToken = loginRes.body.data.login.token;
  });

  it('should create and fetch a post', async () => {
    // Create post
    const createRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        query: `
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              id
              title
              content
              author {
                name
              }
            }
          }
        `,
        variables: {
          input: {
            title: 'Integration Test Post',
            content: 'This is test content',
            published: true,
          },
        },
      });

    expect(createRes.body.errors).toBeUndefined();
    expect(createRes.body.data.createPost.title).toBe('Integration Test Post');
    expect(createRes.body.data.createPost.author.name).toBe('Test User');

    const postId = createRes.body.data.createPost.id;

    // Fetch the created post
    const fetchRes = await request(app)
      .post('/graphql')
      .send({
        query: `
          query GetPost($id: ID!) {
            post(id: $id) {
              id
              title
              content
            }
          }
        `,
        variables: { id: postId },
      });

    expect(fetchRes.body.data.post.title).toBe('Integration Test Post');
  });
});
```

## Production Considerations

### Performance and Caching

```javascript
// server.js
const { ApolloServer } = require('@apollo/server');
const { ApolloServerPluginCacheControl } = require('@apollo/server/plugin/cacheControl');
const responseCachePlugin = require('@apollo/server-plugin-response-cache').default;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    // Enable cache control headers
    ApolloServerPluginCacheControl({
      defaultMaxAge: 5, // 5 seconds default
    }),
    // Response caching
    responseCachePlugin(),
  ],
});

// Add cache hints in schema
const typeDefs = `#graphql
  type Query {
    # Cache public data for 1 hour
    publicPosts: [Post!]! @cacheControl(maxAge: 3600)

    # Never cache user-specific data
    me: User @cacheControl(maxAge: 0, scope: PRIVATE)
  }
`;
```

### Query Complexity and Depth Limiting

```javascript
// server.js
const depthLimit = require('graphql-depth-limit');
const { createComplexityLimitRule } = require('graphql-validation-complexity');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    // Limit query depth to prevent deeply nested queries
    depthLimit(10),

    // Limit query complexity
    createComplexityLimitRule(1000, {
      onCost: (cost) => {
        console.log('Query cost:', cost);
      },
    }),
  ],
});
```

### Rate Limiting

```javascript
// server.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for mutations
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 mutations per minute
  skip: (req) => {
    // Only apply to mutations
    const body = req.body;
    return !body?.query?.trim().startsWith('mutation');
  },
});

app.use('/graphql', limiter, mutationLimiter);
```

### Monitoring and Logging

```javascript
// server.js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart(requestContext) {
        const startTime = Date.now();

        return {
          async didResolveOperation(context) {
            console.log('Operation:', context.operationName);
          },

          async willSendResponse(context) {
            const duration = Date.now() - startTime;
            console.log({
              operationName: context.operationName,
              duration,
              errors: context.errors?.length || 0,
            });
          },

          async didEncounterErrors(context) {
            for (const error of context.errors) {
              console.error('GraphQL Error:', {
                message: error.message,
                path: error.path,
                code: error.extensions?.code,
              });
            }
          },
        };
      },
    },
  ],
});
```

## Best Practices Summary

| Area | Best Practice |
|------|---------------|
| **Schema Design** | Use clear naming, input types for mutations, and pagination for lists |
| **Authentication** | Validate tokens in context, use custom errors for auth failures |
| **Error Handling** | Create custom error classes with codes, mask internal errors in production |
| **N+1 Prevention** | Use DataLoader for batching and caching related data fetches |
| **Subscriptions** | Use graphql-ws for WebSocket transport, PubSub for event distribution |
| **File Uploads** | Validate file types and sizes, stream to storage |
| **Testing** | Unit test resolvers with mocks, integration test full queries |
| **Performance** | Implement caching, limit query depth and complexity |
| **Security** | Rate limit mutations, validate input, sanitize errors |

Building GraphQL APIs with Express and Apollo Server provides a powerful, flexible foundation for your applications. The combination of Express middleware support and GraphQL's query language gives you the best of both worlds - established patterns and modern API design.

For monitoring your GraphQL APIs in production, [OneUptime](https://oneuptime.com) provides comprehensive observability including request tracing, error tracking, and performance monitoring to ensure your APIs stay healthy and performant.
