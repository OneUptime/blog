# How to Load Test Redis with Custom Workloads (memtier_benchmark)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Load Testing, Performance, memtier_benchmark, Benchmark

Description: Use memtier_benchmark to load test Redis with realistic custom workloads, control key distribution, data size, and pipeline depth for accurate capacity planning.

---

`redis-benchmark` is great for quick sanity checks, but `memtier_benchmark` from Redis Labs gives you far more control over workload shape - custom read/write ratios, key distributions, data sizes, and pipeline depths that reflect real application patterns.

## Installing memtier_benchmark

```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential autoconf automake libpcre3-dev \
  libevent-dev pkg-config zlib1g-dev libssl-dev

git clone https://github.com/RedisLabs/memtier_benchmark.git
cd memtier_benchmark
autoreconf -ivf
./configure
make
sudo make install
```

Or use the Docker image:

```bash
docker pull redis/memtier_benchmark
```

## Basic Throughput Test

```bash
memtier_benchmark \
  --host=127.0.0.1 \
  --port=6379 \
  --protocol=redis \
  --clients=50 \
  --threads=4 \
  --requests=10000 \
  --ratio=1:10
```

`--ratio=1:10` means 1 write for every 10 reads - a common cache workload.

## Realistic Key Distribution

Real traffic does not hit all keys uniformly. Simulate a Gaussian (hot-key) distribution:

```bash
memtier_benchmark \
  --host=127.0.0.1 \
  --port=6379 \
  --clients=100 \
  --threads=4 \
  --requests=50000 \
  --ratio=1:9 \
  --key-pattern=G:G \
  --key-maximum=100000 \
  --data-size=512
```

Key patterns:
- `R:R` - random keys on both SET and GET
- `S:S` - sequential keys
- `G:G` - Gaussian distribution (simulates popular keys)
- `Z:Z` - Zipfian distribution (heavy-tailed hot-key pattern)
- `P:P` - parallel (sequential where each client gets a subset of the key range)

## Testing with Varying Data Sizes

Use a size range to simulate mixed payload workloads:

```bash
memtier_benchmark \
  --host=127.0.0.1 \
  --port=6379 \
  --clients=50 \
  --threads=4 \
  --requests=20000 \
  --ratio=1:4 \
  --data-size-range=64-4096 \
  --data-size-pattern=R
```

## Pipeline Testing

Pipelining dramatically increases throughput. Test different pipeline depths to find the sweet spot:

```bash
for pipeline in 1 10 50 100; do
  echo "=== Pipeline: $pipeline ==="
  memtier_benchmark \
    --host=127.0.0.1 \
    --port=6379 \
    --clients=20 \
    --threads=4 \
    --requests=10000 \
    --pipeline=$pipeline \
    --ratio=0:1
done
```

## Running Against Redis Cluster

```bash
memtier_benchmark \
  --host=127.0.0.1 \
  --port=7000 \
  --cluster-mode \
  --clients=50 \
  --threads=4 \
  --requests=20000 \
  --ratio=1:9
```

## Interpreting the Output

```text
Type         Ops/sec    Hits/sec  Misses/sec  Latency  KB/sec
------------ ---------- --------- ----------- -------- ------
Sets         12345.67   ---       ---         1.23ms   789.01
Gets         111111.03  55555.51  55555.52    0.98ms   4567.89
Totals       123456.70  55555.51  55555.52    1.01ms   5356.90
```

Key metrics:
- **Ops/sec** - total throughput
- **Latency** - average (arithmetic mean); p50, p99, and p99.9 percentiles are shown in separate columns by default
- **Hits/sec vs Misses/sec** - your effective cache hit rate

## Summary

memtier_benchmark gives you fine-grained control over workload characteristics that match real application traffic. Use key distribution patterns like Gaussian to simulate hot-key scenarios, vary data sizes to match your payload range, and sweep pipeline depths to find optimal client settings. Always run tests with a warm keyspace and compare results across Redis versions or configuration changes.
