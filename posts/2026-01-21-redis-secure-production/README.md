# How to Secure Redis in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Production, Authentication, Encryption, ACL, Network Security

Description: A comprehensive guide to securing Redis in production environments, covering authentication, ACLs, network security, encryption, and best practices for protecting your Redis deployment from unauthorized access.

---

Redis, by default, is designed for use in trusted environments and doesn't enable security features out of the box. Running Redis securely in production requires configuring authentication, network isolation, encryption, and access controls. This guide covers essential security measures for production Redis deployments.

## Redis Security Overview

### Default Security State

Out of the box, Redis:
- Has no authentication
- Listens on all interfaces (0.0.0.0)
- Has no encryption
- Allows all commands

This makes unconfigured Redis extremely vulnerable to attacks.

### Security Layers

```
Internet -> Firewall -> VPN/Private Network -> TLS Encryption -> Authentication -> ACL -> Redis
```

## Authentication Configuration

### Basic Password Authentication

```bash
# Set password in redis.conf
requirepass YourStrongPasswordHere123!

# Or set via command (doesn't persist restart)
redis-cli CONFIG SET requirepass "YourStrongPasswordHere123!"
CONFIG REWRITE

# Connect with password
redis-cli -a YourStrongPasswordHere123!
# or
redis-cli
AUTH YourStrongPasswordHere123!
```

### Strong Password Guidelines

```python
import secrets
import string

def generate_redis_password(length=32):
    """Generate a strong Redis password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

# Generate password
password = generate_redis_password()
print(f"Generated password: {password}")
# Example: Kj9#mP2$xL5nQw8@vR4tYh7&zB1cF3gA
```

### Environment Variable Configuration

```bash
# Don't hardcode passwords - use environment variables
# /etc/systemd/system/redis.service.d/override.conf
[Service]
Environment="REDIS_PASSWORD=your-password-here"

# redis.conf
requirepass ${REDIS_PASSWORD}
```

## Access Control Lists (ACLs)

Redis 6.0+ includes a comprehensive ACL system.

### Creating Users

```bash
# Create a read-only user
ACL SETUSER readonly on >readonlypassword ~* +@read

# Create a user with specific key patterns
ACL SETUSER appuser on >apppassword ~app:* +@all -@dangerous

# Create an admin user
ACL SETUSER admin on >adminpassword ~* +@all

# Create a user for specific commands only
ACL SETUSER metrics on >metricspass ~* +info +dbsize +slowlog

# List all users
ACL LIST

# Get user details
ACL GETUSER appuser
```

### ACL Rules Reference

```bash
# User states
on              # Enable user
off             # Disable user

# Passwords
>password       # Add password
<password       # Remove password
nopass          # No password required
resetpass       # Remove all passwords

# Key patterns
~pattern        # Allow keys matching pattern
~*              # Allow all keys
resetkeys       # Remove all key patterns

# Commands
+command        # Allow command
-command        # Deny command
+@category      # Allow command category
-@category      # Deny command category
allcommands     # Allow all commands
nocommands      # Deny all commands

# Categories: @read, @write, @set, @list, @hash, @string, @sortedset,
#             @stream, @pubsub, @admin, @dangerous, @slow, @fast
```

### ACL Configuration File

Create `/etc/redis/users.acl`:

```
# Default user (admin)
user default on >adminpassword ~* +@all

# Application user - read/write to app: keys only
user appuser on >apppassword ~app:* +@read +@write +@string +@hash +@list -@admin -@dangerous

# Read-only user for reporting
user readonly on >readonlypass ~* +@read +ping +info

# Metrics user - stats only
user metrics on >metricspass ~* +info +dbsize +slowlog|get +client|list

# Replica user - replication only
user replicauser on >replicapass +psync +replconf +ping
```

Reference in redis.conf:

```bash
aclfile /etc/redis/users.acl
```

### Python ACL Management

