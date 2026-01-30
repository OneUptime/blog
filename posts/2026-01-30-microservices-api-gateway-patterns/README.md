# How to Build API Gateway Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Microservices, API Gateway, Architecture, Design Patterns

Description: Design API gateway patterns for microservices including routing, aggregation, authentication, and rate limiting with practical implementation examples.

---

## Introduction

An API Gateway sits between clients and your microservices, acting as a single entry point for all requests. Instead of having clients communicate directly with dozens of services, they talk to one gateway that handles routing, security, and cross-cutting concerns.

This post walks through building API gateway patterns from scratch. We will cover the core responsibilities, implement each pattern with working code, and discuss when to use each approach.

## Core Gateway Responsibilities

Before diving into implementation, let's understand what an API gateway actually does:

| Responsibility | Purpose | Example |
|----------------|---------|---------|
| Request Routing | Direct requests to appropriate services | `/users/*` routes to User Service |
| Authentication | Verify client identity | JWT token validation |
| Authorization | Check permissions | Role-based access control |
| Rate Limiting | Prevent abuse | 100 requests per minute per client |
| Response Aggregation | Combine multiple service responses | Merge user + orders data |
| Request Transformation | Modify requests before forwarding | Add headers, change payload format |
| Caching | Store frequent responses | Cache product catalog for 5 minutes |
| Load Balancing | Distribute traffic | Round-robin across service instances |

## Setting Up the Base Gateway

We will build our gateway using Node.js and Express. This gives us flexibility to implement each pattern clearly.

Create the project structure:

```bash
mkdir api-gateway && cd api-gateway
npm init -y
npm install express axios redis jsonwebtoken rate-limiter-flexible
```

Here is the base gateway setup that we will extend throughout this post:

```javascript
// gateway.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Service registry - in production, use service discovery
const services = {
    users: 'http://localhost:3001',
    orders: 'http://localhost:3002',
    products: 'http://localhost:3003',
    payments: 'http://localhost:3004'
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});

module.exports = { app, services };
```

## Pattern 1: Request Routing

Request routing is the most fundamental gateway pattern. The gateway examines incoming requests and forwards them to the appropriate backend service.

### Simple Path-Based Routing

This router extracts the service name from the URL path and proxies the request:

```javascript
// routing/path-router.js
const axios = require('axios');

class PathRouter {
    constructor(services) {
        this.services = services;
    }

    // Extract service name from path like /users/123 -> 'users'
    extractServiceName(path) {
        const segments = path.split('/').filter(Boolean);
        return segments[0] || null;
    }

    // Build the downstream URL by removing the service prefix
    buildDownstreamUrl(serviceName, originalPath) {
        const serviceUrl = this.services[serviceName];
        const downstreamPath = originalPath.replace(`/${serviceName}`, '') || '/';
        return `${serviceUrl}${downstreamPath}`;
    }

    async route(req, res) {
        const serviceName = this.extractServiceName(req.path);

        if (!serviceName || !this.services[serviceName]) {
            return res.status(404).json({
                error: 'Service not found',
                availableServices: Object.keys(this.services)
            });
        }

        const downstreamUrl = this.buildDownstreamUrl(serviceName, req.path);

        try {
            const response = await axios({
                method: req.method,
                url: downstreamUrl,
                data: req.body,
                headers: this.filterHeaders(req.headers),
                params: req.query,
                timeout: 5000
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            this.handleError(error, res, serviceName);
        }
    }

    // Remove hop-by-hop headers that should not be forwarded
    filterHeaders(headers) {
        const filtered = { ...headers };
        const hopByHopHeaders = [
            'connection', 'keep-alive', 'proxy-authenticate',
            'proxy-authorization', 'te', 'trailer',
            'transfer-encoding', 'upgrade', 'host'
        ];
        hopByHopHeaders.forEach(h => delete filtered[h]);
        return filtered;
    }

    handleError(error, res, serviceName) {
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: 'Service unavailable',
                service: serviceName
            });
        }
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ error: 'Internal gateway error' });
    }
}

module.exports = PathRouter;
```

