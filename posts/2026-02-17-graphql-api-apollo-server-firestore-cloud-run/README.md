# How to Build a GraphQL API with Apollo Server and Firestore on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GraphQL, Apollo Server, Firestore, Cloud Run, Node.js, Google Cloud

Description: Build a production-ready GraphQL API using Apollo Server 4 with Firestore as the database, deployed to Cloud Run with proper error handling and pagination.

---

GraphQL and Firestore make a natural pair. GraphQL lets clients request exactly the data they need, and Firestore's document model maps cleanly to GraphQL types. Add Cloud Run to the mix and you get a serverless GraphQL API that scales automatically and costs nothing when idle.

In this post, I will build a complete GraphQL API using Apollo Server 4 with Firestore as the backing database, and deploy it to Cloud Run. We will cover schema design, resolvers, data loaders for efficient queries, error handling, and pagination.

## Project Setup

```bash
# Initialize project and install dependencies
mkdir graphql-firestore && cd graphql-firestore
npm init -y
npm install @apollo/server graphql @google-cloud/firestore express cors
```

## Defining the GraphQL Schema

Let's build an API for a task management application.

```javascript
// schema.js - Define the GraphQL type definitions
const typeDefs = `#graphql
  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    assignee: User
    assigneeId: String
    tags: [String!]!
    createdAt: String!
    updatedAt: String
  }

  type User {
    id: ID!
    name: String!
    email: String!
    tasks: [Task!]!
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
    ARCHIVED
  }

  type TaskConnection {
    tasks: [Task!]!
    nextPageToken: String
    totalCount: Int
  }

  input CreateTaskInput {
    title: String!
    description: String
    assigneeId: String
    tags: [String!]
  }

  input UpdateTaskInput {
    title: String
    description: String
    status: TaskStatus
    assigneeId: String
    tags: [String!]
  }

  type Query {
    task(id: ID!): Task
    tasks(
      status: TaskStatus
      assigneeId: String
      limit: Int
      pageToken: String
    ): TaskConnection!
    user(id: ID!): User
    users: [User!]!
  }

  type Mutation {
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
    createUser(name: String!, email: String!): User!
  }
`;

module.exports = typeDefs;
```

## Setting Up Firestore

```javascript
// firestore.js - Initialize Firestore client
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: process.env.PROJECT_ID || 'your-project-id',
});

// Collection references
const tasksCollection = db.collection('tasks');
const usersCollection = db.collection('users');

module.exports = { db, tasksCollection, usersCollection };
```

## Building the Resolvers

```javascript
// resolvers.js - GraphQL resolvers backed by Firestore
const { tasksCollection, usersCollection } = require('./firestore');
const { GraphQLError } = require('graphql');

const resolvers = {
  Query: {
    // Fetch a single task by ID
    task: async (_, { id }) => {
      const doc = await tasksCollection.doc(id).get();
      if (!doc.exists) {
        throw new GraphQLError('Task not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return { id: doc.id, ...doc.data() };
    },

    // Fetch tasks with optional filtering and pagination
    tasks: async (_, { status, assigneeId, limit = 20, pageToken }) => {
      let query = tasksCollection.orderBy('createdAt', 'desc');

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }
      if (assigneeId) {
        query = query.where('assigneeId', '==', assigneeId);
      }

      // Handle cursor-based pagination
      if (pageToken) {
        const cursorDoc = await tasksCollection.doc(pageToken).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      // Fetch one extra to determine if there are more pages
      const snapshot = await query.limit(limit + 1).get();
      const tasks = [];
      let nextPageToken = null;

      snapshot.docs.forEach((doc, index) => {
        if (index < limit) {
          tasks.push({ id: doc.id, ...doc.data() });
        } else {
          // There are more results - use the last returned doc as the cursor
          nextPageToken = tasks[tasks.length - 1].id;
        }
      });

      return {
        tasks,
        nextPageToken,
        totalCount: tasks.length,
      };
    },

    // Fetch a single user
    user: async (_, { id }) => {
      const doc = await usersCollection.doc(id).get();
      if (!doc.exists) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return { id: doc.id, ...doc.data() };
    },

    // Fetch all users
    users: async () => {
      const snapshot = await usersCollection.orderBy('name').get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
  },

  Mutation: {
    // Create a new task
    createTask: async (_, { input }) => {
      const taskData = {
        title: input.title,
        description: input.description || '',
        status: 'TODO',
        assigneeId: input.assigneeId || null,
        tags: input.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      const docRef = await tasksCollection.add(taskData);
      return { id: docRef.id, ...taskData };
    },

    // Update an existing task
    updateTask: async (_, { id, input }) => {
      const docRef = tasksCollection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new GraphQLError('Task not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Only include fields that were actually provided
      const updates = { updatedAt: new Date().toISOString() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId;
      if (input.tags !== undefined) updates.tags = input.tags;

      await docRef.update(updates);

      const updated = await docRef.get();
      return { id: updated.id, ...updated.data() };
    },

    // Delete a task
    deleteTask: async (_, { id }) => {
      const docRef = tasksCollection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new GraphQLError('Task not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await docRef.delete();
      return true;
    },

    // Create a user
    createUser: async (_, { name, email }) => {
      // Check for duplicate email
      const existing = await usersCollection
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existing.empty) {
        throw new GraphQLError('Email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const userData = {
        name,
        email,
        createdAt: new Date().toISOString(),
      };

      const docRef = await usersCollection.add(userData);
      return { id: docRef.id, ...userData };
    },
  },

  // Field resolvers for nested types
  Task: {
    // Resolve the assignee field by loading the user document
    assignee: async (task) => {
      if (!task.assigneeId) return null;

      const doc = await usersCollection.doc(task.assigneeId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    },
  },

  User: {
    // Resolve the tasks field by querying tasks for this user
    tasks: async (user) => {
      const snapshot = await tasksCollection
        .where('assigneeId', '==', user.id)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
  },
};

module.exports = resolvers;
```

