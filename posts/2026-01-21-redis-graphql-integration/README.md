# How to Integrate Redis with GraphQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GraphQL, Caching, DataLoader, Apollo Server, Performance

Description: A comprehensive guide to integrating Redis with GraphQL applications, covering DataLoader caching, response caching, persisted queries, and subscription patterns.

---

GraphQL's flexible query nature creates unique caching challenges. Redis provides solutions for DataLoader caching, full response caching, persisted queries, and real-time subscriptions. This guide covers practical patterns for both Apollo Server and other GraphQL implementations.

## Installation

```bash
npm install @apollo/server graphql dataloader ioredis
```

## Redis Client Setup

```typescript
// src/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

export default redis;
```

## DataLoader with Redis Caching

### Basic DataLoader Setup

```typescript
// src/dataloaders/userLoader.ts
import DataLoader from 'dataloader';
import redis from '../redis';
import { User } from '../models';

interface DataLoaderContext {
  redis: typeof redis;
  cache: Map<string, any>;
}

export function createUserLoader(ctx: DataLoaderContext) {
  return new DataLoader<string, User | null>(
    async (userIds) => {
      // Check Redis cache first
      const cacheKeys = userIds.map((id) => `user:${id}`);
      const cachedUsers = await redis.mget(...cacheKeys);

      const users: (User | null)[] = [];
      const uncachedIds: string[] = [];
      const uncachedIndices: number[] = [];

      // Process cached results
      cachedUsers.forEach((cached, index) => {
        if (cached) {
          users[index] = JSON.parse(cached);
        } else {
          users[index] = null;
          uncachedIds.push(userIds[index]);
          uncachedIndices.push(index);
        }
      });

      // Fetch uncached from database
      if (uncachedIds.length > 0) {
        const dbUsers = await User.findMany({
          where: { id: { in: uncachedIds } },
        });

        // Create lookup map
        const dbUserMap = new Map(dbUsers.map((u) => [u.id, u]));

        // Cache and fill results
        const pipeline = redis.pipeline();
        uncachedIndices.forEach((resultIndex, i) => {
          const userId = uncachedIds[i];
          const user = dbUserMap.get(userId) || null;
          users[resultIndex] = user;

          if (user) {
            pipeline.setex(`user:${userId}`, 300, JSON.stringify(user));
          }
        });
        await pipeline.exec();
      }

      return users;
    },
    {
      cache: true, // Use DataLoader's in-memory cache per request
      cacheKeyFn: (key) => key.toString(),
    }
  );
}
```

### DataLoader Factory with Cache Invalidation

```typescript
// src/dataloaders/index.ts
import DataLoader from 'dataloader';
import redis from '../redis';
import { User, Post, Comment } from '../models';

export interface Loaders {
  userLoader: DataLoader<string, User | null>;
  postLoader: DataLoader<string, Post | null>;
  postsByUserLoader: DataLoader<string, Post[]>;
  commentsByPostLoader: DataLoader<string, Comment[]>;
}

export function createLoaders(): Loaders {
  return {
    userLoader: createCachedLoader<User>({
      keyPrefix: 'user',
      ttl: 300,
      batchFn: async (ids) => {
        const users = await User.findMany({ where: { id: { in: ids } } });
        return ids.map((id) => users.find((u) => u.id === id) || null);
      },
    }),

    postLoader: createCachedLoader<Post>({
      keyPrefix: 'post',
      ttl: 300,
      batchFn: async (ids) => {
        const posts = await Post.findMany({ where: { id: { in: ids } } });
        return ids.map((id) => posts.find((p) => p.id === id) || null);
      },
    }),

    postsByUserLoader: createCachedLoader<Post[]>({
      keyPrefix: 'user:posts',
      ttl: 60,
      batchFn: async (userIds) => {
        const posts = await Post.findMany({
          where: { authorId: { in: userIds } },
          orderBy: { createdAt: 'desc' },
        });
        return userIds.map((userId) =>
          posts.filter((p) => p.authorId === userId)
        );
      },
    }),

    commentsByPostLoader: createCachedLoader<Comment[]>({
      keyPrefix: 'post:comments',
      ttl: 60,
      batchFn: async (postIds) => {
        const comments = await Comment.findMany({
          where: { postId: { in: postIds } },
          orderBy: { createdAt: 'asc' },
        });
        return postIds.map((postId) =>
          comments.filter((c) => c.postId === postId)
        );
      },
    }),
  };
}

interface CachedLoaderOptions<T> {
  keyPrefix: string;
  ttl: number;
  batchFn: (ids: string[]) => Promise<(T | null)[]>;
}

function createCachedLoader<T>(options: CachedLoaderOptions<T>) {
  const { keyPrefix, ttl, batchFn } = options;

  return new DataLoader<string, T | null>(
    async (ids) => {
      const cacheKeys = ids.map((id) => `${keyPrefix}:${id}`);
      const cached = await redis.mget(...cacheKeys);

      const results: (T | null)[] = new Array(ids.length).fill(null);
      const uncachedIds: string[] = [];
      const uncachedIndices: number[] = [];

      cached.forEach((value, index) => {
        if (value) {
          results[index] = JSON.parse(value);
        } else {
          uncachedIds.push(ids[index]);
          uncachedIndices.push(index);
        }
      });

      if (uncachedIds.length > 0) {
        const dbResults = await batchFn(uncachedIds);
        const pipeline = redis.pipeline();

        dbResults.forEach((result, i) => {
          const originalIndex = uncachedIndices[i];
          results[originalIndex] = result;

          if (result !== null) {
            const cacheKey = `${keyPrefix}:${uncachedIds[i]}`;
            pipeline.setex(cacheKey, ttl, JSON.stringify(result));
          }
        });

        await pipeline.exec();
      }

      return results;
    },
    { cache: true }
  );
}

// Cache invalidation helpers
export async function invalidateUser(userId: string) {
  await redis.del(`user:${userId}`);
}

export async function invalidatePost(postId: string, authorId: string) {
  await redis.del(`post:${postId}`);
  await redis.del(`user:posts:${authorId}`);
  await redis.del(`post:comments:${postId}`);
}
```

