# How to Configure Redis ACLs for Fine-Grained Access Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Access Control, Security, Authentication, Authorization, RBAC

Description: A comprehensive guide to configuring Redis Access Control Lists (ACLs) for fine-grained user permissions, covering command restrictions, key patterns, user management, and role-based access control patterns.

---

Redis 6.0 introduced Access Control Lists (ACLs), enabling fine-grained control over user permissions. Unlike simple password authentication, ACLs let you control exactly which commands users can run and which keys they can access. This guide covers everything you need to implement robust access control in Redis.

## ACL Fundamentals

### ACL Components

Each Redis user has:
- **State**: enabled (on) or disabled (off)
- **Passwords**: One or more valid passwords
- **Key patterns**: Which keys the user can access
- **Command permissions**: Which commands the user can execute
- **Channel patterns**: Which Pub/Sub channels the user can access

### Basic ACL Syntax

```bash
ACL SETUSER username [rule1] [rule2] ...
```

## User Management Commands

### Creating Users

```bash
# Create a simple user
ACL SETUSER alice on >password123 ~* +@all

# Create a read-only user
ACL SETUSER bob on >bobpass ~* +@read +ping

# Create a user with key prefix restriction
ACL SETUSER app_user on >apppass ~app:* +@all -@admin

# Create a user with multiple passwords
ACL SETUSER multipass on >pass1 >pass2 ~* +@all
```

### Viewing Users

```bash
# List all users
ACL LIST

# Get specific user details
ACL GETUSER alice

# Get current user
ACL WHOAMI

# Count users
ACL USERS
```

### Modifying Users

```bash
# Add password
ACL SETUSER alice >newpassword

# Remove password
ACL SETUSER alice <oldpassword

# Add key pattern
ACL SETUSER alice ~newpattern:*

# Add command
ACL SETUSER alice +hset

# Remove command
ACL SETUSER alice -flushall

# Disable user
ACL SETUSER alice off

# Enable user
ACL SETUSER alice on
```

### Deleting Users

```bash
# Delete a user
ACL DELUSER alice

# Delete multiple users
ACL DELUSER bob charlie
```

## Permission Rules

### User State

```bash
on          # User is enabled
off         # User is disabled (cannot authenticate)
```

### Password Rules

```bash
>password   # Add this password
<password   # Remove this password
#hash       # Add password by SHA256 hash
nopass      # User doesn't need password (dangerous!)
resetpass   # Remove all passwords
```

### Key Patterns

```bash
~pattern    # Allow access to keys matching pattern
~*          # Allow all keys
~app:*      # Keys starting with "app:"
~user:${username}:*  # Dynamic pattern (Redis 7+)
%R~pattern  # Read-only access to pattern
%W~pattern  # Write-only access to pattern
%RW~pattern # Read-write access (default)
allkeys     # Allow all keys
resetkeys   # Remove all key patterns
```

### Command Rules

```bash
+command    # Allow command
-command    # Disallow command
+@category  # Allow command category
-@category  # Disallow command category
+command|subcommand  # Allow specific subcommand
-command|subcommand  # Disallow specific subcommand
allcommands # Allow all commands
nocommands  # Disallow all commands
```

### Command Categories

```bash
# View all categories
ACL CAT

# View commands in a category
ACL CAT read
ACL CAT write
ACL CAT admin
ACL CAT dangerous
```

| Category | Description | Examples |
|----------|-------------|----------|
| @read | Read-only commands | GET, HGET, SMEMBERS |
| @write | Write commands | SET, HSET, LPUSH |
| @set | Set operations | SADD, SMEMBERS, SINTER |
| @list | List operations | LPUSH, RPOP, LRANGE |
| @hash | Hash operations | HSET, HGET, HDEL |
| @string | String operations | GET, SET, INCR |
| @sortedset | Sorted set operations | ZADD, ZRANGE, ZSCORE |
| @stream | Stream operations | XADD, XREAD, XACK |
| @pubsub | Pub/Sub operations | PUBLISH, SUBSCRIBE |
| @admin | Administrative commands | CONFIG, ACL, DEBUG |
| @dangerous | Dangerous commands | FLUSHALL, KEYS, DEBUG |
| @slow | Potentially slow commands | KEYS, SMEMBERS on large sets |
| @fast | Fast O(1) commands | GET, SET, PING |
| @connection | Connection commands | AUTH, CLIENT, PING |
| @transaction | Transaction commands | MULTI, EXEC, WATCH |
| @scripting | Lua scripting | EVAL, EVALSHA |

## Pub/Sub Channel Patterns

