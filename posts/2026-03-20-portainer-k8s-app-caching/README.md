# How to Enable Application Data Caching for Kubernetes in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Performance, Caching, Configuration

Description: Enable and configure application data caching for Kubernetes environments in Portainer to dramatically reduce API response times and improve UI performance for large clusters.

## Introduction

When managing large Kubernetes clusters in Portainer, the UI can become slow because the browser needs to repeatedly fetch Kubernetes data through Portainer as you move between views. Portainer's front-end data caching feature stores cached Kubernetes responses in your user session, allowing the UI to reuse them during navigation instead of refetching the same data every time.

## What Application Data Caching Does

When enabled, Portainer:
1. Caches eligible Kubernetes responses in the front-end for your user session
2. Reuses cached responses on subsequent UI requests
3. Expires cached entries automatically after five minutes

**Benefits:**
- Faster repeated navigation through Kubernetes views
- Reduces repeated requests from the browser to Portainer for the same data
- Improves perceived UI performance on large clusters

**Tradeoff:** Data may be slightly stale for up to five minutes.

## Step 1: Enable Caching in Portainer UI

1. Log in to Portainer
2. Click your username in the top-right corner
3. Select **My account**
4. Scroll to **Application settings**
5. Enable **Enable front-end data caching for Kubernetes environments**
6. Click **Save**
7. Allow Portainer to reload the page after the setting is saved

## Step 2: Enable via Portainer API

```bash
PORTAINER_URL="https://localhost:9443" # use http://localhost:9000 only if legacy HTTP is enabled

TOKEN=$(curl -s -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Get the current user and confirm the existing cache setting
curl -s -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/users/me" | jq '{Id, Username, UseCache}'

USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/users/me" | jq -r .Id)

# Update the user setting to enable front-end caching
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/users/$USER_ID" \
  -d '{
    "UseCache": true
  }' | jq '{Id, Username, UseCache}'
```

## Step 3: Verify Caching Is Working

```bash
# Confirm the current user has caching enabled
curl -s -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/users/me" | jq '{Username, UseCache}'

# Confirm Portainer marks Kubernetes proxy responses as cacheable
curl -sk -D - -o /dev/null \
  -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints/2/kubernetes/api/v1/namespaces" | grep -i '^X-Portainer-Cache:'
```

Actual cache hits happen in the browser session, so use your browser's Network tab while navigating Portainer's Kubernetes views to observe repeated requests being served from the front-end cache.

## Step 4: Understand the Cache Duration

Portainer uses a fixed cache lifetime for this feature.

| Setting | Value |
|---------|-------|
| Cache duration | 5 minutes |
| Configurable in UI | No |
| Configurable via endpoint API | No |

In Portainer UI: **My account** → **Application settings** lets you enable or disable the feature, but not change its duration.

## Step 5: Understand Cache Invalidation

The front-end cache is cleared when the five-minute lifetime expires, when you use Portainer's page refresh control, when your session performs Kubernetes write requests such as `POST`, `PUT`, `PATCH`, or `DELETE`, and when you log in or log out. There is no documented environment-level cache refresh endpoint for this feature.

## Step 6: Monitor Caching Performance

Because this is a front-end cache, the most reliable way to observe it is in your browser's developer tools while using Portainer. Portainer container logs and container memory usage do not provide a direct measure of whether this Kubernetes UI cache is being hit.

## Step 7: Caching for Multiple Kubernetes Environments

This setting is per user and applies across the Kubernetes environments that the user can access:

```bash
# Get all Kubernetes environments
curl -s -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints" | \
  jq '.[] | select(.Type == 5 or .Type == 6 or .Type == 7) | {id: .Id, name: .Name, type: .Type}'

# Enable caching once per user
# via Portainer UI: My account → Application settings
```

## Step 8: What Gets Cached

Portainer documents this feature as front-end data caching for Kubernetes environments rather than a resource-by-resource server-side cache. In practice, Portainer marks Kubernetes proxy responses with `X-Portainer-Cache: true`, and the browser session caches the eligible responses used by the UI.

## Step 9: Disable Caching for Troubleshooting

If you suspect the cache is serving stale data:

1. **Portainer UI**: Click your username → **My account** → disable **Enable front-end data caching for Kubernetes environments** → **Save**
2. **API**: Set `UseCache` to `false` for the current user
3. **Workaround**: Use Portainer's page refresh button or reload the page to clear cached Kubernetes responses

```bash
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/users/$USER_ID" \
  -d '{
    "UseCache": false
  }' | jq '{Id, Username, UseCache}'
```

## Conclusion

Application data caching for Kubernetes in Portainer can materially improve repeated navigation in large clusters, but it is a per-user front-end cache with a fixed five-minute lifetime rather than a per-environment server-side cache. Enable it for users who want faster repeated navigation in Kubernetes views, and disable it when they need the freshest possible view of cluster state.