### Header-Based Routing

Sometimes you need to route based on headers, such as API version or tenant ID:

```javascript
// routing/header-router.js
class HeaderRouter {
    constructor(routingRules) {
        // Rules format: { header: 'X-API-Version', routes: { 'v1': 'http://...', 'v2': 'http://...' } }
        this.rules = routingRules;
    }

    determineTarget(headers) {
        for (const rule of this.rules) {
            const headerValue = headers[rule.header.toLowerCase()];
            if (headerValue && rule.routes[headerValue]) {
                return rule.routes[headerValue];
            }
        }
        return null;
    }
}

// Usage example
const versionRoutes = {
    header: 'X-API-Version',
    routes: {
        'v1': 'http://localhost:3001',
        'v2': 'http://localhost:3002'
    }
};
```

### Weighted Routing for Canary Deployments

Weighted routing lets you gradually shift traffic to new service versions:

```javascript
// routing/weighted-router.js
class WeightedRouter {
    constructor(targets) {
        // targets: [{ url: 'http://...', weight: 90 }, { url: 'http://...', weight: 10 }]
        this.targets = targets;
        this.totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    }

    selectTarget() {
        const random = Math.random() * this.totalWeight;
        let cumulative = 0;

        for (const target of this.targets) {
            cumulative += target.weight;
            if (random <= cumulative) {
                return target.url;
            }
        }
        return this.targets[0].url;
    }
}

// 90% traffic to stable, 10% to canary
const canaryRouter = new WeightedRouter([
    { url: 'http://users-stable:3001', weight: 90 },
    { url: 'http://users-canary:3001', weight: 10 }
]);
```

## Pattern 2: Authentication and Authorization

The gateway is the ideal place to handle authentication. Every request passes through it, so you validate tokens once instead of in every service.

### JWT Authentication Middleware

This middleware validates JWT tokens and attaches user information to requests:

```javascript
// auth/jwt-auth.js
const jwt = require('jsonwebtoken');

class JWTAuthenticator {
    constructor(options) {
        this.secret = options.secret;
        this.publicRoutes = options.publicRoutes || [];
        this.issuer = options.issuer || 'api-gateway';
    }

    // Express middleware function
    middleware() {
        return (req, res, next) => {
            // Skip authentication for public routes
            if (this.isPublicRoute(req.path, req.method)) {
                return next();
            }

            const token = this.extractToken(req);
            if (!token) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'No token provided'
                });
            }

            try {
                const decoded = jwt.verify(token, this.secret, {
                    issuer: this.issuer
                });

                // Attach user info to request for downstream services
                req.user = decoded;
                req.headers['x-user-id'] = decoded.userId;
                req.headers['x-user-roles'] = JSON.stringify(decoded.roles || []);

                next();
            } catch (error) {
                this.handleTokenError(error, res);
            }
        };
    }

    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }
        return req.query.token || null;
    }

    isPublicRoute(path, method) {
        return this.publicRoutes.some(route => {
            const pathMatch = route.path instanceof RegExp
                ? route.path.test(path)
                : path.startsWith(route.path);
            const methodMatch = !route.methods || route.methods.includes(method);
            return pathMatch && methodMatch;
        });
    }

    handleTokenError(error, res) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                expiredAt: error.expiredAt
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: error.message
            });
        }
        res.status(500).json({ error: 'Authentication error' });
    }
}

module.exports = JWTAuthenticator;
```

### Role-Based Authorization

After authentication, you often need to check if the user has permission to access a resource:

