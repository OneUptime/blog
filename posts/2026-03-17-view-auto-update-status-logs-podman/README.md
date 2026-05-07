# How to View Auto-Update Status and Logs in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Monitoring, Logging

Description: Learn how to monitor Podman auto-update status, view update history, and check logs for update successes and failures.

---

> Monitor your Podman auto-update system by checking update status, reviewing logs, and tracking which containers have been updated.

Keeping track of auto-updates is important for maintaining system health. Podman and systemd provide several tools to monitor update status, review history, and diagnose issues.

---

## Check Current Auto-Update Status

```bash
# See which containers are configured for auto-update

podman auto-update --dry-run
```

Output:

```text
UNIT                    CONTAINER       IMAGE                              POLICY      UPDATED
webapp.service          abc123def456    docker.io/myorg/webapp:latest      registry    pending
api.service             def456abc789    docker.io/myorg/api:latest         registry    false
worker.service          789abc123def    localhost/worker:latest             local       false
```

Status values:
- **pending** - A newer image is available
- **true** - Updated during a real auto-update run
- **false** - No update needed
- **failed** - Update attempted but failed

## View Auto-Update Service Logs

```bash
# View the most recent auto-update run
journalctl --user -u podman-auto-update.service -n 50

# View all auto-update activity from the last week
journalctl --user -u podman-auto-update.service --since "7 days ago"

# Follow auto-update logs in real time
journalctl --user -u podman-auto-update.service -f
```

## Check Timer Status

```bash
# View when the last update ran and when the next is scheduled
systemctl --user list-timers podman-auto-update.timer

# Check if the timer is active
systemctl --user status podman-auto-update.timer
```

## View Container-Specific Update History

```bash
# Check when a specific container was last restarted (indicating an update)
podman inspect webapp --format '{{.State.StartedAt}}'

# Check the current image digest
podman inspect webapp --format '{{.ImageDigest}}'

# View the service journal for update-related restarts
journalctl --user -u webapp.service | grep -i "start\|stop\|restart"
```

## JSON Output for Monitoring Scripts

```bash
# Get auto-update status in JSON format
podman auto-update --dry-run --format json

# Parse with Python to find pending updates
podman auto-update --dry-run --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data:
    if item.get('Updated') == 'pending':
        print(f\"Update available: {item['Unit']} - {item['Image']}\")
"
```

## Monitoring Script

```bash
#!/bin/bash
# check-updates.sh - Report auto-update status

echo "=== Podman Auto-Update Status ==="
echo "Date: $(date)"
echo ""

echo "Timer status:"
systemctl --user is-active podman-auto-update.timer
echo ""

echo "Last run:"
systemctl --user show podman-auto-update.service --property=ExecMainStartTimestamp
echo ""

echo "Available updates:"
podman auto-update --dry-run 2>/dev/null
echo ""

echo "Recent update log:"
journalctl --user -u podman-auto-update.service --since "24 hours ago" --no-pager -q
```

## Summary

Monitor Podman auto-updates through `podman auto-update --dry-run` for current status, `journalctl` for update history, and `systemctl list-timers` for scheduling information. Use JSON output for scripting and monitoring integration. Regular monitoring ensures you catch failed updates and verify that containers are staying current.
