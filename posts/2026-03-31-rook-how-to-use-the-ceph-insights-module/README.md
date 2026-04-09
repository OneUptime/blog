# How to Use the Ceph Insights Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Insights, Telemetry

Description: Enable and use the Ceph Insights module to collect cluster health reports, track configuration history, and monitor long-term cluster trends.

---

## What Is the Ceph Insights Module

The Ceph `insights` module is a manager plugin that collects periodic cluster health snapshots and stores them in memory. It maintains a rolling history of health checks, warnings, and errors in hourly time slots. This allows you to answer questions like "when did this warning first appear?" or "how long has this health issue persisted?" Note that insights data is held in-memory only and is lost on manager restart or failover.

## Enabling the Insights Module

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr module enable insights
```

Verify it is enabled:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr module ls | grep insights
```

Output:

```text
    "enabled_modules": [
        "balancer",
        "insights",
        "pg_autoscaler",
        ...
    ]
```

## Viewing the Insights Report

Get the current insights report:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph insights
```

This returns a JSON report of cluster health history. For human-readable output:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph insights | python3 -m json.tool | head -100
```

Example output structure:

```json
{
    "version": {
        "full": "ceph version 18.2.0 ...",
        "release": 18,
        "major": 2,
        "minor": 0
    },
    "crashes": {
        "summary": {},
        "hours": 24
    },
    "health": {
        "current": {
            "status": "HEALTH_WARN",
            "checks": {
                "OSD_NEARFULL": {
                    "severity": "HEALTH_WARN",
                    "summary": {
                        "message": "1 nearfull osd(s)"
                    }
                }
            }
        },
        "history": {
            "checks": {
                "OSD_NEARFULL": {
                    "HEALTH_WARN": {
                        "summary": ["1 nearfull osd(s)"],
                        "detail": []
                    }
                }
            }
        }
    },
    "config": [...],
    "osd_dump": {...},
    "df": {...},
    "osd_tree": {...},
    ...
}
```

## Filtering Historical Health Data

The insights report includes a health history section that records which health checks have been seen. To list all historical health checks and their severities:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph insights | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
history = data.get('health', {}).get('history', {}).get('checks', {})
for check_name, severities in sorted(history.items()):
    for severity, info in severities.items():
        msgs = info.get('summary', [])
        print(f'{check_name} [{severity}]: {msgs}')
"
```

Output:

```text
OSD_NEARFULL [HEALTH_WARN]: ['1 nearfull osd(s)']
SLOW_OPS [HEALTH_WARN]: ['3 slow ops, oldest one blocked for 32 sec']
```

## Understanding Retention

The insights module retains health history for a hardcoded period of 30 hours in hourly time slots. Old slots are automatically pruned as new data arrives. There is no configuration option to change the retention period. If you need to manually clear old data, use the `prune-health` command described below.

## Pruning Old Insights Data

To manually prune old health history data:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph insights prune-health 24
```

This prunes health records older than 24 hours. Pass `0` to clear all health history data.

## Reviewing Cluster State from the Report

The insights report includes a point-in-time snapshot of various cluster components such as `osd_dump`, `df`, `osd_tree`, `crush_map`, and more. Export and analyze the current state:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph insights > /tmp/insights.json
```

Process with Python to extract current cluster usage from the `df` section:

```python
import json

with open('/tmp/insights.json') as f:
    data = json.load(f)

df = data.get('df', {})
stats = df.get('stats', {})
total = stats.get('total_bytes', 0)
used = stats.get('total_used_bytes', 0)
pct = (used / total * 100) if total else 0
print(f"Cluster usage: {pct:.1f}% used ({used} / {total} bytes)")
```

## Disabling the Insights Module

If you don't need it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr module disable insights
```

## Summary

The Ceph Insights module provides historical cluster health tracking without requiring external tools. Enable it with `ceph mgr module enable insights`, then use `ceph insights` to retrieve a JSON report containing current health status, health check history, and a snapshot of cluster state. Note that insights data is stored in memory only (lost on manager restart), with a 30-hour retention window. This is valuable for post-incident analysis and understanding recent cluster health trends.
