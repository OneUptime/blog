# How to Store Nested Data Structures in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hash, JSON, Data Modeling, Nested

Description: Explore four strategies for storing nested data in Redis - JSON strings, key namespacing, RedisJSON, and flattened hashes - with tradeoffs for each approach.

---

Redis data types are flat by design - hashes store string fields mapping to string values, and there is no native nested object. Storing nested structures requires a deliberate strategy. Here are four practical approaches.

## Strategy 1: JSON String in a String Key

The simplest approach: serialize the entire object to JSON and store it as a string.

```bash
SET product:99 '{"id":99,"name":"Widget","metadata":{"sku":"WG-001","tags":["sale","new"]}}' EX 3600
```

```python
import redis, json

r = redis.Redis()

def save_product(product_id, data):
    r.set(f"product:{product_id}", json.dumps(data), ex=3600)

def get_product(product_id):
    raw = r.get(f"product:{product_id}")
    return json.loads(raw) if raw else None

product = get_product(99)
print(product["metadata"]["sku"])  # "WG-001"
```

**Tradeoff**: Simple to implement but requires full read-write for any update. No partial field access.

## Strategy 2: Key Namespacing

Flatten nested structure into multiple Redis keys using a naming convention:

```bash
SET product:99:name "Widget"
SET product:99:metadata:sku "WG-001"
SADD product:99:metadata:tags "sale" "new"
```

```python
def save_product_flat(product_id, name, sku, tags):
    pipe = r.pipeline()
    pipe.set(f"product:{product_id}:name", name)
    pipe.set(f"product:{product_id}:metadata:sku", sku)
    pipe.sadd(f"product:{product_id}:metadata:tags", *tags)
    pipe.execute()
```

**Tradeoff**: Partial updates are efficient, but fetching the whole object requires multiple round trips. Key count grows with nesting depth.

## Strategy 3: Flattened Hash with Dotted Keys

Store the nested structure in a single hash using dotted-path field names:

```bash
HSET product:99 \
  name "Widget" \
  "metadata.sku" "WG-001" \
  "metadata.weight_kg" "0.5" \
  "pricing.base" "9.99" \
  "pricing.sale" "7.99"
```

```python
def save_product_hash(product_id, data, prefix=""):
    """Flatten nested dict into hash with dotted keys."""
    flat = {}
    for k, v in data.items():
        key = f"{prefix}{k}" if not prefix else f"{prefix}.{k}"
        if isinstance(v, dict):
            flat.update(flatten_dict(v, key))
        elif isinstance(v, (list, set)):
            flat[key] = json.dumps(list(v))  # Serialize arrays as JSON
        else:
            flat[key] = str(v)
    return flat

def flatten_dict(d, prefix=""):
    result = {}
    for k, v in d.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            result.update(flatten_dict(v, full_key))
        else:
            result[full_key] = str(v)
    return result

product_data = {
    "name": "Widget",
    "metadata": {"sku": "WG-001", "weight_kg": 0.5},
    "pricing": {"base": 9.99, "sale": 7.99}
}
flat = flatten_dict(product_data)
r.hset("product:99", mapping=flat)

# Partial read
sku = r.hget("product:99", "metadata.sku")
print(sku.decode())  # "WG-001"
```

**Tradeoff**: Single key with partial field access, but arrays must be serialized. Deeply nested structures with arrays become unwieldy.

## Strategy 4: RedisJSON Module

If your Redis instance has the RedisJSON module (included in Redis Stack), use native JSON storage:

```bash
JSON.SET product:99 $ '{"id":99,"name":"Widget","metadata":{"sku":"WG-001","tags":["sale","new"]}}'

# Read nested field with JSONPath
JSON.GET product:99 $.metadata.sku
# Returns: ["WG-001"]

# Update a nested field
JSON.SET product:99 $.metadata.sku '"WG-002"'

# Append to a nested array
JSON.ARRAPPEND product:99 $.metadata.tags '"featured"'
```

```python
# Using redis-py with JSON support
import redis.commands.json.path as jsonpath

data = {
    "name": "Widget",
    "metadata": {"sku": "WG-001", "tags": ["sale", "new"]}
}
r.json().set("product:99", "$", data)
sku = r.json().get("product:99", "$.metadata.sku")
print(sku)  # ["WG-001"]
```

**Tradeoff**: Most flexible and natural for nested data. Requires the RedisJSON module.

## Choosing a Strategy

| Strategy | Partial update | Module needed | Best for |
|----------|---------------|---------------|---------|
| JSON string | No | No | Small objects, full read/write |
| Key namespace | Yes | No | Deep nesting, independent TTLs |
| Flattened hash | Yes | No | Moderate nesting, no arrays |
| RedisJSON | Yes | Yes | Complex nested documents |

## Summary

Redis lacks native nested types, so you must flatten or serialize nested data. Use JSON strings for simplicity, key namespacing for independent TTLs per sub-field, flattened hashes for partial updates without modules, or RedisJSON when you need full JSONPath support. Match your strategy to the update patterns your application requires.
