# How to Rate Limit GraphQL Queries by IPv6 Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, Rate Limiting, IPv6, Redis, Security

Description: Implement per-client rate limiting for GraphQL APIs using IPv6 addresses as client identifiers.

## Overview

Implement per-client rate limiting for GraphQL APIs using IPv6 addresses as client identifiers. A practical setup is to extract the client IP from the request, normalize IPv4-mapped IPv6 addresses, and use Redis to count requests before the GraphQL handler runs.

## Prerequisites

- Basic understanding of IPv6 networking
- Node.js 18+ with an HTTP GraphQL server
- Redis installed and running
- IPv6 connectivity on your server

## Configuration

Bind your HTTP server to `::`, make sure your application reads a trustworthy client address, and point your Redis client at a reachable Redis instance. On many operating systems, listening on `::` may also accept IPv4 connections unless you explicitly configure IPv6-only sockets.

```bash
# Verify IPv6 is available on your system
ip -6 addr show
ping -6 -c 3 ::1

# Verify Redis is reachable
redis-cli PING
```

## Step-by-Step Setup

### 1. Bind to IPv6 Interfaces

Listen on `::` so IPv6 clients can reach the GraphQL endpoint:

```javascript
// Node.js example
app.listen(4000, '::', () => {
    console.log('GraphQL server listening on http://[::]:4000/graphql');
});
```

### 2. Handle IPv6 Addresses in Application Logic

If your app is behind a trusted reverse proxy, configure Express `trust proxy` to that proxy's exact IP or CIDR before using `req.ip`. Otherwise Express falls back to the socket peer address.

```javascript
function getClientIP(req) {
    const addr = req.ip || req.socket.remoteAddress || '';
    // Convert IPv4-mapped IPv6 such as ::ffff:192.168.1.1 to plain IPv4.
    return addr.replace(/^::ffff:/, '');
}
```

### 3. Count Requests in Redis

Use Redis to atomically increment a per-client counter and apply an expiry window:

```javascript
import { createClient } from 'redis';

const redis = createClient({
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
});

redis.on('error', (err) => console.error('Redis Client Error', err));
await redis.connect();

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 5; // Raise this for production.

const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

async function checkRateLimit(clientIP) {
    const key = `graphql:rate:${clientIP}`;
    const current = await redis.eval(RATE_LIMIT_SCRIPT, {
        keys: [key],
        arguments: [String(WINDOW_SECONDS)],
    });

    const retryAfter = current > MAX_REQUESTS
        ? Math.max(await redis.ttl(key), 1)
        : 0;

    return {
        allowed: current <= MAX_REQUESTS,
        retryAfter,
    };
}
```

### 4. Apply the Limit Before GraphQL Execution

Run the rate-limit check before the GraphQL handler so rejected requests do not execute queries or resolvers:

```javascript
import express from 'express';
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';

const app = express();

// Example for a reverse proxy on the same host:
// app.set('trust proxy', 'loopback');

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            hello: {
                type: GraphQLString,
                resolve: () => 'Hello from IPv6 GraphQL!',
            },
        },
    }),
});

app.use('/graphql', async (req, res, next) => {
    try {
        const clientIP = getClientIP(req);
        const { allowed, retryAfter } = await checkRateLimit(clientIP);

        if (!allowed) {
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({
                errors: [{ message: 'Too many GraphQL requests from this client' }],
            });
        }

        next();
    } catch (err) {
        next(err);
    }
});

app.all('/graphql', createHandler({ schema }));

app.listen(4000, '::', () => {
    console.log('GraphQL server listening on http://[::]:4000/graphql');
});
```

## Testing

```bash
# Send 6 requests over IPv6. With MAX_REQUESTS=5, the 6th should return 429.
for i in {1..6}; do
  curl -6 -s -o /dev/null -w "%{http_code}\n" \
    http://[::1]:4000/graphql \
    -H "Content-Type: application/json" \
    --data '{"query":"{ hello }"}'
done

# Inspect the rate-limited response and Retry-After header.
curl -6 -i http://[::1]:4000/graphql \
  -H "Content-Type: application/json" \
  --data '{"query":"{ hello }"}'

# Verify IPv6 is used
curl -6 -v http://[::1]:4000/graphql 2>&1 | grep "Connected to"
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your service's IPv6 GraphQL endpoint. Keep routine health checks below the configured rate limit, and track spikes in `429 Too Many Requests` responses separately so you can distinguish abuse from availability problems.

## Conclusion

Rate limiting GraphQL by IPv6 client is not just about binding the server to `::`. You also need to extract a trustworthy client address, normalize IPv4-mapped IPv6 addresses, and reject excess requests before GraphQL execution. For user-level quotas, combine IP-based limiting with authenticated identity because IPv6 privacy addresses can rotate.
