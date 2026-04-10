# How to Implement PKCE Code Verifier Storage with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OAuth, PKCE

Description: Learn how to store OAuth 2.0 PKCE code verifiers in Redis with short TTLs and one-time-use enforcement to secure the authorization code flow for public clients.

---

PKCE (Proof Key for Code Exchange) protects public OAuth clients from authorization code interception attacks. The client generates a `code_verifier`, derives a `code_challenge` from it, and sends the challenge to the authorization endpoint. On the token endpoint, the client sends the original `code_verifier` to prove it initiated the flow. Redis is ideal for storing the short-lived verifier between these two steps.

## PKCE Flow Overview

1. Generate `code_verifier` (random string, 43-128 chars)
2. Compute `code_challenge = BASE64URL(SHA256(code_verifier))`
3. Store `code_verifier` in Redis keyed by session or state
4. Redirect to authorization server with `code_challenge`
5. On callback, retrieve `code_verifier` from Redis
6. Exchange code + verifier for tokens
7. Delete the verifier from Redis

## Generating the PKCE Pair

```javascript
const crypto = require('crypto');

function generateCodeVerifier() {
  return crypto.randomBytes(96).toString('base64url').slice(0, 128);
}

function generateCodeChallenge(verifier) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}
```

## Storing the Verifier in Redis

```javascript
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const PKCE_TTL = 600; // 10 minutes - matches typical auth server timeout

async function storePkceVerifier(state, verifier, metadata = {}) {
  const key = `pkce:${state}`;
  await redis.hSet(key, {
    codeVerifier: verifier,
    createdAt: Date.now(),
    ...metadata
  });
  await redis.expire(key, PKCE_TTL);
}
```

## Authorization Route

```javascript
app.get('/auth/start', async (req, res) => {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomBytes(32).toString('base64url');

  // Store verifier tied to state
  await storePkceVerifier(state, verifier, {
    sessionId: req.session.id,
    redirectTo: req.query.redirectTo || '/'
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  res.redirect(`${process.env.AUTH_URL}/authorize?${params}`);
});
```

## Callback Route - Consume Verifier

```javascript
app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.redirect('/login?error=' + error);

  const key = `pkce:${state}`;

  // Retrieve and immediately delete (one-time use)
  const stored = await redis.hGetAll(key);
  await redis.del(key);

  if (!stored || !stored.codeVerifier) {
    return res.status(400).json({ error: 'PKCE verifier not found or expired' });
  }

  if (stored.sessionId !== req.session.id) {
    return res.status(400).json({ error: 'Session mismatch' });
  }

  // Exchange code + verifier for tokens
  const tokens = await fetch(`${process.env.AUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
      client_id: process.env.CLIENT_ID,
      code_verifier: stored.codeVerifier
    })
  }).then(r => r.json());

  req.session.tokens = tokens;
  res.redirect(stored.redirectTo || '/');
});
```

## Inspecting Active PKCE Sessions

```bash
redis-cli keys "pkce:*"
redis-cli hgetall "pkce:somestate123"
redis-cli ttl "pkce:somestate123"
```

## Summary

Redis provides the right properties for PKCE verifier storage: short TTLs matching the authorization server's code lifetime, one-time-use enforcement by deleting on retrieval, and fast lookup by state parameter. Storing the session ID alongside the verifier allows cross-referencing to detect session fixation. Combined with OAuth state parameter storage in the same Redis instance, this covers the full security surface of the authorization code flow.
