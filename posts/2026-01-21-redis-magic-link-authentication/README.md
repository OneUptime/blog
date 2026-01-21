# How to Implement Magic Link Authentication with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Authentication, Magic Link, Passwordless, Security, One-Time Tokens

Description: A comprehensive guide to implementing secure magic link authentication with Redis including one-time tokens, rate limiting, and secure login flows.

---

Magic link authentication provides a passwordless login experience where users receive a unique, time-limited link via email. Redis is the perfect backend for this pattern due to its TTL support, atomic operations, and speed. This guide covers implementing secure magic links with proper security considerations.

## Understanding Magic Link Authentication

Magic link authentication works as follows:

1. User enters their email address
2. System generates a unique, cryptographically secure token
3. Token is stored in Redis with short TTL (typically 15-30 minutes)
4. Email is sent with a link containing the token
5. User clicks the link, token is validated and consumed
6. User is authenticated and token is invalidated

## Basic Magic Link Implementation

### Python Implementation

```python
import redis
import secrets
import hashlib
import json
import time
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class MagicLinkAuth:
    def __init__(self, prefix='magic_link', token_ttl=900):  # 15 minutes
        self.prefix = prefix
        self.token_ttl = token_ttl

    def generate_token(self):
        """Generate a cryptographically secure token."""
        return secrets.token_urlsafe(32)

    def _hash_token(self, token):
        """Hash the token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    def create_magic_link(self, email, metadata=None):
        """Create a magic link token for an email."""
        token = self.generate_token()
        token_hash = self._hash_token(token)

        token_data = {
            'email': email.lower(),
            'created_at': int(time.time()),
            'metadata': metadata or {},
            'used': False
        }

        key = f"{self.prefix}:{token_hash}"

        # Store with TTL
        r.setex(key, self.token_ttl, json.dumps(token_data))

        # Track tokens by email (for rate limiting and management)
        email_key = f"{self.prefix}:email:{email.lower()}"
        r.lpush(email_key, token_hash)
        r.ltrim(email_key, 0, 4)  # Keep last 5 tokens
        r.expire(email_key, self.token_ttl)

        return token

    def verify_token(self, token, consume=True):
        """
        Verify a magic link token.

        Args:
            token: The raw token from the URL
            consume: Whether to mark the token as used (default True)

        Returns:
            dict with email and metadata if valid, None otherwise
        """
        token_hash = self._hash_token(token)
        key = f"{self.prefix}:{token_hash}"

        data = r.get(key)
        if not data:
            return None

        token_data = json.loads(data)

        # Check if already used
        if token_data.get('used'):
            return None

        if consume:
            # Mark as used atomically
            token_data['used'] = True
            token_data['used_at'] = int(time.time())
            r.setex(key, 300, json.dumps(token_data))  # Keep for 5 min after use

        return {
            'email': token_data['email'],
            'metadata': token_data.get('metadata', {}),
            'created_at': token_data['created_at']
        }

    def invalidate_token(self, token):
        """Explicitly invalidate a token."""
        token_hash = self._hash_token(token)
        key = f"{self.prefix}:{token_hash}"
        r.delete(key)

    def invalidate_all_for_email(self, email):
        """Invalidate all tokens for an email address."""
        email_key = f"{self.prefix}:email:{email.lower()}"
        token_hashes = r.lrange(email_key, 0, -1)

        if token_hashes:
            keys = [f"{self.prefix}:{h}" for h in token_hashes]
            r.delete(*keys)
            r.delete(email_key)

    def get_token_info(self, token):
        """Get token information without consuming it."""
        return self.verify_token(token, consume=False)

# Usage
auth = MagicLinkAuth()

# Create magic link
email = "user@example.com"
token = auth.create_magic_link(email, metadata={'redirect': '/dashboard'})
magic_link = f"https://yourapp.com/auth/verify?token={token}"
print(f"Magic link: {magic_link}")

# Verify token (when user clicks the link)
result = auth.verify_token(token)
if result:
    print(f"Authenticated: {result['email']}")
else:
    print("Invalid or expired token")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');

const redis = new Redis();

class MagicLinkAuth {
  constructor(prefix = 'magic_link', tokenTTL = 900) {
    this.prefix = prefix;
    this.tokenTTL = tokenTTL;
  }

  generateToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createMagicLink(email, metadata = {}) {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    const tokenData = {
      email: email.toLowerCase(),
      created_at: Math.floor(Date.now() / 1000),
      metadata,
      used: false
    };

    const key = `${this.prefix}:${tokenHash}`;
    const emailKey = `${this.prefix}:email:${email.toLowerCase()}`;

    await redis.pipeline()
      .setex(key, this.tokenTTL, JSON.stringify(tokenData))
      .lpush(emailKey, tokenHash)
      .ltrim(emailKey, 0, 4)
      .expire(emailKey, this.tokenTTL)
      .exec();

    return token;
  }

  async verifyToken(token, consume = true) {
    const tokenHash = this.hashToken(token);
    const key = `${this.prefix}:${tokenHash}`;

    const data = await redis.get(key);
    if (!data) {
      return null;
    }

    const tokenData = JSON.parse(data);

    if (tokenData.used) {
      return null;
    }

    if (consume) {
      tokenData.used = true;
      tokenData.used_at = Math.floor(Date.now() / 1000);
      await redis.setex(key, 300, JSON.stringify(tokenData));
    }

    return {
      email: tokenData.email,
      metadata: tokenData.metadata || {},
      created_at: tokenData.created_at
    };
  }

  async invalidateToken(token) {
    const tokenHash = this.hashToken(token);
    const key = `${this.prefix}:${tokenHash}`;
    await redis.del(key);
  }

  async invalidateAllForEmail(email) {
    const emailKey = `${this.prefix}:email:${email.toLowerCase()}`;
    const tokenHashes = await redis.lrange(emailKey, 0, -1);

    if (tokenHashes.length > 0) {
      const keys = tokenHashes.map(h => `${this.prefix}:${h}`);
      await redis.del(...keys, emailKey);
    }
  }
}

// Usage
async function example() {
  const auth = new MagicLinkAuth();

  // Create magic link
  const token = await auth.createMagicLink('user@example.com', {
    redirect: '/dashboard'
  });
  console.log('Magic link token:', token);

  // Verify token
  const result = await auth.verifyToken(token);
  if (result) {
    console.log('Authenticated:', result.email);
  }
}

example().catch(console.error);
```

