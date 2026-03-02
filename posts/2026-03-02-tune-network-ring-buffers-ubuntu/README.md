# How to Tune Network Ring Buffers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Performance, ethtool, Ring Buffer

Description: Learn how to tune network ring buffer sizes on Ubuntu to reduce packet drops under high traffic load and optimize NIC performance for your workload.

---

Network ring buffers are fixed-size queues that sit between the NIC hardware and the kernel's network stack. When packets arrive faster than the kernel can process them, the ring buffer absorbs the burst. If the buffer fills up before the kernel catches up, packets are dropped - silently, from the perspective of the application.

Tuning ring buffer sizes is one of the first steps when investigating packet loss on a busy Ubuntu server. This guide covers how to check current settings, understand drop counters, and tune ring buffers for your workload.

## Understanding Ring Buffers

Every NIC has receive (RX) and transmit (TX) descriptor rings. Each descriptor points to a memory buffer that holds one packet.

When a packet arrives:
1. The NIC DMA-writes it into a ring buffer slot.
2. The NIC signals an interrupt (or NAPI polling picks it up).
3. The kernel reads the descriptor, processes the packet, and releases the slot back to the ring.

If step 3 is slower than step 1 - due to high packet rate, slow packet processing, or CPU contention - the ring fills up and new packets are dropped at the NIC level. These drops happen before the kernel sees the packet, so they don't show up in `netstat` RX error counters - they appear in `ethtool -S` NIC statistics.

## Checking Current Ring Buffer Sizes

```bash
# Show current and maximum ring buffer sizes
ethtool -g eth0
```

Example output:

```
Ring parameters for eth0:
Pre-set maximums:
RX:             4096
RX Mini:        n/a
RX Jumbo:       n/a
TX:             4096
Current hardware settings:
RX:             256
RX Mini:        n/a
RX Jumbo:       n/a
TX:             256
```

The default RX ring size of 256 is quite small. Under high traffic, even brief processing delays will cause ring overflow and packet drops.

## Detecting Ring Buffer Drops

### Using ethtool Statistics

```bash
# Show all NIC statistics
ethtool -S eth0

# Filter for drop-related counters (driver-specific names)
ethtool -S eth0 | grep -i -E 'drop|miss|error|overflow'
```

Common counter names that indicate ring buffer overflow:
- `rx_missed_errors`
- `rx_fifo_errors`
- `rx_dropped`
- `missed_rx` (Intel)
- `rx_queue_0_drops` (mlx5)
- `no_rx_buffer` (vmxnet3)

### Using ip statistics

```bash
ip -s link show eth0
```

Look for the `RX errors` line. While not all ring drops appear here, it gives a quick overview.

### Using /proc/net/dev

```bash
cat /proc/net/dev
```

The `drop` column shows packets dropped in the receive path.

## Increasing Ring Buffer Size

```bash
# Increase RX ring buffer to maximum supported by the NIC
sudo ethtool -G eth0 rx 4096

# Increase TX ring buffer
sudo ethtool -G eth0 tx 4096

# Verify the change
ethtool -g eth0
```

### Making Ring Buffer Changes Persistent

ethtool changes are lost on reboot. Persist them using a systemd service:

```bash
sudo nano /etc/systemd/system/ring-buffer-tune.service
```

```ini
[Unit]
Description=Tune NIC ring buffer sizes
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
# Adjust eth0 and sizes to match your system
ExecStart=/usr/sbin/ethtool -G eth0 rx 4096 tx 4096
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ring-buffer-tune.service
```

For systems with multiple interfaces:

```bash
sudo nano /usr/local/bin/tune-ring-buffers.sh
```

```bash
#!/bin/bash
# Tune ring buffers on all active network interfaces

INTERFACES=$(ip link show up | grep -oP '^\d+: \K[\w@]+' | grep -v lo | sed 's/@.*//')

for IFACE in $INTERFACES; do
    # Get max supported size
    MAX_RX=$(ethtool -g "$IFACE" 2>/dev/null | awk '/Pre-set maximums/{found=1} found && /RX:/{print $2; exit}')

    if [ -n "$MAX_RX" ] && [ "$MAX_RX" -gt 256 ]; then
        ethtool -G "$IFACE" rx "$MAX_RX" tx "$MAX_RX" 2>/dev/null
        echo "Set $IFACE ring buffers to RX=$MAX_RX TX=$MAX_RX"
    fi
done
```

```bash
sudo chmod +x /usr/local/bin/tune-ring-buffers.sh
```

Update the systemd service to use this script:

```ini
ExecStart=/usr/local/bin/tune-ring-buffers.sh
```

