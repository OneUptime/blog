# How to Configure IPv6 Receive Side Scaling (RSS) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RSS, Receive Side Scaling, Linux, Networking, Performance

Description: Configure Receive Side Scaling for IPv6 traffic on Linux to distribute packet processing across multiple CPU cores and maximize throughput on multi-core systems.

## Introduction

Receive Side Scaling (RSS) distributes incoming network traffic across multiple CPU cores by using a hash function on packet header fields. Without RSS, all IPv6 traffic may be processed by a single CPU, creating a bottleneck at high packet rates.

## Step 1: Check Current RSS Configuration

```bash
# Check number of RSS queues on your NIC

ethtool -l eth0
# Shows: "Pre-set maximums" and "Current hardware settings"
# Combined count = number of RSS queues

# Check which CPUs each queue is assigned to
cat /sys/class/net/eth0/queues/rx-0/rps_cpus
ls /sys/class/net/eth0/queues/

# Check NIC-level RSS hash configuration
ethtool -n eth0 rx-flow-hash tcp6
ethtool -n eth0 rx-flow-hash udp6
```

## Step 2: Set the Number of RSS Queues

```bash
# Set RSS queues to match the number of CPU cores
CPUS=$(nproc)
sudo ethtool -L eth0 combined $CPUS

# Verify the change
ethtool -l eth0

# For NICs that separate rx/tx queues
sudo ethtool -L eth0 rx $CPUS tx $CPUS
```

## Step 3: Configure RSS Hash Fields for IPv6

Tell the NIC which header fields to include in the RSS hash.

```bash
# Enable RSS hashing on IPv6 source/destination addresses + ports (TCP)
sudo ethtool -N eth0 rx-flow-hash tcp6 sd
# s = source IP, d = destination IP
# sd = both IPs, sdfn = IPs + ports (f=src port, n=dst port)

# For UDP IPv6 traffic
sudo ethtool -N eth0 rx-flow-hash udp6 sdfn

# For raw IPv6 traffic
sudo ethtool -N eth0 rx-flow-hash ip6 sd

# Verify settings
ethtool -n eth0 rx-flow-hash tcp6
```

## Step 4: Configure RPS (Software RSS Fallback)

For NICs without hardware RSS, use Receive Packet Steering (RPS) in software.

```bash
# Enable RPS on all CPUs for each receive queue
# Calculate bitmask for all CPUs: e.g., 8 CPUs = 0xFF

CPUS=$(nproc)
BITMASK=$(python3 -c "print(hex(2**$CPUS - 1))")
echo "CPU bitmask: $BITMASK"

# Apply to all rx queues
for queue in /sys/class/net/eth0/queues/rx-*; do
    echo "$BITMASK" > "$queue/rps_cpus"
    echo "Set RPS on $queue"
done

# Set per-queue RFS flow table size (entries per receive queue)
for queue in /sys/class/net/eth0/queues/rx-*; do
    echo 4096 > "$queue/rps_flow_cnt"
done

# Set global RFS flow table size
echo 32768 > /proc/sys/net/core/rps_sock_flow_entries
```

## Step 5: Configure RFS (Receive Flow Steering)

RFS extends RPS to steer packets to the same CPU where the application is running, improving cache locality.

```bash
# Enable RFS - set global flow table size
echo 32768 > /proc/sys/net/core/rps_sock_flow_entries

# Set per-queue flow table size (must sum to <= global)
for queue in /sys/class/net/eth0/queues/rx-*; do
    echo 2048 > "$queue/rps_flow_cnt"
done
```

## Step 6: Verify Distribution with irqbalance

```bash
# Check that interrupts are balanced across CPUs
cat /proc/interrupts | grep eth0

# Install irqbalance for dynamic rebalancing
sudo apt-get install irqbalance
sudo systemctl enable --now irqbalance

# Monitor per-CPU interrupt rates
watch -n1 "cat /proc/interrupts | grep eth0"

# Check per-queue packet statistics
ethtool -S eth0 | grep -E "rx_queue_[0-9]+_packets"
```

## Persistent Configuration

```bash
# /etc/network/if-up.d/rss-setup
#!/bin/bash
IFACE="eth0"
CPUS=$(nproc)
BITMASK=$(python3 -c "print(hex(2**$CPUS - 1))")

ethtool -L $IFACE combined $CPUS 2>/dev/null
ethtool -N $IFACE rx-flow-hash tcp6 sdfn 2>/dev/null
ethtool -N $IFACE rx-flow-hash udp6 sdfn 2>/dev/null

for queue in /sys/class/net/$IFACE/queues/rx-*; do
    echo "$BITMASK" > "$queue/rps_cpus"
    echo 4096 > "$queue/rps_flow_cnt"
done
```

## Conclusion

RSS for IPv6 distributes packet processing across all available CPU cores, eliminating per-CPU saturation at high packet rates. Hardware RSS is preferred, with software RPS/RFS as a fallback. After tuning, monitor per-CPU utilization and packet drop rates with OneUptime's infrastructure metrics.