```javascript
// auth/rbac.js
class RoleBasedAccessControl {
    constructor() {
        // Define permissions for each role
        this.permissions = {
            admin: ['read', 'write', 'delete', 'admin'],
            editor: ['read', 'write'],
            viewer: ['read']
        };

        // Map routes to required permissions
        this.routePermissions = new Map();
    }

    // Register route permission requirements
    protect(path, method, requiredPermission) {
        const key = `${method.toUpperCase()}:${path}`;
        this.routePermissions.set(key, requiredPermission);
        return this;
    }

    // Express middleware
    middleware() {
        return (req, res, next) => {
            const key = `${req.method}:${req.path}`;
            const requiredPermission = this.findMatchingPermission(req);

            if (!requiredPermission) {
                return next(); // No permission required for this route
            }

            const userRoles = req.user?.roles || [];
            const userPermissions = this.getPermissionsForRoles(userRoles);

            if (!userPermissions.includes(requiredPermission)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Requires '${requiredPermission}' permission`,
                    yourRoles: userRoles
                });
            }

            next();
        };
    }

    findMatchingPermission(req) {
        // Check exact match first
        const exactKey = `${req.method}:${req.path}`;
        if (this.routePermissions.has(exactKey)) {
            return this.routePermissions.get(exactKey);
        }

        // Check pattern matches
        for (const [pattern, permission] of this.routePermissions) {
            const [method, pathPattern] = pattern.split(':');
            if (method === req.method && this.pathMatches(req.path, pathPattern)) {
                return permission;
            }
        }
        return null;
    }

    pathMatches(path, pattern) {
        // Convert /users/:id to regex /users/[^/]+
        const regexPattern = pattern.replace(/:\w+/g, '[^/]+');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }

    getPermissionsForRoles(roles) {
        const allPermissions = new Set();
        roles.forEach(role => {
            const perms = this.permissions[role] || [];
            perms.forEach(p => allPermissions.add(p));
        });
        return Array.from(allPermissions);
    }
}

// Usage
const rbac = new RoleBasedAccessControl();
rbac.protect('/users', 'GET', 'read')
    .protect('/users', 'POST', 'write')
    .protect('/users/:id', 'DELETE', 'admin')
    .protect('/admin/*', 'GET', 'admin');

module.exports = RoleBasedAccessControl;
```

## Pattern 3: Rate Limiting

Rate limiting protects your services from abuse and ensures fair resource usage. Here are several strategies:

### Token Bucket Rate Limiter

The token bucket algorithm allows bursts while maintaining an average rate:

```javascript
// ratelimit/token-bucket.js
const Redis = require('ioredis');

class TokenBucketRateLimiter {
    constructor(options) {
        this.redis = new Redis(options.redisUrl);
        this.bucketSize = options.bucketSize || 100;      // Max tokens
        this.refillRate = options.refillRate || 10;        // Tokens per second
        this.keyPrefix = options.keyPrefix || 'ratelimit:';
    }

    async middleware() {
        return async (req, res, next) => {
            const identifier = this.getIdentifier(req);
            const key = `${this.keyPrefix}${identifier}`;

            try {
                const result = await this.consumeToken(key);

                // Set rate limit headers
                res.set({
                    'X-RateLimit-Limit': this.bucketSize,
                    'X-RateLimit-Remaining': result.remaining,
                    'X-RateLimit-Reset': result.resetTime
                });

                if (!result.allowed) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        retryAfter: result.retryAfter
                    });
                }

                next();
            } catch (error) {
                console.error('Rate limiter error:', error);
                next(); // Fail open - allow request if rate limiter fails
            }
        };
    }

    getIdentifier(req) {
        // Use API key, user ID, or IP address
        return req.user?.userId ||
               req.headers['x-api-key'] ||
               req.ip;
    }

    async consumeToken(key) {
        const now = Date.now();
        const data = await this.redis.get(key);

        let bucket;
        if (data) {
            bucket = JSON.parse(data);
            // Refill tokens based on elapsed time
            const elapsed = (now - bucket.lastRefill) / 1000;
            const refill = Math.floor(elapsed * this.refillRate);
            bucket.tokens = Math.min(this.bucketSize, bucket.tokens + refill);
            bucket.lastRefill = now;
        } else {
            bucket = { tokens: this.bucketSize, lastRefill: now };
        }

        if (bucket.tokens < 1) {
            const waitTime = Math.ceil((1 - bucket.tokens) / this.refillRate);
            return {
                allowed: false,
                remaining: 0,
                retryAfter: waitTime,
                resetTime: Math.ceil(now / 1000) + waitTime
            };
        }

        bucket.tokens -= 1;
        await this.redis.setex(key, 3600, JSON.stringify(bucket));

        return {
            allowed: true,
            remaining: Math.floor(bucket.tokens),
            resetTime: Math.ceil(now / 1000) + Math.ceil(this.bucketSize / this.refillRate)
        };
    }
}

