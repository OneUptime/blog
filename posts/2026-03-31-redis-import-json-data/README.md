# How to Import JSON Data into Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, JSON, Data Import

Description: Learn multiple ways to import JSON data into Redis as strings, hashes, or RedisJSON documents using redis-cli, pipeline scripts, and application-level batch loading.

---

Importing JSON data into Redis is a common task for seeding caches, loading configuration, or migrating from another store. Redis supports JSON data in several ways: as serialized strings, as hash fields, or natively with the RedisJSON module. Each approach has trade-offs.

## Option 1: Import JSON as String Values

The simplest approach - serialize each JSON object and store it as a string:

```bash
# Import a single JSON object from a file
redis-cli SET product:123 "$(cat product.json)"

# Check the result
redis-cli GET product:123
```

For a JSON array of objects, use a shell script:

```bash
#!/bin/bash
python3 << 'PYEOF' | redis-cli --pipe
import json, sys

data = json.load(open("products.json"))
for item in data:
    key = f"product:{item['id']}"
    value = json.dumps(item)
    sys.stdout.write(f"*3\r\n$3\r\nSET\r\n${len(key)}\r\n{key}\r\n${len(value)}\r\n{value}\r\n")
PYEOF
```

## Option 2: Import JSON Fields as Redis Hashes

Hashes allow updating individual fields without overwriting the entire object:

```python
import json
import redis

r = redis.Redis.from_url('redis://localhost:6379')

with open('products.json') as f:
    products = json.load(f)

pipeline = r.pipeline()
for product in products:
    key = f"product:{product['id']}"
    # Flatten nested objects to strings for hash storage
    flat = {k: str(v) for k, v in product.items()}
    pipeline.hset(key, mapping=flat)
    if 'ttl' in product:
        pipeline.expire(key, product['ttl'])

pipeline.execute()
print(f"Imported {len(products)} products")
```

## Option 3: Import with RedisJSON Module

RedisJSON stores JSON natively with JSONPath access:

```python
import json
import redis
from redis.commands.json.path import Path

r = redis.Redis.from_url('redis://localhost:6379')

with open('products.json') as f:
    products = json.load(f)

pipeline = r.pipeline()
for product in products:
    key = f"product:{product['id']}"
    pipeline.json().set(key, Path.root_path(), product)

pipeline.execute()
print(f"Imported {len(products)} products as JSON documents")
```

## Option 4: Bulk Import with redis-cli Pipe Mode

Generate Redis protocol commands for maximum throughput:

```python
import json
import sys

def to_resp(command, *args):
    parts = [f"*{len(args) + 1}\r\n${len(command)}\r\n{command}\r\n"]
    for arg in args:
        arg_str = str(arg)
        parts.append(f"${len(arg_str)}\r\n{arg_str}\r\n")
    return ''.join(parts)

with open('products.json') as f:
    products = json.load(f)

for product in products:
    key = f"product:{product['id']}"
    value = json.dumps(product)
    sys.stdout.write(to_resp('SET', key, value))
    sys.stdout.write(to_resp('EXPIRE', key, '3600'))
```

Run the import:

```bash
python3 generate_commands.py | redis-cli --pipe
```

## Verifying the Import

```bash
# Check key count
redis-cli keys "product:*" | wc -l

# Inspect a sample
redis-cli get "product:123"

# For hashes
redis-cli hgetall "product:123"

# For RedisJSON
redis-cli json.get "product:123"
```

## Summary

JSON data can be imported into Redis as serialized strings, hash fields, or native JSON documents using RedisJSON. For large datasets, use redis-cli pipe mode to batch commands at wire speed. The string approach is simplest for whole-document reads; hashes work well for partial updates; RedisJSON is best when you need JSONPath queries or partial document access.