## Tuning the Kernel Receive Queue

In addition to NIC ring buffers, the kernel has its own queue (`netdev_max_backlog`) that holds packets after the NIC hands them off:

```bash
# Check current setting
sysctl net.core.netdev_max_backlog

# Increase it (default is usually 1000)
sudo sysctl -w net.core.netdev_max_backlog=5000
```

Make persistent:

```bash
sudo nano /etc/sysctl.d/10-network-buffers.conf
```

```ini
# Kernel receive queue size
net.core.netdev_max_backlog = 5000

# NIC budget per NAPI poll cycle - increase if still dropping under load
net.core.netdev_budget = 600
net.core.netdev_budget_usecs = 8000
```

```bash
sudo sysctl -p /etc/sysctl.d/10-network-buffers.conf
```

## Understanding NAPI and Interrupt Coalescing Interaction

Ring buffers interact closely with NAPI (New API) polling and interrupt coalescing. When the ring buffer fills up faster than NAPI drains it, drops occur even with large rings.

### Check Interrupt Coalescing Settings

```bash
ethtool -c eth0
```

Example output:

```
Coalesce parameters for eth0:
Adaptive RX: on  TX: off
...
rx-usecs: 50
rx-frames: 0
```

Adaptive coalescing adjusts interrupt rates automatically based on traffic. Enable it if not already on:

```bash
sudo ethtool -C eth0 adaptive-rx on
```

For latency-sensitive workloads, reduce coalescing at the cost of higher interrupt rate:

```bash
# Low latency - interrupt on every packet
sudo ethtool -C eth0 rx-usecs 0 rx-frames 1

# High throughput - batch more packets per interrupt
sudo ethtool -C eth0 rx-usecs 100 rx-frames 0
```

## Monitoring Ring Buffer Health

### Continuous Monitoring Script

```bash
sudo nano /usr/local/bin/monitor-ring-drops.sh
```

```bash
#!/bin/bash
# Monitor NIC drop counters every 5 seconds

IFACE="${1:-eth0}"
INTERVAL=5

echo "Monitoring $IFACE for ring buffer drops (Ctrl+C to stop)"
echo "---"

PREV_DROPS=0
while true; do
    CURR_DROPS=$(ethtool -S "$IFACE" 2>/dev/null | \
        grep -i -E 'missed|drop|fifo' | \
        awk -F: '{sum += $2} END {print sum}')

    DELTA=$((CURR_DROPS - PREV_DROPS))
    echo "$(date '+%H:%M:%S') Total drops: $CURR_DROPS (delta: +$DELTA)"

    PREV_DROPS=$CURR_DROPS
    sleep "$INTERVAL"
done
```

```bash
chmod +x /usr/local/bin/monitor-ring-drops.sh
sudo /usr/local/bin/monitor-ring-drops.sh eth0
```

### Using sar for Long-Term Tracking

```bash
sudo apt install sysstat

# Enable sysstat data collection
sudo systemctl enable --now sysstat

# View network statistics (includes drops)
sar -n DEV 1 10

# View from history
sar -n DEV -f /var/log/sysstat/sa$(date +%d)
```

## Trade-offs of Large Ring Buffers

Larger ring buffers absorb bursts but have downsides:

**Increased latency**: A full ring buffer means packets sit in queue longer before processing. For latency-sensitive applications (VoIP, trading systems), keep buffers smaller and fix the root cause of slow processing.

**Memory usage**: Each ring buffer slot pre-allocates memory. 4096 descriptors at 2KB each = 8MB per queue per interface. With multiple queues and interfaces, this adds up.

**Bufferbloat**: Very large buffers can mask congestion and increase RTT. For internet-facing interfaces, consider enabling CoDel or FQ-CoDel instead of simply increasing buffer sizes:

```bash
# Check current qdisc
tc qdisc show dev eth0

# Use FQ-CoDel for better latency under load
sudo tc qdisc replace dev eth0 root fq_codel
```

## Ring Buffer Size Recommendations

| Workload | RX Ring Size | TX Ring Size |
|----------|-------------|-------------|
| General server | 1024-2048 | 1024 |
| High-throughput database | 4096 (max) | 2048 |
| Latency-sensitive | 256-512 | 256 |
| Video streaming | 2048-4096 | 2048 |

## Summary

Network ring buffer tuning is a practical first step when dealing with packet drops on busy Ubuntu servers. Increasing RX ring buffer size reduces drops during traffic bursts, while pairing the change with NAPI budget and interrupt coalescing tuning gives a more complete solution. Always measure drop counters before and after changes, and monitor over time to confirm the fix holds under your actual traffic patterns.
