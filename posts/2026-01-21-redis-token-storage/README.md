# How to Implement Token Storage with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Authentication, JWT, Token Storage, Security, Blacklisting

Description: A comprehensive guide to implementing secure token storage with Redis including JWT blacklisting, refresh token management, and token rotation strategies.

---

Token-based authentication is the standard for modern applications. While JWTs are stateless by design, real-world scenarios often require server-side token management for features like logout, token revocation, and refresh token rotation. Redis provides the perfect backend for these use cases with its speed, TTL support, and atomic operations.

## Understanding Token Storage Requirements

Common token storage needs include:

- **JWT blacklisting**: Invalidate tokens before expiration
- **Refresh token storage**: Secure long-lived tokens for session renewal
- **Token rotation**: Implement one-time-use refresh tokens
- **Device/session tracking**: Allow users to manage active sessions
- **Rate limiting**: Prevent token abuse

## JWT Blacklisting

When a user logs out or a token needs to be revoked, you need a way to invalidate JWTs before their natural expiration.

### Basic Blacklist Implementation

```python
import redis
import jwt
import time
from datetime import datetime, timedelta

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

JWT_SECRET = 'your-secret-key'
JWT_ALGORITHM = 'HS256'

class TokenBlacklist:
    def __init__(self, prefix='blacklist'):
        self.prefix = prefix

    def blacklist_token(self, token):
        """Add a token to the blacklist."""
        try:
            # Decode without verification to get expiration
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM],
                options={'verify_exp': False}
            )

            jti = payload.get('jti')  # JWT ID
            exp = payload.get('exp')

            if not jti or not exp:
                return False

            # Calculate TTL (time until token would naturally expire)
            ttl = max(0, exp - int(time.time()))

            if ttl > 0:
                # Store in blacklist with TTL matching token expiration
                key = f"{self.prefix}:{jti}"
                r.setex(key, ttl, '1')
                return True

            return False  # Token already expired
        except jwt.InvalidTokenError:
            return False

    def is_blacklisted(self, token):
        """Check if a token is blacklisted."""
        try:
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM],
                options={'verify_exp': False}
            )

            jti = payload.get('jti')
            if not jti:
                return False

            key = f"{self.prefix}:{jti}"
            return r.exists(key) == 1
        except jwt.InvalidTokenError:
            return True  # Invalid tokens are effectively blacklisted

    def blacklist_all_user_tokens(self, user_id, issued_before=None):
        """Blacklist all tokens for a user issued before a timestamp."""
        if issued_before is None:
            issued_before = int(time.time())

        # Store the timestamp - all tokens issued before this are invalid
        key = f"{self.prefix}:user:{user_id}"
        r.set(key, issued_before)

    def is_user_token_valid(self, token):
        """Check if a user's token is valid (not blacklisted individually or by user)."""
        try:
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM]
            )

            # Check individual blacklist
            jti = payload.get('jti')
            if jti and r.exists(f"{self.prefix}:{jti}"):
                return False

            # Check user-level blacklist
            user_id = payload.get('sub')
            iat = payload.get('iat')

            if user_id and iat:
                invalidation_time = r.get(f"{self.prefix}:user:{user_id}")
                if invalidation_time and int(invalidation_time) > iat:
                    return False

            return True
        except jwt.InvalidTokenError:
            return False

# Usage
blacklist = TokenBlacklist()

# Create a token
def create_token(user_id, expires_in=3600):
    import uuid
    payload = {
        'sub': user_id,
        'jti': str(uuid.uuid4()),
        'iat': int(time.time()),
        'exp': int(time.time()) + expires_in
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# Example usage
token = create_token('user123')
print(f"Token created: {token[:50]}...")

# Verify token is valid
print(f"Is valid: {blacklist.is_user_token_valid(token)}")

# Blacklist the token
blacklist.blacklist_token(token)
print(f"After blacklist: {blacklist.is_user_token_valid(token)}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis();
const JWT_SECRET = 'your-secret-key';

class TokenBlacklist {
  constructor(prefix = 'blacklist') {
    this.prefix = prefix;
  }

  async blacklistToken(token) {
    try {
      const payload = jwt.decode(token);

      if (!payload || !payload.jti || !payload.exp) {
        return false;
      }

      const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));

      if (ttl > 0) {
        const key = `${this.prefix}:${payload.jti}`;
        await redis.setex(key, ttl, '1');
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async isBlacklisted(token) {
    try {
      const payload = jwt.decode(token);

      if (!payload || !payload.jti) {
        return true;
      }

      const key = `${this.prefix}:${payload.jti}`;
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      return true;
    }
  }

  async blacklistAllUserTokens(userId) {
    const timestamp = Math.floor(Date.now() / 1000);
    const key = `${this.prefix}:user:${userId}`;
    await redis.set(key, timestamp);
  }

  async verifyToken(token) {
    try {
      // First verify the JWT signature and expiration
      const payload = jwt.verify(token, JWT_SECRET);

      // Check individual blacklist
      if (payload.jti) {
        const isBlacklisted = await redis.exists(`${this.prefix}:${payload.jti}`);
        if (isBlacklisted) {
          return { valid: false, reason: 'Token blacklisted' };
        }
      }

      // Check user-level blacklist
      if (payload.sub && payload.iat) {
        const invalidationTime = await redis.get(`${this.prefix}:user:${payload.sub}`);
        if (invalidationTime && parseInt(invalidationTime) > payload.iat) {
          return { valid: false, reason: 'User tokens invalidated' };
        }
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }
}

// Helper to create tokens
function createToken(userId, expiresIn = '1h') {
  return jwt.sign(
    {
      sub: userId,
      jti: uuidv4(),
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn }
  );
}

// Usage
async function example() {
  const blacklist = new TokenBlacklist();

  const token = createToken('user123');
  console.log('Token created');

  let result = await blacklist.verifyToken(token);
  console.log('Before blacklist:', result);

  await blacklist.blacklistToken(token);

  result = await blacklist.verifyToken(token);
  console.log('After blacklist:', result);
}

example().catch(console.error);
```

