# How to Fix Tab Switching Causing Long Reloads in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Performance, Troubleshooting, Browser, UI

Description: Fix the annoying behavior where switching between Portainer browser tabs or navigating between sections triggers full page reloads and long wait times.

## Introduction

When switching between Portainer tabs in your browser, or navigating between the Containers, Stacks, and Images sections, some users experience full page reloads that take 10-30 seconds. This is usually caused by browser tab suspension, Portainer session expiry, or the browser discarding the application state to free memory.

## Understanding Why This Happens

Portainer is a Single Page Application (SPA) built with Angular. When you switch browser tabs:

1. **Browser tab suspension**: Modern browsers can deactivate or unload inactive tabs to save memory, discarding JavaScript state
2. **Session timeout**: Portainer's JWT token may expire, requiring re-authentication
3. **UI re-initialization**: When the app is re-activated, it may need to re-fetch data
4. **Large data payloads**: The re-fetch takes long because there are many containers/stacks to load

## Step 1: Disable Browser Tab Suspension

### Chrome

1. Open Chrome **Settings**
2. Go to **Performance**
3. Turn **Memory Saver** off
4. Or keep it enabled and add your Portainer URL under **Always keep these sites active**

### Firefox

1. Open `about:config`
2. Search for `browser.tabs.unloadOnLowMemory`
3. Set to `false`

You can also open `about:unloads` to see whether Firefox is unloading inactive tabs.

## Step 2: Increase Portainer Session Timeout

By default, Portainer sessions have a lifetime of 8 hours:

```bash
# Check current session settings

# Via API: configurable through the settings endpoint
# Via UI: Settings → Authentication → Session lifetime

# In Portainer UI:
# Settings → Authentication → Authentication settings
# Increase "Session lifetime" to a longer value (e.g., 24h or 72h)
```

## Step 3: Use a Poll Script Only as a Diagnostic

This can confirm whether the tab is still executing timers, but it does **not** prevent browser tab suspension and it does **not** extend Portainer's JWT session lifetime:

```javascript
// Run in the Portainer browser console for diagnosis only
setInterval(() => {
  // Poll Portainer's public status endpoint
  fetch('/api/system/status')
    .then(r => console.log('Status poll:', r.status))
    .catch(e => console.log('Status poll failed:', e));
}, 4 * 60 * 1000);  // Every 4 minutes
```

## Step 4: Increase the Snapshot Interval

Snapshot jobs are separate from normal tab navigation, but in large installations reducing their frequency can lower background load on the Portainer server. Portainer's snapshot interval controls how often it captures basic environment snapshot data:

```bash
docker stop portainer && docker rm portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval=10m
```

## Step 5: Fix Browser Memory Pressure

Tab reloads happen more frequently when the browser is under memory pressure:

```bash
# Check what else is using memory
# Close unused browser tabs
# Reduce browser extensions running on Portainer's tab
```

## Step 6: Optimize Portainer API Response Size

For large environments, filtered API calls can help you confirm whether large list payloads are part of the slowdown. This is useful for diagnosis, but it does not change what the built-in UI requests:

```bash
# Use the API with filters to reduce response size
# Instead of fetching all containers, filter to specific status/stack

# Test API response sizes
TOKEN=$(curl -s -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Check unfiltered response size
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/endpoints/1/docker/containers/json | wc -c

# Check filtered (running only) response size
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:9000/api/endpoints/1/docker/containers/json?filters=%7B%22status%22%3A%5B%22running%22%5D%7D" | wc -c
```

## Step 7: Enable HTTP/2 on Your Reverse Proxy

HTTP/2 multiplexing reduces the overhead of multiple API calls:

```nginx
server {
    listen 443 ssl;
    http2 on;  # Enable HTTP/2
    server_name portainer.yourdomain.com;

    # ... rest of config
}
```

```bash
# Verify HTTP/2 is working
curl -I --http2 https://portainer.yourdomain.com | grep HTTP
# Should show: HTTP/2 200
```

## Step 8: Use Portainer's "Quick Actions"

Instead of navigating to full pages (which trigger full data fetches), use:

1. **Container quick actions**: Click the action buttons directly from the container list
2. **Stack actions**: Use the action menu in the stack list without opening the stack detail

These avoid triggering a full page re-render.

## Step 9: Bookmark Specific Portainer Views

Instead of navigating through multiple pages, bookmark direct URLs:

```text
# Direct URL to containers list
https://portainer.yourdomain.com/#!/1/docker/containers

# Direct URL to stacks list
https://portainer.yourdomain.com/#!/1/docker/stacks
```

## Step 10: Monitor Portainer Logs

Long tab-switching reload times are often tied to slow environment/API calls or server-side errors. Enable debug logging briefly and inspect the Portainer logs:

```bash
# Enable debug mode briefly to see detailed server logs
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=DEBUG

# Check for warnings, errors, and snapshot-related messages
docker logs portainer 2>&1 | grep -iE "error|warn|snapshot|timeout" | head -30
```

## Conclusion

Tab switching causing long reloads in Portainer is typically a combination of browser tab suspension discarding the application state, Portainer session expiry, and large data payload re-fetches. The most effective fixes are preventing the browser from deactivating the Portainer site and increasing the session lifetime in Portainer settings. Snapshot interval tuning and log review are secondary server-side tuning steps when the Portainer instance itself is under load.