## Apollo Server Integration

### Context Setup with Loaders

```typescript
// src/server.ts
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { createLoaders, Loaders } from './dataloaders';
import redis from './redis';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

interface Context {
  loaders: Loaders;
  redis: typeof redis;
  user?: { id: string };
}

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

await server.start();

const app = express();

app.use(
  '/graphql',
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }): Promise<Context> => {
      // Create fresh loaders for each request
      const loaders = createLoaders();

      // Get user from auth header
      const user = await getUserFromToken(req.headers.authorization);

      return {
        loaders,
        redis,
        user,
      };
    },
  })
);

app.listen(4000);
```

### Resolvers Using DataLoaders

```typescript
// src/resolvers.ts
import { Context } from './server';
import { invalidateUser, invalidatePost } from './dataloaders';

export const resolvers = {
  Query: {
    user: async (_: any, { id }: { id: string }, ctx: Context) => {
      return ctx.loaders.userLoader.load(id);
    },

    users: async (_: any, __: any, ctx: Context) => {
      // For list queries, check Redis first
      const cached = await ctx.redis.get('users:all');
      if (cached) {
        return JSON.parse(cached);
      }

      const users = await User.findMany({ take: 100 });
      await ctx.redis.setex('users:all', 60, JSON.stringify(users));

      // Prime individual loaders
      users.forEach((user) => {
        ctx.loaders.userLoader.prime(user.id, user);
      });

      return users;
    },

    post: async (_: any, { id }: { id: string }, ctx: Context) => {
      return ctx.loaders.postLoader.load(id);
    },
  },

  Mutation: {
    createPost: async (
      _: any,
      { input }: { input: PostInput },
      ctx: Context
    ) => {
      const post = await Post.create({
        data: {
          ...input,
          authorId: ctx.user!.id,
        },
      });

      // Invalidate related caches
      await ctx.redis.del(`user:posts:${ctx.user!.id}`);
      await ctx.redis.del('posts:recent');

      return post;
    },

    updateUser: async (
      _: any,
      { id, input }: { id: string; input: UserInput },
      ctx: Context
    ) => {
      const user = await User.update({
        where: { id },
        data: input,
      });

      // Invalidate cache
      await invalidateUser(id);

      // Update DataLoader cache
      ctx.loaders.userLoader.clear(id);
      ctx.loaders.userLoader.prime(id, user);

      return user;
    },
  },

  User: {
    posts: async (parent: User, _: any, ctx: Context) => {
      return ctx.loaders.postsByUserLoader.load(parent.id);
    },
  },

  Post: {
    author: async (parent: Post, _: any, ctx: Context) => {
      return ctx.loaders.userLoader.load(parent.authorId);
    },

    comments: async (parent: Post, _: any, ctx: Context) => {
      return ctx.loaders.commentsByPostLoader.load(parent.id);
    },
  },
};
```

