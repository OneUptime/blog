# Validation Summary: How to Use LATENCY GRAPH in Redis to Visualize Latency

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (LATENCY GRAPH command)
- Redis latency monitoring framework
- Redis CLI
- Bash scripting

## Sources Consulted
- Redis official documentation for LATENCY GRAPH: https://redis.io/docs/latest/commands/latency-graph/
- Redis official documentation for LATENCY HISTORY: https://redis.io/docs/latest/commands/latency-history/
- Redis official documentation for LATENCY LATEST: https://redis.io/docs/latest/commands/latency-latest/
- Redis official documentation for LATENCY RESET: https://redis.io/docs/latest/commands/latency-reset/
- Redis Latency Monitoring Framework documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/
- Redis source code (latency.c) for sparkline rendering parameters

## Issues Found
1. **LATENCY HISTORY limit was 180, should be 160**: The mermaid flowchart stated "up to 180 entries" but Redis stores up to 160 elements per event. Fixed to 160.
2. **Chart height was 8 rows, should be 4**: The mermaid flowchart stated the chart height is 8 rows, but the Redis source code uses a height of 4 for the sparkline rendering. Fixed to 4.
3. **Example output format was incorrect**: The blog showed a fabricated output format with `max latency: 156 ms`, `latest sample: 42 ms (1 seconds ago)`, and a footer line with `min: 12 ms | max: 156 ms | latest: 42 ms | avg: 58 ms`. The actual Redis output has a header line in the format `event - high X ms, low Y ms (all time high Z ms)`, a separator line of dashes, the ASCII sparkline, and time labels below. There is no "avg" stat. Fixed to match actual output format.
4. **Flowchart header/footer descriptions were wrong**: The flowchart described printing a "header: max, latest, age" and "footer: min, max, latest, avg stats". Fixed to reflect the actual header format and time labels instead of a footer.
5. **Bash script awk parsing was incorrect**: The script used `awk 'NR%4==2 {gsub(/"/, "", $0); print $2}'` to parse LATENCY LATEST output, which assumes a multi-line-per-event format that doesn't match the actual tabular output. Fixed to `awk '{print $1}'`.

## Review Notes
- The blog omits LATENCY HISTOGRAM from its comparison of LATENCY commands. This is a valid related command but its omission is not an error — it serves a different purpose (measuring command-level latency distributions) and is not directly related to the latency monitoring framework events that LATENCY GRAPH visualizes.
- The bash script for iterating events is a rough approximation. The exact parsing needed depends on the redis-cli output mode (normal vs. raw vs. CSV). In practice, users may need to adjust the parsing for their specific setup.