## Secure Implementation with Rate Limiting

```python
class SecureMagicLinkAuth(MagicLinkAuth):
    def __init__(self, prefix='magic_link', token_ttl=900):
        super().__init__(prefix, token_ttl)
        self.rate_limit_window = 3600  # 1 hour
        self.max_requests_per_hour = 5
        self.max_attempts_per_token = 3

    def create_magic_link(self, email, ip_address=None, metadata=None):
        """Create magic link with rate limiting."""
        email = email.lower()

        # Check rate limits
        if not self._check_rate_limit(email, 'email'):
            raise RateLimitError("Too many requests for this email")

        if ip_address and not self._check_rate_limit(ip_address, 'ip'):
            raise RateLimitError("Too many requests from this IP")

        # Create token
        token = self.generate_token()
        token_hash = self._hash_token(token)

        token_data = {
            'email': email,
            'created_at': int(time.time()),
            'metadata': metadata or {},
            'ip_address': ip_address,
            'used': False,
            'attempts': 0
        }

        key = f"{self.prefix}:{token_hash}"
        r.setex(key, self.token_ttl, json.dumps(token_data))

        # Update rate limit counters
        self._increment_rate_limit(email, 'email')
        if ip_address:
            self._increment_rate_limit(ip_address, 'ip')

        # Track for email
        email_key = f"{self.prefix}:email:{email}"
        r.lpush(email_key, token_hash)
        r.ltrim(email_key, 0, 4)
        r.expire(email_key, self.token_ttl)

        return token

    def verify_token(self, token, ip_address=None, consume=True):
        """Verify token with attempt tracking."""
        token_hash = self._hash_token(token)
        key = f"{self.prefix}:{token_hash}"

        # Use Lua script for atomic verification
        lua_script = """
        local key = KEYS[1]
        local max_attempts = tonumber(ARGV[1])
        local consume = ARGV[2] == 'true'
        local current_time = tonumber(ARGV[3])

        local data = redis.call('GET', key)
        if not data then
            return nil
        end

        local token_data = cjson.decode(data)

        -- Check if already used
        if token_data.used then
            return cjson.encode({error = 'TOKEN_USED'})
        end

        -- Check attempt limit
        if token_data.attempts >= max_attempts then
            return cjson.encode({error = 'TOO_MANY_ATTEMPTS'})
        end

        -- Increment attempts
        token_data.attempts = token_data.attempts + 1

        if consume then
            token_data.used = true
            token_data.used_at = current_time
            redis.call('SETEX', key, 300, cjson.encode(token_data))
        else
            redis.call('SET', key, cjson.encode(token_data), 'KEEPTTL')
        end

        return cjson.encode({
            email = token_data.email,
            metadata = token_data.metadata,
            created_at = token_data.created_at
        })
        """

        result = r.eval(
            lua_script, 1, key,
            self.max_attempts_per_token,
            'true' if consume else 'false',
            int(time.time())
        )

        if not result:
            return None

        data = json.loads(result)
        if 'error' in data:
            if data['error'] == 'TOO_MANY_ATTEMPTS':
                raise TooManyAttemptsError("Too many verification attempts")
            return None

        return data

    def _check_rate_limit(self, identifier, limit_type):
        """Check if rate limit is exceeded."""
        key = f"{self.prefix}:ratelimit:{limit_type}:{identifier}"
        count = r.get(key)
        return count is None or int(count) < self.max_requests_per_hour

    def _increment_rate_limit(self, identifier, limit_type):
        """Increment rate limit counter."""
        key = f"{self.prefix}:ratelimit:{limit_type}:{identifier}"
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.rate_limit_window)
        pipe.execute()

class RateLimitError(Exception):
    pass

class TooManyAttemptsError(Exception):
    pass

# Usage
secure_auth = SecureMagicLinkAuth()

try:
    token = secure_auth.create_magic_link(
        'user@example.com',
        ip_address='192.168.1.1',
        metadata={'action': 'login'}
    )
    print(f"Token created: {token}")

    # Verify
    result = secure_auth.verify_token(token)
    print(f"Verified: {result}")

except RateLimitError as e:
    print(f"Rate limited: {e}")
except TooManyAttemptsError as e:
    print(f"Too many attempts: {e}")
```

