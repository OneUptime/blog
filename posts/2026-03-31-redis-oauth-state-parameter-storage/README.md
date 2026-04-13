# How to Implement OAuth State Parameter Storage with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OAuth, Security

Description: Learn how to store and validate OAuth 2.0 state parameters in Redis to prevent CSRF attacks during authorization code flows with short TTLs and one-time-use enforcement.

---

The OAuth 2.0 state parameter prevents cross-site request forgery (CSRF) in authorization flows. The client generates a random value, sends it to the authorization server, and validates that the same value comes back in the redirect. Redis is ideal for storing state parameters because they have short lifespans and need to be consumed exactly once.

## How the State Parameter Works

1. Client generates `state = random_value`
2. Client stores `state` in Redis with a short TTL (5-10 minutes)
3. Client redirects user to `authorization_server/authorize?state=random_value&...`
4. User authenticates and is redirected back with `?code=xxx&state=random_value`
5. Client looks up `state` in Redis to verify it matches
6. Client deletes the state from Redis (one-time use)

## Generating and Storing State

```javascript
const crypto = require('crypto');
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const STATE_TTL = 600; // 10 minutes

async function generateOAuthState(sessionId, additionalData = {}) {
  const state = crypto.randomBytes(32).toString('base64url');
  const key = `oauth:state:${state}`;

  await redis.hSet(key, {
    sessionId,
    createdAt: Date.now(),
    ...additionalData
  });
  await redis.expire(key, STATE_TTL);

  return state;
}
```

## Initiating the Authorization Flow

```javascript
const { URLSearchParams } = require('url');

app.get('/auth/login', async (req, res) => {
  const state = await generateOAuthState(req.session.id, {
    returnUrl: req.query.returnUrl || '/'
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.OAUTH_CLIENT_ID,
    redirect_uri: process.env.OAUTH_REDIRECT_URI,
    scope: 'openid profile email',
    state
  });

  res.redirect(`${process.env.OAUTH_AUTHORIZATION_URL}?${params}`);
});
```

## Validating the State on Callback

```javascript
app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/login?error=' + error);
  }

  if (!state) {
    return res.status(400).json({ error: 'Missing state parameter' });
  }

  const key = `oauth:state:${state}`;

  // Get and delete (one-time use) - not truly atomic; see Lua script below
  const storedState = await redis.hGetAll(key);
  await redis.del(key);

  if (!storedState || !storedState.sessionId) {
    return res.status(400).json({ error: 'Invalid or expired state parameter' });
  }

  if (storedState.sessionId !== req.session.id) {
    return res.status(400).json({ error: 'Session mismatch - possible CSRF attack' });
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  req.session.userId = tokens.userId;

  const returnUrl = storedState.returnUrl || '/';
  res.redirect(returnUrl);
});
```

## Atomic Get-and-Delete with Lua

For true atomicity, use a Lua script to fetch and delete in one operation:

```javascript
const getAndDeleteScript = `
local val = redis.call('HGETALL', KEYS[1])
redis.call('DEL', KEYS[1])
return val
`;

async function consumeOAuthState(state) {
  const key = `oauth:state:${state}`;
  const result = await redis.eval(getAndDeleteScript, { keys: [key] });

  if (!result || result.length === 0) return null;

  // Convert flat array to object
  const obj = {};
  for (let i = 0; i < result.length; i += 2) {
    obj[result[i]] = result[i + 1];
  }
  return obj;
}
```

## Monitoring Unused State Parameters

```bash
redis-cli keys "oauth:state:*" | wc -l
redis-cli ttl "oauth:state:somevalue"
```

A large number of unexpired state keys may indicate abandoned authorization flows or a scanning attempt.

## Summary

Redis is well-suited for OAuth state parameter storage because states need short TTLs, one-time-use semantics, and fast lookup. Storing a session ID alongside the state allows you to detect session mismatches that indicate CSRF. Deleting the state key immediately after validation enforces one-time use and prevents replay attacks within the TTL window.
