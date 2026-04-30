# How to Fix Portainer Blank Screen or Loading Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Docker, Browser Cache, UI Issues

Description: Learn how to diagnose and fix Portainer blank screen or infinite loading issues caused by stale browser cache, corrupted databases, or WebSocket problems.

---

A blank screen or spinner that never resolves in Portainer is one of the most common UI complaints. Common causes include a stale browser cache, a corrupted BoltDB database, or a broken WebSocket connection. This guide covers all three.

## Step 1: Clear Browser Cache and Hard Reload

Browser cache is the most common culprit after a Portainer upgrade.

```bash
# In Chrome/Edge: Ctrl+Shift+Delete → Clear cached images and files

# Or hard reload: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

Also try an incognito/private window to rule out extensions interfering.

## Step 2: Check Browser Console for Errors

Open browser Developer Tools (`F12`) and check the Console and Network tabs:

- `404` on `/api/websocket/...` → Reverse proxy likely is not forwarding the WebSocket path correctly
- `401 Unauthorized` on `/api/auth/logout` → Session token may be expired or invalid
- JavaScript errors mentioning `undefined` → Stale cached JS after upgrade

## Step 3: Check Portainer Container Logs

```bash
# Inspect Portainer server logs for startup errors
docker logs portainer --tail 100

# Look for lines mentioning database open/migration failures
# or JWT/authentication initialization errors
```

## Step 4: Fix a Corrupted BoltDB Database

If logs show database errors, the BoltDB file may be corrupt:

```bash
# Stop Portainer
docker stop portainer

# Back up the Portainer data volume to the current directory
docker run --rm -v portainer_data:/data -v "$PWD:/backup" alpine \
  tar czf /backup/portainer-data-backup.tar.gz -C /data .

# Rename the current database so Portainer creates a fresh one
docker run --rm -v portainer_data:/data alpine \
  mv /data/portainer.db /data/portainer.db.corrupt

# Restart Portainer - it will create a fresh database
docker start portainer
```

Note: Portainer stores users, settings, endpoints, and stack metadata in `/data`. Creating a fresh database resets that state, so use this only if you can restore from backup or redeploy afterward.

## Step 5: Fix WebSocket Behind a Reverse Proxy

If the blank screen occurs only behind Nginx, ensure WebSocket upgrade headers are forwarded:

```nginx
location /api/websocket/ {
    proxy_pass http://portainer:9000/api/websocket/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600;
}
```

## Step 6: Verify Memory

A Portainer process killed by the OOM killer may restart mid-request:

```bash
# Check if Portainer was OOM-killed
dmesg | grep -i "out of memory" | grep portainer
```

If so, see the guide on fixing Portainer memory issues on low-resource hosts.
