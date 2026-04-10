# How to Cache OpenID Connect Discovery Metadata with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OpenID Connect, Caching

Description: Learn how to cache OpenID Connect discovery metadata and JWKS in Redis to avoid repeated HTTP fetches on every token validation request.

---

OpenID Connect providers publish discovery metadata at `/.well-known/openid-configuration`. This JSON document contains the JWKS URI, token endpoint, supported algorithms, and more. Fetching it on every token validation is wasteful and adds latency. Caching it in Redis with a reasonable TTL eliminates repeated HTTP calls.

## What Gets Cached

Two documents benefit from caching:

1. **Discovery document** - `/.well-known/openid-configuration` - changes rarely, safe to cache for hours
2. **JWKS** - JSON Web Key Set used to verify token signatures - changes when keys rotate, cache for minutes to hours with fallback logic

## Caching the Discovery Document

```javascript
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const DISCOVERY_TTL = 3600; // 1 hour
const JWKS_TTL = 600; // 10 minutes

async function getDiscoveryDocument(issuer) {
  const cacheKey = `oidc:discovery:${encodeURIComponent(issuer)}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `${issuer}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch discovery document: ${res.status}`);

  const doc = await res.json();
  await redis.setEx(cacheKey, DISCOVERY_TTL, JSON.stringify(doc));
  return doc;
}
```

## Caching the JWKS

```javascript
async function getJwks(issuer) {
  const discovery = await getDiscoveryDocument(issuer);
  const jwksUri = discovery.jwks_uri;
  const cacheKey = `oidc:jwks:${encodeURIComponent(jwksUri)}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const res = await fetch(jwksUri);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);

  const jwks = await res.json();
  await redis.setEx(cacheKey, JWKS_TTL, JSON.stringify(jwks));
  return jwks;
}
```

## Token Validation with Cached JWKS

```javascript
const jose = require('jose');

async function validateIdToken(token, issuer, audience) {
  const jwks = await getJwks(issuer);

  // Build JWKS key set from cached data
  const keySet = jose.createLocalJWKSet(jwks);

  try {
    const { payload } = await jose.jwtVerify(token, keySet, {
      issuer,
      audience
    });
    return payload;
  } catch (err) {
    if (err.code === 'ERR_JWKS_NO_MATCHING_KEY') {
      // Key may have rotated - clear cache and retry once
      const discovery = await getDiscoveryDocument(issuer);
      await redis.del(`oidc:jwks:${encodeURIComponent(discovery.jwks_uri)}`);
      const freshJwks = await getJwks(issuer);
      const freshKeySet = jose.createLocalJWKSet(freshJwks);
      const { payload } = await jose.jwtVerify(token, freshKeySet, { issuer, audience });
      return payload;
    }
    throw err;
  }
}
```

## Handling Key Rotation

When a JWT cannot be verified with the cached JWKS, it may mean a new signing key was added. Clear the JWKS cache and retry:

```javascript
async function invalidateJwksCache(issuer) {
  const discovery = await getDiscoveryDocument(issuer);
  const cacheKey = `oidc:jwks:${encodeURIComponent(discovery.jwks_uri)}`;
  await redis.del(cacheKey);
  console.log(`JWKS cache invalidated for ${issuer}`);
}
```

## Inspecting Cached Keys

```bash
redis-cli keys "oidc:*"
redis-cli ttl "oidc:discovery:https%3A%2F%2Faccounts.google.com"
redis-cli ttl "oidc:jwks:https%3A%2F%2Fwww.googleapis.com%2Foauth2%2Fv3%2Fcerts"
```

## Summary

Caching OpenID Connect discovery documents and JWKS in Redis eliminates HTTP calls on every token validation. Use a longer TTL for discovery documents (hours) and a shorter TTL for JWKS (minutes) since signing keys rotate periodically. Implement a stale-key fallback that clears the JWKS cache and retries when a JWT cannot be verified - this handles key rotation gracefully without failing legitimate tokens.
