# How to Export and Analyze Run Data from HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Run Data, Analytics, Reporting, API

Description: Export run data from HCP Terraform using the API to build reports, track deployment frequency, and analyze infrastructure change patterns.

---

HCP Terraform stores a wealth of data about every infrastructure run - who triggered it, when it ran, how long it took, what changed, and whether it succeeded or failed. Exporting and analyzing this data gives you insights into your team's deployment velocity, failure patterns, and infrastructure change frequency. This post shows how to extract run data and turn it into actionable reports.

## What Data Is Available

Every run in HCP Terraform contains:

- **Status** - planned, applied, errored, canceled, discarded
- **Timing** - created, started, completed timestamps
- **Source** - who or what triggered the run (VCS, CLI, API, UI)
- **Changes** - resources added, changed, destroyed
- **Cost estimate** - projected cost impact (if enabled)
- **Plan and apply logs** - full output text
- **Configuration version** - which code was used
- **Workspace** - which workspace the run belongs to

## Exporting Run Data via API

### Fetching Runs for a Workspace

```bash
# Get the latest 20 runs for a specific workspace
WORKSPACE_ID="ws-abc123"

curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/runs?page%5Bsize%5D=20" | \
  jq '.data[] | {
    id: .id,
    status: .attributes.status,
    source: .attributes.source,
    created: .attributes["created-at"],
    message: .attributes.message,
    has_changes: .attributes["has-changes"],
    auto_apply: .attributes["auto-apply"],
    is_destroy: .attributes["is-destroy"]
  }'
```

### Fetching Runs Across the Organization

```bash
# Get all runs across the organization
ORG="my-company"

curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/$ORG/runs?page%5Bsize%5D=100" | \
  jq '.data[] | {
    id: .id,
    workspace: .relationships.workspace.data.id,
    status: .attributes.status,
    created: .attributes["created-at"]
  }'
```

### Exporting All Runs with Pagination

```bash
#!/bin/bash
# export-all-runs.sh
# Export all runs from an organization to a JSON file

ORG="my-company"
OUTPUT_FILE="runs-export.json"
PAGE=1
TOTAL_EXPORTED=0

echo "[" > "$OUTPUT_FILE"

while true; do
  RESPONSE=$(curl -s \
    --header "Authorization: Bearer $TF_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    "https://app.terraform.io/api/v2/organizations/$ORG/runs?page%5Bnumber%5D=$PAGE&page%5Bsize%5D=100")

  # Extract run data
  RUNS=$(echo "$RESPONSE" | jq '.data')
  COUNT=$(echo "$RUNS" | jq 'length')

  if [ "$COUNT" -eq 0 ]; then
    break
  fi

  # Append runs to the output file
  if [ "$TOTAL_EXPORTED" -gt 0 ]; then
    echo "," >> "$OUTPUT_FILE"
  fi
  echo "$RUNS" | jq '.[]' >> "$OUTPUT_FILE"

  TOTAL_EXPORTED=$((TOTAL_EXPORTED + COUNT))
  echo "Exported $TOTAL_EXPORTED runs (page $PAGE)"

  # Check for next page
  NEXT=$(echo "$RESPONSE" | jq -r '.meta.pagination["next-page"]')
  if [ "$NEXT" = "null" ]; then
    break
  fi

  PAGE=$NEXT
  sleep 0.2  # Respect rate limits
done

echo "]" >> "$OUTPUT_FILE"
echo "Total runs exported: $TOTAL_EXPORTED"
```

## Analyzing Run Data

### Deployment Frequency

```bash
# Count runs per day over the last 30 days
cat runs-export.json | jq -r '.[].attributes["created-at"]' | \
  cut -d'T' -f1 | sort | uniq -c | sort -k2

# Output:
#   12 2026-01-24
#   8  2026-01-25
#   15 2026-01-26
#   ...
```

### Success and Failure Rates

```bash
# Calculate success/failure rates
cat runs-export.json | jq -r '.[].attributes.status' | sort | uniq -c | sort -rn

# Output:
#   245 applied
#   52  planned_and_finished
#   18  errored
#   12  discarded
#   8   canceled
```

### Mean Time to Apply

```bash
# Calculate average run duration using Python
python3 << 'PYEOF'
import json
from datetime import datetime

with open('runs-export.json') as f:
    runs = json.load(f)

durations = []
for run in runs:
    attrs = run['attributes']
    if attrs['status'] == 'applied':
        created = datetime.fromisoformat(attrs['created-at'].replace('Z', '+00:00'))
        # status-timestamps contains apply completion time
        timestamps = attrs.get('status-timestamps', {})
        if timestamps.get('applied-at'):
            applied = datetime.fromisoformat(timestamps['applied-at'].replace('Z', '+00:00'))
            duration = (applied - created).total_seconds()
            durations.append(duration)

if durations:
    avg_duration = sum(durations) / len(durations)
    print(f"Average time to apply: {avg_duration:.0f} seconds ({avg_duration/60:.1f} minutes)")
    print(f"Fastest: {min(durations):.0f}s")
    print(f"Slowest: {max(durations):.0f}s")
    print(f"Total successful applies: {len(durations)}")
PYEOF
```

## Building a Run Report

Here is a comprehensive reporting script:

