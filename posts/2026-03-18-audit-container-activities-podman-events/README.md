# How to Audit Container Activities with Podman Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Auditing, Event, Compliance

Description: Learn how to audit container activities using Podman events to maintain security compliance and track all container operations.

---

> A complete audit trail of container activities is not optional in regulated environments - it is a compliance requirement.

Container auditing is essential for security compliance, incident forensics, and operational governance. Podman events provide a built-in mechanism to track container operations, from creation and execution to removal. This guide shows you how to build a comprehensive container audit system using Podman events.

---

## What to Audit

Container auditing should capture several categories of activity:

```bash
# Lifecycle events - created, started, stopped, and removed containers

podman events --filter type=container --since 24h --stream=false

# Image events - what images were pulled or modified
podman events --filter type=image --since 24h --stream=false

# Exec events - when commands were run inside containers
podman events --filter event=exec --since 24h --stream=false

# Volume events - what storage was provisioned
podman events --filter type=volume --since 24h --stream=false
```

## Setting Up an Audit Log

Create a dedicated audit log that captures all Podman events in JSON Lines format.

```bash
#!/bin/bash
# setup-audit.sh - Set up Podman event auditing

AUDIT_DIR="/var/log/podman-audit"
mkdir -p "$AUDIT_DIR"

echo "Starting Podman audit logger..."
echo "Audit directory: ${AUDIT_DIR}"

# Create a date-stamped audit log
DATE=$(date '+%Y-%m-%d')
AUDIT_LOG="${AUDIT_DIR}/audit-${DATE}.jsonl"

# Stream all events to the audit log in JSON format
podman events --format json >> "$AUDIT_LOG" &
AUDIT_PID=$!

echo "Audit logger started with PID: ${AUDIT_PID}"
echo "$AUDIT_PID" > "${AUDIT_DIR}/audit.pid"
```

## Auditing Container Creation

Track when containers are created and which image they use.

```bash
# Monitor all container creations
podman events --filter event=create --format json | \
while IFS= read -r event; do
    name=$(echo "$event" | jq -r '.Name // "unnamed"')
    image=$(echo "$event" | jq -r '.Image // "unknown"')
    timestamp=$(echo "$event" | jq -r '.Time')

    echo "[AUDIT] Container created: ${name}"
    echo "  Image: ${image}"
    echo "  Time: ${timestamp}"
    echo "  Full event: ${event}" >> /tmp/audit-creates.jsonl
done
```

## Auditing Container Exec Operations

Exec events are critical for security - they show when a command is run inside a container.

```bash
# Start a container for testing exec auditing
podman run -d --name audit-target alpine sleep 600

# In another terminal, monitor exec events
podman events --filter event=exec --format json | \
while IFS= read -r event; do
    name=$(echo "$event" | jq -r '.Name')
    timestamp=$(echo "$event" | jq -r '.Time')
    echo "[SECURITY AUDIT] Exec detected on container: ${name} at ${timestamp}"
done

# Trigger exec events
podman exec audit-target whoami
podman exec audit-target ls /etc/passwd
podman exec audit-target cat /etc/hostname
```

## Building a Comprehensive Audit Report

```bash
#!/bin/bash
# audit-report.sh - Generate a comprehensive container audit report
# Usage: ./audit-report.sh [hours-back]

HOURS="${1:-24}"
REPORT_FILE="/tmp/podman-audit-report-$(date '+%Y%m%d-%H%M%S').txt"

{
    echo "============================================"
    echo "  Podman Container Audit Report"
    echo "  Period: Last ${HOURS} hours"
    echo "  Generated: $(date)"
    echo "============================================"
    echo ""

    # Summary statistics
    echo "--- Summary ---"
    total=$(podman events --since "${HOURS}h" --stream=false --format json 2>/dev/null | wc -l)
    echo "Total events: ${total}"
    echo ""

    # Container lifecycle summary
    echo "--- Container Lifecycle ---"
    echo "Created:"
    podman events --since "${HOURS}h" --stream=false --filter event=create --format json 2>/dev/null | \
        jq -r '"  \(.Time) - \(.Name // "unnamed") (\(.Image // "unknown"))"'

    echo "Removed:"
    podman events --since "${HOURS}h" --stream=false --filter event=remove --format json 2>/dev/null | \
        jq -r '"  \(.Time) - \(.Name // "unnamed")"'

    echo ""
    echo "--- Container Deaths ---"
    podman events --since "${HOURS}h" --stream=false --filter event=died --format json 2>/dev/null | \
        jq -r '"  \(.Time) - \(.Name // "unnamed") (exit: \(.ContainerExitCode // "unknown"))"'

    echo ""
    echo "--- Exec Operations ---"
    exec_count=$(podman events --since "${HOURS}h" --stream=false --filter event=exec --format json 2>/dev/null | wc -l)
    echo "Total exec operations: ${exec_count}"
    podman events --since "${HOURS}h" --stream=false --filter event=exec --format json 2>/dev/null | \
        jq -r '"  \(.Time) - \(.Name // "unnamed")"'

    echo ""
    echo "--- Image Operations ---"
    podman events --since "${HOURS}h" --stream=false --filter type=image --format json 2>/dev/null | \
        jq -r '"  \(.Time) - \(.Status) \(.Name // "unnamed")"'

    echo ""
    echo "============================================"
    echo "  End of Report"
    echo "============================================"
} > "$REPORT_FILE"

echo "Audit report generated: ${REPORT_FILE}"
cat "$REPORT_FILE"
```

## Automating Daily Audit Reports

Set up a cron job to generate daily audit reports.

```bash
# Create the audit report script
cat > /usr/local/bin/podman-daily-audit.sh << 'SCRIPT'
#!/bin/bash
REPORT_DIR="/var/log/podman-audit/reports"
mkdir -p "$REPORT_DIR"
DATE=$(date '+%Y-%m-%d')
REPORT_FILE="${REPORT_DIR}/daily-audit-${DATE}.json"

podman events --since 24h --stream=false --format json | jq -s '{
    report_date: "'"${DATE}"'",
    total_events: length,
    events_by_status: (group_by(.Status) | map({(.[0].Status): length}) | add),
    containers_seen: ([.[] | select(.Type == "container") | .Name] | unique),
    deaths: [.[] | select(.Status == "died") | {name: .Name, time: .Time}],
    exec_operations: [.[] | select(.Status == "exec") | {name: .Name, time: .Time}]
}' > "$REPORT_FILE"

echo "Daily audit saved to: ${REPORT_FILE}"
SCRIPT

chmod +x /usr/local/bin/podman-daily-audit.sh

# Add to crontab for daily execution at midnight
# crontab -e
# 0 0 * * * /usr/local/bin/podman-daily-audit.sh
```

## Audit Log Integrity

Protect audit logs from tampering.

```bash
# Generate checksums for audit log files
find /var/log/podman-audit/ -name "*.jsonl" -exec sha256sum {} \; \
    > /var/log/podman-audit/checksums.txt

# Verify audit log integrity
sha256sum -c /var/log/podman-audit/checksums.txt
```

## Cleanup

```bash
# Remove test containers
podman rm -f audit-target 2>/dev/null

# Clean up temporary files
rm -f /tmp/audit-creates.jsonl /tmp/podman-audit-report-*.txt
```

## Summary

Auditing container activities with Podman events provides the visibility needed for security compliance and operational governance. By capturing container lifecycle events, exec operations, image changes, and volume activity, you can maintain a comprehensive record of the events Podman reports in your container environment. Automated daily reports, secure log storage, and integrity verification help keep your audit trail trustworthy.
