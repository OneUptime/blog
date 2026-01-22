# How to Create GraphQL APIs with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, GraphQL, API, Apollo, Express

Description: Learn how to create GraphQL APIs with Node.js using Apollo Server, including schema design, resolvers, mutations, subscriptions, and authentication.

---

GraphQL provides a flexible query language for APIs that allows clients to request exactly the data they need. This guide covers building GraphQL APIs with Apollo Server in Node.js.

## Installation

```bash
npm install @apollo/server graphql
npm install express cors  # If using Express integration
```

## Basic Apollo Server Setup

### Standalone Server

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

// Schema definition
const typeDefs = `
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [Book]
  }
`;

// Sample data
const books = [
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
  { title: '1984', author: 'George Orwell' },
];

// Resolvers
const resolvers = {
  Query: {
    books: () => books,
  },
};

// Create and start server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function start() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
  console.log(`Server ready at ${url}`);
}

start();
```

### With Express

```javascript
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const app = express();

const typeDefs = `
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello World!',
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function start() {
  await server.start();
  
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.authorization }),
    })
  );
  
  app.listen(4000, () => {
    console.log('Server running on http://localhost:4000/graphql');
  });
}

start();
```

## Schema Design

### Type Definitions

```javascript
const typeDefs = `
  # Scalar types
  scalar Date

  # Enums
  enum Status {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  # Object types
  type User {
    id: ID!
    email: String!
    name: String
    posts: [Post!]!
    createdAt: Date
  }

  type Post {
    id: ID!
    title: String!
    content: String
    status: Status!
    author: User!
    tags: [String!]
  }

  # Input types for mutations
  input CreateUserInput {
    email: String!
    name: String
    password: String!
  }

  input CreatePostInput {
    title: String!
    content: String
    status: Status = DRAFT
  }

  # Query root type
  type Query {
    users: [User!]!
    user(id: ID!): User
    posts(status: Status): [Post!]!
    post(id: ID!): Post
  }

  # Mutation root type
  type Mutation {
    createUser(input: CreateUserInput!): User!
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: CreatePostInput!): Post
    deletePost(id: ID!): Boolean!
  }

  # Subscription root type
  type Subscription {
    postCreated: Post!
  }
`;
```

### Interfaces and Unions

```javascript
const typeDefs = `
  interface Node {
    id: ID!
    createdAt: Date!
  }

  type User implements Node {
    id: ID!
    createdAt: Date!
    name: String!
  }

  type Post implements Node {
    id: ID!
    createdAt: Date!
    title: String!
  }

  union SearchResult = User | Post

  type Query {
    search(term: String!): [SearchResult!]!
    node(id: ID!): Node
  }
`;

const resolvers = {
  SearchResult: {
    __resolveType(obj) {
      if (obj.name) return 'User';
      if (obj.title) return 'Post';
      return null;
    },
  },
  Node: {
    __resolveType(obj) {
      if (obj.name) return 'User';
      if (obj.title) return 'Post';
      return null;
    },
  },
};
```

## Resolvers

### Basic Resolvers

```javascript
const resolvers = {
  Query: {
    // Return all users
    users: async (parent, args, context, info) => {
      return context.db.users.findAll();
    },
    
    // Return single user
    user: async (parent, { id }, context) => {
      return context.db.users.findByPk(id);
    },
    
    // With filtering
    posts: async (parent, { status }, context) => {
      const where = status ? { status } : {};
      return context.db.posts.findAll({ where });
    },
  },
  
  Mutation: {
    createUser: async (parent, { input }, context) => {
      return context.db.users.create(input);
    },
    
    createPost: async (parent, { input }, context) => {
      const post = await context.db.posts.create({
        ...input,
        authorId: context.user.id,
      });
      return post;
    },
    
    deletePost: async (parent, { id }, context) => {
      const deleted = await context.db.posts.destroy({ where: { id } });
      return deleted > 0;
    },
  },
  
  // Field resolvers
  User: {
    posts: async (user, args, context) => {
      return context.db.posts.findAll({
        where: { authorId: user.id },
      });
    },
  },
  
  Post: {
    author: async (post, args, context) => {
      return context.db.users.findByPk(post.authorId);
    },
  },
};
```

### Resolver Arguments

```javascript
const resolvers = {
  Query: {
    posts: (
      parent,    // Parent resolver result
      args,      // Arguments { status, limit, offset }
      context,   // Shared context { db, user, etc }
      info       // Query metadata
    ) => {
      const { status, limit = 10, offset = 0 } = args;
      return context.db.posts.findAll({
        where: status ? { status } : {},
        limit,
        offset,
      });
    },
  },
};
```

## Context and Authentication

### Setting Up Context

```javascript
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const jwt = require('jsonwebtoken');

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

app.use(
  '/graphql',
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      // Get token from header
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      let user = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user = await db.users.findByPk(decoded.userId);
        } catch (error) {
          // Invalid token
        }
      }
      
      return {
        db,
        user,
        req,
      };
    },
  })
);
```

