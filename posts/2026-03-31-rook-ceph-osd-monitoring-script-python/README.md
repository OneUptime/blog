# How to Write a Ceph OSD Monitoring Script in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Python, Scripting, OSD, Monitoring

Description: Build a Python script to monitor Ceph OSD health, track per-OSD performance metrics, detect anomalies, and send alerts when OSDs degrade or fail.

---

Python is ideal for Ceph OSD monitoring because its JSON parsing, HTTP libraries, and subprocess handling make it easy to query the cluster, analyze metrics, and trigger alerts. This guide builds a complete OSD monitoring script.

## Setting Up the Script

```python
#!/usr/bin/env python3
"""Ceph OSD Monitoring Script"""

import json
import subprocess
import sys
import os
from datetime import datetime
from typing import Any

NAMESPACE = os.environ.get("CEPH_NAMESPACE", "rook-ceph")
TOOLS_DEPLOY = "deploy/rook-ceph-tools"
SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "")
ALERT_THRESHOLD_UTIL = float(os.environ.get("OSD_UTIL_THRESHOLD", "85"))


def run_ceph(args: list[str]) -> dict[str, Any]:
    """Run a ceph command and return parsed JSON output."""
    cmd = [
        "kubectl", "-n", NAMESPACE,
        "exec", TOOLS_DEPLOY, "--",
        "ceph", *args, "--format", "json"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ceph command failed: {result.stderr}")
    return json.loads(result.stdout)
```

## Collecting OSD Status Metrics

```python
def get_osd_status() -> list[dict]:
    """Get status for all OSDs."""
    osd_dump = run_ceph(["osd", "dump"])

    osds = []
    for osd in osd_dump.get("osds", []):
        osd_id = osd["osd"]
        osds.append({
            "id": osd_id,
            "up": osd.get("up", 0),
            "in": osd.get("in", 0),
            "state": osd.get("state", []),
            "weight": osd.get("weight", 0),
        })
    return osds


def get_osd_perf() -> dict[int, dict]:
    """Get performance stats per OSD."""
    perf = run_ceph(["osd", "perf"])
    result = {}
    for entry in perf.get("osd_perf_infos", []):
        osd_id = entry["id"]
        stats = entry.get("perf_stats", {})
        result[osd_id] = {
            "apply_latency_ms": stats.get("apply_latency_ms", 0),
            "commit_latency_ms": stats.get("commit_latency_ms", 0),
        }
    return result
```

## Detecting Problems

```python
def check_osd_health(osds: list[dict], perf: dict) -> list[str]:
    """Check OSDs for problems and return alert messages."""
    alerts = []

    for osd in osds:
        osd_id = osd["id"]

        # Check if OSD is down
        if osd["up"] == 0:
            alerts.append(f"OSD {osd_id} is DOWN")

        # Check if OSD is out
        if osd["in"] == 0 and osd["up"] == 0:
            alerts.append(f"OSD {osd_id} is OUT of the cluster")

        # Check latency
        if osd_id in perf:
            apply_lat = perf[osd_id]["apply_latency_ms"]
            commit_lat = perf[osd_id]["commit_latency_ms"]
            if apply_lat > 500:
                alerts.append(
                    f"OSD {osd_id} high apply latency: {apply_lat}ms"
                )
            if commit_lat > 500:
                alerts.append(
                    f"OSD {osd_id} high commit latency: {commit_lat}ms"
                )

    return alerts
```

## OSD Utilization Check

```python
def check_osd_utilization() -> list[str]:
    """Check per-OSD disk utilization."""
    df = run_ceph(["osd", "df"])
    alerts = []

    for node in df.get("nodes", []):
        if node.get("type") != "osd":
            continue
        util = node.get("utilization", 0)
        osd_id = node.get("id")
        if util > ALERT_THRESHOLD_UTIL:
            alerts.append(
                f"OSD {osd_id} utilization is {util:.1f}% "
                f"(threshold: {ALERT_THRESHOLD_UTIL}%)"
            )

    return alerts
```

## Sending Alerts

```python
import urllib.request

def send_slack_alert(messages: list[str]) -> None:
    """Send alerts to Slack."""
    if not SLACK_WEBHOOK:
        return
    text = "\n".join([f"- {m}" for m in messages])
    payload = json.dumps({"text": f"*Ceph OSD Alert*\n{text}"}).encode()
    req = urllib.request.Request(
        SLACK_WEBHOOK,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req, timeout=10)


def main():
    print(f"=== Ceph OSD Monitor: {datetime.now().isoformat()} ===")
    osds = get_osd_status()
    perf = get_osd_perf()
    alerts = check_osd_health(osds, perf)
    alerts += check_osd_utilization()

    if alerts:
        print("ALERTS:")
        for alert in alerts:
            print(f"  - {alert}")
        send_slack_alert(alerts)
        sys.exit(1)
    else:
        print(f"All {len(osds)} OSDs healthy")
        sys.exit(0)


if __name__ == "__main__":
    main()
```

## Summary

This Python OSD monitoring script collects status, performance, and utilization metrics from Ceph, detects down or high-latency OSDs, and sends structured Slack alerts. Running it every few minutes via a Kubernetes CronJob gives you proactive OSD failure detection before issues impact application performance.
