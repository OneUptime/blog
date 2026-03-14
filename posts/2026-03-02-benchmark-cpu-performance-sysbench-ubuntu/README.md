# How to Benchmark CPU Performance with sysbench on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, Benchmarking, Sysbench, SysAdmin

Description: Learn how to install and use sysbench to benchmark CPU, memory, and I/O performance on Ubuntu for baseline testing and server comparison.

---

Benchmarking gives you objective data to compare servers, validate hardware purchases, detect performance regressions after configuration changes, and establish baselines before tuning. `sysbench` is one of the most widely used tools for this on Linux - it covers CPU, memory, file I/O, and even database performance in a single package.

## Installing sysbench on Ubuntu

```bash
# Update package list and install sysbench
sudo apt update
sudo apt install sysbench -y

# Verify the installation
sysbench --version
```

For the latest version, you can also install from the official repository:

```bash
# Add the Percona repository (sysbench is maintained by Percona)
curl -s https://packagecloud.io/install/repositories/akopytov/sysbench/script.deb.sh | sudo bash

# Install from the official repo
sudo apt install sysbench -y
```

## CPU Benchmarking

The CPU test in sysbench works by computing prime numbers up to a specified limit. It's a pure compute workload that exercises integer arithmetic and branch prediction.

### Basic CPU Test

```bash
# Run a single-threaded CPU benchmark
# --cpu-max-prime: upper limit for prime number calculations
# --threads: number of parallel threads
# --time: duration in seconds (0 = run events count instead)
# --events: number of events to process (0 = unlimited)
sysbench cpu --cpu-max-prime=20000 --threads=1 --time=60 run
```

Example output:
```text
CPU speed:
    events per second:  1042.73

Latency (ms):
         min:                                    0.96
         avg:                                    0.96
         max:                                    1.71
         95th percentile:                        0.97
         sum:                                59992.30

Threads fairness:
    events (avg/stddev):           62563.0000/0.00
    execution time (avg/stddev):   59.9923/0.00
```

The key metric is **events per second** - higher is better. For a single-threaded test, this tells you the raw single-core performance.

### Multi-Threaded CPU Test

Most modern servers have multiple cores. Testing with all cores shows how well the system scales:

```bash
# Get the number of CPU cores
nproc

# Run multi-threaded test with all available cores
THREADS=$(nproc)
sysbench cpu \
    --cpu-max-prime=20000 \
    --threads=$THREADS \
    --time=60 \
    run
```

### Comparing Single-Core vs Multi-Core Scaling

A well-scaling system should show near-linear improvement as you add threads. If a 16-core server only shows 8x improvement with 16 threads, something is wrong (thermal throttling, NUMA issues, or memory bandwidth constraints).

```bash
# Test with 1, 2, 4, 8, and 16 threads to measure scaling
for threads in 1 2 4 8 16; do
    echo "=== Testing with $threads threads ==="
    sysbench cpu \
        --cpu-max-prime=20000 \
        --threads=$threads \
        --time=30 \
        run | grep "events per second"
done
```

## Memory Benchmarking

The memory test measures raw memory bandwidth - how fast data can be read from and written to RAM.

```bash
# Test sequential memory write performance
sysbench memory \
    --memory-block-size=1K \
    --memory-total-size=100G \
    --memory-operation=write \
    --threads=1 \
    run

# Test read performance
sysbench memory \
    --memory-block-size=1K \
    --memory-total-size=100G \
    --memory-operation=read \
    --threads=1 \
    run
```

### Memory Test with Different Block Sizes

Block size affects cache behavior. Small blocks test cache bandwidth; large blocks test main memory bandwidth:

```bash
# Test with various block sizes to understand cache hierarchy
for size in 1K 4K 64K 1M 16M; do
    echo "=== Block size: $size ==="
    sysbench memory \
        --memory-block-size=$size \
        --memory-total-size=10G \
        --threads=1 \
        run | grep -E "transferred|MiB/sec"
done
```

## File I/O Benchmarking

