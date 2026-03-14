# Parsing Output from Cilium Bugtool Archives

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Parsing, Diagnostics, Scripting, Automation

Description: Learn how to extract, parse, and analyze the diagnostic data collected by cilium-bugtool, building automated analysis scripts for faster incident resolution.

---

## Introduction

A cilium-bugtool archive contains dozens of files with diagnostic data in various formats -- plain text, JSON, tables, and raw system output. Manually reviewing each file is time-consuming, especially when analyzing archives from multiple nodes. Automated parsing extracts the most relevant information quickly and highlights potential issues.

This guide covers techniques for extracting, parsing, and summarizing cilium-bugtool archives to accelerate your troubleshooting workflow.

## Prerequisites

- One or more cilium-bugtool archives
- `tar`, `jq`, `grep`, `awk` for shell-based parsing
- Python 3.x for structured analysis
- Basic familiarity with Cilium diagnostic data

## Extracting the Archive

```bash
# Extract the bugtool archive
mkdir -p /tmp/bugtool-analysis
tar xzf /tmp/cilium-bugtool.tar.gz -C /tmp/bugtool-analysis

# Find the extracted directory
BUGDIR=$(find /tmp/bugtool-analysis -maxdepth 1 -type d | tail -1)

# List all collected files
find "$BUGDIR" -type f | sort
```

## Quick Health Summary Script

```bash
#!/bin/bash
# analyze-bugtool.sh
# Generate a quick health summary from a bugtool archive

BUGDIR="${1:-/tmp/bugtool-analysis}"
BUGDIR=$(find "$BUGDIR" -maxdepth 1 -type d | tail -1)

echo "=== Cilium Bugtool Analysis ==="
echo "Archive: $BUGDIR"
echo ""

# Agent status
echo "--- Agent Status ---"
STATUS_FILE=$(find "$BUGDIR" -name "*status*" -path "*/cmd-output/*" | head -1)
if [ -n "$STATUS_FILE" ]; then
  grep -E "Overall|KVStore|Kubernetes|IPAM" "$STATUS_FILE" 2>/dev/null
else
  echo "No status file found"
fi
echo ""

# Endpoint summary
echo "--- Endpoint Summary ---"
EP_FILE=$(find "$BUGDIR" -name "*endpoint*list*" -path "*/cmd-output/*" | head -1)
if [ -n "$EP_FILE" ]; then
  TOTAL=$(wc -l < "$EP_FILE")
  READY=$(grep -c "ready" "$EP_FILE" 2>/dev/null || echo 0)
  echo "Total lines: $TOTAL"
  echo "Ready endpoints: $READY"
else
  echo "No endpoint list found"
fi
echo ""

# System info
echo "--- System Info ---"
UNAME_FILE=$(find "$BUGDIR" -name "*uname*" | head -1)
[ -n "$UNAME_FILE" ] && cat "$UNAME_FILE"

# Memory info
MEM_FILE=$(find "$BUGDIR" -name "*meminfo*" | head -1)
if [ -n "$MEM_FILE" ]; then
  grep -E "MemTotal|MemAvailable|MemFree" "$MEM_FILE" 2>/dev/null
fi
echo ""

# Error detection
echo "--- Errors Detected ---"
find "$BUGDIR" -type f -exec grep -l -i "error\|panic\|fatal" {} \; 2>/dev/null | \
  while read f; do
    COUNT=$(grep -ci "error\|panic\|fatal" "$f")
    echo "  $f: $COUNT error references"
  done
```

## Python Comprehensive Analyzer