```python
import redis

class RedisACLManager:
    def __init__(self, host='localhost', port=6379, admin_password=None):
        self.redis = redis.Redis(
            host=host,
            port=port,
            password=admin_password,
            decode_responses=True
        )

    def create_user(self, username, password, key_pattern='*',
                    permissions=None):
        """Create a new Redis user with specified permissions."""
        if permissions is None:
            permissions = ['+@read', '+@write', '-@admin', '-@dangerous']

        rules = [
            'on',
            f'>{password}',
            f'~{key_pattern}',
        ] + permissions

        result = self.redis.acl_setuser(username, *rules)
        return result

    def create_readonly_user(self, username, password, key_pattern='*'):
        """Create a read-only user."""
        return self.create_user(
            username, password, key_pattern,
            permissions=['+@read', '+ping', '+info']
        )

    def create_app_user(self, username, password, key_prefix):
        """Create an application-specific user."""
        return self.create_user(
            username, password, f'{key_prefix}:*',
            permissions=['+@read', '+@write', '+@string', '+@hash',
                        '+@list', '+@set', '+@sortedset', '-@admin',
                        '-@dangerous', '-keys', '-scan']
        )

    def delete_user(self, username):
        """Delete a user."""
        return self.redis.acl_deluser(username)

    def list_users(self):
        """List all users."""
        return self.redis.acl_list()

    def get_user(self, username):
        """Get user details."""
        return self.redis.acl_getuser(username)

    def set_password(self, username, new_password):
        """Change user password."""
        return self.redis.acl_setuser(username, f'>{new_password}')

    def disable_user(self, username):
        """Disable a user."""
        return self.redis.acl_setuser(username, 'off')

    def enable_user(self, username):
        """Enable a user."""
        return self.redis.acl_setuser(username, 'on')

    def audit_permissions(self):
        """Audit all user permissions."""
        users = self.redis.acl_list()
        report = []

        for user_str in users:
            parts = user_str.split()
            username = parts[1]
            user_info = self.get_user(username)

            report.append({
                'username': username,
                'enabled': 'on' in user_info.get('flags', []),
                'passwords': len(user_info.get('passwords', [])),
                'keys': user_info.get('keys', []),
                'commands': user_info.get('commands', ''),
            })

        return report


# Usage
acl_manager = RedisACLManager(admin_password='admin-password')

# Create users
acl_manager.create_app_user('webapp', 'webapp-pass-123', 'webapp')
acl_manager.create_readonly_user('reporter', 'reporter-pass-456')

# Audit
for user in acl_manager.audit_permissions():
    print(f"User: {user['username']}")
    print(f"  Enabled: {user['enabled']}")
    print(f"  Keys: {user['keys']}")
```

## Network Security

### Bind to Specific Interfaces

```bash
# redis.conf - Only accept local connections
bind 127.0.0.1

# Accept from specific network
bind 127.0.0.1 10.0.0.5

# Accept from all (NOT recommended for production)
# bind 0.0.0.0
```

### Protected Mode

```bash
# redis.conf - Enable protected mode
protected-mode yes

# Protected mode blocks external connections when:
# 1. No bind directive is specified
# 2. No password is configured
```

### Firewall Configuration

```bash
# UFW (Ubuntu)
ufw allow from 10.0.0.0/24 to any port 6379

# iptables
iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP

# Save iptables rules
iptables-save > /etc/iptables/rules.v4
```

### Docker Network Isolation

```yaml
# docker-compose.yml
version: '3.8'

networks:
  redis-internal:
    internal: true  # No external access
  app-network:

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    networks:
      - redis-internal
    # NO ports exposed to host

  app:
    image: your-app
    networks:
      - redis-internal
      - app-network
    environment:
      - REDIS_URL=redis://redis:6379
```

### Kubernetes Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: redis-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: redis
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              access: redis
      ports:
        - protocol: TCP
          port: 6379
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

## TLS/SSL Encryption

### Enable TLS in Redis

```bash
# Generate certificates (for testing)
openssl genrsa -out redis.key 4096
openssl req -new -key redis.key -out redis.csr -subj "/CN=redis.example.com"
openssl x509 -req -days 365 -in redis.csr -signkey redis.key -out redis.crt

# redis.conf
tls-port 6379
port 0  # Disable non-TLS port

tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt

# TLS authentication (optional)
tls-auth-clients optional  # or 'yes' to require client certs

# TLS protocols
tls-protocols "TLSv1.2 TLSv1.3"

# Cipher suites
tls-ciphersuites TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
```

### Connect with TLS

```bash
# redis-cli with TLS
redis-cli --tls --cert /path/to/client.crt --key /path/to/client.key --cacert /path/to/ca.crt

# Verify TLS is working
redis-cli --tls INFO server | grep tcp_port
```

### Python TLS Connection

```python
import redis
import ssl

# Create SSL context
ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
ssl_context.check_hostname = True
ssl_context.verify_mode = ssl.CERT_REQUIRED
ssl_context.load_cert_chain(
    certfile='/path/to/client.crt',
    keyfile='/path/to/client.key'
)
ssl_context.load_verify_locations('/path/to/ca.crt')

# Connect with TLS
r = redis.Redis(
    host='redis.example.com',
    port=6379,
    password='your-password',
    ssl=True,
    ssl_ca_certs='/path/to/ca.crt',
    ssl_certfile='/path/to/client.crt',
    ssl_keyfile='/path/to/client.key',
    ssl_cert_reqs='required',
)

# Verify connection
r.ping()
```

### Node.js TLS Connection