module.exports = TokenBucketRateLimiter;
```

### Sliding Window Rate Limiter

The sliding window approach provides smoother rate limiting without the burst issues of fixed windows:

```javascript
// ratelimit/sliding-window.js
class SlidingWindowRateLimiter {
    constructor(options) {
        this.redis = options.redis;
        this.windowSize = options.windowSize || 60000;  // 1 minute in ms
        this.maxRequests = options.maxRequests || 100;
    }

    async isAllowed(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowSize;
        const key = `sliding:${identifier}`;

        // Use Redis sorted set with timestamps as scores
        const pipeline = this.redis.pipeline();

        // Remove old entries outside the window
        pipeline.zremrangebyscore(key, 0, windowStart);

        // Count requests in current window
        pipeline.zcard(key);

        // Add current request
        pipeline.zadd(key, now, `${now}-${Math.random()}`);

        // Set expiry on the key
        pipeline.expire(key, Math.ceil(this.windowSize / 1000));

        const results = await pipeline.exec();
        const requestCount = results[1][1];

        return {
            allowed: requestCount < this.maxRequests,
            current: requestCount,
            limit: this.maxRequests,
            resetIn: this.windowSize
        };
    }
}
```

### Tiered Rate Limits

Different users or API keys often need different rate limits:

```javascript
// ratelimit/tiered.js
class TieredRateLimiter {
    constructor(redis) {
        this.redis = redis;
        this.tiers = {
            free: { requests: 100, window: 3600 },      // 100/hour
            basic: { requests: 1000, window: 3600 },    // 1000/hour
            pro: { requests: 10000, window: 3600 },     // 10000/hour
            enterprise: { requests: 100000, window: 3600 } // 100000/hour
        };
    }

    middleware() {
        return async (req, res, next) => {
            const tier = req.user?.tier || 'free';
            const limits = this.tiers[tier];
            const identifier = `${tier}:${req.user?.userId || req.ip}`;

            const result = await this.checkLimit(identifier, limits);

            res.set({
                'X-RateLimit-Tier': tier,
                'X-RateLimit-Limit': limits.requests,
                'X-RateLimit-Remaining': result.remaining,
                'X-RateLimit-Reset': result.reset
            });

            if (!result.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    tier: tier,
                    upgradeUrl: '/pricing'
                });
            }

            next();
        };
    }

    async checkLimit(identifier, limits) {
        const key = `tiered:${identifier}`;
        const count = await this.redis.incr(key);

        if (count === 1) {
            await this.redis.expire(key, limits.window);
        }

        const ttl = await this.redis.ttl(key);

        return {
            allowed: count <= limits.requests,
            remaining: Math.max(0, limits.requests - count),
            reset: Math.ceil(Date.now() / 1000) + ttl
        };
    }
}

module.exports = TieredRateLimiter;
```

## Pattern 4: Response Aggregation

Response aggregation combines data from multiple services into a single response. This reduces client-side complexity and network round trips.

### Backend for Frontend (BFF) Pattern

The BFF pattern creates gateway endpoints tailored to specific client needs:

```javascript
// aggregation/bff.js
const axios = require('axios');

class ResponseAggregator {
    constructor(services) {
        this.services = services;
    }

