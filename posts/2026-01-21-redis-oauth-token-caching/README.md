# How to Implement OAuth Token Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OAuth, Authentication, Token Caching, API Security, Access Tokens

Description: A comprehensive guide to implementing OAuth token caching with Redis for access token storage, refresh token flows, and efficient third-party API integration.

---

OAuth token caching is essential when your application integrates with third-party APIs. Properly caching access tokens reduces latency, minimizes API calls to authorization servers, and handles token refresh seamlessly. Redis provides the perfect storage layer with its TTL support and atomic operations.

## Understanding OAuth Token Caching

When integrating with OAuth providers (Google, GitHub, Salesforce, etc.), you need to:

- **Cache access tokens**: Avoid requesting new tokens for every API call
- **Handle token refresh**: Automatically refresh expired tokens
- **Manage multiple providers**: Support users with various OAuth connections
- **Ensure security**: Store tokens securely with proper encryption

## Basic Token Cache Implementation

### Python Implementation

```python
import redis
import json
import time
import requests
from cryptography.fernet import Fernet
from datetime import datetime, timedelta

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Generate with: Fernet.generate_key()
ENCRYPTION_KEY = b'your-32-byte-encryption-key-here='

class OAuthTokenCache:
    def __init__(self, prefix='oauth_token'):
        self.prefix = prefix
        self.cipher = Fernet(ENCRYPTION_KEY)

    def _encrypt(self, data):
        """Encrypt sensitive data."""
        return self.cipher.encrypt(json.dumps(data).encode()).decode()

    def _decrypt(self, encrypted_data):
        """Decrypt sensitive data."""
        return json.loads(self.cipher.decrypt(encrypted_data.encode()))

    def store_tokens(self, user_id, provider, tokens):
        """
        Store OAuth tokens for a user.

        tokens: {
            'access_token': str,
            'refresh_token': str (optional),
            'expires_in': int (seconds),
            'token_type': str,
            'scope': str (optional)
        }
        """
        key = f"{self.prefix}:{user_id}:{provider}"

        # Calculate expiration
        expires_at = int(time.time()) + tokens.get('expires_in', 3600)

        token_data = {
            'access_token': tokens['access_token'],
            'refresh_token': tokens.get('refresh_token'),
            'expires_at': expires_at,
            'token_type': tokens.get('token_type', 'Bearer'),
            'scope': tokens.get('scope'),
            'provider': provider,
            'stored_at': int(time.time())
        }

        # Encrypt and store
        encrypted = self._encrypt(token_data)

        # Set TTL slightly longer than token expiry to allow refresh
        ttl = tokens.get('expires_in', 3600) + 300  # +5 min buffer
        r.setex(key, ttl, encrypted)

        # Track user's OAuth connections
        r.sadd(f"{self.prefix}:connections:{user_id}", provider)

        return True

    def get_access_token(self, user_id, provider):
        """Get a valid access token, refreshing if necessary."""
        key = f"{self.prefix}:{user_id}:{provider}"
        encrypted = r.get(key)

        if not encrypted:
            return None

        token_data = self._decrypt(encrypted)

        # Check if token is expired or about to expire (5 min buffer)
        if token_data['expires_at'] < int(time.time()) + 300:
            # Try to refresh
            if token_data.get('refresh_token'):
                new_tokens = self._refresh_token(provider, token_data['refresh_token'])
                if new_tokens:
                    self.store_tokens(user_id, provider, new_tokens)
                    return new_tokens['access_token']

            # Token expired and can't refresh
            return None

        return token_data['access_token']

    def _refresh_token(self, provider, refresh_token):
        """Refresh an access token using the refresh token."""
        # Provider-specific refresh endpoints
        refresh_configs = {
            'google': {
                'url': 'https://oauth2.googleapis.com/token',
                'client_id': 'YOUR_GOOGLE_CLIENT_ID',
                'client_secret': 'YOUR_GOOGLE_CLIENT_SECRET'
            },
            'github': {
                'url': 'https://github.com/login/oauth/access_token',
                'client_id': 'YOUR_GITHUB_CLIENT_ID',
                'client_secret': 'YOUR_GITHUB_CLIENT_SECRET'
            }
        }

        config = refresh_configs.get(provider)
        if not config:
            return None

        try:
            response = requests.post(
                config['url'],
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': config['client_id'],
                    'client_secret': config['client_secret']
                },
                headers={'Accept': 'application/json'}
            )

            if response.status_code == 200:
                return response.json()

        except Exception as e:
            print(f"Token refresh failed: {e}")

        return None

    def revoke_tokens(self, user_id, provider):
        """Revoke and delete tokens for a provider."""
        key = f"{self.prefix}:{user_id}:{provider}"

        # Get tokens to revoke with provider
        encrypted = r.get(key)
        if encrypted:
            token_data = self._decrypt(encrypted)
            self._revoke_with_provider(provider, token_data['access_token'])

        r.delete(key)
        r.srem(f"{self.prefix}:connections:{user_id}", provider)

    def _revoke_with_provider(self, provider, access_token):
        """Revoke token with the OAuth provider."""
        revoke_urls = {
            'google': 'https://oauth2.googleapis.com/revoke',
            'github': f'https://api.github.com/applications/CLIENT_ID/token'
        }

        url = revoke_urls.get(provider)
        if url and provider == 'google':
            requests.post(url, params={'token': access_token})

    def get_user_connections(self, user_id):
        """Get all OAuth providers connected by a user."""
        return list(r.smembers(f"{self.prefix}:connections:{user_id}"))

    def get_token_info(self, user_id, provider):
        """Get token metadata without exposing the actual token."""
        key = f"{self.prefix}:{user_id}:{provider}"
        encrypted = r.get(key)

        if not encrypted:
            return None

        token_data = self._decrypt(encrypted)
        current_time = int(time.time())

        return {
            'provider': provider,
            'scope': token_data.get('scope'),
            'expires_in': max(0, token_data['expires_at'] - current_time),
            'has_refresh_token': bool(token_data.get('refresh_token')),
            'stored_at': datetime.fromtimestamp(token_data['stored_at']).isoformat()
        }

# Usage
cache = OAuthTokenCache()

# After OAuth callback, store the tokens
tokens = {
    'access_token': 'ya29.a0AfH6SMBx...',
    'refresh_token': '1//0eZlvH...',
    'expires_in': 3600,
    'token_type': 'Bearer',
    'scope': 'email profile'
}
cache.store_tokens('user123', 'google', tokens)

# When making API calls, get the token
access_token = cache.get_access_token('user123', 'google')
if access_token:
    headers = {'Authorization': f'Bearer {access_token}'}
    # Make API call...

# Get user's connected providers
connections = cache.get_user_connections('user123')
print(f"Connected providers: {connections}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');
const axios = require('axios');

const redis = new Redis();

// Encryption setup
const ENCRYPTION_KEY = crypto.scryptSync('your-secret-password', 'salt', 32);
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

class OAuthTokenCache {
  constructor(prefix = 'oauth_token') {
    this.prefix = prefix;
    this.providerConfigs = {
      google: {
        refreshUrl: 'https://oauth2.googleapis.com/token',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      },
      github: {
        refreshUrl: 'https://github.com/login/oauth/access_token',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
      }
    };
  }

  async storeTokens(userId, provider, tokens) {
    const key = `${this.prefix}:${userId}:${provider}`;

    const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);

    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      provider,
      stored_at: Math.floor(Date.now() / 1000)
    };

    const encrypted = encrypt(JSON.stringify(tokenData));
    const ttl = (tokens.expires_in || 3600) + 300;

    await redis.pipeline()
      .setex(key, ttl, encrypted)
      .sadd(`${this.prefix}:connections:${userId}`, provider)
      .exec();

    return true;
  }

  async getAccessToken(userId, provider) {
    const key = `${this.prefix}:${userId}:${provider}`;
    const encrypted = await redis.get(key);

    if (!encrypted) {
      return null;
    }

    const tokenData = JSON.parse(decrypt(encrypted));
    const currentTime = Math.floor(Date.now() / 1000);

    // Check expiration with 5-minute buffer
    if (tokenData.expires_at < currentTime + 300) {
      if (tokenData.refresh_token) {
        const newTokens = await this.refreshToken(provider, tokenData.refresh_token);
        if (newTokens) {
          await this.storeTokens(userId, provider, newTokens);
          return newTokens.access_token;
        }
      }
      return null;
    }

    return tokenData.access_token;
  }

  async refreshToken(provider, refreshToken) {
    const config = this.providerConfigs[provider];
    if (!config) return null;

    try {
      const response = await axios.post(
        config.refreshUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret
        }),
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      return null;
    }
  }

  async revokeTokens(userId, provider) {
    const key = `${this.prefix}:${userId}:${provider}`;

    await redis.pipeline()
      .del(key)
      .srem(`${this.prefix}:connections:${userId}`, provider)
      .exec();
  }

  async getUserConnections(userId) {
    return await redis.smembers(`${this.prefix}:connections:${userId}`);
  }
}

// Usage
async function example() {
  const cache = new OAuthTokenCache();

  // Store tokens after OAuth flow
  await cache.storeTokens('user123', 'google', {
    access_token: 'ya29.xxx',
    refresh_token: '1//xxx',
    expires_in: 3600,
    scope: 'email profile'
  });

  // Get access token (auto-refreshes if needed)
  const token = await cache.getAccessToken('user123', 'google');
  console.log('Access token:', token ? 'Available' : 'Not available');

  // Get connected providers
  const connections = await cache.getUserConnections('user123');
  console.log('Connections:', connections);
}

example().catch(console.error);
```

