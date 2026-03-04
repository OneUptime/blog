# How to Compare x86_64 and aarch64 Application Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, x86_64, aarch64, ARM, Performance Comparison, Benchmarking, Linux

Description: Set up a structured comparison of application performance between x86_64 and aarch64 architectures on RHEL to make informed hardware decisions.

---

When evaluating a migration from x86_64 to aarch64, you need a consistent benchmarking methodology. This guide shows how to run comparable tests on both architectures using RHEL to produce meaningful performance data.

## Set Up Identical Test Environments

The key to valid comparison is controlling variables. Use the same RHEL version, package versions, and test parameters on both architectures.

```bash
# On both x86_64 and aarch64 systems, verify the OS version
cat /etc/redhat-release

# Ensure the same packages are installed
sudo dnf install -y sysbench fio iperf3 gcc make

# Check that compiler versions match
gcc --version
```

## CPU Performance Comparison

```bash
# Run identical sysbench CPU tests on both architectures
# Single-threaded test
sysbench cpu --threads=1 --cpu-max-prime=50000 --time=120 run

# Multi-threaded test (match the vCPU count)
sysbench cpu --threads=$(nproc) --cpu-max-prime=50000 --time=120 run

# Record the "events per second" from each run
```

## Compile-Time Comparison

Compilation speed is a practical real-world benchmark.

```bash
# Download a consistent source package for testing
curl -LO https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.6.tar.xz
tar xf linux-6.6.tar.xz
cd linux-6.6

# Configure and time a kernel build
make defconfig

# Time the build using all available cores
time make -j$(nproc)

# Compare the real time on both architectures
```

## Application-Specific Benchmarks

```bash
# For database workloads, use sysbench OLTP
# Install MariaDB on both systems
sudo dnf install -y mariadb-server
sudo systemctl start mariadb

# Prepare the test database
mysql -u root -e "CREATE DATABASE sbtest;"
sysbench oltp_read_write --db-driver=mysql --mysql-user=root \
  --tables=10 --table-size=100000 prepare

# Run the benchmark
sysbench oltp_read_write --db-driver=mysql --mysql-user=root \
  --tables=10 --table-size=100000 --threads=8 --time=120 run
```

## Memory and Cache Performance

```bash
# Memory bandwidth comparison
sysbench memory --memory-block-size=1M --memory-total-size=50G --threads=$(nproc) run

# Use lmbench for detailed memory latency (build from source)
# git clone https://github.com/intel/lmbench.git
# cd lmbench && make results
```

## Collect and Compare Results

```bash
# Create a results file on each system
cat > /tmp/benchmark-results.txt << EOF
Architecture: $(uname -m)
Kernel: $(uname -r)
CPUs: $(nproc)
Memory: $(free -h | awk '/Mem:/{print $2}')
CPU Model: $(lscpu | grep "Model name" | cut -d: -f2 | xargs)

sysbench CPU (single): [events/sec]
sysbench CPU (multi):  [events/sec]
Kernel compile time:   [seconds]
sysbench OLTP:         [transactions/sec]
sysbench memory:       [MiB/sec]
EOF
```

## Things to Watch For

- **Compiler optimizations**: Ensure you are not using x86-specific flags (like `-march=native`) that would not apply on ARM
- **Library differences**: Some math and crypto libraries have architecture-specific optimizations
- **Container images**: If testing containerized applications, use multi-arch images

A structured comparison like this gives you solid data to decide whether aarch64 is a good fit for your specific workloads on RHEL.
