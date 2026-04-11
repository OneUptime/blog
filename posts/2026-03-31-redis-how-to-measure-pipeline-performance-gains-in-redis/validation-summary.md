# Validation Summary: How to Measure Pipeline Performance Gains in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-benchmark, redis-cli)
- Python (redis-py client library)
- Bash scripting

## Sources Consulted
- redis-benchmark --help output (verified -n, -c, -P, -q, -t flags)
- redis-cli --help output (verified --latency flag and output format)
- Redis official documentation on pipelining (https://redis.io/docs/latest/develop/use/pipelining/)
- redis-py documentation for Pipeline API (pipeline(), execute(), transaction=False)
- Python stdlib documentation for time.perf_counter() and statistics.mean()

## Issues Found
- **Section title mismatch**: The section titled "Measuring Mixed Read/Write Pipelines" only contained code that benchmarks GET (read) operations — sequential vs pipelined reads. There were no write operations in the benchmark itself (only in the seed data setup). Renamed the section to "Measuring Read Pipeline Performance" to accurately reflect the content.

## Review Notes
- All redis-benchmark flags (-n, -c, -P, -q, -t) verified correct.
- All redis-cli flags (--latency) verified correct.
- Python code uses correct redis-py APIs: Redis(), pipeline(transaction=False), execute().
- The latency table math is internally consistent (e.g., 1000 cmds x 0.1ms RTT = 0.1s without pipelining; 0.1/0.005 = 20x speedup).
- The latency table's pipelined times are reasonable approximations that account for 1 RTT plus server processing time.
- Sample throughput numbers (85k, 650k, 1.2M req/sec) are presented as illustrative examples and are plausible for typical hardware.
- The redis-benchmark output format shown (with p50, p99, p99.9 percentiles) matches Redis 7+ output format.
