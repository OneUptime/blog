# How to Use the Progress Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Progress, Monitoring, Operation

Description: Learn how to use the Ceph Manager Progress module to track and display the status of long-running cluster operations such as backfills and recoveries.

---

The Ceph Manager Progress module tracks long-running cluster operations and displays their completion percentage. This is especially valuable when monitoring data recovery, backfill, and rebalance operations that can take hours to complete on large clusters.

## Enabling the Progress Module

The progress module is enabled by default in Ceph. Verify its status:

```bash
ceph mgr module ls | grep progress
```

Enable it if disabled:

```bash
ceph mgr module enable progress
```

## Viewing Current Operations

List all tracked operations and their progress:

```bash
ceph progress
```

Example output:

```text
Global Recovery Event (2m)
    [========================......] (remaining: 01m)

Rebalancing after osd.4 marked out (5m)
    [================..............] (remaining: 03m)
```

The progress bar visually represents completion, with `=` for completed and `.` for remaining work.

## Clearing Completed Events

After operations complete, clear stale progress events:

```bash
ceph progress clear
```

## JSON Output

For scripting and monitoring integrations, request JSON format:

```bash
ceph progress json
```

```json
{
  "events": [
    {
      "id": "recovery-abc123",
      "message": "Global Recovery Event",
      "refs": [],
      "progress": 0.97
    }
  ],
  "completed": []
}
```

## Monitoring Recovery Progress with a Script

Use the JSON output to alert when recoveries are stuck:

```python
import subprocess
import json
import time

while True:
    result = subprocess.run(
        ["ceph", "progress", "json"],
        capture_output=True,
        text=True
    )
    data = json.loads(result.stdout)
    for event in data.get("events", []):
        print(f"{event['message']}: {event['progress']*100:.1f}%")
    time.sleep(30)
```

## Integration with Ceph Dashboard

The progress module feeds operation status directly into the Ceph Dashboard. Navigate to `Cluster > Manager Modules` to verify it is active, then check the Dashboard home page for active events under the "Progress" widget.

## What Triggers Progress Events

Operations that create progress events include:

- PG recovery after OSD failure
- Data backfill after adding OSDs
- Data rebalancing triggered by CRUSH map changes
- PG autoscaler adjustments when matching target PG counts

## Summary

The Ceph Manager Progress module provides real-time visibility into long-running cluster operations by tracking and displaying completion percentages. The `ceph progress` command lists active events with progress bars, JSON output enables scripted monitoring, and the Ceph Dashboard integrates progress data into its home page for at-a-glance cluster health awareness.
