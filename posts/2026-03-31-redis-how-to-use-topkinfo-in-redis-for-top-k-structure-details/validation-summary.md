# Validation Summary: How to Use TOPK.INFO in Redis for Top-K Structure Details

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (Bloom module / RedisBloom)
- TOPK.INFO command
- TOPK.RESERVE command
- Top-K probabilistic data structure (HeavyKeeper algorithm)
- Python redis client (`redis-py`)

## Sources Consulted
- Redis TOPK.INFO command documentation: https://redis.io/commands/topk.info/
- Redis TOPK.RESERVE command documentation: https://redis.io/commands/topk.reserve/
- Redis Top-K data type overview: https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/

## Issues Found

### 1. Decay parameter description in table was incorrect
- **What was wrong:** The "Understanding Each Field" table described decay as "Rate at which counts decay over time (0.0 to 1.0)". Decay is not time-based; it is the probability base for counter reduction on collision (calculated as `decay^counter`).
- **What was changed:** Updated to "Probability of reducing a counter on collision, calculated as decay^counter (0.0 to 1.0)".
- **Why:** Per the official TOPK.RESERVE docs, decay is raised to the power of the current counter value to determine the probability of decrementing on a hash collision with a different item. It is not a time-based rate.

### 2. Decay effects section intro text was misleading
- **What was wrong:** "The decay parameter controls how quickly old counts fade" implies time-based decay.
- **What was changed:** Updated to "The decay parameter controls how easily counters are displaced on collision".
- **Why:** The decay mechanism is triggered by hash collisions with competing items, not by the passage of time.

### 3. Decay value explanations were inverted
- **What was wrong:** The blog stated:
  - `decay = 1.0` → "No decay, counts accumulate indefinitely"
  - `decay = 0.9` → "Counts decay by 10% when a slot is displaced"
  - `decay = 0.5` → "Aggressive decay, heavy hitters change quickly"
- **What was changed:** Corrected to:
  - `decay = 1.0` → "Every collision decrements; heavy hitters get no extra protection"
  - `decay = 0.9` → "Default; heavy hitters with high counts are progressively harder to displace"
  - `decay = 0.5` → "Strong protection for heavy hitters; top-k list is very stable"
- **Why:** Since probability = `decay^counter`, with decay=1.0 the probability is always 1.0 regardless of counter value (no protection). With decay=0.5 and a high counter, the probability approaches 0 (strong protection). The blog had the relationship completely backwards.

### 4. Bash examples for trending vs historical use cases were inverted
- **What was wrong:** The blog recommended decay=0.85 for "real-time trending" and decay=1.0 for "historical aggregation where all counts matter equally".
- **What was changed:** Swapped the recommendations: decay=1.0 for real-time trending (more volatile, easier to displace heavy hitters) and decay=0.5 for stable tracking (heavy hitters persist).
- **Why:** Higher decay values make it easier to displace existing heavy hitters (more suitable for trending), while lower decay values protect established heavy hitters (more suitable for stable/historical tracking).

## Review Notes
- The TOPK.INFO syntax, return format, and field names are all correct per official documentation.
- The default parameters (width=8, depth=7, decay=0.9) match the official TOPK.RESERVE documentation.
- The Python code for parsing TOPK.INFO output using `dict(zip(raw[::2], raw[1::2]))` is a correct approach for the RESP2 response format.
- The memory estimate calculation (`width * depth * 8 / 1024`) is a rough approximation; actual memory usage depends on additional factors like the min-heap for tracking top-k items and per-bucket metadata. This is acceptable as a rough estimate in a blog context.
- The `int(str(width))` pattern in the Python code is defensive but unnecessary when `decode_responses=True` is set — the values would already be integers or strings from the Redis response. However, it works correctly so it was left as-is.