```python
#!/usr/bin/env python3
# run-report.py
# Generate a report from exported HCP Terraform run data

import json
import sys
from datetime import datetime, timedelta
from collections import defaultdict

def load_runs(filename):
    with open(filename) as f:
        return json.load(f)

def generate_report(runs):
    # Filter to last 30 days
    cutoff = datetime.utcnow() - timedelta(days=30)
    recent_runs = []
    for run in runs:
        created = datetime.fromisoformat(
            run['attributes']['created-at'].replace('Z', '+00:00')
        ).replace(tzinfo=None)
        if created > cutoff:
            recent_runs.append(run)

    print(f"=== HCP Terraform Run Report (Last 30 Days) ===\n")
    print(f"Total Runs: {len(recent_runs)}")

    # Status breakdown
    status_counts = defaultdict(int)
    for run in recent_runs:
        status_counts[run['attributes']['status']] += 1

    print("\nRun Status Breakdown:")
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        pct = count / len(recent_runs) * 100
        print(f"  {status}: {count} ({pct:.1f}%)")

    # Source breakdown
    source_counts = defaultdict(int)
    for run in recent_runs:
        source = run['attributes'].get('source', 'unknown')
        source_counts[source] += 1

    print("\nRun Sources:")
    for source, count in sorted(source_counts.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count}")

    # Workspace activity
    workspace_counts = defaultdict(int)
    for run in recent_runs:
        ws_id = run['relationships']['workspace']['data']['id']
        workspace_counts[ws_id] += 1

    print(f"\nActive Workspaces: {len(workspace_counts)}")
    print("Top 5 Most Active Workspaces:")
    for ws_id, count in sorted(workspace_counts.items(), key=lambda x: -x[1])[:5]:
        print(f"  {ws_id}: {count} runs")

    # Error analysis
    errors = [r for r in recent_runs if r['attributes']['status'] == 'errored']
    if errors:
        error_rate = len(errors) / len(recent_runs) * 100
        print(f"\nError Rate: {error_rate:.1f}%")
        print(f"Total Errors: {len(errors)}")

    # Deployment frequency
    daily_counts = defaultdict(int)
    for run in recent_runs:
        if run['attributes']['status'] == 'applied':
            day = run['attributes']['created-at'][:10]
            daily_counts[day] += 1

    if daily_counts:
        avg_daily = sum(daily_counts.values()) / len(daily_counts)
        print(f"\nAverage Deployments Per Day: {avg_daily:.1f}")

if __name__ == '__main__':
    filename = sys.argv[1] if len(sys.argv) > 1 else 'runs-export.json'
    runs = load_runs(filename)
    generate_report(runs)
```

## Exporting to CSV for Spreadsheet Analysis

```bash
# Convert run data to CSV
cat runs-export.json | jq -r '
  ["id", "status", "source", "created", "workspace"],
  (.[] | [
    .id,
    .attributes.status,
    .attributes.source,
    .attributes["created-at"],
    .relationships.workspace.data.id
  ]) | @csv' > runs-export.csv
```

## Setting Up Automated Exports

Schedule regular exports with a cron job or CI pipeline:

```bash
#!/bin/bash
# weekly-export.sh
# Run weekly to export and analyze run data

DATE=$(date +%Y-%m-%d)
ORG="my-company"
EXPORT_DIR="/var/data/terraform-reports"

mkdir -p "$EXPORT_DIR"

# Export runs from the last 7 days
SINCE=$(date -u -d "-7 days" +%Y-%m-%dT%H:%M:%SZ)

curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/$ORG/runs?filter%5Bfrom%5D=$SINCE&page%5Bsize%5D=100" \
  -o "$EXPORT_DIR/runs-$DATE.json"

# Generate the report
python3 /opt/scripts/run-report.py "$EXPORT_DIR/runs-$DATE.json" \
  > "$EXPORT_DIR/report-$DATE.txt"

# Send the report via email or Slack
cat "$EXPORT_DIR/report-$DATE.txt"
```

## Integrating with Monitoring Tools

Send run data to your existing monitoring stack:

```bash
# Send run metrics to a monitoring endpoint
APPLIED=$(cat runs-export.json | jq '[.[] | select(.attributes.status == "applied")] | length')
ERRORED=$(cat runs-export.json | jq '[.[] | select(.attributes.status == "errored")] | length')

# Example: send to a metrics endpoint
curl -s \
  --request POST \
  --header "Content-Type: application/json" \
  --data "{
    \"metrics\": [
      {\"name\": \"terraform.runs.applied\", \"value\": $APPLIED},
      {\"name\": \"terraform.runs.errored\", \"value\": $ERRORED}
    ]
  }" \
  "https://metrics.example.com/api/v1/series"
```

## Audit Log Export

For compliance, export detailed run information including who triggered each run:

```bash
# Export audit-ready run data
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/runs?page%5Bsize%5D=100&include=created-by" | \
  jq '.data[] | {
    run_id: .id,
    status: .attributes.status,
    created_at: .attributes["created-at"],
    source: .attributes.source,
    message: .attributes.message,
    is_destroy: .attributes["is-destroy"],
    auto_apply: .attributes["auto-apply"]
  }'
```

## Summary

Exporting run data from HCP Terraform lets you measure deployment frequency, track error rates, identify bottlenecks, and maintain audit compliance. Use the API to extract the data, process it with scripts or Python for analysis, and integrate the results into your existing reporting and monitoring tools. Regular analysis of run data gives you visibility into your infrastructure operations that is hard to get any other way.
