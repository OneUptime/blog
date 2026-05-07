# How to Export Podman Events to External Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, Export, Integration, Logging

Description: Learn how to export Podman events to external systems like databases, message queues, and cloud services for centralized storage and analysis.

---

> Exporting events to external systems ensures your container activity data survives container and host restarts, and is accessible to your entire team.

Podman events stored locally are useful for immediate debugging, but production environments need events exported to external systems for long-term retention, cross-host correlation, and team-wide access. This guide covers how to export Podman events to databases, message queues, cloud logging services, and file-based systems.

---

## Export Architecture

The export pattern is straightforward: stream JSON events from Podman and forward them to your destination.

```bash
# The basic export pattern

podman events --format json | <forwarder> | <destination>

# Verify events are flowing
podman events --since 1m --format json | head -3
```

## Exporting to a Log File (NDJSON)

The simplest export: write events to a newline-delimited JSON file.

```bash
# Export events to a NDJSON file
podman events --format json >> /var/log/podman/events.ndjson &

# Create a rotation-aware exporter
#!/bin/bash
# file-exporter.sh - Export events to daily log files

LOG_DIR="/var/log/podman"
mkdir -p "$LOG_DIR"

echo "Exporting events to ${LOG_DIR}..."

podman events --format json | while IFS= read -r event; do
    # Use a daily log file
    logfile="${LOG_DIR}/events-$(date '+%Y-%m-%d').ndjson"
    echo "$event" >> "$logfile"
done
```

## Exporting to SQLite

Store events in a SQLite database for SQL-based querying.

```bash
#!/bin/bash
# sqlite-exporter.sh - Export Podman events to SQLite

DB_FILE="/var/lib/podman-events/events.db"
mkdir -p "$(dirname "$DB_FILE")"

# Create the database schema
sqlite3 "$DB_FILE" << 'SQL'
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    name TEXT,
    container_id TEXT,
    image TEXT,
    raw_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_name ON events(name);
SQL

echo "Exporting events to SQLite: ${DB_FILE}"

sql_escape() {
    printf "%s" "$1" | sed "s/'/''/g"
}

podman events --format json | while IFS= read -r event; do
    timestamp=$(echo "$event" | jq -r '.Time // ""')
    event_type=$(echo "$event" | jq -r '.Type // ""')
    status=$(echo "$event" | jq -r '.Status // ""')
    name=$(echo "$event" | jq -r '.Name // ""')
    container_id=$(echo "$event" | jq -r '.ID // ""')
    image=$(echo "$event" | jq -r '.Image // ""')

    # Escape single quotes for SQL string literals
    safe_timestamp=$(sql_escape "$timestamp")
    safe_event_type=$(sql_escape "$event_type")
    safe_status=$(sql_escape "$status")
    safe_name=$(sql_escape "$name")
    safe_container_id=$(sql_escape "$container_id")
    safe_image=$(sql_escape "$image")
    safe_json=$(sql_escape "$event")

    sqlite3 "$DB_FILE" \
        "INSERT INTO events (timestamp, type, status, name, container_id, image, raw_json) VALUES ('${safe_timestamp}', '${safe_event_type}', '${safe_status}', '${safe_name}', '${safe_container_id}', '${safe_image}', '${safe_json}');"

    echo "Stored: [${status}] ${name}"
done
```

Query the exported events:

```bash
# Query events from SQLite
DB_FILE="/var/lib/podman-events/events.db"

# Count events by status
sqlite3 "$DB_FILE" "SELECT status, COUNT(*) FROM events GROUP BY status ORDER BY COUNT(*) DESC;"

# Find all died events
sqlite3 "$DB_FILE" "SELECT timestamp, name, image FROM events WHERE status='died';"

# Events for a specific container
sqlite3 "$DB_FILE" "SELECT timestamp, status FROM events WHERE name='myapp' ORDER BY timestamp;"
```

## Exporting to a TCP Endpoint

Send events to a remote log collector over the network.

