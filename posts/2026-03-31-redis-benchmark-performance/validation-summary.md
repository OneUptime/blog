# Validation Summary: How to Benchmark Redis Performance with redis-benchmark

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (server and CLI tools)
- redis-benchmark (built-in performance testing tool)
- redis-cli (used in config change example)
- Bash scripting (regression testing script)

## Sources Consulted
- Redis official documentation on benchmarks: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis redis-benchmark CLI help output (`redis-benchmark --help`) for flag verification
- Redis redis-cli documentation for `--latency-history` flag confirmation
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/

## Issues Found

1. **`--latency-history` listed as a redis-benchmark flag (line 34 in original):** This flag belongs to `redis-cli`, not `redis-benchmark`. The `redis-benchmark` tool does not accept `--latency-history`. Removed the row from the flags table.

2. **`--pipeline` used instead of `-P` (multiple locations):** `redis-benchmark` does not support `--pipeline` as a long-form option. The correct flag is `-P <numreq>`. Changed all occurrences of `--pipeline` to `-P` — in the flags table, three pipelining code examples, the regression testing script, and the summary paragraph.

3. **`redis-cli config set tcp-nodelay yes` (line 173 in original):** `tcp-nodelay` is not a valid Redis CONFIG SET parameter. Redis enables TCP_NODELAY on client sockets by default and this is not runtime-configurable via CONFIG SET. Replaced with `redis-cli config set save ""` (disabling RDB snapshots), which is a valid and common performance tuning example.

## Review Notes
- The CSV output example (`"SET","175438.59"`) shows a simplified two-column format. In Redis 7.x, `--csv` output includes additional latency columns. The example is illustrative but readers on newer Redis versions will see more columns.
- The term "eval subcommand" for custom command benchmarking is slightly imprecise — EVAL is a Redis command used as the benchmark target, not a subcommand of redis-benchmark itself. However, the syntax and functionality shown are correct.
- The `-d` default of 3 bytes is correct per current Redis documentation.
- Sample output numbers are illustrative and will vary by hardware — this is expected and appropriate.