## Response Caching

### Cache Directive

```typescript
// src/directives/cacheControl.ts
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { GraphQLSchema, defaultFieldResolver } from 'graphql';
import redis from '../redis';
import crypto from 'crypto';

export function cacheControlDirective(directiveName: string) {
  return {
    cacheControlDirectiveTypeDefs: `
      directive @${directiveName}(
        maxAge: Int
        scope: CacheControlScope = PUBLIC
      ) on FIELD_DEFINITION | OBJECT

      enum CacheControlScope {
        PUBLIC
        PRIVATE
      }
    `,

    cacheControlDirectiveTransformer: (schema: GraphQLSchema) => {
      return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const directive = getDirective(
            schema,
            fieldConfig,
            directiveName
          )?.[0];

          if (directive) {
            const { maxAge, scope } = directive;
            const { resolve = defaultFieldResolver } = fieldConfig;

            fieldConfig.resolve = async (source, args, context, info) => {
              // Generate cache key from query
              const cacheKey = generateCacheKey(info, args, context, scope);

              // Check cache
              const cached = await redis.get(cacheKey);
              if (cached) {
                return JSON.parse(cached);
              }

              // Execute resolver
              const result = await resolve(source, args, context, info);

              // Cache result
              if (result !== null && result !== undefined) {
                await redis.setex(cacheKey, maxAge, JSON.stringify(result));
              }

              return result;
            };
          }

          return fieldConfig;
        },
      });
    },
  };
}

function generateCacheKey(
  info: any,
  args: any,
  context: any,
  scope: string
): string {
  const parts = [
    'gql',
    info.parentType.name,
    info.fieldName,
    JSON.stringify(args),
  ];

  if (scope === 'PRIVATE' && context.user) {
    parts.push(context.user.id);
  }

  return crypto.createHash('md5').update(parts.join(':')).digest('hex');
}
```

### Using Cache Directive

```graphql
# schema.graphql
type Query {
  # Cached for 5 minutes, public
  posts: [Post!]! @cacheControl(maxAge: 300)

  # Cached for 1 minute, per user
  myPosts: [Post!]! @cacheControl(maxAge: 60, scope: PRIVATE)

  # Cached for 10 minutes
  post(id: ID!): Post @cacheControl(maxAge: 600)
}

type User @cacheControl(maxAge: 300) {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}
```

## Full Response Caching

### Response Cache Plugin

```typescript
// src/plugins/responseCache.ts
import type { ApolloServerPlugin } from '@apollo/server';
import crypto from 'crypto';
import redis from '../redis';

interface ResponseCacheOptions {
  ttl?: number;
  sessionId?: (context: any) => string | null;
  shouldCache?: (context: any, result: any) => boolean;
}

export function responseCache(
  options: ResponseCacheOptions = {}
): ApolloServerPlugin {
  const {
    ttl = 300,
    sessionId = () => null,
    shouldCache = () => true,
  } = options;

  return {
    async requestDidStart({ request, contextValue }) {
      // Skip mutations
      if (request.query?.includes('mutation')) {
        return {};
      }

      // Generate cache key
      const session = sessionId(contextValue);
      const keyParts = [
        'response',
        request.query,
        JSON.stringify(request.variables || {}),
        session || 'public',
      ];
      const cacheKey = crypto
        .createHash('md5')
        .update(keyParts.join(':'))
        .digest('hex');

      // Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return {
          async willSendResponse({ response }) {
            response.body = {
              kind: 'single',
              singleResult: JSON.parse(cached),
            };
            response.http?.headers.set('X-Cache', 'HIT');
          },
        };
      }

      return {
        async willSendResponse({ response }) {
          if (
            response.body.kind === 'single' &&
            !response.body.singleResult.errors &&
            shouldCache(contextValue, response.body.singleResult)
          ) {
            await redis.setex(
              cacheKey,
              ttl,
              JSON.stringify(response.body.singleResult)
            );
            response.http?.headers.set('X-Cache', 'MISS');
          }
        },
      };
    },
  };
}

// Usage
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    responseCache({
      ttl: 300,
      sessionId: (ctx) => ctx.user?.id || null,
      shouldCache: (ctx, result) => {
        // Don't cache errors
        return !result.errors;
      },
    }),
  ],
});
```