```javascript
const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis({
    host: 'redis.example.com',
    port: 6379,
    password: 'your-password',
    tls: {
        ca: fs.readFileSync('/path/to/ca.crt'),
        cert: fs.readFileSync('/path/to/client.crt'),
        key: fs.readFileSync('/path/to/client.key'),
        rejectUnauthorized: true,
    },
});

redis.ping().then(console.log);
```

## Disable Dangerous Commands

### Rename or Disable Commands

```bash
# redis.conf
# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN ""

# Rename to obscure names (for admin use)
rename-command CONFIG "REDIS_CONFIG_a7b3c9d2"
rename-command SHUTDOWN "REDIS_SHUTDOWN_x8y4z1e5"
```

### Using ACLs Instead (Recommended)

```bash
# Create admin user with dangerous commands
ACL SETUSER admin on >adminpassword ~* +@all

# Create app user without dangerous commands
ACL SETUSER appuser on >apppassword ~app:* +@all -@admin -@dangerous -flushdb -flushall -keys -debug -config -shutdown

# Disable default user
ACL SETUSER default off
```

## Security Configuration Template

Complete secure redis.conf:

```bash
# /etc/redis/redis.conf - Secure Production Configuration

# Network
bind 127.0.0.1 10.0.0.5
port 0
tls-port 6379
protected-mode yes
tcp-backlog 511
timeout 300
tcp-keepalive 300

# TLS Configuration
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients optional
tls-protocols "TLSv1.2 TLSv1.3"
tls-prefer-server-ciphers yes

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Security
aclfile /etc/redis/users.acl
# Disable dangerous commands for default user
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command DEBUG ""

# Memory
maxmemory 4gb
maxmemory-policy volatile-lru

# Persistence
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Client limits
maxclients 10000
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Disable potentially dangerous features
enable-debug-command no
```

## Security Audit Script

