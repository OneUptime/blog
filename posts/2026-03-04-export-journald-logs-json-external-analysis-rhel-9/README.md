# How to Export journald Logs to JSON for External Analysis on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journald, JSON, Logging, Data Analysis, Linux

Description: Learn how to export systemd journal logs in JSON format on RHEL 9 for ingestion into external analysis tools, databases, and monitoring platforms.

---

The systemd journal stores rich, structured log data with metadata like service names, PIDs, priorities, and custom fields. Exporting this data as JSON makes it easy to feed into external tools like Elasticsearch, Splunk, Python scripts, or any system that processes structured data.

## Basic JSON Export

journalctl has built-in JSON output support:

```bash
# Export logs as JSON (one JSON object per line)
journalctl -o json --no-pager > /tmp/journal-export.json

# Pretty-printed JSON (easier to read but larger)
journalctl -o json-pretty --no-pager -n 100

# Export with filters
journalctl -u sshd -o json --since "24 hours ago" --no-pager > /tmp/sshd-logs.json
```

## JSON Output Formats

### json (Newline-Delimited JSON)

Each log entry is a single JSON object on one line. This format is ideal for streaming processing:

```bash
# One JSON object per line
journalctl -o json -n 3 --no-pager
```

Output:

```json
{"__CURSOR":"s=...","PRIORITY":"6","_HOSTNAME":"server1","MESSAGE":"Started Session 45 of User admin.","_SYSTEMD_UNIT":"session-45.scope"}
{"__CURSOR":"s=...","PRIORITY":"6","_HOSTNAME":"server1","MESSAGE":"Accepted publickey for admin","SYSLOG_IDENTIFIER":"sshd"}
```

### json-pretty (Formatted JSON)

Human-readable with indentation:

```bash
journalctl -o json-pretty -n 1 --no-pager
```

```json
{
    "__CURSOR" : "s=abc123...",
    "__REALTIME_TIMESTAMP" : "1709528400000000",
    "__MONOTONIC_TIMESTAMP" : "12345678",
    "PRIORITY" : "6",
    "_HOSTNAME" : "server1",
    "_SYSTEMD_UNIT" : "sshd.service",
    "SYSLOG_IDENTIFIER" : "sshd",
    "MESSAGE" : "Accepted publickey for admin from 192.168.1.10",
    "_PID" : "12345",
    "_UID" : "0",
    "_GID" : "0",
    "_TRANSPORT" : "syslog"
}
```

## Exporting Filtered Data

### By Service and Time Range

```bash
# Export nginx logs from the last week
journalctl -u nginx -o json \
    --since "7 days ago" \
    --no-pager > /tmp/nginx-week.json

# Export all error-level logs from today
journalctl -p err -o json \
    --since today \
    --no-pager > /tmp/errors-today.json

# Export authentication logs
journalctl -u sshd -u sudo -o json \
    --since "30 days ago" \
    --no-pager > /tmp/auth-month.json
```

### By Custom Fields

```bash
# Export logs from a specific container
journalctl CONTAINER_NAME=myapp -o json --no-pager > /tmp/container-logs.json

# Export kernel messages
journalctl -k -o json --no-pager > /tmp/kernel.json

# Export audit logs
journalctl _TRANSPORT=audit -o json --no-pager > /tmp/audit.json
```

## Processing JSON Logs with Python

### Basic Analysis Script

```python
#!/usr/bin/env python3
# analyze_journal.py
# Parse and analyze exported journal logs

import json
import sys
from collections import Counter
from datetime import datetime

def analyze_logs(filename):
    """Analyze journal logs exported in JSON format."""
    severity_counts = Counter()
    service_counts = Counter()
    hourly_counts = Counter()
    total = 0

    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                total += 1

                # Count by priority
                priority = entry.get('PRIORITY', 'unknown')
                priority_names = {
                    '0': 'emerg', '1': 'alert', '2': 'crit',
                    '3': 'err', '4': 'warning', '5': 'notice',
                    '6': 'info', '7': 'debug'
                }
                severity_counts[priority_names.get(priority, priority)] += 1

                # Count by service
                unit = entry.get('_SYSTEMD_UNIT', entry.get('SYSLOG_IDENTIFIER', 'unknown'))
                service_counts[unit] += 1

                # Count by hour
                ts = entry.get('__REALTIME_TIMESTAMP')
                if ts:
                    dt = datetime.fromtimestamp(int(ts) / 1000000)
                    hourly_counts[dt.strftime('%Y-%m-%d %H:00')] += 1

            except json.JSONDecodeError:
                continue

    # Print results
    print(f"\nTotal log entries: {total}\n")

    print("--- Severity Distribution ---")
    for severity, count in severity_counts.most_common():
        print(f"  {severity:10s}: {count:8d}")

    print("\n--- Top 10 Services ---")
    for service, count in service_counts.most_common(10):
        print(f"  {service:40s}: {count:8d}")

    print("\n--- Hourly Distribution (last 10 hours) ---")
    for hour, count in sorted(hourly_counts.items())[-10:]:
        print(f"  {hour}: {count:8d}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <json-log-file>")
        sys.exit(1)
    analyze_logs(sys.argv[1])
```