## Handling Multiple Scopes

```python
class ScopedOAuthCache(OAuthTokenCache):
    def store_tokens(self, user_id, provider, tokens, scope_key=None):
        """Store tokens with optional scope differentiation."""
        if scope_key is None:
            scope_key = self._normalize_scope(tokens.get('scope', 'default'))

        key = f"{self.prefix}:{user_id}:{provider}:{scope_key}"

        expires_at = int(time.time()) + tokens.get('expires_in', 3600)

        token_data = {
            'access_token': tokens['access_token'],
            'refresh_token': tokens.get('refresh_token'),
            'expires_at': expires_at,
            'token_type': tokens.get('token_type', 'Bearer'),
            'scope': tokens.get('scope'),
            'scope_key': scope_key,
            'provider': provider,
            'stored_at': int(time.time())
        }

        encrypted = self._encrypt(token_data)
        ttl = tokens.get('expires_in', 3600) + 300
        r.setex(key, ttl, encrypted)

        # Track scopes for this provider
        r.sadd(f"{self.prefix}:scopes:{user_id}:{provider}", scope_key)

        return True

    def _normalize_scope(self, scope):
        """Normalize scope string for consistent key generation."""
        if not scope:
            return 'default'
        # Sort scopes alphabetically for consistent keys
        scopes = sorted(scope.split())
        return '_'.join(scopes)

    def get_access_token(self, user_id, provider, required_scope=None):
        """Get token with specific scope requirement."""
        if required_scope:
            scope_key = self._normalize_scope(required_scope)
            return self._get_token_for_scope(user_id, provider, scope_key)

        # Get any available token for the provider
        scopes = r.smembers(f"{self.prefix}:scopes:{user_id}:{provider}")
        for scope_key in scopes:
            token = self._get_token_for_scope(user_id, provider, scope_key)
            if token:
                return token

        return None

    def _get_token_for_scope(self, user_id, provider, scope_key):
        """Get token for specific scope."""
        key = f"{self.prefix}:{user_id}:{provider}:{scope_key}"
        encrypted = r.get(key)

        if not encrypted:
            return None

        token_data = self._decrypt(encrypted)

        if token_data['expires_at'] < int(time.time()) + 300:
            if token_data.get('refresh_token'):
                new_tokens = self._refresh_token(provider, token_data['refresh_token'])
                if new_tokens:
                    self.store_tokens(user_id, provider, new_tokens, scope_key)
                    return new_tokens['access_token']
            return None

        return token_data['access_token']

    def get_available_scopes(self, user_id, provider):
        """Get all available scopes for a provider."""
        return list(r.smembers(f"{self.prefix}:scopes:{user_id}:{provider}"))

# Usage
scoped_cache = ScopedOAuthCache()

# Store tokens for different scopes
scoped_cache.store_tokens('user123', 'google', {
    'access_token': 'token_for_basic',
    'expires_in': 3600,
    'scope': 'email profile'
})

scoped_cache.store_tokens('user123', 'google', {
    'access_token': 'token_for_drive',
    'expires_in': 3600,
    'scope': 'email profile drive.readonly'
})

# Get token for specific scope
token = scoped_cache.get_access_token('user123', 'google', 'drive.readonly email profile')
```

