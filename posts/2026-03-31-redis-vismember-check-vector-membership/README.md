# How to Use VISMEMBER in Redis to Check Vector Membership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector, VISMEMBER, Vector Set, Search

Description: Learn how to use VISMEMBER in Redis to check if a vector element exists in a vector set, with practical examples for recommendation and search systems.

---

Redis vector sets provide a native way to store and query high-dimensional vectors. The `VISMEMBER` command lets you check whether a specific element already exists in a vector set - useful for deduplication and conditional upserts.

## Basic Syntax

```text
VISMEMBER key element
```

Returns `1` if the element exists in the vector set, `0` otherwise.

## Adding Vectors and Checking Membership

```bash
# Add some items to a vector set (3-dimensional float vectors)
VADD products VALUES 3 0.1 0.2 0.8 laptop
VADD products VALUES 3 0.9 0.1 0.3 phone
VADD products VALUES 3 0.4 0.6 0.5 tablet

# Check if "laptop" is a member
VISMEMBER products laptop
# Returns: 1

# Check if "headphones" is a member
VISMEMBER products headphones
# Returns: 0
```

## Practical Example: Conditional Upsert

In recommendation systems, you may want to add a new item only if it does not already exist:

```python
import redis

r = redis.Redis(host="localhost", port=6379)

def add_product_if_missing(set_name, product_id, vector):
    exists = r.execute_command("VISMEMBER", set_name, product_id)
    if not exists:
        # Pass VALUES <dim> before the vector components
        args = ["VALUES", str(len(vector))]
        for v in vector:
            args.append(str(v))
        args.append(product_id)
        r.execute_command("VADD", set_name, *args)
        print(f"Added {product_id}")
    else:
        print(f"{product_id} already exists, skipping")

add_product_if_missing("products", "keyboard", [0.3, 0.7, 0.4])
add_product_if_missing("products", "laptop", [0.1, 0.2, 0.8])
```

## Checking Multiple Elements

Redis does not yet have a `VMISMEMBER` command, so you need to use a pipeline for bulk checks:

```python
def batch_check_membership(set_name, elements):
    pipe = r.pipeline()
    for elem in elements:
        pipe.execute_command("VISMEMBER", set_name, elem)
    results = pipe.execute()
    return dict(zip(elements, results))

status = batch_check_membership("products", ["laptop", "phone", "watch", "tablet"])
for item, is_member in status.items():
    print(f"{item}: {'exists' if is_member else 'missing'}")
```

## Integration with Ingestion Pipelines

When syncing a product catalog into Redis vector sets, use `VISMEMBER` to skip re-embedding items that are already indexed:

```python
from openai import OpenAI

client = OpenAI()

def sync_catalog(catalog, set_name):
    for product in catalog:
        pid = product["id"]
        if r.execute_command("VISMEMBER", set_name, pid):
            continue  # Already indexed
        # Get embedding from OpenAI
        resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=product["description"]
        )
        vec = resp.data[0].embedding
        r.execute_command("VADD", set_name, "VALUES", str(len(vec)), *[str(v) for v in vec], pid)
```

## Error Handling

```bash
# VISMEMBER on a non-existent key returns 0
VISMEMBER nonexistent_set some_element
# Returns: 0

# VISMEMBER on a wrong type raises an error
SET mystring "hello"
VISMEMBER mystring element
# Returns: WRONGTYPE error
```

## Summary

`VISMEMBER` is a simple but essential command for managing Redis vector sets. It provides O(1) membership testing, enabling safe conditional inserts and efficient deduplication in embedding ingestion pipelines. Combine it with pipelining for high-throughput batch checks.
