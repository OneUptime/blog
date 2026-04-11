# Validation Summary: How to Write Redis Performance Benchmarks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-benchmark CLI tool)
- Python (redis-py client library)
- Node.js (ioredis client library)
- Redis pipelining
- JSON serialization/deserialization for benchmarking

## Sources Consulted
- Redis redis-benchmark documentation: https://redis.io/docs/management/optimization/benchmarks/
- redis-py (Python Redis client) API documentation: https://redis-py.readthedocs.io/en/stable/
- ioredis (Node.js Redis client) documentation: https://github.com/redis/ioredis
- Python `time.perf_counter()` documentation: https://docs.python.org/3/library/time.html#time.perf_counter
- Python `statistics` module documentation: https://docs.python.org/3/library/statistics.html
- Node.js `process.hrtime.bigint()` documentation: https://nodejs.org/api/process.html#processhrtimebigint

## Issues Found
No technical issues found.

## Review Notes
- The pipeline benchmark uses `r.pipeline()` which defaults to `transaction=True` in redis-py, wrapping commands in MULTI/EXEC. This adds slight overhead compared to pure pipelining (`r.pipeline(transaction=False)`). For a benchmarking tutorial this is acceptable since it still demonstrates the pipeline pattern correctly, but readers doing precise pipeline-vs-transaction comparisons should be aware of this distinction.
- The percentile calculation uses simple index-based lookup on a sorted array (e.g., `latencies[int(len(latencies) * 0.95)]`), which is a standard approximation and appropriate for this context.
- All redis-benchmark CLI flags (`-h`, `-p`, `-n`, `-c`, `-t`, `-P`, `-d`, `--csv`) are correct and current.
- All Python redis-py API calls (`set`, `setex`, `get`, `hset` with `mapping` parameter) use current, non-deprecated signatures.
- All ioredis API calls (`set`, `get`, `hset`, `disconnect`) are correct and current.
