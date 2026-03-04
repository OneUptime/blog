# How to Export Journal Logs to a File for Analysis on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journalctl, Log Export, Analysis, systemd, Troubleshooting

Description: Export systemd journal logs to text, JSON, or binary files on RHEL for offline analysis, sharing with support teams, or ingestion into log analysis tools.

---

Sometimes you need to export journal logs to send to a vendor, analyze offline, or import into another tool. journalctl supports multiple export formats including plain text, JSON, and its native binary format.

## Export to Plain Text

```bash
# Export all logs to a text file
journalctl > /tmp/full-journal.txt

# Export logs for a specific service
journalctl -u httpd.service > /tmp/httpd-logs.txt

# Export logs for a specific time range
journalctl --since "2025-01-15 08:00" --until "2025-01-15 12:00" > /tmp/morning-logs.txt

# Export only errors and above
journalctl -p err --since today > /tmp/errors-today.txt
```

## Export to JSON Format

JSON is useful for importing into Elasticsearch, Splunk, or custom scripts.

```bash
# Export as JSON (one JSON object per line)
journalctl -o json > /tmp/journal.json

# Export as pretty-printed JSON
journalctl -u sshd -o json-pretty --since today > /tmp/sshd-pretty.json

# Export specific fields in JSON
journalctl -o json --output-fields=MESSAGE,_HOSTNAME,_PID,SYSLOG_IDENTIFIER \
    --since "1 hour ago" > /tmp/filtered.json
```

## Export in Native Binary Format

The binary format preserves all metadata and can be read by journalctl on another machine.

```bash
# Export to native journal binary format
journalctl -o export > /tmp/journal-export.bin

# Export a specific service in binary format
journalctl -u nginx.service -o export --since today > /tmp/nginx-export.bin

# Import on another RHEL machine using systemd-journal-remote
sudo /usr/lib/systemd/systemd-journal-remote \
    --output=/var/log/journal/remote/ \
    /tmp/journal-export.bin
```

## Export Specific Fields Only

```bash
# Show only the message and timestamp
journalctl -o short --since today | awk '{print $1, $2, $3, $0}' > /tmp/timestamps.txt

# Export with verbose output (all fields)
journalctl -o verbose -u sshd --since today > /tmp/sshd-verbose.txt

# Export in cat format (just the message, no metadata)
journalctl -o cat -u myapp.service > /tmp/myapp-messages.txt
```

## Parse Exported JSON with Python

```python
#!/usr/bin/env python3
# parse_journal.py - Parse exported JSON journal logs
import json
import sys

error_count = 0
# Read JSON lines format
with open(sys.argv[1], 'r') as f:
    for line in f:
        entry = json.loads(line)
        # Extract fields of interest
        priority = int(entry.get('PRIORITY', 6))
        message = entry.get('MESSAGE', '')
        unit = entry.get('_SYSTEMD_UNIT', 'unknown')

        # Count errors (priority 3 or lower)
        if priority <= 3:
            error_count += 1
            print(f"[ERROR] {unit}: {message}")

print(f"\nTotal errors found: {error_count}")
```

```bash
# Run the parser
journalctl -o json --since today > /tmp/today.json
python3 parse_journal.py /tmp/today.json
```

## Compress Large Exports

```bash
# Pipe directly through gzip to save space
journalctl --since "7 days ago" | gzip > /tmp/week-logs.txt.gz

# Export JSON compressed
journalctl -o json --since "7 days ago" | gzip > /tmp/week-logs.json.gz

# Decompress for reading
zcat /tmp/week-logs.txt.gz | less
```

Exporting journal logs is a routine task when working with support teams or performing post-incident analysis. Choose the format that best fits your downstream tool or workflow.
