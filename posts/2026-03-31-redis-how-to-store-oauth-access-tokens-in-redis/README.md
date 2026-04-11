# How to Store OAuth Access Tokens in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OAuth, Authentication, Access Tokens, Security

Description: Store and manage OAuth 2.0 access tokens in Redis with proper TTL alignment, token rotation, and revocation support for secure API authentication.

---

## Why Store OAuth Tokens in Redis

OAuth 2.0 access tokens are short-lived credentials that need fast lookup on every API request. Redis is ideal for token storage because:

- Sub-millisecond reads for authentication middleware
- Built-in TTL matches token expiration
- Atomic operations enable safe token rotation
- Fast revocation by deleting keys

## Token Storage Structure

Use a consistent key schema that separates concerns:

```text
oauth:access:{tokenHash}  -> token data Hash (userId, scopes, clientId, expiresAt)
oauth:user:{userId}:tokens -> Set of active token hashes for this user
oauth:client:{clientId}:tokens -> Set of tokens issued to this client
```

## Storing Access Tokens

Never store raw tokens as keys - always hash them first:

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');

const redis = new Redis({ host: process.env.REDIS_HOST });

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeAccessToken(accessToken, tokenData) {
  const { userId, clientId, scopes, expiresIn } = tokenData;
  const tokenHash = hashToken(accessToken);
  const expiresAt = Date.now() + expiresIn * 1000;

  const pipeline = redis.pipeline();

  // Store token data
  pipeline.hset(`oauth:access:${tokenHash}`, {
    userId,
    clientId,
    scopes: Array.isArray(scopes) ? scopes.join(' ') : scopes,
    expiresAt: expiresAt.toString(),
    issuedAt: Date.now().toString(),
    isRevoked: '0',
  });
  pipeline.expire(`oauth:access:${tokenHash}`, expiresIn);

  // Track by user
  pipeline.sadd(`oauth:user:${userId}:tokens`, tokenHash);
  pipeline.expire(`oauth:user:${userId}:tokens`, 86400 * 30);

  // Track by client
  pipeline.sadd(`oauth:client:${clientId}:tokens`, tokenHash);
  pipeline.expire(`oauth:client:${clientId}:tokens`, 86400 * 30);

  await pipeline.exec();

  return tokenHash;
}
```

## Validating Access Tokens

```javascript
async function validateAccessToken(accessToken) {
  const tokenHash = hashToken(accessToken);
  const data = await redis.hgetall(`oauth:access:${tokenHash}`);

  if (!data || !data.userId) {
    return { valid: false, error: 'Token not found or expired' };
  }

  if (data.isRevoked === '1') {
    return { valid: false, error: 'Token has been revoked' };
  }

  const now = Date.now();
  if (parseInt(data.expiresAt) < now) {
    // Token expired - clean up
    await redis.del(`oauth:access:${tokenHash}`);
    return { valid: false, error: 'Token expired' };
  }

  return {
    valid: true,
    userId: data.userId,
    clientId: data.clientId,
    scopes: data.scopes.split(' '),
    issuedAt: new Date(parseInt(data.issuedAt)),
    expiresAt: new Date(parseInt(data.expiresAt)),
  };
}
```

## Express Middleware for Token Validation

```javascript
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  const token = authHeader.slice(7);
  const result = await validateAccessToken(token);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  req.auth = {
    userId: result.userId,
    clientId: result.clientId,
    scopes: result.scopes,
  };

  next();
}
```

## Token Revocation

```javascript
async function revokeToken(accessToken) {
  const tokenHash = hashToken(accessToken);
  const data = await redis.hgetall(`oauth:access:${tokenHash}`);

  if (!data || !data.userId) {
    return { revoked: false, reason: 'Token not found' };
  }

  // Mark as revoked instead of deleting (for audit trail)
  await redis.hset(`oauth:access:${tokenHash}`, 'isRevoked', '1');

  // Remove from user and client tracking sets
  const pipeline = redis.pipeline();
  pipeline.srem(`oauth:user:${data.userId}:tokens`, tokenHash);
  pipeline.srem(`oauth:client:${data.clientId}:tokens`, tokenHash);
  await pipeline.exec();

  return { revoked: true };
}

// Revoke all tokens for a user (e.g., on password change)
async function revokeAllUserTokens(userId) {
  const tokenHashes = await redis.smembers(`oauth:user:${userId}:tokens`);

  if (tokenHashes.length === 0) return { count: 0 };

  const pipeline = redis.pipeline();
  for (const hash of tokenHashes) {
    pipeline.hset(`oauth:access:${hash}`, 'isRevoked', '1');
  }
  pipeline.del(`oauth:user:${userId}:tokens`);
  await pipeline.exec();

  return { count: tokenHashes.length };
}
```

## Token Introspection Endpoint (RFC 7662)

```javascript
app.post('/oauth/introspect', authenticateClient, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.json({ active: false });
  }

  const result = await validateAccessToken(token);

  if (!result.valid) {
    return res.json({ active: false });
  }

  res.json({
    active: true,
    sub: result.userId,
    client_id: result.clientId,
    scope: result.scopes.join(' '),
    exp: Math.floor(result.expiresAt.getTime() / 1000),
    iat: Math.floor(result.issuedAt.getTime() / 1000),
  });
});
```

## Monitoring Token Usage

```javascript
// Track token validation metrics
async function trackTokenValidation(userId, success) {
  const key = `metrics:token:${success ? 'valid' : 'invalid'}`;
  await redis.incr(key);
  await redis.incr(`metrics:token:user:${userId}`);
}

// Get active token count
async function getActiveTokenCount(userId) {
  return redis.scard(`oauth:user:${userId}:tokens`);
}
```

## Summary

Storing OAuth access tokens in Redis combines fast validation performance with automatic expiry via TTL. Always hash tokens before using them as Redis keys to prevent exposure in logs or memory dumps. Implement revocation by marking tokens rather than deleting them immediately to preserve audit capability, and track tokens by user ID to enable bulk revocation on account changes.
