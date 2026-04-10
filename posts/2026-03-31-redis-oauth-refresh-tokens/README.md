# How to Store OAuth Refresh Tokens in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OAuth, Security

Description: Learn how to store OAuth refresh tokens in Redis with proper TTL management, rotation tracking, and revocation support for secure token lifecycle management.

---

Refresh tokens are long-lived credentials that allow clients to obtain new access tokens without requiring user re-authentication. Storing them securely requires a persistent, revocable store. Redis provides fast lookup, TTL-based expiry, and atomic operations that make refresh token lifecycle management straightforward.

## Refresh Token Storage Model

Store each refresh token as a Redis hash containing metadata:

```bash
HSET refresh:sha256_of_token userId user_42 clientId app_web rotations 0 issuedAt 1706054400
EXPIRE refresh:sha256_of_token 2592000
```

Always store the hash of the token, not the token itself. If Redis is compromised, raw tokens are not exposed.

## Issuing a Refresh Token

```javascript
const crypto = require('crypto');
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const REFRESH_TTL = 30 * 24 * 3600; // 30 days

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId, clientId) {
  const token = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashToken(token);
  const key = `refresh:${tokenHash}`;

  await redis.hSet(key, {
    userId,
    clientId,
    rotations: 0,
    issuedAt: Date.now(),
    lastUsed: Date.now()
  });
  await redis.expire(key, REFRESH_TTL);

  // Track token hash in user's set for bulk revocation
  await redis.sAdd(`user:${userId}:refresh_tokens`, tokenHash);

  return token; // Return raw token to client
}
```

## Validating and Rotating a Refresh Token

Token rotation: each use of a refresh token invalidates the old one and issues a new one. If an old token is reused, it indicates theft - revoke all tokens for the user.

```javascript
async function rotateRefreshToken(token, clientId) {
  const tokenHash = hashToken(token);
  const key = `refresh:${tokenHash}`;

  const stored = await redis.hGetAll(key);
  if (!stored || !stored.userId) {
    throw new Error('Invalid or expired refresh token');
  }

  if (stored.clientId !== clientId) {
    throw new Error('Client ID mismatch');
  }

  // Delete old token (rotation)
  await redis.del(key);

  // Check rotation count to detect reuse attacks
  const rotations = parseInt(stored.rotations, 10);
  if (rotations > 10) {
    // Suspicious - revoke all tokens for this user
    await revokeAllUserTokens(stored.userId);
    throw new Error('Refresh token rotation limit exceeded - possible theft');
  }

  // Issue new refresh token
  const newToken = crypto.randomBytes(48).toString('base64url');
  const newHash = hashToken(newToken);
  const newKey = `refresh:${newHash}`;

  await redis.hSet(newKey, {
    userId: stored.userId,
    clientId,
    rotations: rotations + 1,
    issuedAt: stored.issuedAt,
    lastUsed: Date.now()
  });
  await redis.expire(newKey, REFRESH_TTL);

  // Update the user's token set: remove old hash, add new hash
  const userTokensKey = `user:${stored.userId}:refresh_tokens`;
  await redis.sRem(userTokensKey, tokenHash);
  await redis.sAdd(userTokensKey, newHash);

  return newToken;
}
```

## Revoking Tokens

Revoke a single token:

```javascript
async function revokeRefreshToken(token) {
  const key = `refresh:${hashToken(token)}`;
  await redis.del(key);
}
```

Revoke all tokens for a user (e.g., on password change):

```javascript
async function revokeAllUserTokens(userId) {
  // Track tokens per user for efficient revocation
  const userTokensKey = `user:${userId}:refresh_tokens`;
  const tokenHashes = await redis.sMembers(userTokensKey);

  const pipeline = redis.multi();
  for (const hash of tokenHashes) {
    pipeline.del(`refresh:${hash}`);
  }
  pipeline.del(userTokensKey);
  await pipeline.exec();
}
```

## Summary

Storing OAuth refresh tokens in Redis by their SHA-256 hash enables fast lookup while avoiding raw token exposure. TTL-based expiry handles natural token aging without cleanup jobs. Token rotation - deleting the old token on each use and issuing a new one - limits the damage from stolen tokens. Tracking rotation counts allows detection of reuse attacks, triggering full revocation for the affected user.