## Refresh Token Management

Refresh tokens are long-lived tokens used to obtain new access tokens. They require secure storage and rotation.

### Secure Refresh Token Storage

```python
import secrets
import hashlib
import json

class RefreshTokenManager:
    def __init__(self, prefix='refresh_token'):
        self.prefix = prefix
        self.token_lifetime = 30 * 24 * 3600  # 30 days

    def _hash_token(self, token):
        """Hash the token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    def create_refresh_token(self, user_id, device_info=None, ip_address=None):
        """Create and store a new refresh token."""
        # Generate cryptographically secure token
        token = secrets.token_urlsafe(64)
        token_hash = self._hash_token(token)

        # Store token metadata
        token_data = {
            'user_id': user_id,
            'created_at': int(time.time()),
            'device_info': device_info or {},
            'ip_address': ip_address,
            'used': False
        }

        # Store by token hash
        token_key = f"{self.prefix}:{token_hash}"
        r.setex(token_key, self.token_lifetime, json.dumps(token_data))

        # Add to user's token list for management
        user_tokens_key = f"{self.prefix}:user:{user_id}"
        r.sadd(user_tokens_key, token_hash)

        return token

    def validate_refresh_token(self, token):
        """Validate a refresh token and return user info."""
        token_hash = self._hash_token(token)
        token_key = f"{self.prefix}:{token_hash}"

        data = r.get(token_key)
        if not data:
            return None

        token_data = json.loads(data)
        return token_data

    def rotate_refresh_token(self, old_token, device_info=None, ip_address=None):
        """
        Rotate a refresh token - invalidate old, create new.
        Implements refresh token rotation for security.
        """
        token_hash = self._hash_token(old_token)
        token_key = f"{self.prefix}:{token_hash}"

        # Get and validate old token
        data = r.get(token_key)
        if not data:
            return None

        token_data = json.loads(data)

        # Check if token was already used (replay attack detection)
        if token_data.get('used'):
            # Potential security breach - invalidate all user tokens
            self.revoke_all_user_tokens(token_data['user_id'])
            return None

        # Mark old token as used (keep briefly for replay detection)
        token_data['used'] = True
        r.setex(token_key, 3600, json.dumps(token_data))  # Keep for 1 hour

        # Create new token
        new_token = self.create_refresh_token(
            token_data['user_id'],
            device_info or token_data.get('device_info'),
            ip_address or token_data.get('ip_address')
        )

        return {
            'refresh_token': new_token,
            'user_id': token_data['user_id']
        }

    def revoke_refresh_token(self, token):
        """Revoke a specific refresh token."""
        token_hash = self._hash_token(token)
        token_key = f"{self.prefix}:{token_hash}"

        # Get user_id before deleting
        data = r.get(token_key)
        if data:
            token_data = json.loads(data)
            user_id = token_data['user_id']

            # Remove from user's token set
            r.srem(f"{self.prefix}:user:{user_id}", token_hash)

        r.delete(token_key)

    def revoke_all_user_tokens(self, user_id):
        """Revoke all refresh tokens for a user."""
        user_tokens_key = f"{self.prefix}:user:{user_id}"
        token_hashes = r.smembers(user_tokens_key)

        if token_hashes:
            # Delete all tokens
            token_keys = [f"{self.prefix}:{h}" for h in token_hashes]
            r.delete(*token_keys)

        r.delete(user_tokens_key)

    def get_user_sessions(self, user_id):
        """Get all active sessions/tokens for a user."""
        user_tokens_key = f"{self.prefix}:user:{user_id}"
        token_hashes = r.smembers(user_tokens_key)

        sessions = []
        for token_hash in token_hashes:
            data = r.get(f"{self.prefix}:{token_hash}")
            if data:
                token_data = json.loads(data)
                sessions.append({
                    'token_id': token_hash[:16] + '...',
                    'device_info': token_data.get('device_info'),
                    'ip_address': token_data.get('ip_address'),
                    'created_at': token_data.get('created_at')
                })

        return sessions

# Usage
refresh_manager = RefreshTokenManager()

# Create initial refresh token
refresh_token = refresh_manager.create_refresh_token(
    'user123',
    device_info={'browser': 'Chrome', 'os': 'macOS'},
    ip_address='192.168.1.1'
)
print(f"Refresh token created: {refresh_token[:30]}...")

# Validate token
token_data = refresh_manager.validate_refresh_token(refresh_token)
print(f"Token data: {token_data}")

# Rotate token (use this when refreshing access tokens)
result = refresh_manager.rotate_refresh_token(refresh_token)
if result:
    new_refresh_token = result['refresh_token']
    print(f"New refresh token: {new_refresh_token[:30]}...")

# Get all user sessions
sessions = refresh_manager.get_user_sessions('user123')
print(f"Active sessions: {sessions}")
```

