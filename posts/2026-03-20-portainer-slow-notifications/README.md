# How to Fix Slow Notification Loading Affecting Bulk Operations - Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Performance, Troubleshooting, Notification

Description: Resolve Portainer performance issues where slow notification loading blocks or delays bulk container operations, stack deployments, and UI interactions.

## Introduction

Portainer can feel sluggish during bulk operations when the UI is busy rendering a large notification history or when other logging and storage issues are present. In current Portainer releases, UI notifications are separate from Business Edition activity logs, so it is important to troubleshoot the right subsystem. This guide explains the supported ways to clear notification history, inspect activity logs, and rule out broader Portainer performance issues.

## Step 1: Check Notification Count

Open **Settings** -> **Notifications** and review how large the notification history has become. Portainer also shows the 50 most recent notifications from the bell icon in the top-right corner of the UI.

If you have a very large notification history, clear it from the UI before investigating deeper performance issues.

## Step 2: Clear All Notifications

Use the Portainer UI to clear notifications:

1. Click the bell icon and use **Clear all** to remove the current notification history
2. Go to **Settings** -> **Notifications** to remove specific notification records from the full list

Portainer does not document a server-side `/api/notifications` endpoint for this.

## Step 3: Prevent Notification Accumulation

Current Portainer docs do not expose a notification retention period or maximum-count setting. Prevent buildup by periodically clearing old notifications from the bell menu or from **Settings** -> **Notifications**.

If the notification UI still feels stale after cleanup, clear the Portainer site's browser storage and sign in again.

## Step 4: Compact the Portainer Database Separately

Portainer supports `--compact-db` to reclaim space in the main datastore on startup, but this does not clear browser-side notifications. Use it as a general maintenance step if the `/data` volume has grown or overall Portainer storage performance has degraded:

```bash
# Stop Portainer and redeploy it with database compaction enabled on startup
docker stop portainer && docker rm portainer

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --compact-db
```

## Step 5: Check User Activity Logs

In Portainer Business Edition, activity logs are separate from UI notifications and are read-only. Open **Logs** -> **Activity** to review them. You can filter the logs by date range, user, and environment, and export the filtered results as CSV.

Current Portainer releases retain user activity logs for at most 7 days.

## Step 6: Identify Which Operations Are Slow

```bash
# Enable debug logging temporarily
docker stop portainer && docker rm portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --log-level DEBUG

# Perform the slow operation
# Then check logs for timing info
docker logs portainer 2>&1 | grep -Ei "activity|database|slow|ms|error" | tail -30
```

## Step 7: Workaround - Perform Bulk Operations via CLI

When Portainer UI is slow, use CLI for bulk operations:

```bash
# Stop multiple containers from CLI (faster than Portainer UI)
docker stop container1 container2 container3

# Restart all containers in a stack
cd /opt/stacks/mystack
docker compose restart

# Pull and redeploy a stack
docker compose pull && docker compose up -d
```

## Step 8: Use the Portainer API Instead of UI for Bulk Operations

```bash
# Bulk stop containers via the Portainer API gateway
API_KEY="your_api_key_here"
PORTAINER_URL="https://localhost:9443"

# Get all running container IDs
CONTAINERS=$(curl -sk -H "X-API-Key: $API_KEY" \
  --get \
  --data-urlencode 'filters={"status":["running"]}' \
  "$PORTAINER_URL/api/endpoints/1/docker/containers/json" | \
  jq -r '.[].Id')

# Stop each container
for ID in $CONTAINERS; do
  curl -sk -X POST \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/1/docker/containers/$ID/stop"
  echo "Stopped: $ID"
done
```

## Step 9: Tune the Portainer Database for Performance

Slow storage can still affect Portainer's main datastore and Business Edition activity logs even though UI notifications themselves are browser-side.

```bash
# Check current I/O performance
iostat -x 1 3

# If storage is the bottleneck, copy the existing Portainer data first
docker stop portainer && docker rm portainer

docker run --rm \
  -v portainer_data:/from \
  -v /ssd/portainer-data:/to \
  alpine sh -c 'cd /from && cp -a . /to/'

# Start Portainer from the faster path
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /ssd/portainer-data:/data \
  portainer/portainer-ce:sts
```

## Step 10: Schedule Supported Maintenance Instead

Portainer UI notifications are stored in the browser, so there is no documented server-side API you can safely call from cron to purge them on a schedule.

If you need routine maintenance, automate supported tasks such as backups, monitoring the `/data` volume, or starting Portainer with `--compact-db`. Clear notification history from the UI when needed.

## Conclusion

A large notification history is a UI cleanup task, not a Portainer API or BoltDB cleanup task. The immediate fix is to remove old notifications from the bell menu or the Notifications page. Database compaction is a separate maintenance task for the Portainer datastore, and Business Edition activity logs are a separate feature with their own behavior and retention window. If the UI is still sluggish after notification cleanup, use debug logging and fall back to the CLI or Portainer API for bulk operations while you investigate.