```python
#!/usr/bin/env python3
"""Analyze cilium-bugtool archives and generate structured reports."""

import os
import json
import re
import sys
from pathlib import Path

def find_files(base_dir, pattern):
    """Find files matching a pattern in the bugtool directory."""
    matches = []
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            if re.search(pattern, f, re.IGNORECASE):
                matches.append(os.path.join(root, f))
    return matches

def parse_status(filepath):
    """Parse cilium status output."""
    with open(filepath) as f:
        content = f.read()
    result = {}
    for line in content.split('\n'):
        if ':' in line and not line.startswith(' '):
            key, _, value = line.partition(':')
            result[key.strip()] = value.strip()
    return result

def count_errors(base_dir):
    """Count error occurrences across all files."""
    error_counts = {}
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            filepath = os.path.join(root, f)
            try:
                with open(filepath, errors='ignore') as fh:
                    content = fh.read()
                    errors = len(re.findall(
                        r'error|panic|fatal', content, re.IGNORECASE))
                    if errors > 0:
                        error_counts[filepath] = errors
            except (IOError, UnicodeDecodeError):
                pass
    return error_counts

def analyze_archive(base_dir):
    """Run full analysis on a bugtool archive."""
    report = {
        'files_collected': 0,
        'status': {},
        'errors': {},
        'warnings': []
    }

    # Count files
    for root, dirs, files in os.walk(base_dir):
        report['files_collected'] += len(files)

    # Parse status
    status_files = find_files(base_dir, r'status')
    for sf in status_files[:1]:
        report['status'] = parse_status(sf)

    # Count errors
    report['errors'] = count_errors(base_dir)

    # Check for critical issues
    total_errors = sum(report['errors'].values())
    if total_errors > 100:
        report['warnings'].append(
            f"High error count: {total_errors} across all files")

    return report

if __name__ == '__main__':
    base_dir = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bugtool-analysis'
    report = analyze_archive(base_dir)
    print(json.dumps(report, indent=2, default=str))
```

## Comparing Archives from Multiple Nodes

```bash
#!/bin/bash
# compare-bugtool-nodes.sh
# Compare bugtool archives from different nodes

ARCHIVE_DIR="${1:-/tmp/cilium-bugtool-archives}"

echo "=== Node Comparison ==="
for archive in "$ARCHIVE_DIR"/*.tar.gz; do
  [ -f "$archive" ] || continue
  NODE=$(basename "$archive" .tar.gz)
  TMPDIR="/tmp/compare-$NODE"
  mkdir -p "$TMPDIR"
  tar xzf "$archive" -C "$TMPDIR" 2>/dev/null

  BUGDIR=$(find "$TMPDIR" -maxdepth 2 -type d | tail -1)

  # Extract key metrics
  STATUS=$(find "$BUGDIR" -name "*status*" -path "*/cmd-output/*" -exec \
    grep -l "Overall" {} \; 2>/dev/null | head -1)
  HEALTH="unknown"
  if [ -n "$STATUS" ]; then
    grep -q "OK" "$STATUS" && HEALTH="healthy" || HEALTH="degraded"
  fi

  FILES=$(find "$BUGDIR" -type f | wc -l)
  echo "$NODE: $HEALTH ($FILES files collected)"

  rm -rf "$TMPDIR"
done
```

## Verification

```bash
# Verify the analysis script
bash analyze-bugtool.sh /tmp/bugtool-analysis

# Verify Python analyzer
python3 analyze_bugtool.py /tmp/bugtool-analysis | jq .files_collected

# Verify comparison
bash compare-bugtool-nodes.sh /tmp/cilium-bugtool-archives
```

## Troubleshooting

- **Binary files causing parse errors**: Skip binary files in your parsing scripts with `file --mime-type` checks.
- **JSON parse errors in endpoint data**: Some commands mix stderr into stdout. Filter lines starting with `{` or `[`.
- **Very large archives**: Process files individually rather than loading everything into memory.
- **Different archive structures across versions**: Use `find` with patterns rather than hardcoded paths.

## Conclusion

Parsing cilium-bugtool archives programmatically transforms raw diagnostic data into actionable summaries. Automated analysis scripts identify errors, compare node states, and generate structured reports that accelerate incident resolution. Build these parsers into your operational toolkit to get the most value from every bugtool collection.
