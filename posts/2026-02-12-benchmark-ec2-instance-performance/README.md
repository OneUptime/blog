# How to Benchmark EC2 Instance Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Performance, Benchmarking

Description: Learn how to benchmark EC2 instance performance including CPU, memory, disk, and network using popular open-source tools and best practices.

---

When you're picking an EC2 instance type, AWS gives you specs on paper - vCPUs, memory, network bandwidth, and storage throughput. But how do those numbers translate to real-world performance for your workload? That's where benchmarking comes in.

Benchmarking your EC2 instances helps you make informed decisions about which instance family and size actually fits your needs. It's also critical when you're comparing generations (like moving from m5 to m7g) or evaluating Graviton vs. Intel processors.

## Why Benchmark?

There are a few solid reasons to benchmark your instances:

- **Cost optimization** - You might be paying for an m6i.xlarge when an m6a.large handles your workload just fine.
- **Migration validation** - Before switching instance types in production, you want proof the new instance performs at least as well.
- **Baseline establishment** - Having performance baselines helps you detect degradation over time, which ties directly into [monitoring your infrastructure](https://oneuptime.com/blog/post/aws-cloudwatch-ec2-monitoring/view).
- **Capacity planning** - Understanding the ceiling of your current instances helps you plan scaling strategies.

## Setting Up Your Benchmarking Environment

Before you start running benchmarks, install the essential tools on your EC2 instance.

Here's a script that installs all the benchmarking tools you'll need on Amazon Linux 2023:

```bash
# Install benchmarking tools on Amazon Linux 2023
sudo yum groupinstall "Development Tools" -y
sudo yum install -y sysbench fio iperf3 stress-ng htop

# Install Geekbench (optional, for standardized CPU scoring)
wget https://cdn.geekbench.com/Geekbench-6.3.0-Linux.tar.gz
tar xf Geekbench-6.3.0-Linux.tar.gz
```

For Ubuntu-based AMIs, swap `yum` for `apt-get`:

```bash
# Install benchmarking tools on Ubuntu
sudo apt-get update
sudo apt-get install -y sysbench fio iperf3 stress-ng htop build-essential
```

## CPU Benchmarking

CPU performance matters for compute-heavy tasks. The `sysbench` tool is perfect for quick CPU benchmarks.

Run a basic CPU benchmark with sysbench:

```bash
# Single-threaded CPU benchmark
sysbench cpu --cpu-max-prime=20000 --threads=1 run

# Multi-threaded CPU benchmark (adjust threads to match your vCPU count)
sysbench cpu --cpu-max-prime=20000 --threads=4 run
```

The key metric here is "events per second" - higher is better. For a more comprehensive CPU test, use `stress-ng`:

```bash
# Run a matrix multiplication benchmark for 60 seconds
stress-ng --matrix 0 --timeout 60s --metrics-brief

# Run a mixed CPU workload benchmark
stress-ng --cpu 0 --cpu-method all --timeout 120s --metrics-brief
```

The `--matrix 0` flag tells stress-ng to use all available CPUs. This gives you a realistic picture of how the instance handles parallel computation.

## Memory Benchmarking

Memory bandwidth and latency can be a bottleneck, especially for in-memory databases and caching layers.

Test memory read/write performance using sysbench:

```bash
# Prepare a 10GB memory test (adjust based on instance memory)
sysbench memory --memory-block-size=1M --memory-total-size=10G --threads=1 run

# Multi-threaded memory benchmark
sysbench memory --memory-block-size=1M --memory-total-size=10G --threads=4 run
```

For more detailed memory analysis, `stream` is the gold standard:

```bash
# Download and compile STREAM benchmark
wget https://www.cs.virginia.edu/stream/FTP/Code/stream.c
gcc -O3 -fopenmp -DSTREAM_ARRAY_SIZE=80000000 stream.c -o stream

# Run the STREAM benchmark
export OMP_NUM_THREADS=4
./stream
```

STREAM measures four key operations: Copy, Scale, Add, and Triad. These numbers tell you the actual memory bandwidth your instance can deliver.

## Disk I/O Benchmarking with fio

Disk performance benchmarking is crucial, especially when you're deciding between EBS volume types. The `fio` tool is the industry standard for storage benchmarks.

Test sequential read/write performance:

```bash
# Sequential write test - 4KB block size, 1GB file
fio --name=seq-write --ioengine=libaio --direct=1 \
    --bs=4k --size=1G --numjobs=1 --iodepth=32 \
    --rw=write --group_reporting

# Sequential read test
fio --name=seq-read --ioengine=libaio --direct=1 \
    --bs=4k --size=1G --numjobs=1 --iodepth=32 \
    --rw=read --group_reporting
```

Test random I/O, which is more representative of database workloads:

```bash
# Random read/write mix (70% read, 30% write) - typical database pattern
fio --name=randrw --ioengine=libaio --direct=1 \
    --bs=4k --size=1G --numjobs=4 --iodepth=32 \
    --rw=randrw --rwmixread=70 --group_reporting

# Random read IOPS test
fio --name=rand-read --ioengine=libaio --direct=1 \
    --bs=4k --size=1G --numjobs=4 --iodepth=256 \
    --rw=randread --group_reporting
```

Pay attention to these fio output metrics:
- **IOPS** - Input/output operations per second
- **BW (bandwidth)** - Throughput in MB/s or GB/s
- **lat (latency)** - Average and percentile latencies (p99 matters most)

If you're comparing EBS volume types, check out our guide on [io2 Block Express volumes](https://oneuptime.com/blog/post/io2-block-express-ebs-volumes-high-performance-storage/view) for high-performance storage options.

## Network Benchmarking

Network throughput matters for distributed systems, microservices, and anything that moves data between instances.

Set up an iperf3 test between two instances in the same VPC:

```bash
# On the server instance
iperf3 -s

# On the client instance (replace with server's private IP)
iperf3 -c 10.0.1.50 -t 30 -P 4

# Test with larger window size for high-bandwidth instances
iperf3 -c 10.0.1.50 -t 30 -P 16 -w 256K
```

The `-P 4` flag runs 4 parallel streams, which is important because a single TCP stream often can't saturate high-bandwidth links. For instances with 25 Gbps or higher networking, you'll want 8-16 parallel streams.

## Putting It All Together

Here's a comprehensive benchmarking script that runs all tests and saves results:

```bash
#!/bin/bash
# comprehensive-benchmark.sh - Run all benchmarks and save results

RESULTS_DIR="benchmark-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "=== EC2 Benchmark Suite ==="
echo "Instance type: $(curl -s http://169.254.169.254/latest/meta-data/instance-type)"
echo "Results directory: $RESULTS_DIR"

# CPU benchmark
echo "[1/4] Running CPU benchmark..."
sysbench cpu --cpu-max-prime=20000 --threads=$(nproc) run > "$RESULTS_DIR/cpu.txt" 2>&1

# Memory benchmark
echo "[2/4] Running memory benchmark..."
sysbench memory --memory-block-size=1M --memory-total-size=10G \
    --threads=$(nproc) run > "$RESULTS_DIR/memory.txt" 2>&1

# Disk benchmark
echo "[3/4] Running disk benchmark..."
fio --name=mixed-io --ioengine=libaio --direct=1 \
    --bs=4k --size=1G --numjobs=4 --iodepth=32 \
    --rw=randrw --rwmixread=70 \
    --group_reporting --output="$RESULTS_DIR/disk.txt"

# Cleanup fio test files
rm -f mixed-io.*

echo "[4/4] Collecting system info..."
lscpu > "$RESULTS_DIR/system-info.txt"
free -h >> "$RESULTS_DIR/system-info.txt"
df -h >> "$RESULTS_DIR/system-info.txt"

echo "=== Benchmarks complete! Results in $RESULTS_DIR ==="
```

## Interpreting Results and Comparing Instances

When comparing instances, don't just look at raw numbers. Consider the price-performance ratio. Here's a simple way to calculate it:

```bash
# Calculate price-performance ratio
# Example: comparing CPU events/second per dollar/hour
# m6i.xlarge: 8,500 events/sec at $0.192/hr = 44,270 events per dollar-hour
# m7g.xlarge: 10,200 events/sec at $0.163/hr = 62,576 events per dollar-hour
```

In this example, the Graviton-based m7g instance delivers about 41% better price-performance for CPU-bound work. That's a pattern you'll see across many workloads - Graviton instances tend to give you more bang for your buck.

## Best Practices for Accurate Benchmarking

A few tips to make sure your benchmarks are meaningful:

1. **Run multiple iterations** - A single run can be noisy. Run each benchmark at least 3 times and take the median.
2. **Use dedicated instances or bare metal** for critical benchmarks to avoid noisy neighbor effects.
3. **Warm up EBS volumes** - New EBS volumes need to be initialized before they deliver peak performance. Read every block at least once.
4. **Test during different times** - Network performance can vary based on overall AWS region load.
5. **Match your workload** - The best benchmark is one that mirrors your actual production workload patterns.

## Monitoring After Benchmarking

Benchmarking gives you a point-in-time measurement. For ongoing performance tracking, you'll want proper monitoring in place. Tools like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-ec2-monitoring/view) can help you track instance performance metrics continuously and alert you when things degrade.

The bottom line: don't trust spec sheets alone. Run your own benchmarks, compare the results against your workload requirements, and let the data guide your instance selection. Your wallet will thank you.