    // Aggregate user dashboard data from multiple services
    async getUserDashboard(userId) {
        const requests = [
            this.fetchWithFallback(`${this.services.users}/${userId}`, { name: 'Unknown' }),
            this.fetchWithFallback(`${this.services.orders}?userId=${userId}&limit=5`, []),
            this.fetchWithFallback(`${this.services.products}/recommendations?userId=${userId}`, []),
            this.fetchWithFallback(`${this.services.notifications}?userId=${userId}&unread=true`, [])
        ];

        const [user, recentOrders, recommendations, notifications] = await Promise.all(requests);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                memberSince: user.createdAt
            },
            recentOrders: recentOrders.map(order => ({
                id: order.id,
                total: order.total,
                status: order.status,
                date: order.createdAt
            })),
            recommendations: recommendations.slice(0, 4),
            notifications: {
                count: notifications.length,
                items: notifications.slice(0, 3)
            },
            aggregatedAt: new Date().toISOString()
        };
    }

    async fetchWithFallback(url, fallback) {
        try {
            const response = await axios.get(url, { timeout: 3000 });
            return response.data;
        } catch (error) {
            console.warn(`Failed to fetch ${url}: ${error.message}`);
            return fallback;
        }
    }
}

// Express route using aggregator
app.get('/api/dashboard', async (req, res) => {
    const aggregator = new ResponseAggregator(services);
    try {
        const dashboard = await aggregator.getUserDashboard(req.user.userId);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});
```

### GraphQL-Style Field Selection

Allow clients to specify which fields they need:

```javascript
// aggregation/field-selector.js
class FieldSelector {
    async aggregate(config, fields) {
        const results = {};
        const requests = [];

        // Only fetch data for requested fields
        for (const field of fields) {
            if (config[field]) {
                requests.push(
                    this.fetchField(field, config[field])
                );
            }
        }

        const responses = await Promise.all(requests);
        responses.forEach((data, index) => {
            results[fields[index]] = data;
        });

        return results;
    }

    async fetchField(fieldName, fetchConfig) {
        try {
            const response = await axios.get(fetchConfig.url, {
                params: fetchConfig.params,
                timeout: fetchConfig.timeout || 5000
            });

            // Apply field transformation if specified
            if (fetchConfig.transform) {
                return fetchConfig.transform(response.data);
            }
            return response.data;
        } catch (error) {
            return fetchConfig.default || null;
        }
    }
}

// Usage - client requests only specific fields
app.get('/api/user-profile', async (req, res) => {
    const fields = req.query.fields?.split(',') || ['basic'];
    const userId = req.user.userId;

    const config = {
        basic: {
            url: `${services.users}/${userId}`,
            transform: (data) => ({ name: data.name, avatar: data.avatar })
        },
        orders: {
            url: `${services.orders}`,
            params: { userId, limit: 10 }
        },
        preferences: {
            url: `${services.users}/${userId}/preferences`,
            default: {}
        }
    };

    const selector = new FieldSelector();
    const result = await selector.aggregate(config, fields);
    res.json(result);
});
```

## Pattern 5: Request Transformation

Transform requests before forwarding them to backend services. This handles protocol translation, payload restructuring, and header manipulation.

### Request Transformer Middleware

```javascript
// transform/request-transformer.js
class RequestTransformer {
    constructor() {
        this.transformers = [];
    }

    // Add a transformation rule
    addRule(matcher, transformer) {
        this.transformers.push({ matcher, transformer });
        return this;
    }

    middleware() {
        return (req, res, next) => {
            for (const { matcher, transformer } of this.transformers) {
                if (matcher(req)) {
                    transformer(req);
                }
            }
            next();
        };
    }
}

// Common transformation functions
const transformations = {
    // Add correlation ID for distributed tracing
    addCorrelationId: (req) => {
        req.headers['x-correlation-id'] = req.headers['x-correlation-id'] ||
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // Convert snake_case to camelCase in request body
    snakeToCamel: (req) => {
        if (req.body && typeof req.body === 'object') {
            req.body = convertKeysToCamelCase(req.body);
        }
    },

    // Add timestamp to all requests
    addTimestamp: (req) => {
        req.headers['x-request-timestamp'] = new Date().toISOString();
    },

    // Normalize pagination parameters
    normalizePagination: (req) => {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        req.query.offset = (page - 1) * limit;
        req.query.limit = limit;
        delete req.query.page;
    }
};

function convertKeysToCamelCase(obj) {
    if (Array.isArray(obj)) {
        return obj.map(convertKeysToCamelCase);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = convertKeysToCamelCase(obj[key]);
            return result;
        }, {});
    }
    return obj;
}

