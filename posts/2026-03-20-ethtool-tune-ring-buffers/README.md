# How to Use ethtool to Tune Network Interface Ring Buffers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ethtool, Ring Buffer, Linux, Network Performance, NIC Tuning

Description: Learn how to use ethtool to view and increase NIC ring buffer sizes, preventing packet drops under high traffic bursts on Linux servers.

## What Are Ring Buffers?

A NIC ring buffer (also called a descriptor ring) is a circular queue between the NIC hardware and the kernel. Incoming packets are placed in the receive ring; outgoing packets are placed in the transmit ring.

If the ring fills up because the CPU can't drain it fast enough, packets are dropped at the NIC level - before they ever reach the kernel TCP stack. This is a common cause of packet loss on high-traffic servers.

## Step 1: Check Current Ring Buffer Sizes

```bash
# View current and maximum ring buffer sizes
# Replace eth0 with your actual interface name, for example enp2s0

ethtool -g eth0

# Output:
# Ring parameters for eth0:
# Pre-set maximums:
# RX:          4096     <- hardware maximum for receive ring
# RX Mini:     0
# RX Jumbo:    0
# TX:          4096     <- hardware maximum for transmit ring
#
# Current hardware settings:
# RX:          256      <- current receive ring size (often default)
# RX Mini:     0
# RX Jumbo:    0
# TX:          256      <- current transmit ring size

# If Current < Pre-set maximums, you can increase it
```

## Step 2: Check for Ring Buffer Drops

```bash
# Check standard per-interface drop/error counters
ip -s -s link show dev eth0

# Check driver-exposed counters; names vary by NIC/driver
ethtool -S eth0 | grep -Ei 'drop|missed|buffer|fifo'

# Common counters and what they usually mean:
# rx_missed_errors: packets the device missed because host buffers were not available
# rx_fifo_errors: receive FIFO / buffer overrun errors
# tx_fifo_errors: transmit FIFO underrun / underflow errors

# RX/TX dropped in ip output are interface-level counters and are not specific to ring exhaustion
```

## Step 3: Increase Ring Buffer Sizes

```bash
# Example: if step 1 showed 4096 as the RX/TX maximum, set both to 4096
ethtool -G eth0 rx 4096 tx 4096

# Verify change applied
ethtool -g eth0 | grep "Current hardware" -A5
```

## Step 4: Monitor Drop Counters Over Time

```bash
# Watch driver counters in real time while generating traffic
watch -n 1 "ethtool -S eth0 | grep -Ei 'drop|missed|buffer|fifo'"

# Use sar to track interface drop/error counters over time
sar -n EDEV 1 60

# Output:
# Average:     IFACE    rxerr/s  txerr/s  coll/s  rxdrop/s  txdrop/s  txcarr/s  rxfram/s  rxfifo/s  txfifo/s
# Average:      eth0       0.00     0.00    0.00     5.23      0.00      0.00      0.00      0.00      0.00
# rxdrop/s > 0 means the interface/kernel is dropping packets; correlate with ethtool or ip counters to confirm ring pressure
```

## Step 5: Tune Ring Buffer Sizes for Latency vs Throughput

Large ring buffers can reduce drops during bursts, but they can also increase latency (more buffering = more queuing delay). For latency-sensitive workloads:

```bash
# Balance ring size vs latency
# Example sizes only; use values supported by ethtool -g on your NIC
# For latency-sensitive (gaming, HFT, real-time control):
ethtool -G eth0 rx 256 tx 256

# For throughput-optimized (file transfer, backup, media):
ethtool -G eth0 rx 4096 tx 4096

# For mixed workloads:
ethtool -G eth0 rx 1024 tx 1024
```

## Step 6: Make Ring Buffer Settings Persistent

```bash
# Method 1: udev rule
# Replace eth0 and 4096/4096 with your actual interface name and supported ring sizes
cat > /etc/udev/rules.d/99-ring-buffer.rules << 'EOF'
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth0", \
  RUN+="/usr/sbin/ethtool -G %k rx 4096 tx 4096"
EOF

# Method 2: Systemd service
# Replace eth0 and 4096/4096 with your actual interface name and supported ring sizes
cat > /etc/systemd/system/ring-buffer-tuning.service << 'EOF'
[Unit]
Description=Set NIC ring buffer sizes
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/ethtool -G eth0 rx 4096 tx 4096
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable ring-buffer-tuning

# Example loop for multiple interfaces; use it in a boot-time script or the service above
for iface in eth0 eth1; do
  /usr/sbin/ethtool -G "$iface" rx 4096 tx 4096 2>/dev/null && echo "$iface: ring buffer set"
done
```

## Step 7: Check Other ethtool Tuning Options

```bash
# Check and set coalescing (interrupt aggregation)
ethtool -c eth0

# Increase coalescing to reduce interrupt rate (improves throughput at cost of latency)
ethtool -C eth0 rx-usecs 50 tx-usecs 50

# Check driver information
ethtool -i eth0

# Check link speed and duplex
ethtool eth0 | grep -E "Speed|Duplex|Auto"
```

## Conclusion

NIC ring buffer drops are a silent source of packet loss on busy servers. Check both standard interface counters with `ip -s -s link show dev eth0` and driver counters with `ethtool -S eth0`, increase ring size toward the hardware maximum reported by `ethtool -g`, and monitor with `sar -n EDEV`. Persist settings in udev rules or a systemd service. For latency-sensitive workloads, balance ring size with coalescing settings to avoid excessive queuing delay.
