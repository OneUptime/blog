# How to Conduct Memory Bandwidth Testing with STREAM on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Streams, Memory Bandwidth, Benchmarking, Performance

Description: Learn how to compile and run the STREAM memory bandwidth benchmark on RHEL to measure memory subsystem performance.

---

STREAM is a synthetic benchmark that measures sustainable memory bandwidth. It tests four operations: Copy, Scale, Add, and Triad. It is the industry standard for measuring memory throughput.

## Downloading and Compiling STREAM

```bash
# Install GCC compiler
sudo dnf install -y gcc

# Download the STREAM source code
wget https://www.cs.virginia.edu/stream/FTP/Code/stream.c -O /tmp/stream.c

# Compile with optimization flags
# STREAM_ARRAY_SIZE should be at least 4x the L3 cache size
gcc -O3 -march=native -fopenmp \
  -DSTREAM_ARRAY_SIZE=80000000 \
  -DNTIMES=20 \
  /tmp/stream.c -o /tmp/stream -lm
```

## Running the Benchmark

```bash
# Set the number of threads to the number of physical cores
export OMP_NUM_THREADS=$(lscpu | grep "^Core(s)" | awk '{print $NF}')

# Run the benchmark
/tmp/stream
```

## Understanding the Output

```bash
# STREAM outputs four measurements:
# Copy:  a(i) = b(i)           -- simple memory copy
# Scale: a(i) = q * b(i)       -- multiply and store
# Add:   a(i) = b(i) + c(i)    -- vector addition
# Triad: a(i) = b(i) + q*c(i)  -- multiply-add (most important)

# Each shows Best Rate (MB/s), Avg time, Min time, Max time
```

## NUMA-Aware Testing

For multi-socket systems, test per-NUMA-node bandwidth:

```bash
# Install numactl
sudo dnf install -y numactl

# Test memory bandwidth on NUMA node 0
numactl --cpunodebind=0 --membind=0 /tmp/stream

# Test memory bandwidth on NUMA node 1
numactl --cpunodebind=1 --membind=1 /tmp/stream

# Test cross-node memory access
numactl --cpunodebind=0 --membind=1 /tmp/stream
```

## Tuning for Accurate Results

```bash
# Verify array size is large enough
# Check L3 cache size
lscpu | grep "L3 cache"

# Array size should be at least 4x L3 cache
# For a 32MB L3 cache: 4 * 32MB / 8 bytes = 16,000,000 elements minimum
# Use a larger value for safety (e.g., 80000000)
```

The Triad result is the most commonly cited metric. Compare your results against known memory bandwidth specifications for your CPU to verify your system is performing as expected.