// Setup transformer
const transformer = new RequestTransformer();
transformer
    .addRule(() => true, transformations.addCorrelationId)
    .addRule(() => true, transformations.addTimestamp)
    .addRule((req) => req.query.page, transformations.normalizePagination)
    .addRule((req) => req.is('application/json'), transformations.snakeToCamel);

module.exports = { RequestTransformer, transformations };
```

### Response Transformer

Transform responses before sending them to clients:

```javascript
// transform/response-transformer.js
class ResponseTransformer {
    constructor() {
        this.transformers = [];
    }

    addRule(matcher, transformer) {
        this.transformers.push({ matcher, transformer });
        return this;
    }

    transform(req, response) {
        let result = response;

        for (const { matcher, transformer } of this.transformers) {
            if (matcher(req, result)) {
                result = transformer(result, req);
            }
        }

        return result;
    }
}

const responseTransformations = {
    // Wrap response in standard envelope
    wrapInEnvelope: (data, req) => ({
        success: true,
        data: data,
        meta: {
            requestId: req.headers['x-correlation-id'],
            timestamp: new Date().toISOString()
        }
    }),

    // Convert camelCase to snake_case for legacy clients
    camelToSnake: (data) => {
        return convertKeysToSnakeCase(data);
    },

    // Remove internal fields
    stripInternalFields: (data) => {
        const strip = (obj) => {
            if (Array.isArray(obj)) return obj.map(strip);
            if (obj && typeof obj === 'object') {
                const cleaned = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (!key.startsWith('_') && !key.startsWith('internal')) {
                        cleaned[key] = strip(value);
                    }
                }
                return cleaned;
            }
            return obj;
        };
        return strip(data);
    },

    // Add HATEOAS links
    addLinks: (data, req) => {
        if (data.id) {
            data._links = {
                self: { href: `${req.baseUrl}${req.path}/${data.id}` }
            };
        }
        return data;
    }
};

function convertKeysToSnakeCase(obj) {
    if (Array.isArray(obj)) {
        return obj.map(convertKeysToSnakeCase);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            result[snakeKey] = convertKeysToSnakeCase(obj[key]);
            return result;
        }, {});
    }
    return obj;
}

module.exports = { ResponseTransformer, responseTransformations };
```

## Pattern 6: Caching at the Gateway

Caching at the gateway level reduces load on backend services and improves response times.

### Cache Middleware with Redis

```javascript
// cache/redis-cache.js
const Redis = require('ioredis');
const crypto = require('crypto');

class GatewayCache {
    constructor(options) {
        this.redis = new Redis(options.redisUrl);
        this.defaultTTL = options.defaultTTL || 300; // 5 minutes
        this.keyPrefix = options.keyPrefix || 'cache:';
    }

    // Generate cache key from request
    generateKey(req) {
        const parts = [
            req.method,
            req.originalUrl,
            req.user?.userId || 'anonymous'
        ];

        // Include relevant headers in cache key
        const varyHeaders = ['accept', 'accept-language', 'accept-encoding'];
        varyHeaders.forEach(header => {
            if (req.headers[header]) {
                parts.push(`${header}:${req.headers[header]}`);
            }
        });

        const hash = crypto.createHash('md5').update(parts.join('|')).digest('hex');
        return `${this.keyPrefix}${hash}`;
    }

