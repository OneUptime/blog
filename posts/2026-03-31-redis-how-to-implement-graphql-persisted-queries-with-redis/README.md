# How to Implement GraphQL Persisted Queries with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GraphQL, Persisted Queries, Apollo Server, Security

Description: Store and retrieve GraphQL persisted queries in Redis to reduce request size, improve CDN cacheability, and prevent arbitrary query execution.

---

## What Are Persisted Queries

Persisted queries replace full GraphQL query strings with a short hash identifier. Instead of sending the entire query document on every request, clients send only the hash. The server looks up the full query from a store (Redis) and executes it.

Benefits:
- Smaller request payloads (hash vs full query text)
- GET requests instead of POST - enabling CDN caching
- Security - only pre-registered queries can be executed

## How the Protocol Works

1. Client sends `{ extensions: { persistedQuery: { version: 1, sha256Hash: "abc..." } } }`
2. Server looks up the hash in Redis
3. If not found, server returns `{ errors: [{ message: "PersistedQueryNotFound" }] }`
4. Client re-sends with the full query text
5. Server stores the query in Redis and executes it

## Setting Up Apollo Server with Redis Persisted Queries

```bash
npm install @apollo/server ioredis
```

```javascript
const { ApolloServer } = require('@apollo/server');
const Redis = require('ioredis');
const { createHash } = require('crypto');

const redis = new Redis({ host: process.env.REDIS_HOST });

// Redis-backed query store implementing KeyValueCache interface
const redisQueryStore = {
  async get(key) {
    const query = await redis.get(`pq:${key}`);
    return query ?? undefined;
  },

  async set(key, value, options) {
    if (options?.ttl) {
      await redis.set(`pq:${key}`, value, 'EX', options.ttl);
    } else {
      await redis.set(`pq:${key}`, value);
    }
  },

  async delete(key) {
    await redis.del(`pq:${key}`);
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: redisQueryStore,
    ttl: null, // No TTL - queries persist forever
  },
});
```

## Using KeyvAdapter for Apollo Persisted Queries

```javascript
const { ApolloServer } = require('@apollo/server');
const { KeyvAdapter } = require('@apollo/utils.keyvadapter');
const Keyv = require('keyv');
const KeyvRedis = require('@keyv/redis');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: new KeyvAdapter(
      new Keyv({
        store: new KeyvRedis(process.env.REDIS_URL),
        namespace: 'persisted-queries',
      })
    ),
    ttl: 300, // 5 minutes TTL for development; use null for production
  },
});
```

## Manual Persisted Query Implementation

For non-Apollo servers, implement the APQ protocol manually:

```javascript
const express = require('express');
const { graphql } = require('graphql');
const { createHash } = require('crypto');
const Redis = require('ioredis');

const redis = new Redis({ host: process.env.REDIS_HOST });
const app = express();
app.use(express.json());

app.post('/graphql', async (req, res) => {
  const { query, variables, extensions } = req.body;
  const apq = extensions?.persistedQuery;

  let resolvedQuery = query;

  if (apq?.sha256Hash) {
    const storedQuery = await redis.get(`pq:${apq.sha256Hash}`);

    if (!storedQuery && !query) {
      // Query not in store, ask client to send full query
      return res.json({
        errors: [{
          message: 'PersistedQueryNotFound',
          extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
        }],
      });
    }

    if (query) {
      // Verify hash matches
      const computedHash = createHash('sha256').update(query).digest('hex');
      if (computedHash !== apq.sha256Hash) {
        return res.status(400).json({ errors: [{ message: 'Hash mismatch' }] });
      }
      // Store for future use
      await redis.set(`pq:${apq.sha256Hash}`, query);
      resolvedQuery = query;
    } else {
      resolvedQuery = storedQuery;
    }
  }

  const result = await graphql({ schema, source: resolvedQuery, variableValues: variables });
  res.json(result);
});
```

## Pre-Registering Queries at Build Time

For maximum security, pre-register approved queries before deployment:

```javascript
const { createHash } = require('crypto');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

async function registerPersistedQueries() {
  const redis = new Redis({ host: process.env.REDIS_HOST });

  // Load all .graphql files from src directory
  const queryDir = path.join(__dirname, 'src/queries');
  const files = fs.readdirSync(queryDir).filter(f => f.endsWith('.graphql'));

  for (const file of files) {
    const query = fs.readFileSync(path.join(queryDir, file), 'utf-8');
    const hash = createHash('sha256').update(query).digest('hex');
    await redis.set(`pq:${hash}`, query);
    console.log(`Registered ${file}: ${hash.substring(0, 8)}...`);
  }

  await redis.quit();
}

registerPersistedQueries().catch(console.error);
```

## Client-Side Implementation

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const httpLink = createHttpLink({ uri: '/graphql' });

const persistedQueryLink = createPersistedQueryLink({
  sha256,
  useGETForHashedQueries: true, // Use GET for CDN caching
});

const client = new ApolloClient({
  link: persistedQueryLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

## Listing All Registered Queries

```javascript
async function listRegisteredQueries() {
  let cursor = '0';
  const queries = [];

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'pq:*', 'COUNT', 100);
    cursor = newCursor;
    queries.push(...keys);
  } while (cursor !== '0');

  console.log(`Total registered queries: ${queries.length}`);
  return queries;
}
```

## Summary

Redis is an ideal backend for GraphQL persisted queries due to its fast key-value lookups and flexible TTL settings. Implement the Automatic Persisted Queries (APQ) protocol by storing query strings keyed by their SHA-256 hash, and use pre-registration scripts to enforce an allowlist of approved queries in production environments.
