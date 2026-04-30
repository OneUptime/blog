# How to Handle IPv6 Client Addresses in GraphQL Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, IPv6, Middleware, Express, Security

Description: Handle, extract, and process IPv6 client addresses in GraphQL middleware for logging, rate limiting, and access control.

## Extracting IPv6 Addresses from Requests

IPv6 addresses in HTTP requests can come from multiple sources. If your app runs behind a proxy, only trust forwarded headers when that proxy is under your control:

```javascript
// middleware/clientIP.js

function extractClientIP(req, { trustProxy = false } = {}) {
    // Express computes req.ip from trusted X-Forwarded-For values
    if (typeof req.ip === 'string' && req.ip) {
        return normalizeIPv6(req.ip);
    }

    if (trustProxy) {
        const forwarded = firstHeaderValue(req.headers['x-forwarded-for']);
        const realIP = firstHeaderValue(req.headers['x-real-ip']);

        if (forwarded) {
            // X-Forwarded-For can be a comma-separated list
            // Take the first IP (original client)
            const firstIP = forwarded.split(',')[0].trim();
            return normalizeIPv6(firstIP);
        }

        if (realIP) {
            return normalizeIPv6(realIP);
        }
    }

    // Fall back to socket remote address
    // May be IPv4-mapped IPv6: ::ffff:192.168.1.1
    const socketAddr = req.socket?.remoteAddress;
    return normalizeIPv6(socketAddr);
}

function firstHeaderValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function normalizeIPv6(addr) {
    if (!addr) return null;

    const normalized = addr.replace(/^\[|\]$/g, '');

    // Convert IPv4-mapped IPv6 to plain IPv4
    // ::ffff:192.168.1.1 → 192.168.1.1
    const ipv4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (ipv4Mapped) {
        return ipv4Mapped[1];
    }

    // Remove brackets if present (shouldn't happen from socket, but be safe)
    return normalized;
}

module.exports = { extractClientIP };
```

## Apollo Server Context Middleware

```javascript
// apollo-context.js
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { extractClientIP } = require('./middleware/clientIP');

const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
        {
            // Log IPv6 client address for each operation
            async requestDidStart() {
                let operationName = null;

                return {
                    async didResolveOperation({ operationName: resolvedOperationName }) {
                        operationName = resolvedOperationName;
                    },
                    async willSendResponse({ contextValue }) {
                        const ip = contextValue.clientIP;
                        const op = operationName || 'anonymous';
                        console.log(`GraphQL operation "${op}" from ${ip}`);
                    },
                };
            },
        },
    ],
});

// Pass clientIP through context
await startStandaloneServer(server, {
    context: async ({ req }) => ({
        clientIP: extractClientIP(req),
        req,
    }),
});
```

## Express GraphQL Middleware for IPv6 Logging

```javascript
// middleware/ipv6Logger.js
const { extractClientIP } = require('./clientIP');

function ipv6LoggerMiddleware(req, res, next) {
    const clientIP = extractClientIP(req);

    // Check if it's an IPv6 address
    const isIPv6 = Boolean(clientIP && clientIP.includes(':'));

    req.clientIP = clientIP;
    req.isIPv6 = isIPv6;

    // Log the request
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        clientIP,
        ipVersion: clientIP ? (isIPv6 ? 'IPv6' : 'IPv4') : 'unknown',
    }));

    next();
}

module.exports = ipv6LoggerMiddleware;
```

## GraphQL Resolver with IPv6 Context

```javascript
// resolvers.js
const resolvers = {
    Query: {
        // Expose client IP in resolver
        myProfile: async (_, __, { clientIP, userId }) => {
            const profile = await db.getUser(userId);

            // Record the IPv6 access in audit log
            await auditLog.record({
                userId,
                action: 'VIEW_PROFILE',
                sourceIP: clientIP,
                timestamp: new Date(),
            });

            return profile;
        },

        // IP-based feature flags
        features: (_, __, { clientIP }) => {
            // Enable IPv6-only features for IPv6 clients
            const isIPv6 = Boolean(clientIP && clientIP.includes(':'));
            return {
                newDashboard: true,
                ipv6Analytics: isIPv6,
                legacyCompat: !isIPv6,
            };
        },
    },
};
```

## TypeScript Types for IPv6 Context

```typescript
// types/context.ts
import type { IncomingMessage } from 'node:http';
import { extractClientIP } from '../middleware/clientIP';

export interface GraphQLContext {
    clientIP: string | null;
    isIPv6: boolean;
    userId?: string;
    req: IncomingMessage;
}

export function createContext(req: IncomingMessage): GraphQLContext {
    const clientIP = extractClientIP(req);
    return {
        clientIP,
        isIPv6: clientIP?.includes(':') ?? false,
        req,
    };
}
```

## Testing IPv6 Middleware

```javascript
// test/ipv6.test.js
const { extractClientIP } = require('../middleware/clientIP');

describe('IPv6 address extraction', () => {
    it('extracts IPv6 from socket', () => {
        const req = { socket: { remoteAddress: '2001:db8::1' }, headers: {} };
        expect(extractClientIP(req)).toBe('2001:db8::1');
    });

    it('converts IPv4-mapped IPv6', () => {
        const req = { socket: { remoteAddress: '::ffff:192.168.1.1' }, headers: {} };
        expect(extractClientIP(req)).toBe('192.168.1.1');
    });

    it('uses req.ip when Express has already resolved the client address', () => {
        const req = {
            ip: '2001:db8::feed',
            socket: { remoteAddress: '::1' },
            headers: { 'x-forwarded-for': '2001:db8::cafe, 10.0.0.1' }
        };
        expect(extractClientIP(req)).toBe('2001:db8::feed');
    });

    it('uses X-Forwarded-For first when proxy headers are trusted', () => {
        const req = {
            socket: { remoteAddress: '::1' },
            headers: { 'x-forwarded-for': '2001:db8::cafe, 10.0.0.1' }
        };
        expect(extractClientIP(req, { trustProxy: true })).toBe('2001:db8::cafe');
    });
});
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your GraphQL server from IPv6 vantage points. This ensures your middleware correctly handles IPv6 client addresses and that IPv6 clients receive proper responses.

## Conclusion

Handling IPv6 client addresses in GraphQL middleware requires extracting the address from multiple potential sources (socket and, when appropriate, trusted forwarded headers), normalizing IPv4-mapped IPv6 addresses, and passing the IP through the GraphQL context. Always test with actual IPv6 requests to ensure your middleware handles all address formats correctly.
