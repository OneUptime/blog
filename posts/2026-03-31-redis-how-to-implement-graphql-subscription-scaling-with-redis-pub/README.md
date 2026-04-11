# How to Implement GraphQL Subscription Scaling with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GraphQL, Subscription, Pub/Sub, WebSocket, Scaling

Description: Scale GraphQL subscriptions across multiple server instances using Redis Pub/Sub as a shared message broker for real-time event delivery.

---

## The Problem with GraphQL Subscriptions at Scale

GraphQL subscriptions use WebSockets to push real-time updates to clients. When you run multiple server instances, a subscription event published on server A will not reach clients connected to server B.

Redis Pub/Sub solves this by acting as a shared message bus. Every server subscribes to Redis channels, and when any server publishes an event, all servers receive it and forward it to their connected clients.

## Architecture Overview

```text
Client A -> Server 1 -> Subscribe to Redis channel
Client B -> Server 2 -> Subscribe to Redis channel

Mutation on Server 1:
Server 1 -> PUBLISH to Redis -> Server 1 receives -> forwards to Client A
                             -> Server 2 receives -> forwards to Client B
```

## Setup with graphql-ws and Redis

```bash
npm install graphql graphql-ws ws ioredis
```

```javascript
const { createServer } = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { useServer } = require('graphql-ws/lib/use/ws');
const { WebSocketServer } = require('ws');
const Redis = require('ioredis');

const publisher = new Redis({ host: process.env.REDIS_HOST });
const subscriber = new Redis({ host: process.env.REDIS_HOST });

// In-memory subscription registry for this server instance
const subscriptions = new Map();

// Subscribe to all GraphQL subscription channels on this instance
async function setupRedisSubscriber() {
  await subscriber.subscribe('graphql:messages');

  subscriber.on('message', (channel, message) => {
    const event = JSON.parse(message);

    // Forward to all local subscribers matching this event
    for (const [subId, { filter, publish }] of subscriptions) {
      if (filter(event)) {
        publish(event);
      }
    }
  });
}

setupRedisSubscriber();
```

## Resolver Implementation

```javascript
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');

const pubsub = new RedisPubSub({
  publisher: new Redis({ host: process.env.REDIS_HOST }),
  subscriber: new Redis({ host: process.env.REDIS_HOST }),
});

const resolvers = {
  Subscription: {
    messageAdded: {
      subscribe: (_, { channelId }) => {
        return pubsub.asyncIterator(`message:${channelId}`);
      },
      resolve: (payload) => payload.messageAdded,
    },
    orderUpdated: {
      subscribe: (_, { orderId }) => {
        return pubsub.asyncIterator(`order:${orderId}`);
      },
    },
  },
  Mutation: {
    sendMessage: async (_, { channelId, content }, { user }) => {
      const message = {
        id: generateId(),
        content,
        channelId,
        author: user.id,
        createdAt: new Date().toISOString(),
      };

      await db.messages.create(message);

      // Publish to Redis - all server instances receive this
      await pubsub.publish(`message:${channelId}`, { messageAdded: message });

      return message;
    },
  },
};
```

## Installing graphql-redis-subscriptions

```bash
npm install graphql-redis-subscriptions ioredis
```

```javascript
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');

const options = {
  host: process.env.REDIS_HOST,
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});
```

## Filtering Subscriptions

```javascript
const resolvers = {
  Subscription: {
    notificationReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('notifications'),
        (payload, variables, context) => {
          // Only send to the intended user
          return payload.notificationReceived.userId === context.user.id;
        }
      ),
    },
  },
};
```

## Complete Apollo Server 4 Example

```javascript
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');

const pubsub = new RedisPubSub({
  publisher: new Redis({ host: process.env.REDIS_HOST }),
  subscriber: new Redis({ host: process.env.REDIS_HOST }),
});

const schema = makeExecutableSchema({ typeDefs, resolvers: makeResolvers(pubsub) });

const httpServer = createServer(app);
const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
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
```

## Monitoring Subscription Counts

```javascript
// Track active subscriptions in Redis
async function trackSubscription(userId, topic) {
  await publisher.sadd(`subscriptions:${topic}`, userId);
  await publisher.incr('metrics:active_subscriptions');
}

async function untrackSubscription(userId, topic) {
  await publisher.srem(`subscriptions:${topic}`, userId);
  await publisher.decr('metrics:active_subscriptions');
}

const count = await publisher.get('metrics:active_subscriptions');
console.log(`Active subscriptions: ${count}`);
```

## Summary

Redis Pub/Sub enables GraphQL subscriptions to scale horizontally across multiple server instances. Each server instance maintains its own WebSocket connections with clients and shares events via Redis channels. The `graphql-redis-subscriptions` package provides a drop-in replacement for the in-memory `PubSub` class, requiring only publisher and subscriber Redis connections.
