# How to Configure IRQ Affinity for Network Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Networking, Performance, Server

Description: Configure IRQ affinity on Ubuntu to distribute network interrupt handling across CPU cores, reducing latency and improving throughput for high-traffic servers.

---

## Why IRQ Affinity Matters

Every time a network packet arrives at your server, it triggers a hardware interrupt (IRQ). By default, Linux may route all interrupts from a given network interface to a single CPU core. On servers handling thousands of packets per second, that single core becomes a bottleneck while the remaining cores sit idle.

Configuring IRQ affinity lets you distribute interrupt processing across multiple cores, which directly translates to lower latency and higher throughput. This is especially important on servers running 10Gbps or faster NICs.

## Checking Current IRQ Assignments

Start by identifying which IRQs are assigned to your network interface.

```bash
# List all IRQs and their CPU affinity
cat /proc/interrupts | head -5

# Find IRQs for a specific NIC (e.g., eth0 or ens3)
grep eth0 /proc/interrupts
```

Each line shows an IRQ number, the count of interrupts handled per CPU, and the device name. If you see all the counts piling up on CPU0 while other CPUs show zero, that is the exact situation IRQ affinity fixes.

## Understanding SMP Affinity

Each IRQ has an affinity mask stored in `/proc/irq/<IRQ_NUMBER>/smp_affinity`. This mask is a hexadecimal bitmask where each bit represents a CPU core.

```bash
# Check the current affinity mask for IRQ 42
cat /proc/irq/42/smp_affinity

# Common bitmask values:
# 01 = CPU 0 only
# 02 = CPU 1 only
# 04 = CPU 2 only
# 08 = CPU 3 only
# 0f = CPUs 0-3 (all four cores)
# ff = CPUs 0-7 (all eight cores)
```

You can also use `smp_affinity_list` which accepts a comma-separated list of CPU numbers instead of hex masks.

```bash
# Check affinity as a CPU list (easier to read)
cat /proc/irq/42/smp_affinity_list

# Output example: 0 (meaning only CPU 0)
```

## Multi-Queue NICs and RSS

Modern NICs support multiple transmit/receive queues, each with its own IRQ. This feature is called Receive Side Scaling (RSS). Check if your NIC supports multiple queues.

```bash
# Check the number of combined queues
ethtool -l eth0
```

If your NIC supports multiple queues but is using fewer than the maximum, increase them.

```bash
# Set the number of combined queues to match CPU count
sudo ethtool -L eth0 combined 8
```

Each queue gets its own IRQ, and you can pin each queue to a different CPU core. This is the foundation of effective IRQ affinity for networking.

## Setting IRQ Affinity Manually

First, find the IRQ numbers for your NIC queues.

```bash
# List all IRQs for your NIC
grep eth0 /proc/interrupts | awk '{print $1, $NF}'
```

Then assign each queue to a specific CPU core.

```bash
# Pin IRQ 41 (queue 0) to CPU 0
echo 1 > /proc/irq/41/smp_affinity

# Pin IRQ 42 (queue 1) to CPU 1
echo 2 > /proc/irq/42/smp_affinity

# Pin IRQ 43 (queue 2) to CPU 2
echo 4 > /proc/irq/43/smp_affinity

# Pin IRQ 44 (queue 3) to CPU 3
echo 8 > /proc/irq/44/smp_affinity
```

You can also use the smp_affinity_list interface, which is more readable.

```bash
# Pin IRQ 41 to CPU 0
echo 0 > /proc/irq/41/smp_affinity_list

# Pin IRQ 42 to CPU 1
echo 1 > /proc/irq/42/smp_affinity_list
```

## Automating with a Script

Writing the affinity settings by hand is tedious and does not survive reboots. Create a script to automate the process.

