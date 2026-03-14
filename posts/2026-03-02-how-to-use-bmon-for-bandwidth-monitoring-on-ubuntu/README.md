# How to Use bmon for Bandwidth Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Bandwidth Monitoring, Bmon, System Administration

Description: Learn how to install and use bmon on Ubuntu to monitor network bandwidth usage in real-time, visualize traffic across multiple interfaces, and capture bandwidth data for analysis.

---

bmon (bandwidth monitor) is a real-time network bandwidth monitoring tool that displays traffic statistics for all network interfaces in a terminal. Unlike tools such as iftop which focus on per-connection traffic, bmon gives you an interface-level view with rate graphs, totals, and packet statistics. It's particularly useful when you need a quick visual overview of all network interfaces at once, or when you want to monitor traffic on a server without the overhead of packet capture.

## Installing bmon on Ubuntu

bmon is available in Ubuntu's package repositories:

```bash
# Install bmon
sudo apt-get update
sudo apt-get install -y bmon

# Verify installation
bmon --version
```

If it's not available in your Ubuntu version or you need the latest:

```bash
# Build from source
sudo apt-get install -y build-essential libconfuse-dev libnl-3-dev libnl-route-3-dev

git clone https://github.com/tgraf/bmon.git
cd bmon
autoreconf -i
./configure
make
sudo make install
```

## Basic Usage

Launch bmon with no arguments to see all network interfaces:

```bash
# Start bmon - shows all interfaces
bmon
```

The display shows:
- **Interface name** - Each detected network interface
- **RX/TX rate** - Current receive/transmit rate in bytes per second
- **Rate graph** - ASCII bar chart of recent traffic
- **Total** - Cumulative bytes received/transmitted since monitoring started
- **Packets** - Packet counts and rates

### Monitoring Specific Interfaces

```bash
# Monitor only eth0
bmon -p eth0

# Monitor eth0 and eth1
bmon -p eth0,eth1

# Monitor with wildcard (all eth* interfaces)
bmon -p "eth*"

# Monitor specific interfaces by pattern
bmon -p "ens*,eth*"  # Match both ens and eth naming schemes
```

### Display Options

```bash
# Show rates in bits per second instead of bytes
bmon -b

# Set update interval to 2 seconds (default is 1)
bmon -s 2

# Set display history to 30 seconds
bmon --histsize=30

# Start with a specific interface selected
bmon -p eth0
```

## Interactive Controls

While bmon is running, use these keyboard shortcuts:

- **Arrow keys** - Navigate between interfaces and details
- **d** - Toggle detailed view (show bytes vs packets)
- **g** - Toggle graph view
- **l** - Toggle list view
- **h** - Toggle help
- **q** - Quit bmon

## Output Modes

bmon supports different output modes beyond the interactive display.

### Plain Text Output

```bash
# Output in plain text format (useful for logging)
bmon -o plain

# Output plain text with specific interface
bmon -p eth0 -o plain

# Redirect to a file
bmon -p eth0 -o plain > /var/log/bandwidth-$(date +%Y%m%d).log
```

### ASCII Output for Scripts

```bash
# Output in a format suitable for parsing
bmon -o ascii

# Run for a specific duration and output
timeout 60 bmon -o ascii -p eth0 | tee /tmp/bandwidth-sample.txt
```

### CSV Output

```bash
# Output in CSV format for importing into spreadsheets or databases
bmon -o format:'$(element:name) $(attr:rxrate:bytes) $(attr:txrate:bytes)\n'

# Custom format with timestamp
bmon -o format:'$(ts) $(element:name) $(attr:rxrate:bytes) $(attr:txrate:bytes)\n'
```

## Capturing Bandwidth Statistics

For long-term monitoring or capacity planning, capture statistics to a file:

```bash
#!/bin/bash
# /usr/local/bin/capture-bandwidth.sh
# Captures bandwidth statistics at regular intervals

INTERFACE="${1:-eth0}"
OUTPUT_DIR="/var/log/bandwidth"
DATE=$(date +%Y%m%d)
LOG_FILE="$OUTPUT_DIR/bandwidth-$DATE.log"

mkdir -p "$OUTPUT_DIR"

echo "Timestamp,Interface,RX_Bytes/s,TX_Bytes/s,RX_Packets/s,TX_Packets/s" > "$LOG_FILE"

while true; do
    TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)

    # Read /proc/net/dev for statistics
    RX_BYTES_1=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $2}')
    TX_BYTES_1=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $10}')
    RX_PKTS_1=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $3}')
    TX_PKTS_1=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $11}')

    sleep 1

    RX_BYTES_2=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $2}')
    TX_BYTES_2=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $10}')
    RX_PKTS_2=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $3}')
    TX_PKTS_2=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $11}')

    # Calculate rates per second
    RX_RATE=$((RX_BYTES_2 - RX_BYTES_1))
    TX_RATE=$((TX_BYTES_2 - TX_BYTES_1))
    RX_PKTS=$((RX_PKTS_2 - RX_PKTS_1))
    TX_PKTS=$((TX_PKTS_2 - TX_PKTS_1))

    echo "$TIMESTAMP,$INTERFACE,$RX_RATE,$TX_RATE,$RX_PKTS,$TX_PKTS" >> "$LOG_FILE"
done
```

