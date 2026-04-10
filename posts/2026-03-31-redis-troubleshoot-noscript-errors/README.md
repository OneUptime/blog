# How to Troubleshoot Redis NOSCRIPT Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Script, NOSCRIPT, Troubleshooting

Description: Fix Redis NOSCRIPT errors by understanding script caching, when scripts get flushed, and how to use EVALSHA vs EVAL reliably in production.

---

A `NOSCRIPT No matching script` error in Redis means you tried to execute a script using `EVALSHA` with a SHA1 hash, but Redis does not have that script in its script cache. This happens because Redis's script cache is volatile - it gets cleared on restart or when `SCRIPT FLUSH` is called.

## Why NOSCRIPT Happens

Redis has two ways to run Lua scripts:
- `EVAL script numkeys key arg` - sends the full script every time
- `EVALSHA sha1 numkeys key arg` - sends only a hash, uses cached script

Scripts are cached in memory, not persisted to RDB or AOF. When Redis restarts, all cached scripts are gone. Calling `EVALSHA` with a hash that is not in the cache produces:

```text
(error) NOSCRIPT No matching script. Please use EVAL.
```

## Reproducing the Error

```bash
# Load a script and get its SHA
SHA=$(redis-cli SCRIPT LOAD "return redis.call('GET', KEYS[1])")
echo $SHA
# Output: d3c21d0c2b9ca22f82737626a27bcaf5d288f99f

# Use EVALSHA - works fine
redis-cli EVALSHA $SHA 1 mykey

# Flush the script cache (simulates restart)
redis-cli SCRIPT FLUSH

# Now EVALSHA fails
redis-cli EVALSHA $SHA 1 mykey
# (error) NOSCRIPT No matching script. Please use EVAL.
```

## Fix 1: Catch NOSCRIPT and Fall Back to EVAL

The standard pattern is to try `EVALSHA`, catch the NOSCRIPT error, then reload the script and retry `EVALSHA`:

```python
import redis
import hashlib

r = redis.Redis(host="localhost", port=6379)

LUA_SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current then
    return redis.call('INCR', KEYS[1])
else
    redis.call('SET', KEYS[1], ARGV[1])
    return tonumber(ARGV[1])
end
"""

# Precompute SHA
script_sha = hashlib.sha1(LUA_SCRIPT.encode()).hexdigest()

def run_script(key, initial_value):
    try:
        return r.evalsha(script_sha, 1, key, initial_value)
    except redis.exceptions.ResponseError as e:
        if "NOSCRIPT" in str(e):
            # Reload the script and use EVALSHA again
            r.script_load(LUA_SCRIPT)
            return r.evalsha(script_sha, 1, key, initial_value)
        raise
```

## Fix 2: Use redis-py's Script Object

redis-py has a built-in `register_script` method that handles the NOSCRIPT fallback automatically:

```python
import redis

r = redis.Redis(host="localhost", port=6379)

# Register the script - redis-py handles EVALSHA + NOSCRIPT fallback
increment_or_set = r.register_script("""
    local current = redis.call('GET', KEYS[1])
    if current then
        return redis.call('INCR', KEYS[1])
    else
        redis.call('SET', KEYS[1], ARGV[1])
        return tonumber(ARGV[1])
    end
""")

# Call it - automatically handles NOSCRIPT
result = increment_or_set(keys=["counter:visits"], args=[1])
print(f"Result: {result}")
```

## Fix 3: Always Preload Scripts on Startup

Load all scripts when your application starts, before serving traffic:

```python
class RedisScriptManager:
    def __init__(self, redis_client):
        self.r = redis_client
        self.scripts = {}

    def load(self, name, script):
        sha = self.r.script_load(script)
        self.scripts[name] = {"sha": sha, "source": script}
        return sha

    def run(self, name, keys, args):
        script_info = self.scripts[name]
        try:
            return self.r.evalsha(script_info["sha"], len(keys), *keys, *args)
        except redis.exceptions.ResponseError as e:
            if "NOSCRIPT" in str(e):
                sha = self.r.script_load(script_info["source"])
                script_info["sha"] = sha
                return self.r.evalsha(sha, len(keys), *keys, *args)
            raise

# On application startup:
mgr = RedisScriptManager(r)
mgr.load("rate_limit", """
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local current = redis.call('INCR', key)
    if current == 1 then redis.call('EXPIRE', key, 60) end
    return current <= limit and 1 or 0
""")

# Use it:
allowed = mgr.run("rate_limit", ["rate:user:123"], [100])
```

## Check What Scripts are Cached

```bash
# Check if a specific script is cached
redis-cli SCRIPT EXISTS d3c21d0c2b9ca22f82737626a27bcaf5d288f99f
# 1 = exists, 0 = not cached

# You cannot list all cached scripts - Redis doesn't expose that
# Check this in your monitoring to detect after restarts
```

## When SCRIPT FLUSH is Called

```bash
# SCRIPT FLUSH clears all cached scripts
redis-cli SCRIPT FLUSH

# Check if this is being called unexpectedly
redis-cli MONITOR | grep -i "script flush"

# In ACL policy, restrict SCRIPT FLUSH to admins only
redis-cli ACL SETUSER appuser -@scripting +EVAL +EVALSHA +SCRIPT|LOAD +SCRIPT|EXISTS
```

## Summary

Redis NOSCRIPT errors occur when `EVALSHA` is called with a SHA for a script that is not in cache - most commonly after a Redis restart. Fix it by using `redis-py`'s `register_script()` which handles fallback automatically, or implement an `EVALSHA` with NOSCRIPT catch-and-reload pattern. Never rely on scripts being permanently cached in Redis.