## Distributed Token Refresh with Locking

```python
import uuid

class DistributedOAuthCache(OAuthTokenCache):
    def __init__(self, prefix='oauth_token'):
        super().__init__(prefix)
        self.lock_prefix = f"{prefix}:lock"
        self.lock_ttl = 30  # 30 seconds lock

    def get_access_token(self, user_id, provider):
        """Get token with distributed lock for refresh."""
        key = f"{self.prefix}:{user_id}:{provider}"
        encrypted = r.get(key)

        if not encrypted:
            return None

        token_data = self._decrypt(encrypted)

        # Check if token needs refresh
        if token_data['expires_at'] < int(time.time()) + 300:
            if token_data.get('refresh_token'):
                # Try to acquire lock for refresh
                return self._refresh_with_lock(user_id, provider, token_data)
            return None

        return token_data['access_token']

    def _refresh_with_lock(self, user_id, provider, token_data):
        """Refresh token with distributed lock to prevent race conditions."""
        lock_key = f"{self.lock_prefix}:{user_id}:{provider}"
        lock_value = str(uuid.uuid4())

        # Try to acquire lock
        acquired = r.set(lock_key, lock_value, nx=True, ex=self.lock_ttl)

        if acquired:
            try:
                # Double-check token still needs refresh
                key = f"{self.prefix}:{user_id}:{provider}"
                encrypted = r.get(key)

                if encrypted:
                    current_data = self._decrypt(encrypted)
                    if current_data['expires_at'] >= int(time.time()) + 300:
                        # Token was refreshed by another process
                        return current_data['access_token']

                # Perform refresh
                new_tokens = self._refresh_token(provider, token_data['refresh_token'])

                if new_tokens:
                    self.store_tokens(user_id, provider, new_tokens)
                    return new_tokens['access_token']

            finally:
                # Release lock (only if we still own it)
                self._release_lock(lock_key, lock_value)

            return None
        else:
            # Wait briefly and retry
            import time as time_module
            time_module.sleep(0.1)

            # Check if token was refreshed
            encrypted = r.get(f"{self.prefix}:{user_id}:{provider}")
            if encrypted:
                token_data = self._decrypt(encrypted)
                if token_data['expires_at'] >= int(time.time()) + 60:
                    return token_data['access_token']

            return None

    def _release_lock(self, lock_key, lock_value):
        """Release lock only if we own it."""
        lua_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """
        r.eval(lua_script, 1, lock_key, lock_value)
```

