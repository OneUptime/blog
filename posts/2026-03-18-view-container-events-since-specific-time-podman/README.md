# How to View Container Events Since a Specific Time in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, Time Filtering, Troubleshooting

Description: Learn how to view Podman container events since a specific time to investigate incidents and review historical container activity.

---

> Time-based event filtering is the cornerstone of incident investigation - knowing what happened since a specific moment tells the story of any outage.

When investigating an incident or reviewing container activity, you often need to see events starting from a specific point in time. Podman's `--since` flag lets you look back at events from a relative duration or an absolute timestamp, and `--stream=false` makes the command exit after showing historical results. This guide covers all the ways to filter Podman events by start time.

---

## Using Relative Time with --since

The simplest way to look back is using a relative time offset.

```bash
# View events from the last 5 minutes

podman events --since 5m --stream=false

# View events from the last hour
podman events --since 1h --stream=false

# View events from the last 30 seconds
podman events --since 30s --stream=false

# View events from the last 2 hours
podman events --since 2h --stream=false
```

## Using Absolute Timestamps with --since

For precise incident investigation, use absolute timestamps.

```bash
# View events since a specific date and time
podman events --since "2026-03-18T10:00:00" --stream=false

# View events since a specific date (midnight)
podman events --since "2026-03-18" --stream=false

# View events since a specific time with timezone
podman events --since "2026-03-18T10:00:00-05:00" --stream=false
```

## Generating Test Events for Demonstration

Let us create some events to work with.

```bash
# Generate a series of events over time
podman run --rm --name since-test-1 alpine echo "first"
sleep 2
podman run --rm --name since-test-2 alpine echo "second"
sleep 2
podman run --rm --name since-test-3 alpine echo "third"

# Note the timestamps
echo "Current time: $(date '+%Y-%m-%dT%H:%M:%S%:z')"
```

## Investigating Events Since an Incident

A typical incident investigation workflow:

```bash
#!/bin/bash
# incident-investigation.sh - Review events since an incident time
# Usage: ./incident-investigation.sh "2026-03-18T14:30:00"

INCIDENT_TIME="${1:?Usage: $0 <timestamp>}"

echo "=== Incident Investigation ==="
echo "Looking at events since: ${INCIDENT_TIME}"
echo ""

# Get all events since the incident
echo "--- All Events ---"
podman events --since "$INCIDENT_TIME" --stream=false \
    --format '{{.Time}} [{{.Type}}] {{.Status}} {{.Name}}'

echo ""
echo "--- Container Deaths ---"
podman events --since "$INCIDENT_TIME" --stream=false \
    --filter event=die \
    --format '{{.Time}} {{.Name}}'

echo ""
echo "--- Container Stops ---"
podman events --since "$INCIDENT_TIME" --stream=false \
    --filter event=stop \
    --format '{{.Time}} {{.Name}}'

echo ""
echo "--- Event Count by Status ---"
podman events --since "$INCIDENT_TIME" --stream=false --format json | \
    jq -r '.Status' | sort | uniq -c | sort -rn
```

## Combining --since with Other Filters

Narrow down time-based queries with additional filters.

```bash
# Container starts since a specific time
podman events --since 1h --stream=false --filter event=start

# Events for a specific container since a specific time
podman events --since 1h --stream=false --filter container=myapp

# Only container events since a time (exclude image, volume events)
podman events --since 1h --stream=false --filter type=container

# Die events for a specific container since a time
podman events --since 1h --stream=false --filter event=die --filter container=myapp
```

## Getting Events in JSON Since a Time

JSON output combined with time filtering is ideal for automated analysis.

```bash
# JSON events from the last hour
podman events --since 1h --stream=false --format json

# Process events since a time with jq
podman events --since 1h --stream=false --format json | \
    jq '{time: .time, type: .Type, status: .Status, name: .Name}'

# Count events per container since a time
podman events --since 1h --stream=false --filter type=container --format json | \
    jq -r '.Name' | sort | uniq -c | sort -rn
```

## Building a Historical Event Viewer

```bash
#!/bin/bash
# event-viewer.sh - Interactive event viewer with time selection
# Usage: ./event-viewer.sh [duration]

DURATION="${1:-1h}"

echo "=== Podman Event Viewer ==="
echo "Showing events since: ${DURATION} ago"
echo ""

# Summary statistics
total=$(podman events --since "$DURATION" --stream=false --format json 2>/dev/null | wc -l)
echo "Total events: ${total}"
echo ""

# Events by type
echo "Events by type:"
podman events --since "$DURATION" --stream=false --format json 2>/dev/null | \
    jq -r '.Type' | sort | uniq -c | sort -rn
echo ""

# Events by status
echo "Events by status:"
podman events --since "$DURATION" --stream=false --format json 2>/dev/null | \
    jq -r '.Status' | sort | uniq -c | sort -rn
echo ""

# Timeline of events
echo "Event timeline:"
podman events --since "$DURATION" --stream=false \
    --format '{{.Time}} | {{.Type}} | {{.Status}} | {{.Name}}'
```

```bash
# Run with different durations
chmod +x event-viewer.sh
./event-viewer.sh 30m    # Last 30 minutes
./event-viewer.sh 6h     # Last 6 hours
./event-viewer.sh 24h    # Last 24 hours
```

## Time Format Reference

Podman accepts several time formats with the `--since` flag.

```bash
# Relative durations
podman events --since 30s --stream=false    # seconds
podman events --since 5m --stream=false     # minutes
podman events --since 2h --stream=false     # hours

# ISO 8601 timestamps
podman events --since "2026-03-18T10:00:00" --stream=false

# Date only (defaults to midnight)
podman events --since "2026-03-18" --stream=false

# With timezone offset
podman events --since "2026-03-18T10:00:00-07:00" --stream=false
```

## Streaming Events Since a Starting Point

Combine `--since` to catch up on missed events, then continue streaming.

```bash
# Start from 10 minutes ago and continue streaming new events
podman events --since 10m

# This will first output all events from the last 10 minutes
# then continue to stream new events as they occur
# Press Ctrl+C to stop
```

## Cleanup

```bash
# No cleanup needed - all test containers used --rm
echo "No cleanup required"
```

## Summary

The `--since` flag in Podman events is essential for incident investigation, historical analysis, and catch-up monitoring. Whether you use relative durations like `1h` and `30m` or absolute timestamps for precise incident timelines, time-based filtering lets you review exactly the period you care about. Combined with event type filters, container filters, and JSON output, the `--since` flag provides the temporal dimension needed for thorough container event analysis.
