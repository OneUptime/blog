# How to Save tcpdump Captures to PCAP Files for Later Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, PCAP, Wireshark, Linux, Packet Capture, Networking

Description: Save tcpdump network captures to PCAP files for offline analysis, sharing with colleagues, or loading into Wireshark for visual inspection.

Saving captures to PCAP files lets you capture on a headless server, then analyze the data on your workstation with Wireshark. It also enables reproducible analysis - you can run filters against the same capture multiple times.

## Write to a PCAP File

```bash
# Save capture to file (Ctrl+C to stop)

sudo tcpdump -i eth0 -w /tmp/capture.pcap

# Save with filter (capture only HTTP/HTTPS)
sudo tcpdump -i eth0 'tcp and (port 80 or port 443)' -w /tmp/web-traffic.pcap

# Capture with the default 262144-byte snapshot length
sudo tcpdump -i eth0 -s 0 -w /tmp/full-capture.pcap

# Capture with packet limit (stop after 1000 packets)
sudo tcpdump -i eth0 -c 1000 -w /tmp/1000-packets.pcap

# Capture for a fixed time using timeout command
sudo timeout 60 tcpdump -i eth0 -w /tmp/60sec-capture.pcap
```

## Read Back a PCAP File

```bash
# Read a saved capture
sudo tcpdump -r /tmp/capture.pcap

# Read with numeric output (no DNS)
sudo tcpdump -nn -r /tmp/capture.pcap

# Apply a filter when reading
sudo tcpdump -nn -r /tmp/capture.pcap 'tcp and port 80'

# Verbose read
sudo tcpdump -nn -v -r /tmp/capture.pcap
```

## PCAP File Rotation

For long-running captures, rotate files to prevent single huge files:

```bash
# Rotate every 100MB, keep 5 files
sudo tcpdump -i eth0 -C 100 -W 5 -w /tmp/capture.pcap
# Creates: capture.pcap0, capture.pcap1, ... capture.pcap4

# Rotate every 60 seconds, stop after 10 files
sudo tcpdump -i eth0 -G 60 -W 10 -w /tmp/capture-%Y%m%d-%H%M%S.pcap
# Creates timestamped files: capture-20260319-101500.pcap

# Both size and time rotation (whichever triggers first)
sudo tcpdump -i eth0 -C 50 -G 300 -w /tmp/capture-%Y%m%d-%H%M%S.pcap
```

## Compress Captures to Save Space

```bash
# Pipe through gzip (loses ability to use -C/-W rotation)
sudo tcpdump -i eth0 -w - | gzip > /tmp/capture.pcap.gz

# Read compressed capture
gunzip -c /tmp/capture.pcap.gz | sudo tcpdump -nn -r -

# Alternatively, compress after capture:
sudo tcpdump -i eth0 -w /tmp/capture.pcap
gzip /tmp/capture.pcap
# Produces capture.pcap.gz
```

## Copy PCAP to Workstation for Wireshark Analysis

```bash
# Capture on remote server
sudo tcpdump -i eth0 -w /tmp/server-capture.pcap 'not port 22'

# Copy to local machine
scp user@server:/tmp/server-capture.pcap ./

# Or stream directly to Wireshark on your workstation:
ssh user@server sudo tcpdump -i eth0 -w - 'not port 22' | wireshark -k -i -
```

## Merge Multiple PCAP Files

```bash
# Install mergecap (part of Wireshark tools)
sudo apt install wireshark-common -y

# Merge captures from multiple interfaces or time windows
mergecap -w /tmp/merged.pcapng /tmp/capture1.pcap /tmp/capture2.pcap

# Filter and merge
mergecap -w - /tmp/capture1.pcap /tmp/capture2.pcap | \
  tcpdump -r - -w /tmp/filtered-merged.pcap 'tcp and port 80'
```

Saving to PCAP gives you a replayable record of network activity - essential for post-incident investigation, reproducing bugs, and detailed protocol analysis in Wireshark.