    middleware(options = {}) {
        const ttl = options.ttl || this.defaultTTL;
        const condition = options.condition || ((req) => req.method === 'GET');

        return async (req, res, next) => {
            // Only cache if condition is met
            if (!condition(req)) {
                return next();
            }

            const cacheKey = this.generateKey(req);

            try {
                // Check cache
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    const data = JSON.parse(cached);
                    res.set('X-Cache', 'HIT');
                    res.set('X-Cache-Key', cacheKey);
                    return res.status(data.status).json(data.body);
                }

                // Cache miss - capture response
                res.set('X-Cache', 'MISS');
                const originalJson = res.json.bind(res);

                res.json = (body) => {
                    // Store in cache
                    const cacheData = {
                        status: res.statusCode,
                        body: body,
                        cachedAt: new Date().toISOString()
                    };

                    this.redis.setex(cacheKey, ttl, JSON.stringify(cacheData))
                        .catch(err => console.error('Cache write error:', err));

                    return originalJson(body);
                };

                next();
            } catch (error) {
                console.error('Cache error:', error);
                next(); // Continue without cache on error
            }
        };
    }

    // Invalidate cache entries
    async invalidate(pattern) {
        const keys = await this.redis.keys(`${this.keyPrefix}${pattern}`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
        return keys.length;
    }

    // Invalidate on mutations
    invalidationMiddleware(patterns) {
        return async (req, res, next) => {
            const originalJson = res.json.bind(res);

            res.json = async (body) => {
                // Invalidate related cache entries after successful mutation
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    for (const pattern of patterns) {
                        await this.invalidate(pattern);
                    }
                }
                return originalJson(body);
            };

            next();
        };
    }
}

module.exports = GatewayCache;
```

### Cache Configuration by Route

Different routes often need different caching strategies:

```javascript
// cache/cache-config.js
const cacheConfig = {
    // Static content - cache for 1 hour
    '/products': {
        ttl: 3600,
        condition: (req) => req.method === 'GET',
        varyBy: ['accept-language']
    },

    // User-specific content - shorter TTL, vary by user
    '/users/:id': {
        ttl: 60,
        condition: (req) => req.method === 'GET' && req.params.id === req.user?.userId,
        varyBy: ['authorization']
    },

    // Search results - cache with query params
    '/search': {
        ttl: 300,
        condition: (req) => req.method === 'GET',
        keyGenerator: (req) => `search:${JSON.stringify(req.query)}`
    },

    // Never cache
    '/auth/*': {
        enabled: false
    }
};

function getCacheConfig(path) {
    for (const [pattern, config] of Object.entries(cacheConfig)) {
        if (pathMatches(path, pattern)) {
            return config;
        }
    }
    return { ttl: 300 }; // Default config
}

function pathMatches(path, pattern) {
    const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/:(\w+)/g, '([^/]+)');
    return new RegExp(`^${regexPattern}$`).test(path);
}

module.exports = { cacheConfig, getCacheConfig };
```

## Putting It All Together

Here is a complete gateway setup combining all patterns:

```javascript
// gateway-complete.js
const express = require('express');
const Redis = require('ioredis');

const PathRouter = require('./routing/path-router');
const JWTAuthenticator = require('./auth/jwt-auth');
const RoleBasedAccessControl = require('./auth/rbac');
const TokenBucketRateLimiter = require('./ratelimit/token-bucket');
const GatewayCache = require('./cache/redis-cache');
const { RequestTransformer, transformations } = require('./transform/request-transformer');

const app = express();
app.use(express.json());

// Configuration
const config = {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    services: {
        users: process.env.USERS_SERVICE || 'http://localhost:3001',
        orders: process.env.ORDERS_SERVICE || 'http://localhost:3002',
        products: process.env.PRODUCTS_SERVICE || 'http://localhost:3003'
    }
};

const redis = new Redis(config.redisUrl);