```bash
#!/bin/bash
# tcp-exporter.sh - Export events over TCP
# Usage: ./tcp-exporter.sh <host> <port>

HOST="${1:?Usage: $0 <host> <port>}"
PORT="${2:?Usage: $0 <host> <port>}"

echo "Exporting events to ${HOST}:${PORT} via TCP..."

podman events --format json | while IFS= read -r event; do
    # Add hostname metadata
    enriched=$(echo "$event" | jq --arg host "$(hostname)" '. + {source_host: $host}')

    # Send over TCP
    echo "$enriched" | nc -q 0 "$HOST" "$PORT" 2>/dev/null

    if [ $? -ne 0 ]; then
        echo "Warning: Failed to send event to ${HOST}:${PORT}"
        # Buffer to local file as fallback
        echo "$enriched" >> /tmp/podman-events-buffer.jsonl
    fi
done
```

## Exporting to Redis

Publish events to a Redis channel for real-time consumption.

```bash
#!/bin/bash
# redis-exporter.sh - Export events to Redis
# Usage: ./redis-exporter.sh [redis-host] [redis-port]

REDIS_HOST="${1:-localhost}"
REDIS_PORT="${2:-6379}"
CHANNEL="podman:events"

echo "Publishing events to Redis ${REDIS_HOST}:${REDIS_PORT} channel '${CHANNEL}'..."

podman events --format json | while IFS= read -r event; do
    # Publish to Redis channel
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
        PUBLISH "$CHANNEL" "$event" > /dev/null

    # Also store in a list for persistence
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
        LPUSH "podman:events:log" "$event" > /dev/null

    # Trim list to last 10000 events
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
        LTRIM "podman:events:log" 0 9999 > /dev/null

    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    echo "Published: [${status}] ${name}"
done
```

## Resilient Export with Buffering

Handle network failures gracefully with local buffering.

```bash
#!/bin/bash
# resilient-exporter.sh - Export with local buffer for reliability

BUFFER_DIR="/tmp/podman-export-buffer"
REMOTE_ENDPOINT="https://logs.example.com/api/events"
mkdir -p "$BUFFER_DIR"

# Function to flush buffer
flush_buffer() {
    for file in "${BUFFER_DIR}"/*.json; do
        [ -f "$file" ] || continue
        if curl -s -X POST "$REMOTE_ENDPOINT" \
            -H "Content-Type: application/json" \
            -d @"$file" > /dev/null 2>&1; then
            rm "$file"
        fi
    done
}

echo "Starting resilient event export..."

podman events --format json | while IFS= read -r event; do
    # Try to send directly
    if curl -s -X POST "$REMOTE_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$event" --max-time 5 > /dev/null 2>&1; then
        echo "Sent: $(echo "$event" | jq -r '.Status')"
    else
        # Buffer locally on failure
        buffer_file="${BUFFER_DIR}/$(date +%s%N).json"
        echo "$event" > "$buffer_file"
        echo "Buffered: $(echo "$event" | jq -r '.Status')"
    fi

    # Periodically try to flush buffer
    flush_buffer
done
```

## Running as a Systemd Service

```bash
# Create a systemd service for the exporter
mkdir -p ~/.config/systemd/user/

cat > ~/.config/systemd/user/podman-event-export.service << 'EOF'
[Unit]
Description=Podman Event Exporter
After=default.target

[Service]
Type=simple
ExecStart=/usr/local/bin/podman-event-exporter.sh
Restart=always
RestartSec=15

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now podman-event-export.service
```

## Cleanup

```bash
# Remove buffer files
rm -rf /tmp/podman-export-buffer
rm -f /tmp/podman-events-buffer.jsonl
rm -f /var/lib/podman-events/events.db
```

## Summary

Exporting Podman events to external systems ensures container activity data is preserved, accessible, and queryable beyond the local host. Whether you export to log files, SQLite databases, TCP endpoints, Redis, or cloud services, the JSON event stream from Podman provides a flexible foundation. Adding resilient buffering and running the exporter as a systemd service ensures reliable, continuous export even through network interruptions and system restarts.
