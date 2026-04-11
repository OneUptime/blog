# How to Use VINFO in Redis for Vector Set Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Metadata, Diagnostic, Index Management

Description: Learn how to use VINFO in Redis to inspect Vector Set metadata including size, dimensions, quantization type, and HNSW graph parameters.

---

## What Is VINFO?

`VINFO` returns detailed metadata about a Redis Vector Set. It provides information about the number of elements, vector dimensions, quantization type, and the internal HNSW (Hierarchical Navigable Small World) graph parameters such as M (max edges per node) and max-level used for approximate nearest-neighbor search.

This command is essential for capacity planning, debugging, and understanding the state of your vector indexes.

## Syntax

```text
VINFO key
```

## Sample Output

```bash
VADD my_vectors VALUES 4 0.1 0.2 0.3 0.4 item1
VADD my_vectors VALUES 4 0.5 0.6 0.7 0.8 item2
VADD my_vectors VALUES 4 0.9 0.8 0.7 0.6 item3

VINFO my_vectors
#  1) "quant-type"
#  2) "int8"
#  3) "hnsw-m"
#  4) (integer) 16
#  5) "vector-dim"
#  6) (integer) 4
#  7) "projection-input-dim"
#  8) (integer) 0
#  9) "size"
# 10) (integer) 3
# 11) "max-level"
# 12) (integer) 1
# 13) "attributes-count"
# 14) (integer) 0
# 15) "vset-uid"
# 16) (integer) 1
# 17) "hnsw-max-node-uid"
# 18) (integer) 3
```

## Understanding Each Field

| Field | Description |
|-------|-------------|
| quant-type | Quantization method: int8, f32, or bin |
| hnsw-m | Maximum number of edges per node in the HNSW graph |
| vector-dim | Dimensionality of each vector |
| projection-input-dim | Original input dimension before REDUCE (0 if not used) |
| size | Number of elements in the vector set |
| max-level | HNSW graph height |
| attributes-count | Number of elements with custom attributes |
| vset-uid | Unique identifier for the vector set |
| hnsw-max-node-uid | Highest node UID in the HNSW graph |

## Python Example: Vector Index Inspector

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def parse_vinfo(key: str) -> dict:
    """Parse VINFO output into a dictionary."""
    try:
        raw = r.execute_command("VINFO", key)
        return dict(zip(raw[::2], raw[1::2]))
    except Exception:
        return {}

def print_index_report(key: str):
    """Print a human-readable report for a Vector Set."""
    info = parse_vinfo(key)
    if not info:
        print(f"Key '{key}' not found or is not a Vector Set")
        return

    size = int(info.get("size", 0))
    dim = int(info.get("vector-dim", 0))
    quant = info.get("quant-type", "unknown")
    hnsw_m = int(info.get("hnsw-m", 0))
    proj_dim = int(info.get("projection-input-dim", 0))

    print(f"Vector Index: {key}")
    print(f"  Elements:      {size:,}")
    print(f"  Dimensions:    {dim}")
    if proj_dim > 0:
        print(f"  Input dim:     {proj_dim} (reduced to {dim})")
    print(f"  Quantization:  {quant}")
    print(f"  HNSW M:        {hnsw_m}")
    print(f"  HNSW level:    {info.get('max-level', 'N/A')}")
    print(f"  Attributes:    {info.get('attributes-count', 0)}")

# Setup and test
r.execute_command("VADD", "products:vectors", "VALUES", "8",
                  "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8",
                  "prod:1001")
r.execute_command("VADD", "products:vectors", "VALUES", "8",
                  "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2",
                  "prod:1002")

print_index_report("products:vectors")
```

## Capacity Planning with VINFO

Use vector-dim and quant-type to estimate storage requirements:

```python
def estimate_full_capacity(key: str, target_elements: int) -> dict:
    """Estimate memory needed to hold target_elements vectors."""
    info = parse_vinfo(key)
    dim = int(info.get("vector-dim", 0))
    quant = info.get("quant-type", "int8")
    hnsw_m = int(info.get("hnsw-m", 16))

    if dim == 0:
        return {"error": "no dimensions found, cannot estimate"}

    # Estimate bytes per vector based on quantization type
    if quant == "f32":
        bytes_per_dim = 4
    elif quant == "int8":
        bytes_per_dim = 1
    elif quant == "bin":
        bytes_per_dim = 1 / 8
    else:
        bytes_per_dim = 4  # conservative default

    vector_bytes = dim * bytes_per_dim
    # HNSW graph overhead: each node stores up to hnsw_m edges per level
    graph_overhead = hnsw_m * 8  # approximate pointer overhead per element
    bytes_per_element = vector_bytes + graph_overhead

    estimated_total = bytes_per_element * target_elements

    return {
        "dimensions": dim,
        "quant_type": quant,
        "target_elements": target_elements,
        "estimated_memory_mb": estimated_total / (1024 * 1024),
        "bytes_per_element": bytes_per_element
    }

estimate = estimate_full_capacity("products:vectors", 1_000_000)
print(f"Estimated memory for 1M vectors: {estimate['estimated_memory_mb']:.0f} MB")
```

## Checking Index Health

```python
def is_index_healthy(key: str) -> dict:
    """Check for signs of index health issues."""
    info = parse_vinfo(key)
    size = int(info.get("size", 0))
    dim = int(info.get("vector-dim", 0))

    health = {"status": "ok", "warnings": []}

    if size == 0:
        health["status"] = "empty"
        health["warnings"].append("Index has no elements")

    if dim == 0:
        health["status"] = "error"
        health["warnings"].append("Vector dimension is 0")

    return health

health = is_index_healthy("products:vectors")
print(f"Health: {health['status']}")
for w in health["warnings"]:
    print(f"  Warning: {w}")
```

## Comparing VINFO, VCARD, and VDIM

| Command | Returns | Use Case |
|---------|---------|----------|
| VINFO | Full metadata | Detailed diagnostics, capacity planning |
| VCARD | Element count only | Quick size check |
| VDIM | Dimension only | Compatibility validation |

## Summary

`VINFO` provides comprehensive metadata about a Redis Vector Set including element count, dimensions, quantization type, and HNSW graph parameters. Use it for capacity planning, health monitoring, and debugging vector index behavior. The vector-dim and quant-type fields enable storage estimation for scaling decisions, while hnsw-m and max-level reveal the graph structure that affects search performance.
