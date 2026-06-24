# How to Fix Slow Notification Loading Affecting Bulk Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Performance, Notification, Bulk Operation, Optimization

Description: Learn how to fix Portainer's slow notification loading that blocks bulk container and stack operations, including notification queue management and database optimization.

---

In environments with high activity, Portainer's notification history can build up in the browser. After bulk operations (like restarting multiple containers), the large number of success and error popups can make the notification list and UI feel slow.

## Understanding the Problem

Portainer stores its server configuration in BoltDB, but notification history is stored per user in the browser, not in `portainer.db`. Activity logs are also separate from notifications. A large notification history can cause:

- Slow loading of the Notifications page
- Slower response when opening the bell menu
- Sluggish UI after actions that generate many notifications

## Step 1: Check Notification History Size

```js
// In the browser console while logged into Portainer
localStorage.getItem('portainer.notifications')?.length

// A large value here indicates a large browser-side notification history
```

## Step 2: Clear Old Notifications

In Portainer go to **Notifications** or click the **bell icon** and choose **View all notifications**. Remove old entries. The bell menu only shows the 50 most recent notifications, so use the full Notifications page for large cleanups.

## Step 3: Reset Browser-side Notification Storage

If the list is too large to manage comfortably in the UI, clear the stored notification history for that browser profile:

```js
// In the browser console while logged into Portainer
localStorage.removeItem('portainer.notifications')

// Reload the page after clearing the key
location.reload()
```

## Step 4: Review Activity Logs Separately (Business Edition)

In Portainer Business Edition, activity logs are under **Logs > Activity**, not **Settings > General**. They are read-only, separate from the browser-stored notification history, and the current UI notes a maximum retention of 7 days.

## Step 5: Reduce Concurrent Bulk Operations

Instead of selecting all containers and restarting simultaneously, process them in smaller batches:

```bash
# Use Docker CLI for bulk operations on an explicit list of containers
printf '%s\n' container1 container2 container3 | xargs -r -n 1 -P 4 docker restart
# -n 1 restarts one container per command, -P 4 means up to 4 in parallel
```

## Step 6: Monitor Server-side Database Growth

Portainer's `portainer.db` can still grow over time, but it is not the notification store. Monitor it separately from browser-side notification history:

```bash
# Server-side Portainer DB size check; this does not measure browser notifications
DB_SIZE=$(docker run --rm -v portainer_data:/data alpine stat -c %s /data/portainer.db)
if [ "$DB_SIZE" -gt 209715200 ]; then
  echo "Portainer DB exceeds 200MB: consider restarting Portainer with --compact-db"
fi
```
