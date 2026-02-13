# How to Use EC2 Enhanced Networking for Higher Throughput

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Enhanced Networking, ENA, Networking, Performance

Description: Enable and optimize EC2 enhanced networking with Elastic Network Adapter for higher throughput, lower latency, and reduced jitter on your instances.

---

Standard virtualized networking adds overhead. Every packet goes through the hypervisor's virtual network stack, which adds latency and limits throughput. Enhanced networking bypasses most of that overhead by using SR-IOV (Single Root I/O Virtualization) to give your instance near-direct access to the physical network hardware. The result is significantly higher bandwidth, lower latency, and less jitter - all without additional cost.

## What Enhanced Networking Provides

The numbers speak for themselves:

| Metric | Standard Networking | Enhanced Networking |
|--------|-------------------|-------------------|
| Bandwidth | Up to 1 Gbps | Up to 200 Gbps |
| Latency | Higher, variable | Lower, consistent |
| Packets per second | ~100K PPS | Millions of PPS |
| Jitter | Higher | Near-zero |
| CPU overhead | Higher (hypervisor processing) | Lower (hardware offload) |

Enhanced networking is free. You don't pay anything extra for it. The only requirement is using a supported instance type and having the right driver.

## Two Types of Enhanced Networking

AWS offers two enhanced networking interfaces:

**Elastic Network Adapter (ENA)** - The current standard. Supports up to 200 Gbps on latest instances. Required for all current-generation instance types.

**Intel 82599 VF (ixgbevf)** - The older interface. Supports up to 10 Gbps. Only used on a few legacy instance types like C3, R3, and I2.

Unless you're running very old instance types, you want ENA.

## Checking If Enhanced Networking Is Enabled

Most current-generation instances have ENA enabled by default. Let's verify:

```bash
# Check if ENA is enabled on a running instance
aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].{
    InstanceType: InstanceType,
    EnaSupport: EnaSupport,
    NetworkInterfaces: NetworkInterfaces[*].{
      InterfaceType: InterfaceType,
      Description: Description
    }
  }'
```

From inside the instance:

```bash
# Check if the ENA driver is loaded (Linux)
modinfo ena

# Check the driver version
ethtool -i eth0
# Should show "driver: ena"

# Check current network capabilities
ethtool eth0
```

## Enabling ENA on an Instance

If you're running an older AMI or instance that doesn't have ENA enabled, here's how to turn it on:

```bash
# Step 1: Stop the instance
aws ec2 stop-instances --instance-ids i-0abc123
aws ec2 wait instance-stopped --instance-ids i-0abc123

# Step 2: Enable ENA support
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123 \
  --ena-support

# Step 3: Start the instance
aws ec2 start-instances --instance-ids i-0abc123
```

Important: The AMI must have the ENA driver installed before you enable ENA support. If the driver isn't there, the instance won't be able to reach the network after starting.

## Installing the ENA Driver

On Amazon Linux 2023 and recent Ubuntu/RHEL versions, the ENA driver is pre-installed. On older AMIs, you may need to install it:

```bash
# Amazon Linux 2 - usually pre-installed, update to latest
sudo yum install -y kernel-devel-$(uname -r)
sudo yum update -y ena

# Ubuntu 18.04+ - usually pre-installed via linux-aws kernel
dpkg -l | grep linux-aws

# For manual installation from source
cd /tmp
git clone https://github.com/amzn/amzn-drivers.git
cd amzn-drivers/kernel/linux/ena
make
sudo make install
sudo modprobe ena
```

After installing, verify the driver:

```bash
# Confirm ENA driver is loaded
lsmod | grep ena

# Check driver version
modinfo ena | grep version
```

## Optimizing Network Performance

Having ENA enabled is the first step. Getting maximum performance requires tuning.

### Increase Ring Buffer Sizes

The default ring buffer sizes are often too small for high-throughput workloads:

```bash
# Check current ring buffer settings
ethtool -g eth0

# Increase ring buffers to maximum (values depend on instance type)
sudo ethtool -G eth0 rx 8192 tx 8192

# Make this persistent across reboots
echo 'ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth*", RUN+="/sbin/ethtool -G $name rx 8192 tx 8192"' | \
  sudo tee /etc/udev/rules.d/60-ena-ring-size.rules
```

### Enable Receive-Side Scaling (RSS)

RSS distributes incoming network traffic across multiple CPU cores:

```bash
# Check how many RSS queues are configured
ethtool -l eth0

# Set RSS queues to match CPU count (or max available)
NUM_CPUS=$(nproc)
sudo ethtool -L eth0 combined $NUM_CPUS
```

### Tune Kernel Network Parameters

Optimize the kernel's network stack for high throughput:

```bash
# Increase socket buffer sizes for high-bandwidth transfers
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
sudo sysctl -w net.core.rmem_default=1048576
sudo sysctl -w net.core.wmem_default=1048576

# Increase TCP buffer sizes
sudo sysctl -w net.ipv4.tcp_rmem="4096 1048576 16777216"
sudo sysctl -w net.ipv4.tcp_wmem="4096 1048576 16777216"

# Increase connection tracking and backlog
sudo sysctl -w net.core.netdev_max_backlog=65536
sudo sysctl -w net.core.somaxconn=65535

# Enable TCP window scaling
sudo sysctl -w net.ipv4.tcp_window_scaling=1

# Disable slow start after idle (important for bursty traffic)
sudo sysctl -w net.ipv4.tcp_slow_start_after_idle=0
```

