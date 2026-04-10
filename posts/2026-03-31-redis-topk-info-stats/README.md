# How to Use TOPK.INFO in Redis to Get TopK Stats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisBloom, TopK, Probabilistic, Command

Description: Learn how to use TOPK.INFO in Redis to retrieve the configuration parameters of a TopK structure including K, width, depth, and decay settings.

---

## How TOPK.INFO Works

`TOPK.INFO` returns the configuration parameters of a Redis TopK structure. It shows the value of K (how many top items are tracked), the internal heavy-hitters sketch dimensions (width and depth), and the decay factor. Use it to verify the structure was created with the intended parameters and to document the configuration for monitoring and auditing.

```mermaid
graph TD
    A["TOPK.INFO trending"]
    A --> B["k: 50 (tracks top 50 items)"]
    A --> C["width: 2000 (sketch accuracy)"]
    A --> D["depth: 7 (sketch reliability)"]
    A --> E["decay: 0.925 (aging factor)"]
```

## Syntax

```redis
TOPK.INFO key
```

- `key` - the TopK structure key

Returns a flat array of field-value pairs. Returns an error if the key does not exist.

## Examples

### Default Structure Parameters

```redis
-- Created with only the k parameter; width, depth, and decay use defaults
TOPK.RESERVE default_topk 50
TOPK.INFO default_topk
```

```text
1) "k"
2) (integer) 50
3) "width"
4) (integer) 8
5) "depth"
6) (integer) 7
7) "decay"
8) "0.9"
```

### Custom Reserved Structure

```redis
TOPK.RESERVE custom_topk 20 3000 10 0.925
TOPK.INFO custom_topk
```

```text
1) "k"
2) (integer) 20
3) "width"
4) (integer) 3000
5) "depth"
6) (integer) 10
7) "decay"
8) "0.925"
```

### Comparing Expected vs Actual Parameters

After deployment, verify your TopK was configured correctly:

```redis
TOPK.INFO production_trending
-- Confirm: k=100, width=5000, depth=7, decay=0.9
-- If different, the structure may have been recreated with default parameters
```

## Understanding the Parameters

### k

The number of heavy hitters maintained. A TopK with `k=50` tracks the 50 most frequent items. Items outside the top 50 are not stored.

### width and depth

These are the dimensions of the internal Count-Min Sketch used to estimate frequencies:
- `width` - number of counters per row; larger = more accurate frequency estimates
- `depth` - number of rows (hash functions); larger = more reliable estimates

### decay

The decay factor (0 to 1) controls the probability of reducing a counter in an occupied bucket. A decay of `0.9` means when a new item hashes to an occupied bucket, the existing counter is probabilistically reduced (with probability `decay ^ counter`), gradually aging out items that are no longer frequent. Lower decay ages items out faster, making the structure more responsive to recent trends.

## Using TOPK.INFO in Monitoring

### Audit Script Pattern

```redis
-- Verify all production TopK structures have expected parameters
TOPK.INFO trending_products
TOPK.INFO top_search_queries
TOPK.INFO heavy_api_clients

-- Compare k values with deployment documentation
```

### Configuration Drift Detection

If a TopK structure was accidentally deleted and recreated with `TOPK.RESERVE` using only the k parameter, the remaining parameters would fall back to defaults (`width=8, depth=7, decay=0.9`), which may be very different from your intended configuration. `TOPK.INFO` reveals this:

```redis
TOPK.INFO my_topk
-- Expected: k=200, width=5000, depth=10
-- Actual: k=200, width=8, depth=7  <- recreated with default width/depth/decay!
-- Action: recreate with TOPK.RESERVE
```

## TOPK.INFO vs BF.INFO vs CMS.INFO

All probabilistic data structures have an INFO command for inspecting their configuration:

```redis
-- Bloom filter info
BF.INFO mybloom
-- Shows: capacity, size, number of filters, items inserted, expansion rate

-- Count-Min Sketch info
CMS.INFO mysketch
-- Shows: width, depth, count

-- TopK info
TOPK.INFO mytopk
-- Shows: k, width, depth, decay
```

## Summary

`TOPK.INFO` returns the configuration parameters of a Redis TopK structure: `k` (the ranking depth), `width` and `depth` (internal sketch dimensions), and `decay` (the aging factor for older counts). Use it to verify that production structures were created with the intended settings, detect cases where a structure was recreated with default parameters, and document TopK configurations for operational runbooks.