## Complete Express.js Implementation

```javascript
const express = require('express');
const Redis = require('ioredis');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

const redis = new Redis();

// Configuration
const CONFIG = {
  tokenTTL: 900, // 15 minutes
  maxRequestsPerHour: 5,
  maxAttemptsPerToken: 3,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000'
};

// Email transporter (configure for your provider)
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

class MagicLinkService {
  constructor() {
    this.prefix = 'magic_link';
  }

  generateToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async checkRateLimit(identifier, type) {
    const key = `${this.prefix}:ratelimit:${type}:${identifier}`;
    const count = await redis.get(key);
    return !count || parseInt(count) < CONFIG.maxRequestsPerHour;
  }

  async incrementRateLimit(identifier, type) {
    const key = `${this.prefix}:ratelimit:${type}:${identifier}`;
    await redis.pipeline()
      .incr(key)
      .expire(key, 3600)
      .exec();
  }

  async createMagicLink(email, ipAddress, metadata = {}) {
    email = email.toLowerCase();

    // Check rate limits
    const emailAllowed = await this.checkRateLimit(email, 'email');
    const ipAllowed = await this.checkRateLimit(ipAddress, 'ip');

    if (!emailAllowed) {
      throw new Error('RATE_LIMIT_EMAIL');
    }

    if (!ipAllowed) {
      throw new Error('RATE_LIMIT_IP');
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    const tokenData = {
      email,
      created_at: Math.floor(Date.now() / 1000),
      metadata,
      ip_address: ipAddress,
      used: false,
      attempts: 0
    };

    const key = `${this.prefix}:${tokenHash}`;

    await redis.pipeline()
      .setex(key, CONFIG.tokenTTL, JSON.stringify(tokenData))
      .exec();

    // Update rate limits
    await this.incrementRateLimit(email, 'email');
    await this.incrementRateLimit(ipAddress, 'ip');

    return token;
  }

  async verifyToken(token) {
    const tokenHash = this.hashToken(token);
    const key = `${this.prefix}:${tokenHash}`;

    // Atomic verification with Lua
    const luaScript = `
      local key = KEYS[1]
      local max_attempts = tonumber(ARGV[1])
      local current_time = tonumber(ARGV[2])

      local data = redis.call('GET', key)
      if not data then
        return nil
      end

      local token_data = cjson.decode(data)

      if token_data.used then
        return cjson.encode({error = 'TOKEN_USED'})
      end

      if token_data.attempts >= max_attempts then
        return cjson.encode({error = 'TOO_MANY_ATTEMPTS'})
      end

      token_data.attempts = token_data.attempts + 1
      token_data.used = true
      token_data.used_at = current_time

      redis.call('SETEX', key, 300, cjson.encode(token_data))

      return cjson.encode({
        email = token_data.email,
        metadata = token_data.metadata,
        created_at = token_data.created_at
      })
    `;

    const result = await redis.eval(
      luaScript,
      1,
      key,
      CONFIG.maxAttemptsPerToken,
      Math.floor(Date.now() / 1000)
    );

    if (!result) {
      return { valid: false, error: 'TOKEN_NOT_FOUND' };
    }

    const data = JSON.parse(result);
    if (data.error) {
      return { valid: false, error: data.error };
    }

    return { valid: true, data };
  }

  async sendMagicLinkEmail(email, token) {
    const magicLink = `${CONFIG.baseUrl}/auth/verify?token=${token}`;

    await transporter.sendMail({
      from: '"Your App" <noreply@yourapp.com>',
      to: email,
      subject: 'Your Login Link',
      html: `
        <h1>Login to Your App</h1>
        <p>Click the link below to log in. This link expires in 15 minutes.</p>
        <a href="${magicLink}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
        ">Log In</a>
        <p>Or copy this link: ${magicLink}</p>
        <p>If you didn't request this, you can ignore this email.</p>
      `
    });
  }
}

const magicLinkService = new MagicLinkService();

// Request magic link endpoint
app.post('/auth/magic-link', async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const token = await magicLinkService.createMagicLink(
      email,
      ipAddress,
      { action: 'login' }
    );

    // Send email (don't await to respond quickly)
    magicLinkService.sendMagicLinkEmail(email, token).catch(console.error);

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account exists, a login link has been sent'
    });

  } catch (error) {
    if (error.message.startsWith('RATE_LIMIT')) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }
    console.error('Magic link error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Verify magic link endpoint
app.get('/auth/verify', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    const result = await magicLinkService.verifyToken(token);

    if (!result.valid) {
      const messages = {
        'TOKEN_NOT_FOUND': 'This link has expired or is invalid',
        'TOKEN_USED': 'This link has already been used',
        'TOO_MANY_ATTEMPTS': 'Too many verification attempts'
      };

      return res.status(400).json({
        error: messages[result.error] || 'Invalid link'
      });
    }

    // Create session for the user
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    await redis.setex(
      `session:${sessionToken}`,
      86400, // 24 hours
      JSON.stringify({
        email: result.data.email,
        created_at: Math.floor(Date.now() / 1000)
      })
    );

    // Set session cookie
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000
    });

    // Redirect or return success
    const redirect = result.data.metadata?.redirect || '/dashboard';
    res.redirect(redirect);

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Additional Security Measures

### Token Binding to Request Context

```python
class ContextBoundMagicLinkAuth(SecureMagicLinkAuth):
    def create_magic_link(self, email, ip_address=None, user_agent=None, metadata=None):
        """Create token bound to request context."""
        email = email.lower()

        # Check rate limits
        if not self._check_rate_limit(email, 'email'):
            raise RateLimitError("Too many requests for this email")

        # Create context hash
        context = f"{ip_address}:{user_agent}"
        context_hash = hashlib.sha256(context.encode()).hexdigest()[:16]

        token = self.generate_token()
        token_hash = self._hash_token(token)

        token_data = {
            'email': email,
            'created_at': int(time.time()),
            'metadata': metadata or {},
            'context_hash': context_hash,
            'used': False,
            'attempts': 0
        }

        key = f"{self.prefix}:{token_hash}"
        r.setex(key, self.token_ttl, json.dumps(token_data))

        self._increment_rate_limit(email, 'email')

        return token

    def verify_token(self, token, ip_address=None, user_agent=None):
        """Verify token with context binding."""
        token_hash = self._hash_token(token)
        key = f"{self.prefix}:{token_hash}"

        data = r.get(key)
        if not data:
            return None

        token_data = json.loads(data)

        if token_data.get('used'):
            return None

        # Verify context (optional strict mode)
        if token_data.get('context_hash'):
            context = f"{ip_address}:{user_agent}"
            context_hash = hashlib.sha256(context.encode()).hexdigest()[:16]

            if context_hash != token_data['context_hash']:
                # Context mismatch - log security event
                self._log_security_event('context_mismatch', {
                    'token_hash': token_hash[:16],
                    'email': token_data['email'],
                    'expected_context': token_data['context_hash'],
                    'actual_context': context_hash
                })
                # Could reject or just warn depending on security requirements

        # Mark as used
        token_data['used'] = True
        token_data['used_at'] = int(time.time())
        r.setex(key, 300, json.dumps(token_data))

        return {
            'email': token_data['email'],
            'metadata': token_data.get('metadata', {})
        }

    def _log_security_event(self, event_type, details):
        """Log security events for monitoring."""
        event = {
            'type': event_type,
            'timestamp': int(time.time()),
            'details': details
        }
        r.lpush('security:magic_link_events', json.dumps(event))
        r.ltrim('security:magic_link_events', 0, 9999)
