# How to Save tcpdump Captures to a PCAP File for Wireshark Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, PCAP, Wireshark, Packet Capture, Network Analysis

Description: Learn how to save tcpdump packet captures to PCAP files, manage file rotation for long captures, compress files for storage, and open them in Wireshark for detailed analysis.

## Why Save to PCAP?

Writing to PCAP files (instead of reading output in the terminal) allows:
- Opening captures in Wireshark for visual analysis
- Applying filters after capture without re-capturing
- Sharing captures with colleagues
- Long-running captures with automatic rotation
- Archiving network events for post-incident analysis

## Step 1: Save Capture to PCAP File

```bash
# Basic save to PCAP

sudo tcpdump -i eth0 -w /tmp/capture.pcap

# Save with filter (only interesting traffic)
sudo tcpdump -i eth0 -w /tmp/web-traffic.pcap 'port 80 or port 443'

# Save host traffic (-n skips name resolution for printed output; PCAP size is unchanged)
sudo tcpdump -i eth0 -n -w /tmp/capture.pcap host 192.168.1.50

# Limit capture to N packets then stop
sudo tcpdump -i eth0 -w /tmp/capture.pcap -c 1000

# Stop after duration (using timeout)
sudo timeout 60 tcpdump -i eth0 -w /tmp/capture-60s.pcap

# Verify file is valid PCAP
file /tmp/capture.pcap
# Output: /tmp/capture.pcap: pcap capture file, microsecond ts (little-endian)
```

## Step 2: Capture with File Rotation

```bash
# Rotate when file reaches 10MB (-C 10), keep 5 files (-W 5)
sudo tcpdump -i eth0 -w /tmp/capture.pcap -C 10 -W 5

# Files created: capture.pcap0, capture.pcap1, ..., capture.pcap4
# When capture.pcap4 is full, it overwrites capture.pcap0 (ring buffer)

# Rotate every 5 minutes (-G 300 seconds)
sudo tcpdump -i eth0 -w '/tmp/capture-%Y%m%d-%H%M%S.pcap' -G 300

# Files: capture-20261015-120000.pcap, capture-20261015-120500.pcap, ...

# Combine: rotate every 5 minutes, write 12 files (1 hour), then stop
sudo tcpdump -i eth0 \
    -w '/tmp/capture-%Y%m%d-%H%M%S.pcap' \
    -G 300 \
    -W 12 \
    'not port 22'    # Exclude SSH
```

## Step 3: Read and Filter PCAP Files

```bash
# Read PCAP and display
tcpdump -r /tmp/capture.pcap

# Read with tcpdump capture/BPF filter
tcpdump -r /tmp/capture.pcap 'host 192.168.1.50'
tcpdump -r /tmp/capture.pcap 'port 443'
tcpdump -r /tmp/capture.pcap -n 'tcp and dst 8.8.8.8'

# Extract subset to new PCAP (filter offline)
tcpdump -r /tmp/capture.pcap -w /tmp/filtered.pcap 'host 192.168.1.50 and port 443'

# Count packets matching filter
tcpdump -r /tmp/capture.pcap 'tcp[tcpflags] & tcp-rst != 0' | wc -l
```

## Step 4: Compress PCAP Files

```bash
# Compress immediately after capture
sudo tcpdump -i eth0 -w - 'port 80' | gzip > /tmp/capture.pcap.gz

# Read from compressed file
zcat /tmp/capture.pcap.gz | tcpdump -r - 'host 192.168.1.50'

# Compress existing PCAP
gzip /tmp/capture.pcap    # Creates capture.pcap.gz, removes original
gzip -k /tmp/capture.pcap  # -k keeps original file

# Check compression ratio
ls -lh /tmp/capture.pcap /tmp/capture.pcap.gz
```

## Step 5: Open in Wireshark

```bash
# Open PCAP in Wireshark (GUI)
wireshark /tmp/capture.pcap

# Open from remote server (copy first)
scp user@server:/tmp/capture.pcap /tmp/remote-capture.pcap
wireshark /tmp/remote-capture.pcap

# Open compressed file (Wireshark handles .pcap.gz when built with gzip/zlib support)
wireshark /tmp/capture.pcap.gz
```

```text
Wireshark workflow after opening PCAP:
1. Apply display filter: ip.addr == 192.168.1.50
2. Statistics → Conversations → TCP (see all connections)
3. Statistics → Protocol Hierarchy (traffic breakdown)
4. Follow → TCP Stream (right-click a packet)
5. File → Export Specified Packets (save subset)
```

## Step 6: Long-Running Capture Script

```bash
#!/bin/bash
# /usr/local/bin/continuous-capture.sh
# Continuous packet capture with rotation and retention management
# Run this script as root (for example: sudo /usr/local/bin/continuous-capture.sh)

INTERFACE="eth0"
CAPTURE_DIR="/var/captures"
MAX_AGE_HOURS=24
MAX_SIZE_GB=10
MAX_SIZE_KB=$((MAX_SIZE_GB * 1024 * 1024))

mkdir -p "$CAPTURE_DIR"

# Start capture with rotation
tcpdump -i "$INTERFACE" \
    -w "${CAPTURE_DIR}/capture-%Y%m%d-%H%M%S.pcap" \
    -G 300 \
    -n \
    'not (src net 127.0.0.0/8 or dst net 127.0.0.0/8)' &

TCPDUMP_PID=$!
echo "tcpdump started: PID $TCPDUMP_PID"
echo "$TCPDUMP_PID" > /var/run/tcpdump.pid

# Cleanup old files in background
while true; do
    # Remove files older than 24 hours
    find "$CAPTURE_DIR" -name "*.pcap" -mmin +$((MAX_AGE_HOURS * 60)) -delete

    # Remove oldest if over size limit
    while [ "$(du -sk "$CAPTURE_DIR" | cut -f1)" -gt "$MAX_SIZE_KB" ]; do
        oldest_file=$(ls -t "$CAPTURE_DIR"/*.pcap 2>/dev/null | tail -1)
        [ -n "$oldest_file" ] || break
        rm -f "$oldest_file"
    done

    sleep 300
done
```

## Step 7: Merge Multiple PCAP Files

```bash
# Merge multiple PCAP files into one (preserving time order)
# Install mergecap (part of Wireshark tools)
sudo apt-get install wireshark-common

# Merge all captures from today
mergecap -F pcap -w /tmp/merged.pcap /tmp/capture-*.pcap

# Merge with specific files
mergecap -F pcap -w /tmp/merged.pcap /tmp/capture1.pcap /tmp/capture2.pcap /tmp/capture3.pcap

# Verify merged file
tcpdump -r /tmp/merged.pcap | wc -l    # Count total packets
```

## Conclusion

Save tcpdump captures with `-w filename.pcap` for Wireshark analysis. Use `-C 10 -W 5` for size-based rotation and `-G 300` for time-based rotation during long captures. Filter offline with `tcpdump -r capture.pcap 'filter'` to apply different filters without recapturing. Compress with `tcpdump -w - | gzip` for storage efficiency. Use `mergecap` to combine multiple PCAP files into a single file for analysis.