```bash
&pattern    # Allow Pub/Sub channel pattern
&*          # All channels
&news:*     # Channels starting with "news:"
allchannels # Allow all channels
resetchannels # Remove all channel patterns
```

## Practical ACL Examples

### Application User Profiles

```bash
# Web application user - full access to app namespace
ACL SETUSER webapp on >webapp-secret-pass \
    ~webapp:* \
    +@all -@admin -@dangerous \
    -keys -scan -flushdb -flushall -debug

# Cache layer - read-heavy with limited writes
ACL SETUSER cache on >cache-pass \
    ~cache:* \
    +@read +@string +@hash \
    +set +setex +expire +del +ttl

# Session manager - session keys only
ACL SETUSER session on >session-pass \
    ~session:* \
    +@string +@hash \
    +expire +ttl +del

# Queue worker - list operations for job queues
ACL SETUSER worker on >worker-pass \
    ~queue:* ~job:* \
    +@list +@string +@hash \
    +expire +del

# Analytics reader - read-only for reporting
ACL SETUSER analytics on >analytics-pass \
    ~* \
    +@read +info +dbsize

# Admin user - full access
ACL SETUSER admin on >super-secret-admin-pass \
    ~* \
    +@all
```

### Multi-Tenant Configuration

```python
import redis

class MultiTenantACLManager:
    def __init__(self, admin_connection):
        self.redis = admin_connection

    def create_tenant_user(self, tenant_id: str, password: str,
                           readonly: bool = False):
        """Create a user for a specific tenant."""
        key_pattern = f"tenant:{tenant_id}:*"
        channel_pattern = f"tenant:{tenant_id}:*"

        rules = [
            'on',
            f'>{password}',
            f'~{key_pattern}',
            f'&{channel_pattern}',
        ]

        if readonly:
            rules.extend(['+@read', '+ping', '+info'])
        else:
            rules.extend(['+@all', '-@admin', '-@dangerous', '-keys'])

        username = f"tenant_{tenant_id}"
        self.redis.acl_setuser(username, *rules)
        return username

    def create_tenant_admin(self, tenant_id: str, password: str):
        """Create an admin user for a tenant."""
        key_pattern = f"tenant:{tenant_id}:*"

        username = f"tenant_{tenant_id}_admin"
        self.redis.acl_setuser(
            username,
            'on',
            f'>{password}',
            f'~{key_pattern}',
            '+@all', '-@admin', '-keys', '-scan'
        )
        return username

    def delete_tenant(self, tenant_id: str):
        """Remove all users for a tenant."""
        users = self.redis.acl_users()
        tenant_users = [u for u in users if u.startswith(f"tenant_{tenant_id}")]

        for user in tenant_users:
            self.redis.acl_deluser(user)

        return tenant_users

    def rotate_tenant_password(self, tenant_id: str, new_password: str):
        """Rotate password for tenant user."""
        username = f"tenant_{tenant_id}"
        user_info = self.redis.acl_getuser(username)

        # Add new password, remove old ones
        self.redis.acl_setuser(username, 'resetpass', f'>{new_password}')


# Usage
r = redis.Redis(host='localhost', password='admin-pass')
acl_manager = MultiTenantACLManager(r)

# Create tenant
acl_manager.create_tenant_user('acme', 'acme-secret-123')
acl_manager.create_tenant_admin('acme', 'acme-admin-456')

# Connect as tenant
tenant_redis = redis.Redis(
    host='localhost',
    username='tenant_acme',
    password='acme-secret-123'
)

# This works
tenant_redis.set('tenant:acme:data', 'value')

# This fails - wrong key pattern
try:
    tenant_redis.set('tenant:other:data', 'value')
except redis.ResponseError as e:
    print(f"Access denied: {e}")
```

### Microservices Architecture

```bash
# Service: User Service
ACL SETUSER svc_user on >user-svc-pass \
    ~user:* ~profile:* ~session:* \
    +@all -@admin -@dangerous

# Service: Order Service
ACL SETUSER svc_order on >order-svc-pass \
    ~order:* ~cart:* ~inventory:* \
    +@all -@admin -@dangerous

# Service: Notification Service
ACL SETUSER svc_notify on >notify-svc-pass \
    ~notification:* \
    &notification:* \
    +@all +@pubsub -@admin -@dangerous

# Service: Cache Service (read-heavy)
ACL SETUSER svc_cache on >cache-svc-pass \
    ~cache:* \
    +@read +set +setex +del +expire +ttl

# Shared read access for all services
ACL SETUSER svc_readonly on >readonly-pass \
    ~config:* ~feature:* \
    +@read
```

## ACL File Configuration

### Creating ACL File

