# How to Configure Receive Side Scaling (RSS) on Linux Network Adapters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RSS, Linux, Network Performance, Multi-Core, IRQ, ethtool

Description: Learn how to configure Receive Side Scaling (RSS) to distribute network packet processing across multiple CPU cores, eliminating the single-CPU bottleneck on high-speed network adapters.

## What Is Receive Side Scaling?

Without RSS, all incoming packets on a network interface are processed by a single CPU core - the one handling that NIC's IRQ. On a 10G or 25G NIC, a single core can become a bottleneck at ~2-3 Gbps of traffic.

RSS allows the NIC hardware to distribute incoming packets across multiple receive queues, each serviced by a different CPU core, using a hash of the 4-tuple (source IP, dest IP, source port, dest port) for TCP/UDP flows.

## Step 1: Check If RSS Is Supported

```bash
# Check number of receive queues (channels) on the NIC

ethtool -l eth0

# Output:
# Channel parameters for eth0:
# Pre-set maximums:
# RX: 16       <- maximum receive queues
# TX: 16       <- maximum transmit queues
# Combined: 16
#
# Current hardware settings:
# RX: 1        <- currently only 1 queue (RSS disabled)
# TX: 1
# Combined: 1

# If "Combined" is >1, the NIC supports multi-queue (RSS/XPS)
```

## Step 2: Enable RSS by Increasing Queue Count

```bash
# Set combined queues to number of CPU cores
CPU_COUNT=$(nproc)
echo "Setting $CPU_COUNT queues"

# Set to number of CPU cores
ethtool -L eth0 combined $CPU_COUNT

# Verify change
ethtool -l eth0
```

## Step 3: Verify RSS Hash Configuration

```bash
# Check which fields are used for RSS hash
ethtool -n eth0 rx-flow-hash tcp4

# Output:
# TCP over IPV4 flows use these fields for computing Hash flow key:
# IP SA
# IP DA
# L4 bytes 0 & 1 [TCP/UDP src port]
# L4 bytes 2 & 3 [TCP/UDP dst port]

# Ensure 4-tuple hashing is enabled for TCP
ethtool -N eth0 rx-flow-hash tcp4 sdfn
# s = IP source, d = IP dest, f = L4 src, n = L4 dst
```

## Step 4: Check IRQ-to-CPU Mapping

With RSS, each receive queue should be bound to a different CPU:

```bash
# List IRQ assignments for eth0 queues
cat /proc/interrupts | grep eth0

# Output:
# 32:  1234567  0  0  0  PCI-MSI 524288-edge  eth0-TxRx-0
# 33:  1234567  0  0  0  PCI-MSI 524289-edge  eth0-TxRx-1
# ...

# Check current CPU affinity for each queue IRQ
for irq in $(grep eth0 /proc/interrupts | awk '{print $1}' | tr -d ':'); do
  printf "IRQ %s -> CPU mask: " $irq
  cat /proc/irq/$irq/smp_affinity
done
```

## Step 5: Set IRQ Affinity for RSS Queues

```bash
# Automatically distribute RSS IRQs across CPUs
# Install irqbalance for automatic distribution
sudo apt-get install -y irqbalance
sudo systemctl enable --now irqbalance

# Or manually set affinity (for more control)
# Assign queue 0 to CPU 0, queue 1 to CPU 1, etc.
IRQ_BASE=$(grep 'eth0-TxRx-0' /proc/interrupts | awk -F: '{print $1}' | tr -d ' ')

for i in $(seq 0 $(($(nproc) - 1))); do
  IRQ=$((IRQ_BASE + i))
  CPU_MASK=$(printf "%x" $((1 << i)))
  echo $CPU_MASK > /proc/irq/$IRQ/smp_affinity
  echo "IRQ $IRQ -> CPU $i (mask 0x$CPU_MASK)"
done
```

## Step 6: Verify RSS Distribution

```bash
# Generate traffic and check per-CPU receive statistics
# First, check per-queue counters
ethtool -S eth0 | grep -i "rx_queue_\|rx[0-9]"

# Monitor CPU usage during traffic to verify distribution
mpstat -P ALL 1 5

# With RSS working correctly, all CPUs should show similar %iowait/%sys
# Without RSS, only CPU 0 would spike
```

## Step 7: Make Changes Persistent

```bash
# Create a NetworkManager or systemd-network script
cat > /etc/udev/rules.d/99-rss.rules << 'EOF'
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth0", \
  RUN+="/sbin/ethtool -L eth0 combined 8"
EOF

# Or use a systemd service
cat > /etc/systemd/system/rss-tuning.service << 'EOF'
[Unit]
Description=Configure RSS for eth0
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ethtool -L eth0 combined 8
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable rss-tuning
```

## Conclusion

RSS distributes incoming packet processing across multiple CPU cores by configuring the NIC to use multiple receive queues. Enable it with `ethtool -L eth0 combined <N>` where N matches your CPU count, verify with `ethtool -l eth0`, and confirm distribution with `mpstat -P ALL`. RSS is essential for achieving full line rate on 10G+ adapters where a single CPU becomes the bottleneck.