```bash
# Export and analyze
journalctl -o json --since "24 hours ago" --no-pager > /tmp/daily.json
python3 analyze_journal.py /tmp/daily.json
```

### Extract Specific Fields

```python
#!/usr/bin/env python3
# extract_fields.py
# Extract specific fields from journal JSON export

import json
import sys
import csv

def extract_fields(input_file, output_file, fields):
    """Extract specific fields and write to CSV."""
    with open(input_file, 'r') as fin, open(output_file, 'w', newline='') as fout:
        writer = csv.DictWriter(fout, fieldnames=fields)
        writer.writeheader()

        for line in fin:
            try:
                entry = json.loads(line.strip())
                # Extract only the requested fields
                row = {field: entry.get(field, '') for field in fields}
                writer.writerow(row)
            except json.JSONDecodeError:
                continue

# Example: extract timestamp, hostname, service, and message
fields = ['__REALTIME_TIMESTAMP', '_HOSTNAME', '_SYSTEMD_UNIT', 'PRIORITY', 'MESSAGE']
extract_fields('/tmp/daily.json', '/tmp/daily.csv', fields)
print("Exported to /tmp/daily.csv")
```

## Streaming JSON Export

For real-time processing, use journalctl with follow mode:

```bash
# Stream JSON logs to a processing pipeline
journalctl -f -o json | while read -r line; do
    echo "$line" | python3 -c "
import sys, json
entry = json.loads(sys.stdin.read())
priority = entry.get('PRIORITY', '?')
msg = entry.get('MESSAGE', '')
if priority in ('0', '1', '2', '3'):
    print(f'ALERT: {msg}')
"
done
```

### Pipe to jq for Real-Time Filtering

```bash
# Install jq if not available
sudo dnf install jq -y

# Stream and filter with jq - show only error messages
journalctl -f -o json | jq -r 'select(.PRIORITY == "3") | "\(.__REALTIME_TIMESTAMP) \(._SYSTEMD_UNIT) \(.MESSAGE)"'

# Show only SSH-related messages
journalctl -f -o json | jq -r 'select(.SYSLOG_IDENTIFIER == "sshd") | .MESSAGE'

# Format as a simple table
journalctl -o json --since "1 hour ago" --no-pager | \
    jq -r '[.__REALTIME_TIMESTAMP, .PRIORITY, ._SYSTEMD_UNIT // .SYSLOG_IDENTIFIER, .MESSAGE] | @tsv'
```

## Export to Elasticsearch

```bash
# Export journal entries formatted for Elasticsearch bulk API
journalctl -o json --since "24 hours ago" --no-pager | \
    python3 -c "
import sys, json
for line in sys.stdin:
    try:
        entry = json.loads(line.strip())
        # Create Elasticsearch bulk index action
        action = json.dumps({'index': {'_index': 'syslog'}})
        # Create the document
        doc = json.dumps({
            'timestamp': entry.get('__REALTIME_TIMESTAMP'),
            'hostname': entry.get('_HOSTNAME'),
            'service': entry.get('_SYSTEMD_UNIT', ''),
            'priority': entry.get('PRIORITY'),
            'message': entry.get('MESSAGE', '')
        })
        print(action)
        print(doc)
    except:
        pass
" > /tmp/elastic-bulk.json

# Send to Elasticsearch
curl -X POST "http://elasticsearch:9200/_bulk" \
    -H "Content-Type: application/x-ndjson" \
    --data-binary @/tmp/elastic-bulk.json
```

## Automated Daily Export

Create a cron job for daily JSON exports:

```bash
#!/bin/bash
# /usr/local/bin/export-journal-daily.sh
# Export yesterday's journal logs to JSON

# Set the output directory
EXPORT_DIR="/var/log/journal-exports"
mkdir -p "$EXPORT_DIR"

# Generate the filename with yesterday's date
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
FILENAME="journal-${YESTERDAY}.json.gz"

# Export yesterday's logs and compress
journalctl --since "$YESTERDAY 00:00:00" \
    --until "$YESTERDAY 23:59:59" \
    -o json --no-pager | gzip > "${EXPORT_DIR}/${FILENAME}"

# Remove exports older than 30 days
find "$EXPORT_DIR" -name "journal-*.json.gz" -mtime +30 -delete

echo "Exported journal logs for ${YESTERDAY} to ${EXPORT_DIR}/${FILENAME}"
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/export-journal-daily.sh

# Add to cron - run at 1 AM daily
echo "0 1 * * * root /usr/local/bin/export-journal-daily.sh" | \
    sudo tee /etc/cron.d/journal-export
```

## Summary

Exporting journald logs to JSON on RHEL 9 opens up your log data to the full ecosystem of data analysis tools. Use `journalctl -o json` for newline-delimited JSON output, filter with standard journalctl options before exporting, and process the results with Python, jq, or direct ingestion into platforms like Elasticsearch. For ongoing exports, set up a daily cron job that compresses and archives the output.