## Persisted Queries with Redis

```typescript
// src/plugins/persistedQueries.ts
import type { ApolloServerPlugin } from '@apollo/server';
import crypto from 'crypto';
import redis from '../redis';

export function persistedQueries(): ApolloServerPlugin {
  return {
    async requestDidStart({ request }) {
      // Check for persisted query
      const persistedQuery = request.extensions?.persistedQuery;

      if (persistedQuery) {
        const { sha256Hash } = persistedQuery;

        if (!request.query) {
          // Client sent hash only - retrieve from cache
          const query = await redis.get(`pq:${sha256Hash}`);

          if (query) {
            request.query = query;
          } else {
            throw new Error('PersistedQueryNotFound');
          }
        } else {
          // Client sent both - store for future use
          const hash = crypto
            .createHash('sha256')
            .update(request.query)
            .digest('hex');

          if (hash === sha256Hash) {
            await redis.set(`pq:${sha256Hash}`, request.query);
          }
        }
      }

      return {};
    },
  };
}
```

## Subscriptions with Redis Pub/Sub

### Subscription Setup

```typescript
// src/pubsub.ts
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const options = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

export const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});

export const EVENTS = {
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  USER_ONLINE: 'USER_ONLINE',
};
```

### Subscription Resolvers

```typescript
// src/resolvers/subscription.ts
import { pubsub, EVENTS } from '../pubsub';
import { withFilter } from 'graphql-subscriptions';

export const subscriptionResolvers = {
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.POST_CREATED]),
    },

    // Filter subscriptions by criteria
    commentAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.COMMENT_ADDED]),
        (payload, variables) => {
          // Only send to subscribers watching this post
          return payload.commentAdded.postId === variables.postId;
        }
      ),
    },

    // User-specific subscriptions
    userNotification: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['NOTIFICATION']),
        (payload, _, context) => {
          return payload.userId === context.user?.id;
        }
      ),
    },
  },
};

// Publishing events
export async function publishPostCreated(post: Post) {
  await pubsub.publish(EVENTS.POST_CREATED, { postCreated: post });
}

export async function publishCommentAdded(comment: Comment) {
  await pubsub.publish(EVENTS.COMMENT_ADDED, { commentAdded: comment });
}
```

### WebSocket Server Setup

```typescript
// src/server.ts
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

const app = express();
const httpServer = createServer(app);

// WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer(
  {
    schema,
    context: async (ctx) => {
      // Auth for WebSocket connections
      const token = ctx.connectionParams?.authorization;
      const user = await getUserFromToken(token);
      return { user, loaders: createLoaders() };
    },
  },
  wsServer
);

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

await server.start();
```

## Cache Invalidation Patterns

```typescript
// src/cache/invalidation.ts
import redis from '../redis';

// Pattern-based invalidation
export async function invalidatePattern(pattern: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;

  do {
    const [newCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    );
    cursor = newCursor;

    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== '0');

  return deleted;
}

// Entity-based invalidation
export async function invalidateEntity(type: string, id: string) {
  const patterns = [
    `${type}:${id}`,
    `${type}:${id}:*`,
    `*:${type}:${id}`,
    `response:*`, // Invalidate all response cache
  ];

  for (const pattern of patterns) {
    await invalidatePattern(pattern);
  }
}

// Tag-based invalidation
export async function invalidateTags(tags: string[]) {
  const pipeline = redis.pipeline();

  for (const tag of tags) {
    const keys = await redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      pipeline.del(...keys);
    }
    pipeline.del(`tag:${tag}`);
  }

  await pipeline.exec();
}
```

## Best Practices

1. **Use DataLoader per request** - Create fresh loaders for each request
2. **Cache at multiple levels** - DataLoader, field-level, and response-level
3. **Invalidate on mutations** - Clear relevant caches when data changes
4. **Use cache tags** - Group related cache keys for easier invalidation
5. **Monitor cache hit rates** - Track effectiveness of caching strategy
6. **Set appropriate TTLs** - Balance freshness vs performance

## Conclusion

Redis integration with GraphQL provides powerful caching capabilities:

- DataLoader with Redis for N+1 query prevention
- Field-level caching with directives
- Full response caching for repeated queries
- Persisted queries for query optimization
- Pub/Sub for real-time subscriptions

By implementing these patterns, you can significantly improve GraphQL API performance while maintaining data consistency through proper cache invalidation.