Make these persistent by adding them to `/etc/sysctl.d/99-network-tuning.conf`:

```bash
# Create persistent network tuning configuration
sudo tee /etc/sysctl.d/99-network-tuning.conf << 'EOF'
# Socket buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576

# TCP buffer sizes
net.ipv4.tcp_rmem = 4096 1048576 16777216
net.ipv4.tcp_wmem = 4096 1048576 16777216

# Backlog and connection limits
net.core.netdev_max_backlog = 65536
net.core.somaxconn = 65535

# TCP performance
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1

# Reduce keepalive time
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6
EOF

sudo sysctl --system
```

### IRQ Affinity

For maximum throughput, pin network IRQs to specific CPU cores:

```bash
# Check current IRQ assignment for ENA
grep ena /proc/interrupts

# The ENA driver includes an IRQ affinity script
# On Amazon Linux, run it to automatically set optimal affinity
sudo /usr/lib/systemd/scripts/ena-rebalance-irqs.sh 2>/dev/null || \
  echo "Script not available - using default affinity"
```

## Benchmarking Network Performance

Test your optimizations with iperf3:

```bash
# On the server instance
iperf3 -s

# On the client instance (basic throughput test)
iperf3 -c <server-ip> -t 30 -P 8

# Test with larger window size
iperf3 -c <server-ip> -t 30 -P 8 -w 2M

# Test packet-per-second performance (small packets)
iperf3 -c <server-ip> -t 30 -l 64 -P 8
```

Compare results before and after tuning. On an m5.8xlarge with ENA, you should see close to 10 Gbps single-flow and 25 Gbps aggregate with multiple parallel flows.

## Instance Type and Network Bandwidth

Not all instance types get the same network bandwidth. Here's a quick reference:

| Instance Size | Baseline Bandwidth | Burst Bandwidth |
|--------------|-------------------|-----------------|
| m5.large | Up to 10 Gbps | 10 Gbps |
| m5.xlarge | Up to 10 Gbps | 10 Gbps |
| m5.2xlarge | Up to 10 Gbps | 10 Gbps |
| m5.4xlarge | Up to 10 Gbps | 10 Gbps |
| m5.8xlarge | 10 Gbps | 10 Gbps |
| m5.12xlarge | 12 Gbps | 12 Gbps |
| m5.16xlarge | 20 Gbps | 20 Gbps |
| m5.24xlarge | 25 Gbps | 25 Gbps |
| m5n.24xlarge | 100 Gbps | 100 Gbps |

The "n" suffix (m5n, c5n, r5n) instances have significantly higher network bandwidth and are designed for network-intensive workloads.

## Placement Groups for Maximum Performance

For the lowest latency between instances, use a cluster placement group:

```bash
# Create a cluster placement group
aws ec2 create-placement-group \
  --group-name high-perf-cluster \
  --strategy cluster

# Launch instances in the placement group
aws ec2 run-instances \
  --image-id ami-0abc123 \
  --instance-type c5n.18xlarge \
  --count 4 \
  --placement "GroupName=high-perf-cluster" \
  --subnet-id subnet-abc123
```

Cluster placement groups put instances on the same physical rack, minimizing network hops. Combined with ENA, this gives you the lowest possible latency between instances - often under 100 microseconds.

## Monitoring Network Performance

Track network metrics to verify your tuning is effective:

```bash
# Get network metrics from CloudWatch (with detailed monitoring enabled)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name NetworkIn \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum Maximum
```

For detailed per-interface metrics, install the [CloudWatch agent](https://oneuptime.com/blog/post/2026-02-12-install-and-configure-the-cloudwatch-agent-on-ec2/view) with the net metrics enabled.

Also monitor from inside the instance:

```bash
# Real-time network throughput monitoring
sar -n DEV 1 10

# Check for dropped packets (indicates buffer overflow)
netstat -s | grep -i drop
ethtool -S eth0 | grep -i drop

# If you see drops, increase ring buffers or tune kernel parameters
```

## Jumbo Frames

Within a VPC, you can use jumbo frames (9001 MTU) to reduce per-packet overhead:

```bash
# Set MTU to 9001 for jumbo frames (VPC internal traffic only)
sudo ip link set dev eth0 mtu 9001

# Make persistent
echo 'MTU=9001' | sudo tee -a /etc/sysconfig/network-scripts/ifcfg-eth0

# Verify
ip link show eth0 | grep mtu
```

Jumbo frames only work within the same VPC or peered VPCs. Traffic going through an internet gateway or VPN is limited to 1500 MTU.

Enhanced networking is one of those features where the default is usually good enough, but spending an hour on tuning can give you dramatically better performance. For network-intensive workloads like data processing, distributed databases, or high-frequency trading, the difference between default and optimized ENA configuration can be the difference between meeting your latency requirements and missing them.
