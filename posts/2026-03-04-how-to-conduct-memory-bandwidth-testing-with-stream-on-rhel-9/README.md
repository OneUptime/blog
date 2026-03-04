# How to Conduct Memory Bandwidth Testing with STREAM on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Benchmarking

Description: Step-by-step guide on conduct memory bandwidth testing with stream on rhel 9 with practical examples and commands.

---

The STREAM benchmark measures sustainable memory bandwidth on RHEL 9, critical for memory-bound workloads.

## Download and Compile STREAM

```bash
sudo dnf install -y gcc
curl -O https://www.cs.virginia.edu/stream/FTP/Code/stream.c

# Compile with optimizations
gcc -O3 -march=native -fopenmp -DSTREAM_ARRAY_SIZE=80000000 \
  -DNTIMES=20 stream.c -o stream
```

## Run the Benchmark

```bash
export OMP_NUM_THREADS=$(nproc)
./stream
```

## Interpret Results

STREAM measures four operations:

| Operation | Description |
|-----------|-------------|
| Copy | a[i] = b[i] |
| Scale | a[i] = q * b[i] |
| Add | a[i] = b[i] + c[i] |
| Triad | a[i] = b[i] + q * c[i] |

Results are in MB/s.

## Test with Different Thread Counts

```bash
for threads in 1 2 4 8 $(nproc); do
  echo "=== $threads threads ==="
  OMP_NUM_THREADS=$threads ./stream | grep -E "Copy|Scale|Add|Triad"
done
```

## NUMA-Aware Testing

```bash
# Test memory bandwidth per NUMA node
numactl --cpunodebind=0 --membind=0 ./stream
numactl --cpunodebind=1 --membind=1 ./stream
```

## Conclusion

STREAM on RHEL 9 provides standardized memory bandwidth measurements. Use it to validate hardware specifications, compare systems, and identify NUMA-related performance issues.

