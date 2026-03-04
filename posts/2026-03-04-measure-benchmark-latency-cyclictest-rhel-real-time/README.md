# How to Measure and Benchmark Latency Using cyclictest on RHEL Real-Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time, cyclictest, Latency Benchmarking, Performance, Linux

Description: Use cyclictest on RHEL real-time systems to measure scheduling latency and validate that your real-time configuration meets deterministic performance requirements.

---

cyclictest is the standard benchmarking tool for measuring real-time scheduling latency on Linux. It creates periodic timer threads and measures how far the actual wake-up time deviates from the expected time. This deviation is your scheduling latency.

## Install cyclictest

```bash
# cyclictest is part of the rt-tests package
sudo dnf install -y rt-tests

# Verify the installation
cyclictest --help | head -5
```

## Run a Basic Latency Test

```bash
# Run cyclictest with 4 threads, 1ms interval, for 60 seconds
# Requires root for real-time scheduling priorities
sudo cyclictest --mlockall \
  --threads=4 \
  --priority=99 \
  --interval=1000 \
  --distance=0 \
  --duration=60

# Output columns:
# T: thread number
# P: priority
# C: number of cycles
# Min: minimum latency in microseconds
# Act: current latency
# Avg: average latency
# Max: maximum latency (most important metric)
```

## Test on Specific Isolated CPUs

```bash
# Run cyclictest on isolated CPUs 2-5
sudo cyclictest --mlockall \
  --threads=4 \
  --affinity=2-5 \
  --priority=99 \
  --interval=1000 \
  --duration=300
```

## Generate a Latency Histogram

```bash
# Run cyclictest with histogram output (1000 bins of 1 microsecond each)
sudo cyclictest --mlockall \
  --threads=1 \
  --affinity=2 \
  --priority=99 \
  --interval=1000 \
  --loops=100000 \
  --histogram=1000 > /tmp/cyclictest-histogram.txt

# View the histogram data
head -50 /tmp/cyclictest-histogram.txt
```

## Run Under Load

Real latency testing should include system stress to simulate production conditions.

```bash
# Install stress-ng for load generation
sudo dnf install -y stress-ng

# In one terminal, generate CPU and memory stress on housekeeping CPUs
sudo taskset -c 0-1 stress-ng --cpu 2 --vm 2 --vm-bytes 512M --timeout 300s &

# In another terminal, run cyclictest on isolated CPUs
sudo cyclictest --mlockall \
  --threads=4 \
  --affinity=2-5 \
  --priority=99 \
  --interval=1000 \
  --duration=300
```

## Interpret the Results

Key metrics to evaluate:

- **Max latency** - The worst-case latency observed. For a well-tuned RHEL RT system, this should be under 50 microseconds
- **Average latency** - Typically in the single-digit microsecond range on isolated CPUs
- **99th percentile** - Useful for understanding the latency distribution tail

```bash
# Compare results between the standard and RT kernel
# First, boot the standard kernel and run cyclictest
# Then, boot the RT kernel and run the same test
# The RT kernel should show significantly lower max latency
```

## Save Results for Tracking

```bash
# Log results with a timestamp for historical comparison
sudo cyclictest --mlockall \
  --threads=4 \
  --affinity=2-5 \
  --priority=99 \
  --interval=1000 \
  --duration=600 2>&1 | tee /var/log/cyclictest-$(date +%Y%m%d).log
```

Regular benchmarking with cyclictest validates that kernel updates, configuration changes, and new workloads do not degrade real-time performance.
