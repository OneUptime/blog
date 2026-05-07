# How to Use journald Events Logger with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, journald, Systemd, Logging

Description: Learn how to use the journald events logger with Podman to store and query container events through the systemd journal.

---

> The journald backend gives Podman events the full power of systemd journal - structured logging, efficient storage, and rich query capabilities.

On systems running systemd, Podman can store container events in the systemd journal using the journald backend. This gives you access to journald's powerful querying, filtering, and retention features for container events. This guide covers how to configure, use, and get the most out of the journald events logger in Podman.

---

## Enabling the journald Backend

The current default depends on the platform, so verify that `journald` is active.

```bash
# Check current events logger

podman info --format '{{.Host.EventLogger}}'
```

If it shows something other than `journald`, configure it:

```bash
# Create user config directory if needed
mkdir -p ~/.config/containers/

# Set journald as the events logger
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
events_logger = "journald"
EOF

# Verify the change
podman info --format '{{.Host.EventLogger}}'
```

## Generating Events for Testing

Start by generating some container events to work with.

```bash
# Create several containers to generate events
podman run --rm --name journald-test-1 alpine echo "first container"
podman run --rm --name journald-test-2 alpine echo "second container"
podman run -d --name journald-test-3 alpine sleep 300
podman stop journald-test-3
podman rm journald-test-3
```

## Querying Events with podman events

The standard `podman events` command works with journald as the backend.

```bash
# View recent events
podman events --since 5m

# View events in JSON format
podman events --since 5m --format json

# Filter by event type
podman events --since 5m --filter event=start
```

## Querying Events with journalctl

The journald backend stores events in the systemd journal, so you can use `journalctl` directly. For rootless Podman, the `--user` examples below require persistent user journals to be enabled.

```bash
# View all Podman events in the user journal
journalctl --user -t podman --since "5 minutes ago"

# View Podman events in the system journal (rootful mode)
# sudo journalctl -t podman --since "5 minutes ago"

# Show only the message field for cleaner output
journalctl --user -t podman --since "5 minutes ago" -o cat

# Output as JSON for parsing
journalctl --user -t podman --since "5 minutes ago" -o json
```

## Advanced journalctl Queries

journalctl provides powerful filtering beyond what `podman events` offers natively.

```bash
# View events from today only
journalctl --user -t podman --since today

# View events from a specific time range
journalctl --user -t podman \
    --since "2026-03-18 08:00:00" \
    --until "2026-03-18 18:00:00"

# Follow events in real-time (like tail -f)
journalctl --user -t podman -f

# Show the last 20 events
journalctl --user -t podman -n 20

# Reverse order (newest first)
journalctl --user -t podman -r -n 10
```

## Filtering journald Events by Fields

journald stores structured data that you can filter on.

```bash
# Filter by specific fields in the journal
journalctl --user -t podman PODMAN_EVENT=start
journalctl --user -t podman PODMAN_EVENT=died

# View available fields for Podman events
journalctl --user -t podman -o json | head -1 | jq 'keys'
```

## journald Storage and Retention

Configure how long journald retains Podman events.

```bash
# Check current journal disk usage
journalctl --disk-usage

# View journal retention settings
# Settings are in /etc/systemd/journald.conf
# Drop-in overrides are in /etc/systemd/journald.conf.d/*.conf

# Show any explicitly configured size or retention limits
grep -E '^(SystemMaxUse|SystemMaxFileSize|RuntimeMaxUse|RuntimeMaxFileSize|MaxRetentionSec)=' \
    /etc/systemd/journald.conf /etc/systemd/journald.conf.d/*.conf 2>/dev/null
```

Configure retention for journald:

```bash
# Create a journald drop-in directory
sudo mkdir -p /etc/systemd/journald.conf.d/

# Set retention limits
sudo tee /etc/systemd/journald.conf.d/podman-events.conf > /dev/null << 'EOF'
[Journal]
# Maximum disk space for journal files
SystemMaxUse=500M
# Maximum size of individual journal files
SystemMaxFileSize=50M
# How long to keep journal entries
MaxRetentionSec=30day
EOF

# Apply the updated journald settings
sudo systemctl restart systemd-journald
```

## Exporting journald Events

Export Podman events from the journal in various formats.

```bash
# Export as JSON lines
journalctl --user -t podman --since today -o json > /tmp/podman-events.json

# Export in verbose format with all fields
journalctl --user -t podman --since today -o verbose > /tmp/podman-events-verbose.txt

# Export in short format for quick review
journalctl --user -t podman --since today -o short > /tmp/podman-events.txt

# Count events by type
journalctl --user -t podman --since today -o json | \
    jq -r '.PODMAN_EVENT // .MESSAGE' | sort | uniq -c | sort -rn
```

## Building a journald Event Report

```bash
#!/bin/bash
# journald-report.sh - Generate Podman event report from journald

SINCE="${1:-today}"

echo "=== Podman Events Report ==="
echo "Period: since ${SINCE}"
echo "Generated: $(date)"
echo ""

# Total event count
total=$(journalctl --user -t podman --since "$SINCE" --no-pager | wc -l)
echo "Total events: ${total}"
echo ""

# Events by hour
echo "Events by hour:"
journalctl --user -t podman --since "$SINCE" -o short-iso --no-pager | \
    awk '{print substr($1,1,13)}' | sort | uniq -c

echo ""
echo "Recent 10 events:"
journalctl --user -t podman -n 10 --no-pager -o cat
```

## Troubleshooting journald Backend

```bash
# Check if journald is running
systemctl status systemd-journald

# Verify Podman can write to the journal
logger -t podman "test message"
journalctl -t podman -n 1

# Check for journal errors
journalctl --verify 2>&1 | tail -5

# If events are missing, check if the backend is correctly set
podman info --format '{{.Host.EventLogger}}'
```

## Cleanup

```bash
# Remove any remaining test containers
podman rm -f journald-test-3 2>/dev/null
```

## Summary

The journald events logger backend integrates Podman events with the systemd journal, giving you access to structured logging, powerful querying with journalctl, configurable retention policies, and multiple export formats. For systems running systemd, journald is the recommended backend as it provides the most mature and feature-rich event storage solution. Whether you need real-time event monitoring, historical analysis, or event export for external systems, the journald backend has you covered.
