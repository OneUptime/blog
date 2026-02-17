# How to Build a Serverless GraphQL API on Cloud Run with Automatic Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, GraphQL, Serverless, API Development, Apollo Server

Description: Build and deploy a production-ready GraphQL API on Google Cloud Run with automatic scaling, authentication, caching, and performance optimization techniques.

---

GraphQL has become the standard for flexible API design. Instead of maintaining dozens of REST endpoints with different response shapes, you define a schema and let clients request exactly the data they need. Combining GraphQL with Cloud Run gives you a serverless deployment that scales automatically from zero to thousands of concurrent requests without managing any infrastructure.

In this guide, I will build a production-ready GraphQL API on Cloud Run using Apollo Server, with authentication, data loaders for batching, caching, and proper error handling.

## Setting Up the Project

Start with a basic Node.js project and the required dependencies.

```bash
mkdir graphql-api && cd graphql-api
npm init -y
npm install @apollo/server graphql express @google-cloud/firestore
npm install dataloader cors helmet
npm install -D typescript @types/node @types/express ts-node
```

## Defining the GraphQL Schema

Define your schema with types, queries, and mutations. Keep it organized by domain.

```graphql
# schema.graphql
type User {
  id: ID!
  email: String!
  name: String!
  orders: [Order!]!
  createdAt: String!
}

type Order {
  id: ID!
  userId: ID!
  user: User!
  items: [OrderItem!]!
  total: Float!
  status: OrderStatus!
  createdAt: String!
}

type OrderItem {
  productId: ID!
  productName: String!
  quantity: Int!
  unitPrice: Float!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
  order(id: ID!): Order
  orders(userId: ID, status: OrderStatus, limit: Int): [Order!]!
}

type Mutation {
  createOrder(input: CreateOrderInput!): Order!
  updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!
  cancelOrder(orderId: ID!): Order!
}

input CreateOrderInput {
  userId: ID!
  items: [OrderItemInput!]!
}

input OrderItemInput {
  productId: ID!
  productName: String!
  quantity: Int!
  unitPrice: Float!
}
```

## Implementing Resolvers

Resolvers connect the schema to your data sources. Use data loaders to batch and deduplicate database queries.

```javascript
// resolvers.js
const { GraphQLError } = require('graphql');

const resolvers = {
  Query: {
    // Fetch a single user by ID
    user: async (_, { id }, { dataSources }) => {
      const user = await dataSources.userLoader.load(id);
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return user;
    },

    // Fetch a list of users with pagination
    users: async (_, { limit = 20, offset = 0 }, { dataSources }) => {
      return dataSources.db
        .collection('users')
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit)
        .get()
        .then(snapshot => snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })));
    },

    // Fetch a single order
    order: async (_, { id }, { dataSources }) => {
      return dataSources.orderLoader.load(id);
    },

    // Fetch orders with optional filters
    orders: async (_, { userId, status, limit = 20 }, { dataSources }) => {
      let query = dataSources.db.collection('orders');

      if (userId) {
        query = query.where('userId', '==', userId);
      }
      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.limit(limit).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  },

  Mutation: {
    createOrder: async (_, { input }, { dataSources, currentUser }) => {
      // Require authentication for mutations
      if (!currentUser) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const total = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice, 0
      );

      const orderRef = dataSources.db.collection('orders').doc();
      const order = {
        userId: input.userId,
        items: input.items,
        total,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      await orderRef.set(order);
      return { id: orderRef.id, ...order };
    },

    updateOrderStatus: async (_, { orderId, status }, { dataSources }) => {
      const orderRef = dataSources.db.collection('orders').doc(orderId);
      await orderRef.update({ status });
      const doc = await orderRef.get();
      return { id: doc.id, ...doc.data() };
    },
  },

  // Resolve nested relationships
  User: {
    orders: async (user, _, { dataSources }) => {
      const snapshot = await dataSources.db
        .collection('orders')
        .where('userId', '==', user.id)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  },

  Order: {
    user: async (order, _, { dataSources }) => {
      return dataSources.userLoader.load(order.userId);
    },
  },
};

module.exports = resolvers;
```

## Setting Up DataLoaders

DataLoaders batch and cache database lookups within a single request. Without them, a query for 10 orders with their users would make 10 separate user lookups. With DataLoaders, it makes a single batched query.