```bash
# Run in background
nohup /usr/local/bin/capture-bandwidth.sh eth0 &
```

## Monitoring Multiple Servers with bmon

For monitoring bandwidth across multiple servers from a single terminal, combine bmon with SSH:

```bash
#!/bin/bash
# Monitor bandwidth on remote servers using bmon via SSH

SERVERS=("web-01" "web-02" "db-01")
INTERFACE="eth0"

for SERVER in "${SERVERS[@]}"; do
    echo "=== $SERVER ==="
    # Get a 5-second bandwidth sample from the remote server
    ssh "$SERVER" "timeout 5 bmon -p $INTERFACE -o plain 2>/dev/null || \
        cat /proc/net/dev | grep $INTERFACE"
    echo ""
done
```

## Comparing bmon with Similar Tools

bmon occupies a specific niche among network monitoring tools:

```bash
# Install alternatives for comparison
sudo apt-get install -y iftop nethogs nload

# bmon - Interface-level traffic with graphs (all interfaces at once)
sudo bmon

# nload - Similar to bmon but focused on one interface at a time
sudo nload eth0

# iftop - Per-connection bandwidth monitoring (requires root)
sudo iftop -i eth0

# nethogs - Per-process bandwidth monitoring
sudo nethogs eth0
```

Choose based on your need:
- Use **bmon** when you want an overview of all interfaces simultaneously
- Use **nload** when you want a cleaner single-interface view with averages
- Use **iftop** when you need to see which remote IPs are consuming bandwidth
- Use **nethogs** when you need to identify which processes are consuming bandwidth

## Scripting Bandwidth Alerts

Trigger an alert when bandwidth exceeds a threshold:

```bash
#!/bin/bash
# /usr/local/bin/bandwidth-alert.sh
# Sends alert when bandwidth exceeds threshold

INTERFACE="eth0"
THRESHOLD_BYTES=$((100 * 1024 * 1024))  # 100 MB/s threshold
ALERT_WEBHOOK="${SLACK_WEBHOOK:-}"
CHECK_INTERVAL=5  # Check every 5 seconds

while true; do
    # Read current bytes
    RX_1=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $2}')
    TX_1=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $10}')

    sleep "$CHECK_INTERVAL"

    RX_2=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $2}')
    TX_2=$(grep "$INTERFACE:" /proc/net/dev | awk '{print $10}')

    # Calculate rate per second
    RX_RATE=$(( (RX_2 - RX_1) / CHECK_INTERVAL ))
    TX_RATE=$(( (TX_2 - TX_1) / CHECK_INTERVAL ))

    # Format for human reading
    RX_MBPS=$(echo "scale=1; $RX_RATE / 1048576" | bc)
    TX_MBPS=$(echo "scale=1; $TX_RATE / 1048576" | bc)

    # Check threshold
    if [[ "$RX_RATE" -gt "$THRESHOLD_BYTES" ]] || [[ "$TX_RATE" -gt "$THRESHOLD_BYTES" ]]; then
        MSG="High bandwidth alert on $(hostname): ${INTERFACE} RX: ${RX_MBPS} MB/s, TX: ${TX_MBPS} MB/s"
        echo "$(date): ALERT - $MSG"

        if [[ -n "$ALERT_WEBHOOK" ]]; then
            curl -s -X POST "$ALERT_WEBHOOK" \
                -H "Content-Type: application/json" \
                -d "{\"text\": \"$MSG\"}"
        fi
    fi
done
```

Run as a systemd service:

```ini
# /etc/systemd/system/bandwidth-alert.service
[Unit]
Description=Bandwidth Alert Monitor
After=network.target

[Service]
ExecStart=/usr/local/bin/bandwidth-alert.sh
Environment=SLACK_WEBHOOK=https://hooks.slack.com/services/xxx/yyy/zzz
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Quick Reference

```bash
# Monitor all interfaces (default)
bmon

# Monitor specific interface with bit display
bmon -p eth0 -b

# Run for exactly 30 seconds and output statistics
timeout 30 bmon -o plain -p eth0

# Show current bandwidth in a simple one-liner using /proc
awk 'NR==3{rx=$2; tx=$10} END{print "RX:", rx/1024/1024 "MB, TX:", tx/1024/1024 "MB"}' /proc/net/dev

# Check cumulative bytes since boot for an interface
cat /proc/net/dev | grep eth0 | awk '{printf "RX: %.2f GB, TX: %.2f GB\n", $2/1073741824, $10/1073741824}'
```

bmon gives you a clean, low-overhead way to see what's happening on your network interfaces at a glance. For server environments where you need to spot unexpected traffic spikes or verify that bandwidth-intensive operations are completing as expected, it's one of the most useful tools to have in your monitoring toolkit.