The fileio test measures disk performance. This is particularly useful for comparing different storage types (HDD vs SSD vs NVMe).

```bash
# Prepare test files (creates files for the benchmark)
# --file-total-size should be larger than your RAM to avoid caching effects
sysbench fileio \
    --file-total-size=10G \
    --file-test-mode=rndrw \
    prepare

# Run the random read/write test
sysbench fileio \
    --file-total-size=10G \
    --file-test-mode=rndrw \
    --file-fsync-freq=0 \
    --file-extra-flags=direct \
    --time=60 \
    --threads=4 \
    run

# Clean up test files after benchmarking
sysbench fileio \
    --file-total-size=10G \
    cleanup
```

Test modes available:
- `seqwr` - sequential write
- `seqrd` - sequential read
- `rndrd` - random read
- `rndwr` - random write
- `rndrw` - combined random read/write

## Writing a Benchmark Script

For repeatable baseline testing, automate the full benchmark suite:

```bash
#!/bin/bash
# full-benchmark.sh - Run a complete system benchmark with sysbench

THREADS=$(nproc)
OUTPUT_FILE="benchmark-$(hostname)-$(date +%Y%m%d-%H%M%S).txt"

echo "System Benchmark Report" > "$OUTPUT_FILE"
echo "Host: $(hostname)" >> "$OUTPUT_FILE"
echo "Date: $(date)" >> "$OUTPUT_FILE"
echo "CPU: $(grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)" >> "$OUTPUT_FILE"
echo "Cores: $THREADS" >> "$OUTPUT_FILE"
echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"

# CPU benchmark
echo "=== CPU Benchmark (single thread) ===" | tee -a "$OUTPUT_FILE"
sysbench cpu --cpu-max-prime=20000 --threads=1 --time=30 run 2>&1 | tee -a "$OUTPUT_FILE"

echo "=== CPU Benchmark ($THREADS threads) ===" | tee -a "$OUTPUT_FILE"
sysbench cpu --cpu-max-prime=20000 --threads=$THREADS --time=30 run 2>&1 | tee -a "$OUTPUT_FILE"

# Memory benchmark
echo "=== Memory Write Benchmark ===" | tee -a "$OUTPUT_FILE"
sysbench memory --memory-block-size=1K --memory-total-size=50G --memory-operation=write --threads=$THREADS run 2>&1 | tee -a "$OUTPUT_FILE"

echo "Results saved to: $OUTPUT_FILE"
```

## Interpreting Results

When comparing servers or tracking changes over time, focus on these metrics:

**CPU events per second**: Higher is better. Compare single-thread results for latency-sensitive workloads (gaming, some databases). Compare multi-thread totals for parallel workloads (web servers, data processing).

**95th percentile latency**: More meaningful than average for production workloads. A low average with a high 95th percentile suggests inconsistent performance (thermal throttling, I/O jitter).

**Memory bandwidth (MiB/sec)**: Modern DDR4 systems should show 20-50 GB/s for in-cache workloads and 30-60 GB/s sequential. Cloud VMs often show lower numbers due to virtualization overhead.

**Thread fairness stddev**: Low standard deviation means all threads are getting equal time. A high stddev suggests the OS scheduler is not distributing work evenly, which can happen on NUMA systems or with CPU pinning issues.

## Quick Performance Health Check

```bash
# One-liner for a quick 30-second CPU health check
sysbench cpu --threads=$(nproc) --time=30 run | grep -E "events per second|95th percentile"

# Compare results against a known-good baseline
# Store baselines in a file for future reference
sysbench cpu --threads=$(nproc) --time=60 run > /var/log/cpu-baseline-$(date +%Y%m%d).txt
```

Running sysbench after each major configuration change - kernel update, BIOS update, new hardware - gives you concrete evidence that performance held steady or improved. It takes minutes and eliminates guesswork.

For tracking application performance alongside infrastructure benchmarks in production, consider using a monitoring platform like OneUptime: https://oneuptime.com/blog/post/2026-03-02-benchmark-cpu-performance-sysbench-ubuntu/view
