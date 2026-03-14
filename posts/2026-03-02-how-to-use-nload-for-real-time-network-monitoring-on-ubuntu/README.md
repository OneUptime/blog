# How to Use nload for Real-Time Network Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Network Monitoring, Nload, System Administration

Description: Learn how to install and use nload on Ubuntu to monitor incoming and outgoing network traffic in real-time, with graphs, statistics, and device switching for server bandwidth analysis.

---

nload is a terminal-based network traffic monitor that shows incoming and outgoing traffic for a network interface using real-time ASCII graphs and summary statistics. It's simpler than iftop (no per-connection detail) but more focused than generic system monitors - just a clean, continuous view of bandwidth consumption on the interface you care about. For servers where you want to quickly check if traffic is flowing normally or track peak bandwidth during specific operations, nload provides exactly the right level of detail.

## Installing nload on Ubuntu

```bash
# Install nload from the Ubuntu repositories
sudo apt-get update
sudo apt-get install -y nload

# Verify installation
nload --version
```

## Basic Usage

Run nload with no arguments to start monitoring the default interface:

```bash
# Monitor the default network interface
nload
```

The display is split into two sections:
- **Incoming** (top half) - Traffic received by the interface
- **Outgoing** (bottom half) - Traffic sent from the interface

Each section shows:
- **ASCII graph** - Visual representation of traffic over time
- **Current** - Current transfer rate
- **Average** - Average rate since monitoring started
- **Min** - Minimum observed rate
- **Max** - Maximum observed rate
- **Ttl** - Total bytes transferred

### Monitoring a Specific Interface

```bash
# Monitor eth0 specifically
nload eth0

# Monitor ens3 (common on newer Ubuntu systems)
nload ens3

# Monitor a virtual interface (useful for VPN monitoring)
nload tun0

# Monitor loopback (for local IPC traffic analysis)
nload lo
```

### Switching Interfaces While Running

nload lets you switch between interfaces without restarting:

- **Left/Right arrow keys** or **Page Up/Down** - Switch between network interfaces
- **F2 or Enter** - Open the settings screen
- **F5** - Refresh the display
- **q or Ctrl+C** - Quit

## Command-Line Options

nload accepts several useful flags:

```bash
# Set update interval to 500ms (default is 500ms)
nload -t 500 eth0

# Set update interval to 2 seconds for slower updates
nload -t 2000 eth0

# Set the traffic amount unit displayed (bit, Bit, byte, Byte)
# Display in Megabits per second
nload -u M eth0

# Set graph data unit (bit or byte)
nload -U M eth0

# Multiple units at once
nload -u M -U M eth0  # Show Mbit/s

# Set the size of the traffic window in seconds
# (how much history the graph shows)
nload -a 300 eth0  # 5-minute history window

# Monitor multiple devices at once (shown sequentially)
nload eth0 eth1 lo
```

## Understanding the Statistics

The statistics nload shows come from `/proc/net/dev`, which is the kernel's network interface statistics. This means:

- **Current** - Rate calculated over the last measurement interval
- **Average** - Mean rate since nload started (weighted by time)
- **Min/Max** - Extremes since nload started
- **Ttl** - Cumulative total (resets when nload restarts or kernel resets the counter)

```bash
# You can view the same raw data nload uses
cat /proc/net/dev

# Or use ip command for current stats
ip -s link show eth0
```

## Interpreting Traffic Patterns

### Normal Traffic Pattern

A web server under light load shows intermittent spikes in outgoing traffic (serving requests) and small amounts of incoming traffic (receiving requests):

```text
Device eth0 [192.168.1.100] (1 of 1):
==============================================================
Incoming:
                        ...  .  .  . ..  .    .  .
                 ████████████████████████████████████
Curr: 2.45 MBit/s   Avg: 1.23 MBit/s   Min: 0.00 Bit/s   Max: 8.91 MBit/s   Ttl: 2.45 GByte
Outgoing:
    .   .  . .   .    .  .  .  .  . .   .  .  .   .
    ████████████████████████████████████
Curr: 543.21 KBit/s  Avg: 298.45 KBit/s  Min: 0.00 Bit/s  Max: 1.23 MBit/s  Ttl: 892.34 MByte
```

### Identifying Issues

**High sustained outgoing traffic** with low incoming could indicate:
- A running backup job
- Log shipping to a central server
- Data exfiltration (if unexpected)

**High incoming, low outgoing** might mean:
- Large file downloads/package updates
- Data pipeline receiving data
- Potential DDoS amplification attack

**Symmetrically high traffic** suggests:
- Active bidirectional transfer (rsync, database replication)
- Video conferencing or VPN traffic

## Comparing nload with Alternatives

```bash
# Install alternatives to understand when to use each
sudo apt-get install -y bmon iftop nethogs

# nload: Single interface, clean RX/TX graphs with stats
nload eth0

# bmon: All interfaces simultaneously, more detailed graphs
bmon

# iftop: Per-connection view (who's talking to whom)
sudo iftop -i eth0

# nethogs: Per-process view (which program is using bandwidth)
sudo nethogs eth0
```

