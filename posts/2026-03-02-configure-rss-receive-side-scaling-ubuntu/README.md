# How to Configure RSS (Receive Side Scaling) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, RSS, Performance, Kernel

Description: Learn how to configure Receive Side Scaling (RSS) on Ubuntu to distribute network packet processing across multiple CPU cores for improved throughput and latency.

---

On a multi-core server handling high network throughput, all incoming packets funneling through a single CPU core creates a bottleneck. Receive Side Scaling (RSS) is a hardware and kernel feature that distributes incoming network interrupts across multiple CPU cores - each CPU handles its own queue of packets, reducing contention and improving overall throughput.

This guide covers how RSS works, how to verify it's working on Ubuntu, and how to tune it for your workload.

## How RSS Works

RSS uses a hash function applied to packet fields - typically a combination of source IP, destination IP, source port, and destination port - to assign each packet flow to a specific receive queue. Each queue is handled by a different CPU core via hardware interrupts (IRQs).

The result: traffic from different connections goes to different CPU cores, and no single core becomes the bottleneck for interrupt handling.

RSS requires:
- A network card with multiple receive queues (most modern NICs have 8-64)
- Kernel support (enabled by default in Ubuntu kernels)
- Proper IRQ affinity configuration

## Checking RSS Support and Status

### Verify NIC Queue Count

```bash
# Check number of RX queues on your NIC
ethtool -l eth0
```

Output example:

```
Channel parameters for eth0:
Pre-set maximums:
RX:             16
TX:             16
Other:          1
Combined:       16
Current hardware settings:
RX:             0
TX:             0
Other:          1
Combined:       4
```

`Combined` queues handle both RX and TX. `RX` queues are dedicated receive queues. Most drivers use combined queues.

### Check Current Interrupt Distribution

```bash
# See which CPUs are handling NIC interrupts
cat /proc/interrupts | grep eth0
```

If all NIC interrupts show high counts on only one CPU, RSS isn't distributing load.

### Check IRQ Affinity

```bash
# Find IRQ numbers for your NIC
grep eth0 /proc/interrupts | awk '{print $1}' | tr -d ':'

# Check affinity for a specific IRQ (e.g., IRQ 42)
cat /proc/irq/42/smp_affinity
cat /proc/irq/42/smp_affinity_list
```

The affinity value is a bitmask. `ff` means all 8 CPUs can handle the interrupt. `01` means only CPU 0.

## Configuring RSS Queue Count

### Setting Queue Count with ethtool

```bash
# Set to 8 combined queues (adjust to your CPU count)
sudo ethtool -L eth0 combined 8
```

Verify:

```bash
ethtool -l eth0
```

### Making It Persistent

ethtool changes don't survive reboots. Use a systemd service or network configuration to persist them.

Create a systemd service:

```bash
sudo nano /etc/systemd/system/nic-rss.service
```

```ini
[Unit]
Description=Configure NIC RSS queues
After=network.target

[Service]
Type=oneshot
# Set combined queues equal to number of CPUs
ExecStart=/usr/sbin/ethtool -L eth0 combined 8
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now nic-rss.service
```

Alternatively, with Netplan (Ubuntu 20.04+):

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

Some drivers expose queue configuration through netplan's `driver-settings` extension, but ethtool via a service is more universally supported.

## Configuring IRQ Affinity for RSS

Setting queue count isn't enough - you also need each queue's interrupt to land on a different CPU.

### Manual IRQ Affinity Assignment

```bash
# Get NIC IRQ numbers
NIC="eth0"
IRQS=$(grep "$NIC" /proc/interrupts | awk '{print $1}' | tr -d ':')

# Assign each IRQ to a different CPU
CPU=0
for IRQ in $IRQS; do
    # Create bitmask for this CPU (CPU 0 = 1, CPU 1 = 2, CPU 2 = 4, etc.)
    MASK=$(printf '%x' $((1 << CPU)))
    echo $MASK > /proc/irq/$IRQ/smp_affinity
    echo "IRQ $IRQ -> CPU $CPU (mask $MASK)"
    CPU=$((CPU + 1))
done
```

### Using irqbalance

`irqbalance` is a daemon that automatically balances interrupts across CPUs. It's simpler than manual assignment:

```bash
sudo apt install irqbalance
sudo systemctl enable --now irqbalance
```