## Solving the N+1 Problem with DataLoader

The naive Task.assignee resolver above will make one Firestore query per task. If you fetch 50 tasks, that is 50 additional queries to load assignees. DataLoader batches these into fewer queries.

```javascript
// dataloader.js - Batch Firestore reads with DataLoader
const DataLoader = require('dataloader');
const { usersCollection } = require('./firestore');

function createLoaders() {
  return {
    // Batch load users by their IDs
    userLoader: new DataLoader(async (userIds) => {
      // Firestore getAll supports up to 500 documents at once
      const refs = userIds.map((id) => usersCollection.doc(id));
      const docs = await usersCollection.firestore.getAll(...refs);

      // Map results back to the original order
      const userMap = new Map();
      docs.forEach((doc) => {
        if (doc.exists) {
          userMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });

      // Return in the same order as the input IDs
      return userIds.map((id) => userMap.get(id) || null);
    }),
  };
}

module.exports = { createLoaders };
```

Install DataLoader and update the resolvers.

```bash
npm install dataloader
```

## Putting It All Together

```javascript
// server.js - Apollo Server with Express on Cloud Run
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const cors = require('cors');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { createLoaders } = require('./dataloader');

async function startServer() {
  const app = express();

  // Create the Apollo Server instance
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // Include stack traces only in development
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  });

  // Start Apollo Server
  await server.start();

  // Apply middleware with context creation
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      // Create fresh data loaders for each request
      context: async ({ req }) => ({
        loaders: createLoaders(),
        // You can add auth context here
        // user: await verifyToken(req.headers.authorization),
      }),
    })
  );

  // Health check for Cloud Run
  app.get('/', (req, res) => {
    res.json({ status: 'healthy' });
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`GraphQL server running at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch(console.error);
```

## Deploying to Cloud Run

```bash
# Deploy the GraphQL API to Cloud Run
gcloud run deploy graphql-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production"
```

## Testing the API

Once deployed, you can test your API with curl or any GraphQL client.

```bash
# Create a user
curl -X POST https://your-service.run.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createUser(name: \"Jane\", email: \"jane@example.com\") { id name email } }"}'

# Create a task
curl -X POST https://your-service.run.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createTask(input: { title: \"Build GraphQL API\", description: \"Write resolvers\" }) { id title status } }"}'

# Query tasks with pagination
curl -X POST https://your-service.run.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ tasks(limit: 10) { tasks { id title status assignee { name } } nextPageToken } }"}'
```

Building a GraphQL API with Apollo Server and Firestore on Cloud Run gives you a flexible, scalable, and cost-effective backend. The combination of GraphQL's query flexibility with Firestore's schemaless documents means you can iterate on your data model quickly, and Cloud Run ensures you only pay for what you use.
