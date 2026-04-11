# Validation Summary: How to Use LATENCY HISTORY in Redis to View Latency Over Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (latency monitoring subsystem)
- Redis CLI (`redis-cli`)
- Bash scripting (for parsing and exporting latency data)

## Sources Consulted
- Redis official documentation for LATENCY HISTORY: https://redis.io/docs/latest/commands/latency-history/
- Redis official documentation for LATENCY LATEST: https://redis.io/docs/latest/commands/latency-latest/
- Redis Latency Monitor guide: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/

## Issues Found

### 1. Incorrect circular buffer size (180 → 160)
**What was wrong:** The post stated the circular buffer stores up to 180 samples per event. The official Redis documentation states the limit is 160 elements per time series.
**What was changed:** Replaced all six occurrences of "180" with "160" throughout the post (introduction, mermaid diagrams, circular buffer section, and summary).
**Why:** The Redis docs explicitly say "Every time series is composed of 160 elements" and "The command will return up to 160 timestamp-latency pairs."

### 2. Bash scripts missing `--raw` flag for `redis-cli`
**What was wrong:** Three bash scripts used `redis-cli LATENCY HISTORY ...` without the `--raw` flag, then attempted to parse the output using `paste - -` and `read`. Without `--raw`, redis-cli outputs type annotations like `(integer)` alongside values, meaning the `read` variable assignments would capture wrong values (e.g., `ts_val` would get `1)` instead of the actual timestamp).
**What was changed:**
- **Timestamp conversion script:** Changed to `redis-cli --raw` with `read ts ms` (two variables instead of four).
- **CSV export script:** Changed to `redis-cli --raw` with `read ts ms` (two variables instead of four with underscores).
- **Correlation script:** Changed to `redis-cli --raw ... | paste - - | wc -l | tr -d ' '` for a cleaner and correct sample count, replacing the fragile `grep -c "integer" | awk '{print $1/2}'` approach.
**Why:** With `--raw`, redis-cli outputs plain values (one per line), making `paste - -` correctly pair timestamps and latencies for simple `read` parsing.

## Review Notes
- The `CONFIG SET latency-monitor-threshold 10` example uses a 10ms threshold. The official Redis docs use 100ms in their example. A 10ms threshold is valid but will capture more events and may produce more noise; the post's choice of 10 is acceptable for a tutorial context.
- The `LATENCY LATEST` suggestion for discovering event names is correct but will only show events that have recorded at least one latency spike. Events with no spikes won't appear.
- The mermaid diagrams are well-structured and accurately represent the data flow and buffer behavior.