irqbalance dynamically rebalances based on load, which works well for general-purpose servers. For latency-sensitive workloads, manual pinning often performs better.

### Using set_irq_affinity Script

The kernel source includes a helper script for NIC IRQ affinity:

```bash
# Download from kernel source or use the version in your driver package
# Many NIC drivers ship this script

# Example usage (sets IRQs to local NUMA node CPUs)
sudo ./set_irq_affinity local eth0

# Or spread across all CPUs
sudo ./set_irq_affinity all eth0
```

## Configuring RPS (Receive Packet Steering) as Software RSS

If your NIC doesn't support hardware RSS (or has only one queue), RPS (Receive Packet Steering) provides a software equivalent. It distributes packet processing across CPUs in software after interrupt handling.

```bash
# Enable RPS on all queues for eth0
# The mask 'ff' enables all 8 CPUs (adjust based on CPU count)
for QUEUE in /sys/class/net/eth0/queues/rx-*; do
    echo ff > $QUEUE/rps_cpus
done
```

For a 16-CPU system:

```bash
# ffff = 16 CPUs (bitmask with 16 bits set)
echo ffff > /sys/class/net/eth0/queues/rx-0/rps_cpus
```

### Enable RFS (Receive Flow Steering) Alongside RPS

RFS extends RPS by directing packets to the CPU where the application consuming them is running, reducing cross-CPU cache invalidation:

```bash
# Set global RFS table size
echo 32768 > /proc/sys/net/core/rps_sock_flow_entries

# Set per-queue flow table size
for QUEUE in /sys/class/net/eth0/queues/rx-*; do
    echo 2048 > $QUEUE/rps_flow_cnt
done
```

Make these persistent via sysctl and a udev rule or startup script:

```bash
# /etc/sysctl.d/10-rfs.conf
net.core.rps_sock_flow_entries = 32768
```

## Checking RSS Hash Configuration

The hash function RSS uses can be tuned:

```bash
# Check which hash fields are used
ethtool -n eth0 rx-flow-hash tcp4
```

Output:

```
TCP over IPV4 flows use these fields for computing Hash flow key:
IP SA
IP DA
L4 bytes 0 & 1 [TCP/UDP src port]
L4 bytes 2 & 3 [TCP/UDP dst port]
```

Customize if needed (for example, to use only IP addresses for hashing, which spreads traffic differently):

```bash
# Hash on IP addresses only (no ports)
sudo ethtool -N eth0 rx-flow-hash tcp4 sd
```

## Verifying RSS is Working

After configuration, monitor interrupt distribution:

```bash
# Watch interrupt counts per CPU in real-time
watch -n 1 "cat /proc/interrupts | grep eth0"
```

With RSS working correctly, you should see interrupt counts increasing across multiple CPUs simultaneously under load.

### Using mpstat

```bash
sudo apt install sysstat

# Monitor per-CPU interrupt activity
mpstat -I SUM -P ALL 1
```

Look for the `%irq` column. With RSS working, you should see nonzero values across multiple CPUs rather than all activity on CPU 0.

## Tuning Considerations

**Queue count vs. CPU count**: Setting queues equal to the number of physical CPU cores (not hyperthreads) is a good starting point. Using hyperthreads for separate queues rarely helps and can hurt performance.

**NUMA awareness**: On multi-socket systems, pin NIC IRQs to CPUs on the same NUMA node as the NIC's PCIe slot. Mixed NUMA access adds latency.

```bash
# Find NIC NUMA node
cat /sys/class/net/eth0/device/numa_node

# Find CPUs on that NUMA node
lscpu | grep "NUMA node0"
```

**Interrupt coalescing**: RSS works best with some interrupt coalescing enabled to reduce CPU overhead:

```bash
# Check current coalescing settings
ethtool -c eth0

# Tune adaptive coalescing (driver-dependent)
sudo ethtool -C eth0 adaptive-rx on
```

## Summary

RSS distributes network packet processing across CPU cores at the hardware level, which is essential for high-throughput workloads on multi-core servers. The configuration involves setting the queue count to match available CPUs, mapping each queue's IRQ to a distinct CPU, and optionally enabling RPS/RFS for software-based distribution when hardware queues are limited. With proper RSS configuration, a server can handle significantly more network traffic before CPU becomes the bottleneck.