## Token Family Tracking

For enhanced security, track token families to detect token reuse attacks.

```python
class TokenFamilyManager:
    def __init__(self):
        self.family_prefix = 'token_family'
        self.token_prefix = 'refresh_token'

    def create_token_family(self, user_id):
        """Create a new token family for a user session."""
        import uuid
        family_id = str(uuid.uuid4())

        family_data = {
            'user_id': user_id,
            'created_at': int(time.time()),
            'token_count': 0,
            'compromised': False
        }

        r.hset(f"{self.family_prefix}:{family_id}", mapping=family_data)
        r.expire(f"{self.family_prefix}:{family_id}", 30 * 24 * 3600)

        return family_id

    def create_token_in_family(self, family_id, device_info=None):
        """Create a new refresh token in an existing family."""
        family_key = f"{self.family_prefix}:{family_id}"
        family_data = r.hgetall(family_key)

        if not family_data:
            return None

        if family_data.get('compromised') == 'True':
            return None

        # Generate token
        token = secrets.token_urlsafe(64)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        token_index = int(family_data.get('token_count', 0)) + 1

        token_data = {
            'family_id': family_id,
            'user_id': family_data['user_id'],
            'index': token_index,
            'created_at': int(time.time()),
            'device_info': json.dumps(device_info or {}),
            'used': 'False'
        }

        pipe = r.pipeline()
        pipe.hset(f"{self.token_prefix}:{token_hash}", mapping=token_data)
        pipe.expire(f"{self.token_prefix}:{token_hash}", 30 * 24 * 3600)
        pipe.hset(family_key, 'token_count', token_index)
        pipe.hset(family_key, 'latest_token', token_hash)
        pipe.execute()

        return token

    def rotate_token(self, old_token):
        """Rotate a token within its family."""
        token_hash = hashlib.sha256(old_token.encode()).hexdigest()
        token_key = f"{self.token_prefix}:{token_hash}"

        token_data = r.hgetall(token_key)
        if not token_data:
            return None

        family_id = token_data.get('family_id')
        family_key = f"{self.family_prefix}:{family_id}"

        # Check if token was already used
        if token_data.get('used') == 'True':
            # Token reuse detected - compromise the family
            self._compromise_family(family_id)
            return None

        # Check if this is the latest token in the family
        family_data = r.hgetall(family_key)
        if family_data.get('latest_token') != token_hash:
            # Using an old token - potential attack
            self._compromise_family(family_id)
            return None

        # Mark old token as used
        r.hset(token_key, 'used', 'True')

        # Create new token in family
        device_info = json.loads(token_data.get('device_info', '{}'))
        new_token = self.create_token_in_family(family_id, device_info)

        return {
            'refresh_token': new_token,
            'user_id': token_data['user_id']
        }

    def _compromise_family(self, family_id):
        """Mark a token family as compromised and revoke all tokens."""
        family_key = f"{self.family_prefix}:{family_id}"
        family_data = r.hgetall(family_key)

        if not family_data:
            return

        # Mark family as compromised
        r.hset(family_key, 'compromised', 'True')

        user_id = family_data.get('user_id')

        # Could trigger security alert here
        print(f"SECURITY ALERT: Token family {family_id} for user {user_id} compromised!")

# Usage
family_manager = TokenFamilyManager()

# Start a new session (creates family)
family_id = family_manager.create_token_family('user123')

# Create first refresh token
token1 = family_manager.create_token_in_family(family_id)
print(f"Token 1: {token1[:30]}...")

# Rotate token (normal flow)
result = family_manager.rotate_token(token1)
if result:
    token2 = result['refresh_token']
    print(f"Token 2: {token2[:30]}...")
```

