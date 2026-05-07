# How to Automate Environment Snapshots and Reporting in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Snapshot, Automation, API, Reporting, DevOps, Backup

Description: Learn how to automate Portainer environment snapshots and generate reports on container, stack, and resource usage across your environments.

---

Portainer's snapshot feature captures a point-in-time view of each environment's resources - containers, stacks, images, volumes, and networks. Automating snapshots and generating reports helps with capacity planning, compliance auditing, and change tracking. This guide covers using the Portainer API to trigger snapshots and export environment reports.

---

## Step 1: Trigger Environment Snapshots via API

Portainer exposes explicit snapshot endpoints in its API. Triggering snapshots requires an administrator API key.

```bash
#!/bin/bash
# trigger-snapshots.sh - force snapshot refresh for all environments

PORTAINER_URL="https://portainer.example.com"
API_KEY="ptr_your_api_key_here"

echo "Triggering environment snapshots..."

# Get all environments

ENDPOINTS=$(curl -s -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints" | \
  python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    print(e['Id'])
")

# Trigger snapshot for each environment
for ENV_ID in $ENDPOINTS; do
  echo "Snapshotting environment $ENV_ID..."
  curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENV_ID/snapshot" > /dev/null
  echo "  Done."
done

echo "All snapshots updated."
```

---

## Step 2: Generate an Environment Report

Query the Portainer API to build a comprehensive report on each Docker-compatible environment's resources.

```python
#!/usr/bin/env python3
# portainer-report.py - generate environment resource report

import requests
import json
import sys
from datetime import datetime

PORTAINER_URL = "https://portainer.example.com"
API_KEY = "ptr_your_api_key_here"
HEADERS = {"X-API-Key": API_KEY}
DOCKER_ENDPOINT_TYPES = {1, 2, 4}

def get_container_stats(env_id: int) -> dict:
    """Get container counts by status for an environment."""
    r = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{env_id}/docker/containers/json",
        headers=HEADERS,
        params={"all": True}
    )
    containers = r.json() if r.ok else []
    stats = {"running": 0, "stopped": 0, "unhealthy": 0, "total": 0}
    for c in containers:
        stats["total"] += 1
        status = c.get("State", "")
        if status == "running":
            stats["running"] += 1
        elif status == "exited":
            stats["stopped"] += 1
        if "unhealthy" in c.get("Status", ""):
            stats["unhealthy"] += 1
    return stats

def get_stack_count(env_id: int) -> int:
    """Count stacks in an environment."""
    r = requests.get(
        f"{PORTAINER_URL}/api/stacks",
        headers=HEADERS,
        params={"filters": json.dumps({"EndpointID": str(env_id)})}
    )
    return len(r.json()) if r.ok else 0

def get_image_count(env_id: int) -> dict:
    """Get image count and total size."""
    r = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{env_id}/docker/images/json",
        headers=HEADERS
    )
    images = r.json() if r.ok else []
    total_size = sum(img.get("Size", 0) for img in images)
    return {"count": len(images), "total_gb": round(total_size / 1024**3, 2)}

def generate_report():
    """Generate full environment report."""
    envs_r = requests.get(f"{PORTAINER_URL}/api/endpoints", headers=HEADERS)
    environments = envs_r.json()

    report = {
        "generated_at": datetime.now().isoformat(),
        "environments": []
    }

    for env in environments:
        if env.get("Type") not in DOCKER_ENDPOINT_TYPES:
            continue

        env_id = env["Id"]
        containers = get_container_stats(env_id)
        images = get_image_count(env_id)
        stacks = get_stack_count(env_id)

        report["environments"].append({
            "name": env["Name"],
            "id": env_id,
            "containers": containers,
            "stacks": stacks,
            "images": images
        })

    return report

if __name__ == "__main__":
    report = generate_report()
    print(json.dumps(report, indent=2))

    # Save report to file
    filename = f"portainer-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(filename, "w") as f:
        json.dump(report, f, indent=2)
    # Keep stdout machine-readable for pipes such as email or Pushgateway exports.
    print(f"\nReport saved to: {filename}", file=sys.stderr)
```

---

## Step 3: Schedule Reports and Send via Email

```bash
# Schedule daily report at 8 AM and email it
0 8 * * * /usr/local/bin/portainer-report.py | mail -s "Daily Portainer Report" devops@example.com
```

---

## Step 4: Export Reports to a Dashboard

Pipe the report data to a Prometheus Pushgateway or another time-series database for trending.

```bash
# Push metrics to Prometheus Pushgateway
python3 portainer-report.py | python3 -c "
import sys, json
report = json.load(sys.stdin)
print('# HELP portainer_containers_running Running containers per environment')
print('# TYPE portainer_containers_running gauge')
print('# HELP portainer_containers_stopped Stopped containers per environment')
print('# TYPE portainer_containers_stopped gauge')
for env in report['environments']:
    name = env['name'].replace('\\\\', r'\\\\').replace('\\n', r'\\n').replace('\"', r'\\\"')
    running = env['containers']['running']
    stopped = env['containers']['stopped']
    print(f'portainer_containers_running{{env=\"{name}\"}} {running}')
    print(f'portainer_containers_stopped{{env=\"{name}\"}} {stopped}')
" | curl --data-binary @- http://pushgateway:9091/metrics/job/portainer
```

---

## Summary

Automating Portainer environment snapshots and reporting gives you continuous visibility into your container fleet's health and resource usage. The Portainer API exposes all the data needed to build custom reports: container states, image sizes, stack counts, and more. Schedule daily reports for capacity planning and compliance, and push metrics to a monitoring system for trend analysis.