// Initialize components
const auth = new JWTAuthenticator({
    secret: config.jwtSecret,
    publicRoutes: [
        { path: '/health', methods: ['GET'] },
        { path: '/auth/login', methods: ['POST'] },
        { path: '/auth/register', methods: ['POST'] }
    ]
});

const rbac = new RoleBasedAccessControl();
rbac.protect('/admin', 'GET', 'admin')
    .protect('/users', 'DELETE', 'admin');

const rateLimiter = new TokenBucketRateLimiter({
    redisUrl: config.redisUrl,
    bucketSize: 100,
    refillRate: 10
});

const cache = new GatewayCache({
    redisUrl: config.redisUrl,
    defaultTTL: 300
});

const transformer = new RequestTransformer();
transformer
    .addRule(() => true, transformations.addCorrelationId)
    .addRule(() => true, transformations.addTimestamp);

const router = new PathRouter(config.services);

// Apply middleware in order
app.use(transformer.middleware());
app.use(auth.middleware());
app.use(rbac.middleware());
app.use(rateLimiter.middleware());

// Cache only GET requests
app.use(cache.middleware({
    condition: (req) => req.method === 'GET'
}));

// Health check (bypasses auth)
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Route all other requests
app.use('*', (req, res) => router.route(req, res));

// Error handler
app.use((err, req, res, next) => {
    console.error('Gateway error:', err);
    res.status(500).json({
        error: 'Internal server error',
        requestId: req.headers['x-correlation-id']
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
```

## Gateway Pattern Comparison

When choosing which patterns to implement, consider the following tradeoffs:

| Pattern | Complexity | Performance Impact | When to Use |
|---------|------------|-------------------|-------------|
| Path Routing | Low | Minimal | Always - it is the foundation |
| JWT Auth | Low | Low (CPU for verification) | When you need authentication |
| RBAC | Medium | Low | When you have role-based permissions |
| Token Bucket | Medium | Low (Redis calls) | High-traffic APIs |
| Sliding Window | Medium | Medium (more Redis ops) | When you need precise rate limiting |
| Response Aggregation | High | Variable | Mobile apps, dashboards |
| Request Transform | Low | Minimal | Protocol translation, legacy support |
| Caching | Medium | Significant improvement | Read-heavy workloads |

## Production Considerations

Before deploying your gateway to production, address these concerns:

### High Availability

Run multiple gateway instances behind a load balancer:

```yaml
# docker-compose.yml
services:
  gateway:
    build: .
    deploy:
      replicas: 3
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:alpine
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Circuit Breaker

Prevent cascade failures when backend services are down:

```javascript
// resilience/circuit-breaker.js
class CircuitBreaker {
    constructor(options) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000;
        this.state = 'CLOSED';
        this.failures = 0;
        this.lastFailure = null;
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailure > this.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is open');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failures++;
        this.lastFailure = Date.now();
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
}

module.exports = CircuitBreaker;
```

### Logging and Monitoring

Add structured logging for observability:

```javascript
// logging/request-logger.js
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-correlation-id'],
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: duration,
            userAgent: req.headers['user-agent'],
            userId: req.user?.userId,
            ip: req.ip
        };

        console.log(JSON.stringify(log));
    });

    next();
};

module.exports = requestLogger;
```

## Summary

We covered six essential API gateway patterns:

1. **Request Routing** directs traffic to the right services based on path, headers, or weighted distribution
2. **Authentication and Authorization** validates tokens and enforces permissions at the gateway level
3. **Rate Limiting** protects services using token bucket, sliding window, or tiered approaches
4. **Response Aggregation** combines data from multiple services for client convenience
5. **Request Transformation** modifies requests and responses for protocol translation
6. **Caching** reduces backend load and improves response times

Start with routing and authentication. Add rate limiting early to protect against abuse. Implement aggregation and caching based on your specific performance requirements. The patterns work together - a well-designed gateway uses most of them in combination.

The code examples in this post are production-ready starting points. Adapt them to your specific technology stack and scale requirements.