Create `/etc/redis/users.acl`:

```bash
# Default user - disabled for security
user default off

# Admin user
user admin on #6f4e3d2c1b0a9f8e7d6c5b4a3029180716253443 ~* +@all

# Application users
user webapp on >webapp-pass ~webapp:* +@all -@admin -@dangerous
user cache on >cache-pass ~cache:* +@read +@string +set +setex +del +expire
user worker on >worker-pass ~queue:* ~job:* +@list +@string +@hash +del +expire

# Read-only users
user reporter on >reporter-pass ~* +@read +info +dbsize +slowlog|get

# Replication user
user replica on >replica-pass +psync +replconf +ping
```

### Reference in redis.conf

```bash
# redis.conf
aclfile /etc/redis/users.acl

# Load ACL on startup
# Changes made with ACL commands don't persist unless you run:
# ACL SAVE
```

### Reload ACL File

```bash
# Reload ACL file
ACL LOAD

# Save current ACLs to file
ACL SAVE
```

## Python ACL Management Library

```python
import redis
import hashlib
import secrets
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class ACLUser:
    username: str
    enabled: bool
    passwords: List[str]
    key_patterns: List[str]
    commands: str
    channels: List[str]

class RedisACLManager:
    """Complete Redis ACL management."""

    def __init__(self, host: str = 'localhost', port: int = 6379,
                 admin_password: str = None):
        self.redis = redis.Redis(
            host=host,
            port=port,
            password=admin_password,
            decode_responses=True
        )

    # User Management
    def create_user(self, username: str, password: str = None,
                    key_patterns: List[str] = None,
                    allowed_commands: List[str] = None,
                    denied_commands: List[str] = None,
                    enabled: bool = True) -> bool:
        """Create a new user with specified permissions."""
        rules = ['on' if enabled else 'off']

        if password:
            rules.append(f'>{password}')
        else:
            rules.append('nopass')

        if key_patterns:
            for pattern in key_patterns:
                rules.append(f'~{pattern}')
        else:
            rules.append('~*')

        if allowed_commands:
            for cmd in allowed_commands:
                if cmd.startswith('@'):
                    rules.append(f'+{cmd}')
                else:
                    rules.append(f'+{cmd}')

        if denied_commands:
            for cmd in denied_commands:
                rules.append(f'-{cmd}')

        try:
            self.redis.acl_setuser(username, *rules)
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False

    def get_user(self, username: str) -> Optional[ACLUser]:
        """Get user details."""
        try:
            info = self.redis.acl_getuser(username)
            if info:
                return ACLUser(
                    username=username,
                    enabled='on' in info.get('flags', []),
                    passwords=[p[:8] + '...' for p in info.get('passwords', [])],
                    key_patterns=info.get('keys', []),
                    commands=info.get('commands', ''),
                    channels=info.get('channels', [])
                )
        except Exception as e:
            print(f"Error getting user: {e}")
        return None

    def list_users(self) -> List[str]:
        """List all usernames."""
        return self.redis.acl_users()

    def delete_user(self, username: str) -> bool:
        """Delete a user."""
        try:
            return self.redis.acl_deluser(username) > 0
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    # Password Management
    def set_password(self, username: str, password: str,
                     clear_existing: bool = True) -> bool:
        """Set user password."""
        try:
            if clear_existing:
                self.redis.acl_setuser(username, 'resetpass', f'>{password}')
            else:
                self.redis.acl_setuser(username, f'>{password}')
            return True
        except Exception as e:
            print(f"Error setting password: {e}")
            return False

    def generate_password(self, length: int = 32) -> str:
        """Generate a secure password."""
        return secrets.token_urlsafe(length)

    def hash_password(self, password: str) -> str:
        """Generate SHA256 hash of password."""
        return hashlib.sha256(password.encode()).hexdigest()

    # Permission Management
    def grant_command(self, username: str, command: str) -> bool:
        """Grant a command to user."""
        try:
            self.redis.acl_setuser(username, f'+{command}')
            return True
        except Exception as e:
            print(f"Error granting command: {e}")
            return False

    def revoke_command(self, username: str, command: str) -> bool:
        """Revoke a command from user."""
        try:
            self.redis.acl_setuser(username, f'-{command}')
            return True
        except Exception as e:
            print(f"Error revoking command: {e}")
            return False

    def grant_key_pattern(self, username: str, pattern: str) -> bool:
        """Grant access to key pattern."""
        try:
            self.redis.acl_setuser(username, f'~{pattern}')
            return True
        except Exception as e:
            print(f"Error granting key pattern: {e}")
            return False

    # Predefined Roles
    def create_readonly_user(self, username: str, password: str,
                             key_pattern: str = '*') -> bool:
        """Create a read-only user."""
        return self.create_user(
            username=username,
            password=password,
            key_patterns=[key_pattern],
            allowed_commands=['@read', 'ping', 'info'],
            denied_commands=[]
        )

    def create_readwrite_user(self, username: str, password: str,
                              key_pattern: str = '*') -> bool:
        """Create a read-write user without admin access."""
        return self.create_user(
            username=username,
            password=password,
            key_patterns=[key_pattern],
            allowed_commands=['@all'],
            denied_commands=['@admin', '@dangerous', 'keys', 'scan',
                           'flushdb', 'flushall', 'config', 'debug']
        )

    def create_admin_user(self, username: str, password: str) -> bool:
        """Create an admin user with full access."""
        return self.create_user(
            username=username,
            password=password,
            key_patterns=['*'],
            allowed_commands=['@all'],
            denied_commands=[]
        )

    # Audit
    def audit_users(self) -> List[Dict]:
        """Audit all user permissions."""
        audit_results = []
        for username in self.list_users():
            user = self.get_user(username)
            if user:
                audit_results.append({
                    'username': user.username,
                    'enabled': user.enabled,
                    'has_password': len(user.passwords) > 0,
                    'key_patterns': user.key_patterns,
                    'has_dangerous': '@dangerous' not in user.commands or
                                    '+@dangerous' in user.commands,
                    'has_admin': '@admin' not in user.commands or
                                '+@admin' in user.commands,
                })
        return audit_results

    def check_user_access(self, username: str, command: str,
                          keys: List[str] = None) -> Dict:
        """Check if user has access to command and keys."""
        try:
            args = ['DRYRUN', username, command]
            if keys:
                args.extend(keys)
            result = self.redis.execute_command('ACL', *args)
            return {'allowed': True, 'result': result}
        except redis.ResponseError as e:
            return {'allowed': False, 'error': str(e)}

    # Persistence
    def save_acl(self) -> bool:
        """Save ACL to file."""
        try:
            self.redis.acl_save()
            return True
        except Exception as e:
            print(f"Error saving ACL: {e}")
            return False

    def load_acl(self) -> bool:
        """Load ACL from file."""
        try:
            self.redis.acl_load()
            return True
        except Exception as e:
            print(f"Error loading ACL: {e}")
            return False


# Usage Example
if __name__ == '__main__':
    manager = RedisACLManager(admin_password='admin-pass')

    # Create users
    manager.create_readonly_user('reporter', 'reporter-pass-123')
    manager.create_readwrite_user('webapp', 'webapp-pass-456', 'webapp:*')
    manager.create_admin_user('superadmin', manager.generate_password())

    # Audit
    print("\nUser Audit:")
    for audit in manager.audit_users():
        print(f"  {audit['username']}: enabled={audit['enabled']}, "
              f"dangerous={audit['has_dangerous']}, admin={audit['has_admin']}")

    # Check access
    result = manager.check_user_access('reporter', 'SET', ['key1'])
    print(f"\nReporter SET access: {result}")

    result = manager.check_user_access('reporter', 'GET', ['key1'])
    print(f"Reporter GET access: {result}")

    # Save to file
    manager.save_acl()
```