```

### Account Enumeration Protection

```python
def request_magic_link_safe(email, ip_address):
    """
    Request magic link without revealing if account exists.
    Always return success to prevent enumeration.
    """
    email = email.lower()

    # Check if email exists in your user database
    user_exists = check_user_exists(email)  # Your function

    if user_exists:
        try:
            auth = SecureMagicLinkAuth()
            token = auth.create_magic_link(email, ip_address)
            send_magic_link_email(email, token)
        except RateLimitError:
            pass  # Silent fail

    # Always return the same response
    return {
        'message': 'If an account exists with this email, a login link has been sent.'
    }
```

## Best Practices

### 1. Token Security

```python
# Always use cryptographically secure random tokens
token = secrets.token_urlsafe(32)  # 256 bits of entropy

# Hash tokens before storage
token_hash = hashlib.sha256(token.encode()).hexdigest()
```

### 2. Implement Proper TTLs

```python
# Short TTL for magic links (15-30 minutes)
token_ttl = 900  # 15 minutes

# Keep used tokens briefly to prevent reuse race conditions
used_token_ttl = 300  # 5 minutes
```

### 3. Rate Limiting

```python
# Limit by email to prevent abuse
max_requests_per_email_per_hour = 5

# Limit by IP to prevent enumeration attacks
max_requests_per_ip_per_hour = 20
```

### 4. Secure Email Content

```html
<!-- Don't include sensitive info in email -->
<p>Click to log in. This link expires in 15 minutes.</p>
<a href="https://app.com/auth/verify?token=xxx">Log In</a>

<!-- Include security notice -->
<p>If you didn't request this login link, you can safely ignore this email.</p>
```

## Conclusion

Magic link authentication with Redis provides a secure, passwordless login experience. Key takeaways:

- Use cryptographically secure token generation
- Hash tokens before storing in Redis
- Implement rate limiting per email and IP
- Limit verification attempts per token
- Use atomic operations for token verification
- Protect against account enumeration
- Set appropriate TTLs for tokens

Redis's TTL support and atomic operations make it ideal for magic link authentication, ensuring tokens expire correctly and cannot be reused.