When to choose nload:
- You know which interface to watch and want minimal overhead
- You want averages and totals in addition to current rate
- You need a simple graph without connection-level detail
- You're monitoring a server without X11/GUI

## Scripting with nload Data

nload doesn't have a direct output mode for scripting, but you can read the same data source it uses:

```bash
#!/bin/bash
# /usr/local/bin/bandwidth-stats.sh
# Reports current and average bandwidth for a network interface

INTERFACE="${1:-eth0}"
INTERVAL=5  # Seconds between samples

echo "Monitoring $INTERFACE (press Ctrl+C to stop)"
echo "Timestamp,Interface,RX_Mbps,TX_Mbps,RX_Total_MB,TX_Total_MB"

while true; do
    # Read bytes at start of interval
    read -r _ _ RX_BYTES_1 _ _ _ _ _ _ TX_BYTES_1 _ < \
        <(grep "${INTERFACE}:" /proc/net/dev)

    sleep "$INTERVAL"

    # Read bytes at end of interval
    read -r _ _ RX_BYTES_2 _ _ _ _ _ _ TX_BYTES_2 _ < \
        <(grep "${INTERFACE}:" /proc/net/dev)

    # Calculate rates and totals
    RX_RATE=$(echo "scale=2; ($RX_BYTES_2 - $RX_BYTES_1) * 8 / $INTERVAL / 1000000" | bc)
    TX_RATE=$(echo "scale=2; ($TX_BYTES_2 - $TX_BYTES_1) * 8 / $INTERVAL / 1000000" | bc)
    RX_TOTAL=$(echo "scale=2; $RX_BYTES_2 / 1048576" | bc)
    TX_TOTAL=$(echo "scale=2; $TX_BYTES_2 / 1048576" | bc)

    TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
    echo "$TIMESTAMP,$INTERFACE,${RX_RATE},${TX_RATE},${RX_TOTAL},${TX_TOTAL}"
done
```

```bash
# Run and log to file
/usr/local/bin/bandwidth-stats.sh eth0 > /var/log/bandwidth/$(date +%Y%m%d).csv
```

## Setting Up nload for Remote Monitoring

Check bandwidth on remote servers using SSH:

```bash
# Check bandwidth on a remote server
ssh ubuntu@web-server-01 "nload -t 1000 -a 60 eth0"

# Get a 10-second snapshot from a remote server
ssh ubuntu@web-server-01 "timeout 10 nload -t 1000 eth0 2>&1"

# Script to check bandwidth on multiple servers
for SERVER in web-01 web-02 db-01; do
    echo "=== $SERVER ==="
    ssh "$SERVER" "ip -s link show eth0 | grep -A1 RX | tail -1; ip -s link show eth0 | grep -A1 TX | tail -1"
    echo ""
done
```

## Useful One-Liners

```bash
# Show current RX/TX rate for eth0 without starting nload
(cat /proc/net/dev; sleep 1; cat /proc/net/dev) | \
    grep "eth0:" | \
    awk 'NR==1{rx1=$2;tx1=$10} NR==2{printf "RX: %.2f Mbit/s, TX: %.2f Mbit/s\n", ($2-rx1)*8/1000000, ($10-tx1)*8/1000000}'

# Check if traffic is above threshold (for scripts)
check_bandwidth() {
    local IFACE="${1:-eth0}"
    local THRESHOLD_MBIT="${2:-100}"

    read -r _ _ RX1 _ _ _ _ _ _ TX1 _ < <(grep "${IFACE}:" /proc/net/dev)
    sleep 1
    read -r _ _ RX2 _ _ _ _ _ _ TX2 _ < <(grep "${IFACE}:" /proc/net/dev)

    RX_MBIT=$(echo "scale=0; ($RX2 - $RX1) * 8 / 1000000" | bc)
    TX_MBIT=$(echo "scale=0; ($TX2 - $TX1) * 8 / 1000000" | bc)

    echo "RX: ${RX_MBIT} Mbit/s, TX: ${TX_MBIT} Mbit/s"
    [[ $RX_MBIT -gt $THRESHOLD_MBIT ]] || [[ $TX_MBIT -gt $THRESHOLD_MBIT ]]
}

# Returns 0 (success) if traffic exceeds threshold
if check_bandwidth eth0 50; then
    echo "High bandwidth detected"
fi
```

## nload vs bmon: When to Use Which

Both tools monitor network interfaces with real-time graphs. The key differences:

- **nload** focuses on one interface at a time with a cleaner display and more detailed statistics (current/avg/min/max/total). Better when you know exactly which interface you care about.
- **bmon** shows all interfaces simultaneously in a more compact view. Better for servers with multiple interfaces where you need a quick overview.

For quick checks during troubleshooting sessions on single-interface servers - which describes most EC2 instances and VMs - nload's focused display and detailed statistics make it the more practical choice.