## Service Account Token Caching

```python
class ServiceAccountTokenCache:
    """Cache tokens for service-to-service OAuth (client credentials flow)."""

    def __init__(self, prefix='service_token'):
        self.prefix = prefix

    def get_token(self, service_name, token_endpoint, client_id, client_secret, scope=None):
        """Get or fetch a service account token."""
        cache_key = f"{self.prefix}:{service_name}"

        # Check cache
        cached = r.get(cache_key)
        if cached:
            token_data = json.loads(cached)
            if token_data['expires_at'] > int(time.time()) + 60:
                return token_data['access_token']

        # Fetch new token
        token_data = self._fetch_token(token_endpoint, client_id, client_secret, scope)

        if token_data:
            # Cache with TTL
            expires_at = int(time.time()) + token_data.get('expires_in', 3600)
            cache_data = {
                'access_token': token_data['access_token'],
                'expires_at': expires_at
            }

            ttl = max(1, expires_at - int(time.time()) - 60)
            r.setex(cache_key, ttl, json.dumps(cache_data))

            return token_data['access_token']

        return None

    def _fetch_token(self, token_endpoint, client_id, client_secret, scope):
        """Fetch token using client credentials flow."""
        try:
            data = {
                'grant_type': 'client_credentials',
                'client_id': client_id,
                'client_secret': client_secret
            }

            if scope:
                data['scope'] = scope

            response = requests.post(
                token_endpoint,
                data=data,
                headers={'Accept': 'application/json'}
            )

            if response.status_code == 200:
                return response.json()

        except Exception as e:
            print(f"Service token fetch failed: {e}")

        return None

# Usage
service_cache = ServiceAccountTokenCache()

# Get token for internal service
token = service_cache.get_token(
    'payment-service',
    'https://auth.internal/oauth/token',
    client_id='payment-service-client',
    client_secret='secret',
    scope='payments:read payments:write'
)
```

## Best Practices

### 1. Always Encrypt Tokens at Rest

```python
# Use strong encryption for stored tokens
from cryptography.fernet import Fernet

key = Fernet.generate_key()  # Store securely, e.g., in env vars
cipher = Fernet(key)

encrypted_token = cipher.encrypt(access_token.encode())
```

### 2. Implement Proper Error Handling

```python
class ResilientOAuthCache(OAuthTokenCache):
    def get_access_token_with_fallback(self, user_id, provider, fallback_callback=None):
        """Get token with fallback for failures."""
        try:
            token = self.get_access_token(user_id, provider)
            if token:
                return token
        except Exception as e:
            print(f"Cache error: {e}")

        # Fallback: trigger re-authentication
        if fallback_callback:
            return fallback_callback(user_id, provider)

        return None
```

### 3. Monitor Token Usage

```python
def track_token_usage(user_id, provider, endpoint):
    """Track OAuth API usage for monitoring."""
    key = f"oauth_usage:{user_id}:{provider}"
    pipe = r.pipeline()
    pipe.hincrby(key, 'total_calls', 1)
    pipe.hincrby(key, f'endpoint:{endpoint}', 1)
    pipe.hincrby(key, f'date:{datetime.utcnow().strftime("%Y-%m-%d")}', 1)
    pipe.expire(key, 86400 * 30)
    pipe.execute()
```

## Conclusion

OAuth token caching with Redis enables efficient third-party API integration while maintaining security. Key takeaways:

- Always encrypt tokens at rest
- Implement automatic token refresh with proper locking
- Handle multiple scopes and providers per user
- Use distributed locks for refresh operations
- Monitor token usage and expiration

Redis's TTL support and atomic operations make it perfect for OAuth token management, ensuring your integrations are fast, reliable, and secure.