## Best Practices

### 1. Disable Default User

```bash
# Disable default user in production
ACL SETUSER default off
```

### 2. Use Least Privilege

```bash
# Only grant what's needed
ACL SETUSER app on >pass ~app:* +@read +@write +@string +@hash -@admin
```

### 3. Separate Admin Access

```bash
# Regular operations
ACL SETUSER app on >pass ~* +@all -@admin -@dangerous

# Admin operations (separate credentials)
ACL SETUSER admin on >different-pass ~* +@all
```

### 4. Use Password Hashes

```bash
# Generate hash
echo -n "password" | sha256sum

# Use hash instead of plaintext
ACL SETUSER user on #5e884898da28047d... ~* +@all
```

### 5. Regular Audits

```bash
# Check for overly permissive users
ACL LIST | grep "+@all"

# Check for users without passwords
ACL LIST | grep "nopass"
```

## Conclusion

Redis ACLs provide powerful, flexible access control:

1. **Fine-grained permissions**: Control commands and keys per user
2. **Multi-tenancy support**: Isolate tenants with key patterns
3. **Role-based access**: Create user profiles for different roles
4. **Audit capability**: Track and verify permissions
5. **File-based management**: Maintain ACLs in version control

Implementing proper ACLs is essential for securing Redis in production, especially in multi-user or multi-tenant environments.
