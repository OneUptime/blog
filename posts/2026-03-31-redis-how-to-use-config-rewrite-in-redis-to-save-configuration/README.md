# How to Use CONFIG REWRITE in Redis to Save Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, Administration, Command, Persistence

Description: Learn how to use CONFIG REWRITE in Redis to persist runtime configuration changes to redis.conf, ensuring settings survive server restarts.

---

## What Is CONFIG REWRITE

When you change Redis settings at runtime with `CONFIG SET`, those changes are only in memory and are lost when the server restarts. `CONFIG REWRITE` writes all current in-memory configuration back to the `redis.conf` file, making runtime changes persistent.

```text
CONFIG REWRITE
```

Returns `OK` on success.

## Prerequisites

`CONFIG REWRITE` requires that Redis was started with a configuration file:

```bash
redis-server /etc/redis/redis.conf
```

If Redis was started without a config file, `CONFIG REWRITE` returns an error:

```text
ERR The server is running without a config file
```

## Basic Workflow

```bash
# View current setting
CONFIG GET maxmemory
# 1) "maxmemory"
# 2) "0"

# Change at runtime
CONFIG SET maxmemory 2gb

# Verify it changed
CONFIG GET maxmemory
# 1) "maxmemory"
# 2) "2147483648"

# Persist to redis.conf
CONFIG REWRITE
# OK
```

After `CONFIG REWRITE`, the `redis.conf` file now contains `maxmemory 2gb` and will survive a restart.

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def apply_and_persist_config(settings):
    """Apply runtime config changes and persist them to redis.conf."""
    for key, value in settings.items():
        client.config_set(key, value)
        print(f"Set {key} = {value}")

    # Persist all changes
    client.config_rewrite()
    print("Configuration persisted to redis.conf")

# Apply and persist multiple settings
apply_and_persist_config({
    'maxmemory': '2gb',
    'maxmemory-policy': 'allkeys-lru',
    'hz': '20',
    'slowlog-log-slower-than': '10000',
    'acllog-max-len': '256',
})
```

## Practical Example in Node.js

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Apply runtime configuration changes
await client.configSet('maxmemory', '1gb');
await client.configSet('maxmemory-policy', 'volatile-lru');
await client.configSet('hz', '15');

console.log('Configuration updated in memory');

// Persist to redis.conf
await client.configRewrite();
console.log('Configuration saved to redis.conf');

// Verify
const maxmem = await client.configGet('maxmemory');
console.log('maxmemory:', maxmem.maxmemory);
```

## What CONFIG REWRITE Changes

The command rewrites all CONFIG parameters that differ from default values. For settings already in `redis.conf`, it updates the existing line. For new settings, it appends them.

```bash
# Before REWRITE - redis.conf excerpt:
# maxmemory 0
# hz 10

# After: CONFIG SET maxmemory 2gb; CONFIG SET hz 20; CONFIG REWRITE
# redis.conf excerpt:
# maxmemory 2147483648
# hz 20
```

## Common Settings to Persist

```bash
# Memory management
CONFIG SET maxmemory 4gb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET maxmemory-samples 10

# Performance tuning
CONFIG SET hz 20
CONFIG SET dynamic-hz yes
CONFIG SET latency-monitor-threshold 50

# Logging
CONFIG SET slowlog-log-slower-than 5000
CONFIG SET slowlog-max-len 200
CONFIG SET loglevel notice

# Persistence
CONFIG SET save "900 1 300 10 60 10000"
CONFIG SET appendonly yes

# Security
CONFIG SET requirepass newsecurepassword
CONFIG SET aclfile /etc/redis/users.acl

# Persist all changes
CONFIG REWRITE
```

## Deployment Pattern - Automated Configuration

```python
import redis
import yaml

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def load_and_apply_config(config_file):
    """Load settings from YAML and apply to Redis."""
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)

    redis_settings = config.get('redis', {})

    for key, value in redis_settings.items():
        try:
            client.config_set(key, str(value))
            print(f"Applied: {key} = {value}")
        except redis.ResponseError as e:
            print(f"Failed to set {key}: {e}")

    # Persist all at once
    try:
        client.config_rewrite()
        print("All settings persisted")
    except redis.ResponseError as e:
        print(f"Rewrite failed: {e}")

# config.yaml:
# redis:
#   maxmemory: 2gb
#   maxmemory-policy: allkeys-lru
#   hz: 20

load_and_apply_config('config.yaml')
```

## CONFIG REWRITE vs Manual File Edit

| Method | Pros | Cons |
|--------|------|------|
| `CONFIG REWRITE` | Atomic, no restart needed | Requires config file |
| Manual file edit | Full control | Requires restart to take effect |
| `CONFIG SET` only | Instant, no restart | Lost on restart |

The best practice is to combine `CONFIG SET` + `CONFIG REWRITE` for zero-downtime configuration changes.

## Verifying the Rewrite

```bash
# Verify the current in-memory config
CONFIG GET maxmemory

# On Linux, verify the file contents
# cat /etc/redis/redis.conf | grep maxmemory
```

## Error Handling

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_config_update(key, value):
    try:
        client.config_set(key, value)
        print(f"Set {key} = {value}")
    except redis.ResponseError as e:
        print(f"Invalid config value: {e}")
        return False

    try:
        client.config_rewrite()
        print("Persisted to redis.conf")
        return True
    except redis.ResponseError as e:
        # Changes are live but not persisted - document this
        print(f"Warning: config is live but not persisted: {e}")
        return False

safe_config_update('maxmemory', '1gb')
```

## Summary

`CONFIG REWRITE` persists all current in-memory Redis configuration to the `redis.conf` file, making runtime changes applied with `CONFIG SET` survive server restarts. It requires that Redis was started with a configuration file. Use it as the final step after `CONFIG SET` when you want permanent configuration changes without restarting the server.
