# How to Evaluate RHEL Performance on AWS Graviton ARM Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, Graviton, ARM, AArch64, Cloud, Performance, Linux

Description: Benchmark and evaluate RHEL performance on AWS Graviton (ARM-based) instances to determine cost-performance benefits compared to x86_64 instances.

---

AWS Graviton processors are custom ARM-based chips that offer better price-performance compared to equivalent x86_64 instances. RHEL runs natively on Graviton instances (c7g, m7g, r7g families), making it straightforward to evaluate whether ARM delivers a benefit for your workloads.

## Launch a Graviton Instance with RHEL

```bash
# Use the AWS CLI to launch a Graviton instance with RHEL 9
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type m7g.xlarge \
  --key-name your-key \
  --security-group-ids sg-0123456789abcdef0 \
  --subnet-id subnet-0123456789abcdef0 \
  --count 1

# Find the RHEL 9 ARM AMI ID in your region
aws ec2 describe-images \
  --owners 309956199498 \
  --filters "Name=name,Values=RHEL-9*arm64*" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text
```

## Verify the Architecture

```bash
# SSH into the instance and verify
uname -m
# Output: aarch64

cat /etc/redhat-release
# Output: Red Hat Enterprise Linux release 9.x
```

## Install Benchmarking Tools

```bash
# Install common benchmarking utilities
sudo dnf install -y sysbench fio iperf3 stress-ng

# Install compiler tools for building custom benchmarks
sudo dnf groupinstall -y "Development Tools"
```

## CPU Benchmark

```bash
# Run a sysbench CPU test
sysbench cpu --threads=4 --time=60 run

# Compare single-threaded performance
sysbench cpu --threads=1 --time=60 run

# Run the same tests on an equivalent x86_64 instance (e.g., m7i.xlarge)
# and compare the events per second
```

## Memory Benchmark

```bash
# Test memory read/write performance
sysbench memory --threads=4 --time=60 run

# Test memory bandwidth with specific block size
sysbench memory --memory-block-size=1M --memory-total-size=10G --threads=4 run
```

## Disk I/O Benchmark

```bash
# Test random read/write IOPS with fio
sudo fio --name=randreadwrite \
  --ioengine=libaio \
  --direct=1 \
  --rw=randrw \
  --bs=4k \
  --numjobs=4 \
  --size=1G \
  --runtime=60 \
  --group_reporting
```

## Network Benchmark

```bash
# On the server instance
iperf3 -s

# On the client instance
iperf3 -c <server-ip> -t 60 -P 4
```

## Compare Cost-Performance

```bash
# Calculate the cost-performance ratio
# Graviton instances are typically 20% cheaper than x86 equivalents
# Example:
# m7g.xlarge (Graviton): $0.1632/hr, sysbench score: 15000 events/sec
# m7i.xlarge (Intel):    $0.2016/hr, sysbench score: 14500 events/sec
# Graviton cost-per-event is significantly lower
```

## Application-Level Testing

```bash
# For web workloads, install and benchmark your actual application
sudo dnf install -y nginx
sudo systemctl start nginx

# Use ab (Apache Bench) from another machine
ab -n 100000 -c 100 http://<graviton-instance-ip>/
```

When evaluating Graviton, focus on your specific workload rather than synthetic benchmarks alone. Most compiled applications work without modification on aarch64 RHEL.
