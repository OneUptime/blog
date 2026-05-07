# How to Format Events as JSON with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, JSON, Automation

Description: Learn how to format Podman events as JSON for parsing, automation, and integration with monitoring tools and pipelines.

---

> JSON-formatted events transform Podman's event stream from human-readable text into machine-parseable data ready for automation.

While the default text output of `podman events` is useful for quick visual inspection, JSON output unlocks the full power of event data. JSON-formatted events can be parsed by scripts, ingested by monitoring systems, stored in databases, and processed by data pipelines. This guide shows you how to format Podman events as JSON and work with the structured data effectively.

---

## Basic JSON Output

The simplest way to get JSON events is with the `--format json` flag.

```bash
# Output events in JSON format

podman events --format json

# View recent events in JSON format
podman events --since 1h --format json
```

## Understanding the JSON Event Structure

Each JSON event contains several fields. Here is the typical structure:

```bash
# Generate an event and capture it as JSON
podman run --rm --name json-test alpine echo "hello" 2>/dev/null
podman events --since 30s --format json | head -1 | jq '.'
```

The output contains top-level fields like:

```json
{
  "ID": "abc123def456...",
  "Image": "docker.io/library/alpine:latest",
  "Name": "json-test",
  "Type": "container",
  "Status": "create",
  "Time": "2026-03-18T10:30:00.000000000Z",
  "Attributes": {
    "name": "json-test"
  }
}
```

## Parsing JSON Events with jq

The `jq` command is the standard tool for working with JSON events.

```bash
# Extract just the status from each event
podman events --since 1h --format json | jq -r '.Status'

# Extract name and status as a table
podman events --since 1h --format json | jq -r '[.Name, .Status] | @tsv'

# Filter JSON events for a specific status
podman events --since 1h --format json | jq 'select(.Status == "start")'

# Extract nested attributes
podman events --since 1h --format json | jq -r '.Attributes.name'
```

## Using Go Templates for Custom JSON

Podman supports Go templates that let you construct custom JSON output.

```bash
# Custom JSON with selected fields
podman events --format '{"time":"{{.Time}}","type":"{{.Type}}","status":"{{.Status}}","name":"{{.Name}}"}'

# JSON with only container events
podman events --filter type=container \
    --format '{"container":"{{.Name}}","event":"{{.Status}}","timestamp":"{{.Time}}"}'
```

## Streaming JSON to a File

Capture JSON events to a file for later analysis.

```bash
# Stream JSON events to a file
podman events --format json > /tmp/podman-events.json &
STREAM_PID=$!

# Generate some events
podman run --rm alpine echo "event 1"
podman run --rm alpine echo "event 2"
podman run --rm alpine echo "event 3"

# Wait a moment and stop the stream
sleep 3
kill $STREAM_PID

# Analyze the captured events
echo "Total events captured:"
wc -l /tmp/podman-events.json

echo "Events by status:"
jq -r '.Status' /tmp/podman-events.json | sort | uniq -c | sort -rn
```

## Building a JSON Event Aggregator

Here is a script that collects JSON events and produces summary reports.

```bash
#!/bin/bash
# json-aggregator.sh - Collect and summarize Podman events

DURATION="${1:-60}"
OUTPUT_FILE="/tmp/podman-event-report.json"

echo "Collecting events for ${DURATION} seconds..."

# Collect events for the specified duration
timeout "$DURATION" podman events --format json > /tmp/raw-events.json 2>/dev/null

# Generate summary report
total=$(wc -l < /tmp/raw-events.json)

echo "Generating report..."

# Build a summary using jq
jq -s '{
  total_events: length,
  events_by_type: (group_by(.Type) | map({(.[0].Type): length}) | add),
  events_by_status: (group_by(.Status) | map({(.[0].Status): length}) | add),
  containers_involved: ([.[].Name] | unique | length),
  time_range: {
    first: (sort_by(.Time) | first | .Time),
    last: (sort_by(.Time) | last | .Time)
  }
}' /tmp/raw-events.json > "$OUTPUT_FILE"

echo "Report saved to ${OUTPUT_FILE}"
jq '.' "$OUTPUT_FILE"
```

## Converting JSON Events to Other Formats

Transform JSON events into CSV or other formats for different tools.

```bash
# Convert JSON events to CSV
echo "timestamp,type,status,name" > /tmp/events.csv
podman events --since 1h --format json | \
    jq -r '[.Time, .Type, .Status, .Name] | @csv' >> /tmp/events.csv

# Convert to newline-delimited JSON (NDJSON) for log aggregators
# podman events --format json already outputs NDJSON by default
podman events --since 1h --format json > /tmp/events.ndjson
```

## Processing JSON Events in Python

For more complex processing, pipe JSON events to a Python script.

```bash
#!/usr/bin/env python3
# process_events.py - Process Podman JSON events from stdin

import json
import sys
from collections import Counter

status_counts = Counter()
container_events = {}

for line in sys.stdin:
    try:
        event = json.loads(line.strip())
        status = event.get("Status", "unknown")
        name = event.get("Name", "unknown")

        status_counts[status] += 1
        container_events.setdefault(name, []).append(status)
    except json.JSONDecodeError:
        continue

print("\n=== Event Summary ===")
for status, count in status_counts.most_common():
    print(f"  {status}: {count}")

print(f"\n=== Containers ({len(container_events)}) ===")
for name, events in container_events.items():
    print(f"  {name}: {', '.join(events)}")
```

```bash
# Run the Python processor with Podman events
podman events --since 1h --format json | python3 process_events.py
```

## Cleanup

```bash
# Clean up temporary files
rm -f /tmp/podman-events.json /tmp/raw-events.json /tmp/events.csv /tmp/events.ndjson
```

## Summary

Formatting Podman events as JSON opens up a world of automation possibilities. With JSON output, you can parse events with jq, build aggregation reports, convert to other formats, and integrate with any tool that accepts structured data. Whether you are building a simple monitoring script or feeding events into a full observability pipeline, JSON-formatted events from Podman provide the structured foundation you need.
