# How to Use ACL SAVE and ACL LOAD in Redis for Persistent ACLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Security, Persistence, Administration

Description: Learn how to use ACL SAVE and ACL LOAD in Redis to persist ACL user rules to disk and reload them, ensuring your access control configuration survives restarts.

---

## Overview of ACL Persistence

Redis ACL rules can be stored in memory (lost on restart) or persisted to an ACL file. `ACL SAVE` writes current in-memory ACL rules to the configured ACL file. `ACL LOAD` reads the ACL file and reloads rules into memory, discarding any in-memory changes.

## Configuring an ACL File

Before using `ACL SAVE` or `ACL LOAD`, configure the ACL file path in `redis.conf`:

```text
aclfile /etc/redis/users.acl
```

Or set it at runtime:

```bash
CONFIG SET aclfile /etc/redis/users.acl
```

Without an ACL file configured, `ACL SAVE` and `ACL LOAD` will return an error.

## ACL SAVE

```text
ACL SAVE
```

Writes current in-memory ACL rules to the configured ACL file. Returns `OK` on success.

```bash
# Create some users
ACL SETUSER alice on >password123 ~data:* +@read +@write
ACL SETUSER bob on >bobpass ~reports:* +@read

# Save to disk
ACL SAVE
# OK

# Verify the file was written
# cat /etc/redis/users.acl
```

## ACL LOAD

```text
ACL LOAD
```

Reloads ACL rules from the ACL file, replacing all current in-memory rules. Returns `OK` on success.

```bash
# After editing the ACL file externally or after a restart
ACL LOAD
# OK
```

## ACL File Format

The ACL file uses one rule per line in `ACL SETUSER` format:

```text
user default on nopass ~* &* +@all
user alice on #5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8 ~data:* &* +@read +@write
user bob on #6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090 ~reports:* &* +@read
user readonly on #a3f8ebe7c0e5e0f4e3b4e9e6a2b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5 ~* &* +@read -@dangerous
```

Passwords in the file are stored as SHA256 hashes (prefixed with `#`).

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# First configure the ACL file
client.config_set('aclfile', '/etc/redis/users.acl')

# Create users
client.acl_setuser('alice',
    enabled=True,
    passwords=['+password123'],
    keys=['data:*'],
    categories=['+@read', '+@write']
)

client.acl_setuser('bob',
    enabled=True,
    passwords=['+bobpass'],
    keys=['reports:*'],
    categories=['+@read']
)

client.acl_setuser('service_account',
    enabled=True,
    passwords=['+servicepass'],
    keys=['service:*'],
    categories=['+@string', '+@hash']
)

# List users before saving
users = client.acl_list()
print("Current users:")
for user_rule in users:
    print(f"  {user_rule}")

# Save to disk
client.acl_save()
print("\nACL rules saved to disk")

# Make a temporary in-memory change
client.acl_setuser('temp_user', enabled=True, passwords=['+temppass'])
print("Added temp user (in memory only)")

# Reload from disk - discards in-memory changes
client.acl_load()
print("ACL rules reloaded from disk")

# Verify temp_user is gone
users = client.acl_list()
user_names = [u.split()[1] for u in users]
print(f"Users after reload: {user_names}")
assert 'temp_user' not in user_names
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

(async () => {
  const client = createClient();
  await client.connect();

  // Set the ACL file path
  await client.configSet('aclfile', '/etc/redis/users.acl');

  // Set up users
  await client.aclSetUser('api_user', [
    'on',
    '>apipassword',
    '~api:*',
    '+@read',
    '+@write',
    '-@dangerous'
  ]);

  // Save current state
  await client.aclSave();
  console.log('ACL saved');

  // Show current users
  const users = await client.aclList();
  console.log('Users:', users);

  // Reload from file (useful after manual edits)
  await client.aclLoad();
  console.log('ACL reloaded from file');
})();
```

## Reload After External File Edit

A common workflow is to edit the ACL file externally and then reload:

```bash
# Edit the ACL file
sudo nano /etc/redis/users.acl

# Add a new user line:
# user newuser on >newpassword ~cache:* &* +@read

# Reload without restart
redis-cli ACL LOAD
```

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def apply_acl_changes():
    """Reload ACL file after external edit."""
    try:
        client.acl_load()
        print("ACL reloaded successfully")

        # Verify loaded users
        users = client.acl_list()
        print(f"Active users: {len(users)}")
        return True
    except redis.ResponseError as e:
        print(f"ACL reload failed: {e}")
        return False

apply_acl_changes()
```

## Deployment Pattern - ACL in Version Control

```bash
#!/bin/bash
# deploy_acl.sh

ACL_FILE="/etc/redis/users.acl"
ACL_SOURCE="./config/redis_users.acl"

# Deploy the ACL file
cp "$ACL_SOURCE" "$ACL_FILE"
chmod 600 "$ACL_FILE"
chown redis:redis "$ACL_FILE"

# Reload into Redis
redis-cli -a "$REDIS_ADMIN_PASS" ACL LOAD
echo "ACL rules deployed"
```

## Error Scenarios

```bash
# No ACL file configured
ACL SAVE
# ERR This Redis instance is not configured to use an ACL file.

# ACL file has syntax errors
ACL LOAD
# ERR /etc/redis/users.acl:3: Unrecognized parameter 'invalidflag'
```

## ACL SAVE vs CONFIG REWRITE

`ACL SAVE` saves only ACL rules to the ACL file. `CONFIG REWRITE` saves all CONFIG settings to `redis.conf`. These are separate operations:

```bash
# Save ACL rules
ACL SAVE

# Save server configuration
CONFIG REWRITE
```

## Summary

`ACL SAVE` persists in-memory ACL user rules to the configured ACL file, while `ACL LOAD` reloads rules from that file into memory. Use `ACL SAVE` after making user changes to ensure they survive restarts, and `ACL LOAD` to apply external file edits without restarting the server. Always configure `aclfile` in `redis.conf` before using these commands.