```bash
#!/bin/bash
# set-irq-affinity.sh - Distribute NIC IRQs across CPU cores

NIC="eth0"
CPUS=$(nproc)

# Find all IRQ numbers for this NIC
IRQS=$(grep "$NIC" /proc/interrupts | awk -F: '{print $1}' | tr -d ' ')

CPU=0
for IRQ in $IRQS; do
    echo "$CPU" > /proc/irq/$IRQ/smp_affinity_list
    echo "IRQ $IRQ -> CPU $CPU"
    # Cycle through available CPUs
    CPU=$(( (CPU + 1) % CPUS ))
done
```

Make it executable and run it.

```bash
chmod +x set-irq-affinity.sh
sudo ./set-irq-affinity.sh
```

## Using irqbalance

Ubuntu ships with `irqbalance`, a daemon that automatically distributes IRQs across CPUs. For many workloads, irqbalance does a reasonable job.

```bash
# Check if irqbalance is running
systemctl status irqbalance

# View its current decisions
sudo irqbalance --debug --oneshot
```

However, irqbalance makes general-purpose decisions. For dedicated network servers, manual pinning often outperforms irqbalance. If you decide to pin IRQs manually, disable irqbalance first.

```bash
# Disable irqbalance for manual control
sudo systemctl stop irqbalance
sudo systemctl disable irqbalance
```

## Persisting Settings Across Reboots

Create a systemd service that runs your affinity script at boot.

```ini
# /etc/systemd/system/irq-affinity.service
[Unit]
Description=Set NIC IRQ affinity
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/set-irq-affinity.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Enable the service.

```bash
sudo cp set-irq-affinity.sh /usr/local/bin/
sudo systemctl daemon-reload
sudo systemctl enable irq-affinity.service
```

## Verifying the Configuration

After applying your affinity settings, generate some network traffic and verify that interrupts are distributed evenly.

```bash
# Watch interrupt distribution in real time (refresh every 2 seconds)
watch -n 2 "grep eth0 /proc/interrupts"
```

You should see interrupt counts increasing across multiple CPU columns instead of being concentrated on a single core.

You can also use `mpstat` to check per-CPU utilization during high network load.

```bash
# Monitor per-CPU soft interrupt (softirq) usage
mpstat -P ALL 2
```

Look at the `%soft` column. If one CPU was previously maxed out at 100% while others showed 0%, and now the load is spread across cores, your configuration is working.

## RPS and RFS as Software Alternatives

If your NIC does not support multiple hardware queues, you can use Receive Packet Steering (RPS) and Receive Flow Steering (RFS) to distribute packet processing in software.

```bash
# Enable RPS on eth0 queue 0 across CPUs 0-7
echo ff > /sys/class/net/eth0/queues/rx-0/rps_cpus

# Enable RFS with 32768 flow entries
echo 32768 > /proc/sys/net/core/rps_sock_flow_entries
echo 4096 > /sys/class/net/eth0/queues/rx-0/rps_flow_cnt
```

RPS distributes packets to CPUs based on a hash of the packet header, while RFS takes it further by steering packets to the CPU where the application socket is running.

## Troubleshooting

If you are still seeing uneven interrupt distribution after setting affinity, check these common issues:

- **irqbalance overriding your settings**: Make sure irqbalance is disabled if you are doing manual pinning
- **Kernel reverting affinity**: Some drivers reset affinity on link state changes. Your systemd service handles this at boot, but you may need a udev rule for cable reconnection events
- **CPU isolation conflicts**: If you are using `isolcpus` for real-time workloads, those CPUs will not handle interrupts unless explicitly assigned
- **NUMA awareness**: On multi-socket servers, pin NIC IRQs to CPUs on the same NUMA node as the NIC's PCIe slot for best performance

```bash
# Check which NUMA node your NIC is on
cat /sys/class/net/eth0/device/numa_node
```

## Summary

Proper IRQ affinity configuration is one of the most effective ways to improve network performance on Ubuntu servers. For most setups, the combination of multi-queue NICs with per-queue IRQ pinning provides the best results. Start with irqbalance for general workloads, and move to manual pinning when you need every bit of performance from your network stack.
