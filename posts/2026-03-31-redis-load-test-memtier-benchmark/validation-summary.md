# Validation Summary: How to Load Test Redis with Custom Workloads (memtier_benchmark)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- memtier_benchmark (Redis Labs / Redis Inc. benchmarking tool)
- Docker
- Redis Cluster

## Sources Consulted
- memtier_benchmark official GitHub README: https://github.com/RedisLabs/memtier_benchmark
- memtier_benchmark man page (memtier_benchmark.1) from the source repository
- memtier_benchmark --help output (embedded in memtier_benchmark.cpp source)
- memtier_benchmark source code (run_stats.cpp) for latency output verification
- Docker Hub redis/memtier_benchmark image listing

## Issues Found

### 1. Incorrect key pattern description (`P:P` labeled as Gaussian)
- **What was wrong:** The post used `--key-pattern=P:P` and described it as "Gaussian distribution (simulates popular keys)." In reality, `P:P` means "Parallel" — sequential access where each client gets its own subset of the key range. The Gaussian pattern is `G:G`, and the Zipfian pattern is `Z:Z`.
- **What was changed:** Changed the command to use `--key-pattern=G:G`, updated the section heading from "Zipf" to "Gaussian", corrected the key pattern list to accurately describe all five patterns (R, S, G, Z, P).
- **Why:** Using the wrong key pattern would produce a completely different access distribution than intended, undermining the entire purpose of the section.

### 2. Outdated Docker image name
- **What was wrong:** The post referenced `redislabs/memtier_benchmark` as the Docker image.
- **What was changed:** Updated to `redis/memtier_benchmark`, which is the current official image per the repository README.
- **Why:** The `redislabs/` namespace is a legacy name. The official README now references `redis/memtier_benchmark`.

### 3. Incorrect latency metric description
- **What was wrong:** The post described the Latency column as "p50 average" and suggested using `--print-percentiles 50,99` to check p99. The default Latency column is actually the arithmetic mean (average), not p50. Additionally, p50, p99, and p99.9 percentile columns are already shown by default.
- **What was changed:** Corrected the description to state that the Latency column is the arithmetic mean, and that percentile columns (p50, p99, p99.9) are shown by default.
- **Why:** Confusing mean with median (p50) is a significant statistical error that could lead to incorrect performance analysis.

## Review Notes
- The `--requests` flag specifies requests per client, not total requests. With `--clients=50 --threads=4 --requests=10000`, the actual total is 10,000 x 50 x 4 = 2,000,000. The post does not clarify this, but it is not strictly incorrect since it does not claim it is a total count.
- The installation instructions build from source. An alternative is installing via package managers on some distributions, but the from-source approach shown is valid and widely used.
- The sample output table is simplified compared to the actual memtier_benchmark output (which includes additional percentile columns by default), but this is acceptable for illustrative purposes.