### Authentication Resolver

```javascript
const { GraphQLError } = require('graphql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const typeDefs = `
  type AuthPayload {
    token: String!
    user: User!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(input: CreateUserInput!): AuthPayload!
  }
`;

const resolvers = {
  Mutation: {
    login: async (parent, { email, password }, context) => {
      const user = await context.db.users.findOne({ where: { email } });
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new GraphQLError('Invalid password', {
          extensions: { code: 'INVALID_PASSWORD' },
        });
      }
      
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return { token, user };
    },
  },
};
```

### Authorization

```javascript
const { GraphQLError } = require('graphql');

// Helper function
function requireAuth(context) {
  if (!context.user) {
    throw new GraphQLError('You must be logged in', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

const resolvers = {
  Mutation: {
    createPost: async (parent, { input }, context) => {
      requireAuth(context);
      
      return context.db.posts.create({
        ...input,
        authorId: context.user.id,
      });
    },
    
    deletePost: async (parent, { id }, context) => {
      requireAuth(context);
      
      const post = await context.db.posts.findByPk(id);
      
      if (post.authorId !== context.user.id) {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      
      await post.destroy();
      return true;
    },
  },
};
```

## Subscriptions (Real-time)

```bash
npm install graphql-ws ws
```

```javascript
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();

const typeDefs = `
  type Post {
    id: ID!
    title: String!
  }

  type Query {
    posts: [Post!]!
  }

  type Mutation {
    createPost(title: String!): Post!
  }

  type Subscription {
    postCreated: Post!
  }
`;

const resolvers = {
  Query: {
    posts: () => posts,
  },
  Mutation: {
    createPost: (parent, { title }) => {
      const post = { id: String(posts.length + 1), title };
      posts.push(post);
      
      // Publish to subscribers
      pubsub.publish('POST_CREATED', { postCreated: post });
      
      return post;
    },
  },
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator(['POST_CREATED']),
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create HTTP and WebSocket servers
const app = express();
const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Set up WebSocket server
useServer({ schema }, wsServer);

// Start server
httpServer.listen(4000, () => {
  console.log('Server running on http://localhost:4000/graphql');
});
```

## Error Handling

```javascript
const { GraphQLError } = require('graphql');

const resolvers = {
  Query: {
    user: async (parent, { id }, context) => {
      const user = await context.db.users.findByPk(id);
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'NOT_FOUND',
            argumentName: 'id',
          },
        });
      }
      
      return user;
    },
  },
};

// Custom error formatting
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    // Log error
    console.error(error);
    
    // Hide internal errors from clients
    if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      return new GraphQLError('Internal server error', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
    
    return error;
  },
});
```

## DataLoader (N+1 Problem)

```bash
npm install dataloader
```

```javascript
const DataLoader = require('dataloader');

// Create loaders in context
app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      return {
        loaders: {
          users: new DataLoader(async (ids) => {
            const users = await db.users.findAll({
              where: { id: ids },
            });
            // Return in same order as requested
            return ids.map(id => users.find(u => u.id === id));
          }),
        },
      };
    },
  })
);

// Use in resolvers
const resolvers = {
  Post: {
    author: async (post, args, context) => {
      // Batches multiple requests
      return context.loaders.users.load(post.authorId);
    },
  },
};
```

## Pagination

```javascript
const typeDefs = `
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type PostEdge {
    cursor: String!
    node: Post!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Query {
    posts(first: Int, after: String): PostConnection!
  }
`;

const resolvers = {
  Query: {
    posts: async (parent, { first = 10, after }, context) => {
      const where = after ? { id: { [Op.gt]: decodeCursor(after) } } : {};
      
      const posts = await context.db.posts.findAll({
        where,
        limit: first + 1,
        order: [['id', 'ASC']],
      });
      
      const hasNextPage = posts.length > first;
      const edges = posts.slice(0, first).map(post => ({
        cursor: encodeCursor(post.id),
        node: post,
      }));
      
      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount: await context.db.posts.count(),
      };
    },
  },
};

function encodeCursor(id) {
  return Buffer.from(`cursor:${id}`).toString('base64');
}

function decodeCursor(cursor) {
  return Buffer.from(cursor, 'base64').toString().replace('cursor:', '');
}
```

## Summary

| Feature | Implementation |
|---------|----------------|
| Schema | Type definitions with `typeDefs` |
| Queries | Resolver functions |
| Mutations | Write operations in resolvers |
| Subscriptions | PubSub + WebSocket |
| Auth | Context + JWT |
| N+1 Problem | DataLoader |
| Pagination | Cursor-based connections |

Best practices:
- Use input types for complex mutations
- Implement proper error handling with custom codes
- Use DataLoader to prevent N+1 queries
- Implement cursor-based pagination
- Validate input data
- Use subscriptions sparingly (consider polling for simpler cases)
