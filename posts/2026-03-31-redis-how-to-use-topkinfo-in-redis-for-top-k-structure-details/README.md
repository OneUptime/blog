# How to Use TOPK.INFO in Redis for Top-K Structure Details

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Top-K, Structure Metadata, Diagnostic

Description: Learn how to use TOPK.INFO in Redis to inspect Top-K structure parameters including k, width, depth, and decay settings.

---

## What Is TOPK.INFO?

`TOPK.INFO` returns configuration details about a Redis Top-K structure. It shows the K value (how many top items are tracked), as well as the internal accuracy parameters: width, depth, and decay. These parameters were set during `TOPK.RESERVE` and cannot be changed after creation.

This command is useful for auditing Top-K configurations, debugging unexpected behavior, and validating that structures were created with the right parameters.

## Syntax

```text
TOPK.INFO key
```

## Sample Output

```bash
TOPK.RESERVE my_topk 10 50 5 0.9

TOPK.INFO my_topk
# 1) "k"
# 2) (integer) 10
# 3) "width"
# 4) (integer) 50
# 5) "depth"
# 6) (integer) 5
# 7) "decay"
# 8) "0.9"
```

## Understanding Each Field

| Field | Description |
|-------|-------------|
| k | Number of top items tracked |
| width | Width of each counter array (affects accuracy) |
| depth | Number of counter arrays (affects false positive rate) |
| decay | Probability of reducing a counter on collision, calculated as decay^counter (0.0 to 1.0) |

## Default Parameters

When you create a Top-K without specifying width, depth, and decay, Redis uses defaults:

```bash
# These two are equivalent:
TOPK.RESERVE default_topk 10
TOPK.RESERVE explicit_topk 10 8 7 0.9  # typical defaults
```

## Verifying Configuration Before Use

```bash
# Create structures for different use cases
TOPK.RESERVE trending:hour 20 100 7 0.85
TOPK.RESERVE trending:day 50 200 10 0.95

# Verify the day tracker has correct settings
TOPK.INFO trending:day
# k=50, width=200, depth=10, decay=0.95

# Verify the hour tracker
TOPK.INFO trending:hour
# k=20, width=100, depth=7, decay=0.85
```

## Python Example: Audit All Top-K Structures

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def parse_topk_info(key: str) -> dict:
    """Parse TOPK.INFO output into a dictionary."""
    raw = r.execute_command("TOPK.INFO", key)
    if not raw:
        return {}
    return dict(zip(raw[::2], raw[1::2]))

def print_topk_config(key: str):
    """Print a human-readable summary of a Top-K structure."""
    info = parse_topk_info(key)
    if not info:
        print(f"Key '{key}' does not exist")
        return

    k = info.get("k", "N/A")
    width = info.get("width", "N/A")
    depth = info.get("depth", "N/A")
    decay = info.get("decay", "N/A")

    print(f"Top-K Config: {key}")
    print(f"  Tracking top: {k} items")
    print(f"  Width:        {width}")
    print(f"  Depth:        {depth}")
    print(f"  Decay:        {decay}")
    print(f"  Accuracy:     {'high' if int(str(width)) >= 50 else 'standard'}")

# Setup
r.execute_command("TOPK.RESERVE", "shop:trending", 10, 50, 5, 0.9)
print_topk_config("shop:trending")
```

## Comparing Accuracy Configurations

```python
def compare_topk_configs(keys: list) -> list:
    """Compare configuration of multiple Top-K structures."""
    configs = []
    for key in keys:
        info = parse_topk_info(key)
        if info:
            configs.append({
                "key": key,
                "k": info.get("k"),
                "width": info.get("width"),
                "depth": info.get("depth"),
                "decay": info.get("decay"),
                "memory_estimate_kb": (int(str(info.get("width", 0))) *
                                       int(str(info.get("depth", 0))) * 8 / 1024)
            })
    return configs

# Create different configurations
r.execute_command("TOPK.RESERVE", "config:low_mem", "5", "20", "3", "0.9")
r.execute_command("TOPK.RESERVE", "config:balanced", "10", "50", "5", "0.9")
r.execute_command("TOPK.RESERVE", "config:high_acc", "20", "100", "7", "0.9")

configs = compare_topk_configs(["config:low_mem", "config:balanced", "config:high_acc"])
for c in configs:
    print(f"{c['key']}: k={c['k']}, ~{c['memory_estimate_kb']:.1f}KB")
```

## Checking Decay Setting Effects

The decay parameter controls how easily counters are displaced on collision:

```text
decay = 1.0  -> Every collision decrements; heavy hitters get no extra protection
decay = 0.9  -> Default; heavy hitters with high counts are progressively harder to displace
decay = 0.5  -> Strong protection for heavy hitters; top-k list is very stable
```

```bash
# For real-time trending where heavy hitters should be easy to displace
TOPK.RESERVE realtime:trending 10 50 5 1.0  # Higher decay, more volatile

# For stable tracking where heavy hitters should persist
TOPK.RESERVE historical:trending 10 50 5 0.5  # Lower decay, more stable
```

## Validating Structure Exists

Use TOPK.INFO to check if a key exists as a Top-K structure:

```python
def topk_exists(key: str) -> bool:
    """Return True if key exists and is a Top-K structure."""
    try:
        result = r.execute_command("TOPK.INFO", key)
        return result is not None and len(result) > 0
    except Exception:
        return False

if not topk_exists("shop:trending"):
    r.execute_command("TOPK.RESERVE", "shop:trending", 10)
    print("Created new Top-K structure")
else:
    print("Using existing Top-K structure")
```

## Summary

`TOPK.INFO` reveals the configuration of a Redis Top-K structure, including k, width, depth, and decay parameters. Use it to audit structures, compare configurations across environments, estimate memory usage, and validate that structures were created with the correct settings. This command is particularly helpful in multi-team environments where different services may create Top-K structures with varying accuracy requirements.
