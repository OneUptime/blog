# How to Use the Insights Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Insights, Monitoring, Health

Description: Learn how to use the Ceph Manager Insights module to collect periodic cluster health reports for long-term trend analysis and incident review.

---

The Ceph Manager Insights module collects periodic health and performance snapshots of your Ceph cluster. These snapshots serve as a historical record, helping operators identify trends and understand what was happening before and during incidents.

## Enabling the Insights Module

Enable the module with:

```bash
ceph mgr module enable insights
```

The module immediately begins recording health reports at regular intervals.

## Viewing the Report

Generate a formatted insights report showing recent cluster health history:

```bash
ceph insights
```

Example output includes current health and a history of health checks:

```json
{
  "version": 1,
  "health": {
    "current": {
      "status": "HEALTH_OK",
      "checks": {}
    },
    "history": {
      "checks": {
        "OSD_DOWN": {
          "severity": "HEALTH_WARN",
          "summary": [
            {"message": "1 osds down"}
          ]
        }
      }
    }
  }
}
```

## Report Time Window

The insights report covers the last 24 hours of health data. This window is hardcoded and cannot be adjusted via command-line flags.

## Clearing Historical Data

Remove accumulated insights history by specifying the number of hours of history to retain:

```bash
ceph insights prune-health 0
```

Passing `0` clears all health data. This is useful after major cluster changes to start a fresh baseline.

## Data Collection and Retention

The insights module stores health data in hourly buckets. Each data point represents a one-hour slot of cluster health. The retention period is 30 hours, after which older data is automatically pruned.

## Use Case: Post-Incident Review

When an OSD failure occurs, use insights to check what health warnings preceded it:

```bash
ceph insights | python3 -m json.tool | grep -A5 "HEALTH_WARN"
```

This surfaces any early warning signs such as slow requests, clock skew, or PG degradation that occurred before the failure.

## Combining with the Crash Module

Pair insights with crash reports for a complete incident timeline:

```bash
# List recent crash reports
ceph crash ls

# Review cluster health around the time of the crash
ceph insights
```

## Summary

The Ceph Manager Insights module captures periodic health snapshots of your cluster, building a historical record useful for trend analysis and incident post-mortems. Enabling it requires a single command, and the `ceph insights` command retrieves a report covering the last 24 hours of cluster health changes, helping operators understand the sequence of events leading to any cluster issue.
