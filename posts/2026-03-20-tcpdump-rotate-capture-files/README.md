# How to Rotate tcpdump Capture Files Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, PCAP, Linux, Networking, Monitoring, File Management

Description: Configure tcpdump to automatically rotate capture files based on size or time intervals to enable long-running captures without filling disk space.

Long-running captures without rotation create single huge files that are hard to analyze and can fill disk space. tcpdump's built-in rotation options create manageable file segments; use `-W` with size rotation, repeating time-based filenames, or cleanup jobs to control retention.

## Rotate by File Size

Use `-C` to rotate when a capture file reaches a specific size:

```bash
# Rotate when each file reaches 100 MB, keep last 5 files

sudo tcpdump -i eth0 -C 100 -W 5 -w /tmp/capture.pcap

# Creates files: capture.pcap0, capture.pcap1, capture.pcap2...
# After capture.pcap4, wraps back to capture.pcap0 (circular buffer)

# Rotate at 50 MB, keep last 10 files
sudo tcpdump -i eth0 -C 50 -W 10 -Z root -w /var/pcap/capture.pcap

# The -C value is in MEGABYTES (not bytes)
```

## Rotate by Time Interval

Use `-G` to rotate every N seconds:

```bash
# Rotate every 60 seconds (1 minute)
sudo tcpdump -i eth0 -G 60 -w /tmp/capture-%Y%m%d-%H%M%S.pcap

# The %Y%m%d-%H%M%S format creates timestamped filenames:
# capture-20260319-101500.pcap
# capture-20260319-101600.pcap

# Rotate every 5 minutes (300 seconds)
sudo tcpdump -i eth0 -G 300 -w /tmp/capture-%Y%m%d-%H%M.pcap

# Rotate every hour, overwrite the same 24 hourly files
sudo tcpdump -i eth0 -G 3600 -w /tmp/capture-%H.pcap
```

## Combine Size and Time Rotation

Both `-C` and `-G` can be used together - files rotate when EITHER condition is met. Use cleanup separately for retention because `-W` is ignored for retention when both options are combined:

```bash
# Rotate at 100 MB or 15 minutes
sudo tcpdump -i eth0 -C 100 -G 900 -w /tmp/capture-%Y%m%d-%H%M%S.pcap
```

## Run as a Service for Continuous Capture

```bash
# Create a systemd service for continuous background capture
sudo tee /etc/systemd/system/tcpdump-continuous.service << 'EOF'
[Unit]
Description=Continuous tcpdump capture with rotation
After=network.target

[Service]
# Rotate every 10 minutes, overwrite the same 144 time-slot files each day
ExecStart=tcpdump -i eth0 \
    -G 600 -Z root \
    -w /var/pcap/capture-%%H%%M.pcap \
    -n 'not port 22'
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo mkdir -p /var/pcap
sudo systemctl enable tcpdump-continuous
sudo systemctl start tcpdump-continuous
```

## Manage Disk Space

```bash
# Monitor disk usage of capture directory
du -sh /var/pcap/
df -h /var/pcap/

# Delete captures older than 24 hours
find /var/pcap/ -name "*.pcap" -mmin +1440 -delete

# Create a cron job for automatic cleanup
echo "0 * * * * root find /var/pcap/ -name '*.pcap' -mmin +1440 -delete" \
  | sudo tee /etc/cron.d/cleanup-pcap
```

## Analyze Recent Capture Files

```bash
# List capture files sorted by time
ls -lt /var/pcap/*.pcap | head -10

# Read the most recent capture
LATEST=$(ls -t /var/pcap/*.pcap | head -1)
sudo tcpdump -nn -r "$LATEST" | head -50

# Search across all recent captures for a specific IP
for f in $(ls -t /var/pcap/*.pcap | head -12); do
    echo "=== $f ==="
    sudo tcpdump -nn -r "$f" 'host 1.2.3.4' | head -5
done
```

Automatic rotation with `-C` and `-G` transforms tcpdump from a manual analysis tool into a continuous network recorder, essential for forensic investigations and baseline traffic analysis.