```javascript
// dataloaders.js
const DataLoader = require('dataloader');

function createLoaders(db) {
  return {
    // Batch user lookups - if 10 orders reference 5 unique users,
    // this makes a single query for those 5 users
    userLoader: new DataLoader(async (userIds) => {
      const uniqueIds = [...new Set(userIds)];
      const docs = await Promise.all(
        uniqueIds.map(id => db.collection('users').doc(id).get())
      );

      const userMap = {};
      docs.forEach(doc => {
        if (doc.exists) {
          userMap[doc.id] = { id: doc.id, ...doc.data() };
        }
      });

      // Return results in the same order as the input IDs
      return userIds.map(id => userMap[id] || null);
    }),

    // Batch order lookups
    orderLoader: new DataLoader(async (orderIds) => {
      const docs = await Promise.all(
        orderIds.map(id => db.collection('orders').doc(id).get())
      );

      return docs.map(doc =>
        doc.exists ? { id: doc.id, ...doc.data() } : null
      );
    }),
  };
}

module.exports = { createLoaders };
```

## Building the Server

Wire everything together with Express and Apollo Server.

```javascript
// server.js
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { readFileSync } = require('fs');
const { Firestore } = require('@google-cloud/firestore');
const resolvers = require('./resolvers');
const { createLoaders } = require('./dataloaders');

const typeDefs = readFileSync('./schema.graphql', 'utf8');
const db = new Firestore();

async function startServer() {
  const app = express();

  // Create the Apollo Server instance
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    plugins: [
      // Log slow queries for debugging
      {
        async requestDidStart() {
          const start = Date.now();
          return {
            async willSendResponse({ request }) {
              const duration = Date.now() - start;
              if (duration > 1000) {
                console.warn(`Slow query (${duration}ms): ${request.query?.substring(0, 100)}`);
              }
            },
          };
        },
      },
    ],
  });

  await server.start();

  // Apply security middleware
  app.use(helmet({ contentSecurityPolicy: false }));

  // Health check endpoint for Cloud Run
  app.get('/health', (req, res) => res.send('OK'));

  // GraphQL endpoint
  app.use(
    '/graphql',
    cors(),
    express.json({ limit: '1mb' }),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Extract the authenticated user from the request
        const currentUser = await authenticateRequest(req);

        // Create fresh DataLoaders for each request
        // (they cache within a single request, not across requests)
        const loaders = createLoaders(db);

        return {
          currentUser,
          dataSources: {
            db,
            ...loaders,
          },
        };
      },
    })
  );

  const port = parseInt(process.env.PORT || '8080');
  app.listen(port, () => {
    console.log(`GraphQL server running on port ${port}`);
  });
}

async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  // Verify the token - replace with your auth logic
  try {
    const token = authHeader.split(' ')[1];
    // Verify token with Identity Platform or your auth provider
    return { id: 'user-123', email: 'user@example.com' };
  } catch {
    return null;
  }
}

startServer();
```

## Adding Response Caching

For queries that do not change frequently, add cache control hints to your schema.

```javascript
// Add cache hints in resolvers
const resolvers = {
  Query: {
    user: async (_, { id }, { dataSources }, info) => {
      // Cache user data for 60 seconds
      info.cacheControl.setCacheHint({ maxAge: 60 });
      return dataSources.userLoader.load(id);
    },
  },
};
```

## Deploying to Cloud Run

Create the Dockerfile and deploy.

```dockerfile
# Dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

```bash
# Deploy to Cloud Run with automatic scaling
gcloud run deploy graphql-api \
  --source=. \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=100 \
  --concurrency=80 \
  --timeout=30

# The service URL will be your GraphQL endpoint
# e.g., https://graphql-api-xxxx.run.app/graphql
```

## Configuring Autoscaling

Cloud Run scales based on concurrent requests. Tune these settings based on your GraphQL query complexity.

```bash
# For CPU-intensive queries (complex resolvers, heavy data processing)
gcloud run services update graphql-api \
  --concurrency=20 \
  --cpu=2 \
  --memory=1Gi

# For I/O-bound queries (mostly database lookups)
gcloud run services update graphql-api \
  --concurrency=100 \
  --cpu=1 \
  --memory=512Mi

# Keep minimum instances warm to avoid cold starts
gcloud run services update graphql-api \
  --min-instances=1
```

## Query Complexity Limiting

Prevent expensive queries from overwhelming your service by limiting query depth and complexity.

```javascript
// Add query depth limiting
const depthLimit = require('graphql-depth-limit');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    // Limit query depth to 5 levels to prevent deeply nested queries
    depthLimit(5),
  ],
});
```

## Wrapping Up

GraphQL on Cloud Run gives you a flexible, scalable API layer without server management. DataLoaders are essential for preventing N+1 query problems. Authentication should happen in the context function, not in individual resolvers. And always limit query complexity to prevent abuse.

Monitor your GraphQL API's performance with OneUptime to track query latency distributions, error rates, and scaling behavior. When a particular query type starts taking longer than expected, you want to know immediately so you can optimize the resolver or add caching before it affects your users.
