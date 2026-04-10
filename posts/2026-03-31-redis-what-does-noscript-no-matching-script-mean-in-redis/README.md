# What Does 'NOSCRIPT No matching script' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, NOSCRIPT, Lua, Scripting, Troubleshooting

Description: Understand why Redis returns the NOSCRIPT error when using EVALSHA and how to properly cache and reload Lua scripts to avoid script cache misses.

---

## What Is the NOSCRIPT Error

When you call `EVALSHA` with a SHA1 hash that does not exist in Redis's script cache, Redis returns:

```text
(error) NOSCRIPT No matching script. Please use EVAL.
```

Redis caches Lua scripts in memory using their SHA1 hash as the key. `EVALSHA` is the optimized way to execute a previously loaded script by its hash instead of sending the full script text on every call. This error means the script is not in the cache.

## When Does This Happen

### Server Restart

The script cache is in-memory and is cleared when Redis restarts. Scripts loaded with `SCRIPT LOAD` or executed with `EVAL` are lost after a restart.

### SCRIPT FLUSH

If someone calls `SCRIPT FLUSH`, all cached scripts are removed.

### New Redis Instance

In a Sentinel failover or Cluster failover, the new primary may not have the scripts loaded if they were loaded only on the previous primary.

### Cache Never Loaded

The script was never loaded - the code is using a SHA1 hash directly without first running `SCRIPT LOAD` or `EVAL`.

## How to Diagnose

Check if a specific script SHA is cached:

```bash
redis-cli SCRIPT EXISTS sha1-hash-here
# Returns 1 if cached, 0 if not
```

Example:

```bash
redis-cli SCRIPT EXISTS abc123def456abc123def456abc123def456abc12
# (integer) 0  <- Not in cache
```

## How to Fix

### Fix 1 - Fall Back to EVAL on NOSCRIPT

The standard pattern is to use EVALSHA for performance and fall back to EVAL if the script is not cached:

```python
import redis
import hashlib

r = redis.Redis()

SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current == false then
    return redis.call('SET', KEYS[1], ARGV[1])
end
if tonumber(current) < tonumber(ARGV[1]) then
    return redis.call('SET', KEYS[1], ARGV[1])
end
return current
"""

script_sha = hashlib.sha1(SCRIPT.encode()).hexdigest()

def execute_script(key, value):
    try:
        return r.evalsha(script_sha, 1, key, value)
    except redis.exceptions.NoScriptError:
        # Script not in cache - load and execute
        sha = r.script_load(SCRIPT)
        return r.evalsha(sha, 1, key, value)
```

### Fix 2 - Use redis-py's Script Object

redis-py has a built-in `register_script` method that handles NOSCRIPT automatically:

```python
import redis

r = redis.Redis()

SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current == false then
    return redis.call('SET', KEYS[1], ARGV[1])
end
return current
"""

# register_script handles NOSCRIPT by falling back to EVAL
set_if_missing = r.register_script(SCRIPT)

# Call the script
result = set_if_missing(keys=['mykey'], args=['myvalue'])
```

### Fix 3 - Pre-load Scripts on Connection

Load all scripts when your application connects to Redis:

```python
import redis

class RedisScriptManager:
    SCRIPTS = {
        'conditional_set': """
            local current = redis.call('GET', KEYS[1])
            if current == false then
                return redis.call('SET', KEYS[1], ARGV[1])
            end
            return current
        """,
        'atomic_increment': """
            local val = redis.call('INCR', KEYS[1])
            if tonumber(val) > tonumber(ARGV[1]) then
                return redis.call('SET', KEYS[1], ARGV[1])
            end
            return val
        """
    }

    def __init__(self, redis_client):
        self.r = redis_client
        self.sha_map = {}
        self._load_scripts()

    def _load_scripts(self):
        for name, script in self.SCRIPTS.items():
            self.sha_map[name] = self.r.script_load(script)

    def execute(self, name, keys=[], args=[]):
        try:
            return self.r.evalsha(self.sha_map[name], len(keys), *keys, *args)
        except redis.exceptions.NoScriptError:
            self._load_scripts()
            return self.r.evalsha(self.sha_map[name], len(keys), *keys, *args)
```

### Fix 4 - Handle in Sentinel/Cluster Environments

In environments with failover, reload scripts after reconnection events:

```python
import redis
from redis.sentinel import Sentinel

sentinel = Sentinel([('sentinel-host', 26379)])
master = sentinel.master_for('mymaster')

SCRIPT = "return redis.call('GET', KEYS[1])"

def get_script_sha():
    return master.script_load(SCRIPT)

sha = get_script_sha()

def execute_script(key):
    global sha
    try:
        return master.evalsha(sha, 1, key)
    except redis.exceptions.NoScriptError:
        sha = get_script_sha()
        return master.evalsha(sha, 1, key)
```

## Node.js Example

```javascript
const Redis = require('ioredis');
const redis = new Redis();

const script = `
  local current = redis.call('GET', KEYS[1])
  if current == false then
    return redis.call('SET', KEYS[1], ARGV[1])
  end
  return current
`;

// ioredis defineCommand handles NOSCRIPT automatically
redis.defineCommand('conditionalSet', {
  numberOfKeys: 1,
  lua: script
});

// Use the custom command
async function conditionalSet(key, value) {
  return redis.conditionalSet(key, value);
}
```

## Checking Script Cache

There is no Redis command to list all cached scripts. Use `SCRIPT EXISTS` to check whether specific scripts are loaded by their SHA1 hashes:

```bash
# Check if specific scripts are loaded
redis-cli SCRIPT EXISTS sha1 sha2 sha3
```

## Summary

The NOSCRIPT error occurs when `EVALSHA` is called with a SHA1 hash that is not in Redis's script cache, typically after a restart or `SCRIPT FLUSH`. Fix it by implementing the EVALSHA-then-fallback-to-EVAL pattern, using client library helpers like redis-py's `register_script` or ioredis's `defineCommand`, or pre-loading scripts on application startup and reloading them after reconnection events.
