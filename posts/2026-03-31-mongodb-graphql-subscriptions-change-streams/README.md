# How to Use Subscriptions with MongoDB Change Streams in GraphQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GraphQL, Subscription, Change Stream, WebSocket

Description: Learn how to implement real-time GraphQL subscriptions using MongoDB change streams and Apollo Server with WebSocket transport.

---

GraphQL subscriptions push data to clients over a persistent WebSocket connection. MongoDB change streams provide a native way to watch for document changes in real time, making them the ideal event source for GraphQL subscriptions.

## Installing Dependencies

```bash
npm install @apollo/server @graphql-tools/schema graphql-ws ws graphql mongoose express graphql-subscriptions
```

## Setting Up WebSocket Transport

Apollo Server 4 separates HTTP and WebSocket handling. Use `graphql-ws` for the subscription transport:

```javascript
const http = require('http');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const express = require('express');

const app = express();
const httpServer = http.createServer(app);

const schema = makeExecutableSchema({ typeDefs, resolvers });

const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
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
app.use('/graphql', express.json(), expressMiddleware(server));
await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
```

## Defining the Subscription Schema

```graphql
type Post {
  id: ID!
  title: String!
  body: String!
  authorId: ID!
}

type Subscription {
  postCreated: Post!
  postUpdated(id: ID): Post!
  postDeleted: ID!
}

type Mutation {
  createPost(title: String!, body: String!): Post!
}
```

## Creating a PubSub from MongoDB Change Streams

```javascript
const { PubSub } = require('graphql-subscriptions');
const mongoose = require('mongoose');
const Post = require('./models/Post');

const pubsub = new PubSub();

function watchPostChanges() {
  const changeStream = Post.watch([], { fullDocument: 'updateLookup' });

  changeStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      pubsub.publish('POST_CREATED', { postCreated: change.fullDocument });
    } else if (change.operationType === 'update' || change.operationType === 'replace') {
      pubsub.publish('POST_UPDATED', { postUpdated: change.fullDocument });
    } else if (change.operationType === 'delete') {
      pubsub.publish('POST_DELETED', { postDeleted: change.documentKey._id.toString() });
    }
  });

  changeStream.on('error', (err) => {
    console.error('Change stream error:', err);
  });
}

// Start watching after connecting to MongoDB
mongoose.connection.once('open', watchPostChanges);
```

## Writing Subscription Resolvers

```javascript
const { withFilter } = require('graphql-subscriptions');

const resolvers = {
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterableIterator(['POST_CREATED']),
      resolve: (payload) => ({
        ...payload.postCreated,
        id: payload.postCreated._id.toString(),
      }),
    },

    postUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator(['POST_UPDATED']),
        (payload, variables) => {
          if (!variables.id) return true;
          return payload.postUpdated._id.toString() === variables.id;
        }
      ),
      resolve: (payload) => ({
        ...payload.postUpdated,
        id: payload.postUpdated._id.toString(),
      }),
    },

    postDeleted: {
      subscribe: () => pubsub.asyncIterableIterator(['POST_DELETED']),
      resolve: (payload) => payload.postDeleted,
    },
  },
};
```

## Client-Side Subscription

```javascript
import { gql, useSubscription } from '@apollo/client';

const POST_CREATED = gql`
  subscription {
    postCreated {
      id
      title
      body
    }
  }
`;

function LiveFeed() {
  const { data } = useSubscription(POST_CREATED);
  return <div>{data?.postCreated.title}</div>;
}
```

## Summary

MongoDB change streams act as a reliable event bus for GraphQL subscriptions. Watch collections with `fullDocument: 'updateLookup'` to receive the complete updated document, not just the diff. Use `withFilter` to send subscription events only to clients that requested a specific document, reducing unnecessary WebSocket traffic.
