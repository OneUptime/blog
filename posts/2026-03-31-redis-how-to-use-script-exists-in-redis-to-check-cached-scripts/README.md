# How to Use SCRIPT EXISTS in Redis to Check Cached Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Command, Cache

Description: Learn how to use SCRIPT EXISTS in Redis to check whether Lua scripts are present in the server script cache before calling EVALSHA, preventing NOSCRIPT errors.

---

## What Is SCRIPT EXISTS

`SCRIPT EXISTS` checks whether one or more Lua scripts are loaded in the Redis server script cache by their SHA1 hash. It returns `1` for each script that exists in the cache and `0` for each that does not.

```text
SCRIPT EXISTS sha1 [sha1 ...]
```

## Basic Usage

```bash
# Load a script first
SCRIPT LOAD "return 'hello'"
# Returns: "1b936e3fe509bcbc9cd0664897bbe8fd0cac101b"

# Check if it exists
SCRIPT EXISTS 1b936e3fe509bcbc9cd0664897bbe8fd0cac101b
# 1) (integer) 1

# Check a non-existent SHA
SCRIPT EXISTS 0000000000000000000000000000000000000000
# 1) (integer) 0
```

## Checking Multiple Scripts

```bash
SCRIPT EXISTS sha1_one sha1_two sha1_three
# 1) (integer) 1   <- sha1_one exists
# 2) (integer) 0   <- sha1_two missing
# 3) (integer) 1   <- sha1_three exists
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

scripts = {
    'rate_limit': """
        local current = tonumber(redis.call('GET', KEYS[1])) or 0
        local limit = tonumber(ARGV[1])
        if current >= limit then return 0 end
        redis.call('INCR', KEYS[1])
        redis.call('EXPIRE', KEYS[1], ARGV[2])
        return 1
    """,
    'cas': """
        local current = redis.call('GET', KEYS[1])
        if current == ARGV[1] then
            redis.call('SET', KEYS[1], ARGV[2])
            return 1
        end
        return 0
    """
}

# Load scripts and store SHAs
shas = {}
for name, script in scripts.items():
    shas[name] = client.script_load(script)
    print(f"Loaded '{name}': {shas[name]}")

# Later, check if scripts are still cached
def ensure_scripts_loaded():
    sha_list = list(shas.values())
    exists_results = client.script_exists(*sha_list)
    names = list(shas.keys())

    for name, sha, exists in zip(names, sha_list, exists_results):
        if not exists:
            print(f"Reloading script: {name}")
            shas[name] = client.script_load(scripts[name])
        else:
            print(f"Script '{name}' is cached")

ensure_scripts_loaded()
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

const scriptRegistry = {};

async function loadScript(name, code) {
  const sha = await client.scriptLoad(code);
  scriptRegistry[name] = { sha, code };
  return sha;
}

async function ensureScriptsLoaded() {
  const names = Object.keys(scriptRegistry);
  const shas = names.map(n => scriptRegistry[n].sha);

  if (shas.length === 0) return;

  const results = await client.scriptExists(shas);

  for (let i = 0; i < names.length; i++) {
    if (!results[i]) {
      console.log(`Reloading script: ${names[i]}`);
      const { code } = scriptRegistry[names[i]];
      scriptRegistry[names[i]].sha = await client.scriptLoad(code);
    }
  }
}

// Load scripts at startup
await loadScript('ping', "return redis.call('PING')");
await loadScript('counter', "return redis.call('INCR', KEYS[1])");

// Verify before use
await ensureScriptsLoaded();
```

## Safe EVALSHA with Fallback Pattern

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ScriptManager:
    def __init__(self, redis_client):
        self.client = redis_client
        self.scripts = {}

    def register(self, name, code):
        sha = self.client.script_load(code)
        self.scripts[name] = {'sha': sha, 'code': code}
        return sha

    def call(self, name, numkeys, *args):
        entry = self.scripts.get(name)
        if not entry:
            raise ValueError(f"Script '{name}' not registered")

        # Check if cached
        exists = self.client.script_exists(entry['sha'])
        if not exists[0]:
            entry['sha'] = self.client.script_load(entry['code'])

        return self.client.evalsha(entry['sha'], numkeys, *args)

mgr = ScriptManager(client)
mgr.register('greet', "return 'Hello, ' .. ARGV[1]")
result = mgr.call('greet', 0, 'Redis')
print(result)  # Hello, Redis
```

## When Scripts Are Evicted

Scripts in the cache are cleared when:
- `SCRIPT FLUSH` is called
- The Redis server restarts
- `DEBUG RELOAD` is triggered

`SCRIPT EXISTS` helps you proactively verify the cache state before calling `EVALSHA` to avoid `NOSCRIPT` errors.

## Bulk Verification Example

```bash
# Store your known SHAs and verify all at once
SCRIPT EXISTS \
  aaa111bbb222ccc333ddd444eee555fff666aaa1 \
  bbb222ccc333ddd444eee555fff666aaa111bbb2 \
  ccc333ddd444eee555fff666aaa111bbb222ccc3

# 1) (integer) 1
# 2) (integer) 0  <- this one needs reloading
# 3) (integer) 1
```

## Summary

`SCRIPT EXISTS` verifies which Lua scripts are currently cached in Redis by their SHA1 hash, returning 1 for present and 0 for absent. Use it at application startup or before critical `EVALSHA` calls to proactively detect cache misses and reload scripts before they cause `NOSCRIPT` errors in production.