## Express.js Middleware Example

```javascript
const express = require('express');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

const app = express();
const redis = new Redis();

const JWT_SECRET = 'your-secret-key';
const BLACKLIST_PREFIX = 'blacklist';

// Middleware to verify tokens
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT signature and expiration
    const payload = jwt.verify(token, JWT_SECRET);

    // Check blacklist
    if (payload.jti) {
      const isBlacklisted = await redis.exists(`${BLACKLIST_PREFIX}:${payload.jti}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    }

    // Check user-level invalidation
    if (payload.sub && payload.iat) {
      const invalidationTime = await redis.get(`${BLACKLIST_PREFIX}:user:${payload.sub}`);
      if (invalidationTime && parseInt(invalidationTime) > payload.iat) {
        return res.status(401).json({ error: 'Session invalidated' });
      }
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Logout endpoint
app.post('/logout', authMiddleware, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const payload = jwt.decode(token);

  if (payload && payload.jti && payload.exp) {
    const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    if (ttl > 0) {
      await redis.setex(`${BLACKLIST_PREFIX}:${payload.jti}`, ttl, '1');
    }
  }

  res.json({ message: 'Logged out successfully' });
});

// Logout from all devices
app.post('/logout-all', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  await redis.set(`${BLACKLIST_PREFIX}:user:${userId}`, Math.floor(Date.now() / 1000));

  res.json({ message: 'Logged out from all devices' });
});

// Protected route
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Best Practices

### 1. Always Hash Refresh Tokens

```python
# Never store raw refresh tokens
token_hash = hashlib.sha256(token.encode()).hexdigest()
r.set(f"refresh:{token_hash}", user_data)
```

### 2. Implement Proper TTLs

```python
# Access token blacklist - match token expiration
access_token_ttl = exp_time - current_time
r.setex(f"blacklist:{jti}", access_token_ttl, '1')

# Refresh tokens - typically 30 days
r.setex(f"refresh:{hash}", 30 * 24 * 3600, data)
```

### 3. Use Atomic Operations for Token Rotation

```lua
-- atomic_token_rotate.lua
local old_key = KEYS[1]
local new_key = KEYS[2]
local user_tokens_key = KEYS[3]
local new_data = ARGV[1]
local ttl = tonumber(ARGV[2])
local old_hash = ARGV[3]
local new_hash = ARGV[4]

-- Check if old token exists and not used
local old_data = redis.call('GET', old_key)
if not old_data then
    return nil
end

local data = cjson.decode(old_data)
if data.used then
    return 'REUSE_DETECTED'
end

-- Mark old as used
data.used = true
redis.call('SETEX', old_key, 3600, cjson.encode(data))

-- Create new token
redis.call('SETEX', new_key, ttl, new_data)

-- Update user's token set
redis.call('SREM', user_tokens_key, old_hash)
redis.call('SADD', user_tokens_key, new_hash)

return 'OK'
```

### 4. Monitor for Suspicious Activity

```python
def check_suspicious_activity(user_id, ip_address):
    """Check for suspicious token activity."""
    key = f"token_activity:{user_id}"

    # Track unique IPs
    r.sadd(f"{key}:ips", ip_address)
    unique_ips = r.scard(f"{key}:ips")

    # Track request count
    requests = r.incr(f"{key}:requests")
    r.expire(f"{key}:requests", 3600)

    if unique_ips > 5 or requests > 100:
        # Flag for review
        r.sadd("security:suspicious_users", user_id)
```

## Conclusion

Implementing secure token storage with Redis enables robust authentication systems that go beyond stateless JWTs. Key takeaways:

- Use JWT blacklisting for immediate token revocation
- Implement refresh token rotation for enhanced security
- Track token families to detect replay attacks
- Always hash sensitive tokens before storage
- Set appropriate TTLs to manage memory usage

Redis's speed and TTL support make it ideal for token management, enabling secure authentication patterns while maintaining the performance your applications need.