```python
#!/usr/bin/env python3
"""Redis Security Audit Script"""

import redis
import ssl
import socket

class RedisSecurityAudit:
    def __init__(self, host, port=6379, password=None, use_tls=False):
        self.host = host
        self.port = port
        self.password = password
        self.use_tls = use_tls
        self.issues = []
        self.warnings = []
        self.passed = []

        try:
            self.redis = redis.Redis(
                host=host,
                port=port,
                password=password,
                ssl=use_tls,
                socket_timeout=5
            )
            self.redis.ping()
            self.connected = True
        except Exception as e:
            self.connected = False
            self.issues.append(f"Cannot connect: {e}")

    def audit(self):
        """Run all security checks."""
        if not self.connected:
            return self.generate_report()

        self._check_authentication()
        self._check_network_binding()
        self._check_protected_mode()
        self._check_dangerous_commands()
        self._check_acl()
        self._check_tls()
        self._check_client_limits()
        self._check_persistence_security()

        return self.generate_report()

    def _check_authentication(self):
        """Check authentication configuration."""
        # Try connecting without password
        try:
            test_client = redis.Redis(host=self.host, port=self.port, socket_timeout=2)
            test_client.ping()
            self.issues.append("CRITICAL: No authentication required!")
        except redis.AuthenticationError:
            self.passed.append("Authentication is enabled")
        except:
            pass

    def _check_network_binding(self):
        """Check network binding configuration."""
        try:
            bind = self.redis.config_get('bind')['bind']
            if '0.0.0.0' in bind or bind == '':
                self.issues.append("CRITICAL: Redis bound to all interfaces (0.0.0.0)")
            elif '127.0.0.1' in bind and len(bind.split()) == 1:
                self.passed.append("Redis bound to localhost only")
            else:
                self.warnings.append(f"Redis bound to: {bind}")
        except:
            pass

    def _check_protected_mode(self):
        """Check protected mode setting."""
        try:
            protected = self.redis.config_get('protected-mode')['protected-mode']
            if protected == 'no':
                self.warnings.append("Protected mode is disabled")
            else:
                self.passed.append("Protected mode is enabled")
        except:
            pass

    def _check_dangerous_commands(self):
        """Check if dangerous commands are available."""
        dangerous_commands = ['FLUSHALL', 'FLUSHDB', 'KEYS', 'DEBUG', 'CONFIG', 'SHUTDOWN']

        for cmd in dangerous_commands:
            try:
                if cmd == 'CONFIG':
                    self.redis.config_get('maxmemory')
                    self.warnings.append(f"Command {cmd} is available")
                elif cmd == 'KEYS':
                    self.redis.keys('__test_key_pattern__')
                    self.warnings.append(f"Command {cmd} is available")
                elif cmd == 'DEBUG':
                    self.redis.execute_command('DEBUG', 'SLEEP', '0')
                    self.issues.append(f"Command {cmd} is available")
            except redis.ResponseError as e:
                if 'unknown command' in str(e).lower() or 'no permission' in str(e).lower():
                    self.passed.append(f"Command {cmd} is disabled/restricted")
            except:
                pass

    def _check_acl(self):
        """Check ACL configuration."""
        try:
            users = self.redis.acl_list()
            if len(users) == 1:
                self.warnings.append("Only default user configured - consider using ACLs")
            else:
                self.passed.append(f"ACL configured with {len(users)} users")

            # Check default user
            default_user = self.redis.acl_getuser('default')
            if 'on' in default_user.get('flags', []):
                if 'nopass' in default_user.get('flags', []):
                    self.issues.append("Default user has no password!")
        except:
            self.warnings.append("ACL not available (Redis < 6.0?)")

    def _check_tls(self):
        """Check TLS configuration."""
        try:
            port_config = self.redis.config_get('tls-port')
            if port_config.get('tls-port', '0') != '0':
                self.passed.append("TLS port is configured")

                # Check if non-TLS port is disabled
                tcp_port = self.redis.config_get('port').get('port', '6379')
                if tcp_port == '0':
                    self.passed.append("Non-TLS port is disabled")
                else:
                    self.warnings.append(f"Non-TLS port {tcp_port} is still enabled")
            else:
                self.issues.append("TLS is not configured")
        except:
            pass

    def _check_client_limits(self):
        """Check client limits."""
        try:
            maxclients = int(self.redis.config_get('maxclients')['maxclients'])
            info = self.redis.info('clients')
            connected = info['connected_clients']

            if maxclients < 100:
                self.warnings.append(f"maxclients is low: {maxclients}")
            else:
                self.passed.append(f"maxclients set to {maxclients}")

            usage = connected / maxclients * 100
            if usage > 80:
                self.warnings.append(f"Client usage high: {usage:.1f}%")
        except:
            pass

    def _check_persistence_security(self):
        """Check persistence configuration security."""
        try:
            # Check if persistence directory is secure
            rdb_dir = self.redis.config_get('dir')['dir']
            self.passed.append(f"RDB directory: {rdb_dir}")
        except:
            pass

    def generate_report(self):
        """Generate security audit report."""
        report = {
            'host': self.host,
            'port': self.port,
            'connected': self.connected,
            'issues': self.issues,
            'warnings': self.warnings,
            'passed': self.passed,
            'score': self._calculate_score()
        }
        return report

    def _calculate_score(self):
        """Calculate security score (0-100)."""
        if not self.connected:
            return 0

        base_score = 100
        base_score -= len(self.issues) * 20
        base_score -= len(self.warnings) * 5
        return max(0, base_score)

    def print_report(self):
        """Print formatted report."""
        report = self.audit()

        print("\n" + "=" * 60)
        print("REDIS SECURITY AUDIT REPORT")
        print("=" * 60)
        print(f"Host: {report['host']}:{report['port']}")
        print(f"Connected: {report['connected']}")
        print(f"Security Score: {report['score']}/100")

        if report['issues']:
            print("\n--- CRITICAL ISSUES ---")
            for issue in report['issues']:
                print(f"  [!] {issue}")

        if report['warnings']:
            print("\n--- WARNINGS ---")
            for warning in report['warnings']:
                print(f"  [~] {warning}")

        if report['passed']:
            print("\n--- PASSED CHECKS ---")
            for check in report['passed']:
                print(f"  [+] {check}")

        print("\n" + "=" * 60)


# Usage
if __name__ == '__main__':
    audit = RedisSecurityAudit(
        host='localhost',
        port=6379,
        password='your-password'
    )
    audit.print_report()
```

## Best Practices Summary

1. **Always use authentication** - Set strong passwords or use ACLs
2. **Bind to specific interfaces** - Never bind to 0.0.0.0 in production
3. **Enable protected mode** - Extra protection against misconfiguration
4. **Use TLS** - Encrypt data in transit
5. **Implement ACLs** - Fine-grained access control
6. **Disable dangerous commands** - Prevent accidental data loss
7. **Network isolation** - Use firewalls and private networks
8. **Regular audits** - Check configuration periodically
9. **Monitor for intrusions** - Track authentication failures
10. **Keep Redis updated** - Apply security patches promptly

## Conclusion

Securing Redis in production requires a defense-in-depth approach:

1. **Authentication**: Strong passwords and ACLs
2. **Network**: Firewalls, binding, and isolation
3. **Encryption**: TLS for data in transit
4. **Access control**: Principle of least privilege
5. **Monitoring**: Audit logs and intrusion detection

With proper security configuration, Redis can be safely deployed in production while maintaining its performance advantages.
