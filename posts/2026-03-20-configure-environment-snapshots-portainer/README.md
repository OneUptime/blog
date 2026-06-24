# How to Configure Environment Snapshots in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Snapshot, Configuration, Performance, Environment

Description: Configure the snapshot frequency and behavior for individual Portainer environments to balance UI freshness with system performance.

---

Configuring environment snapshots in Portainer helps balance up-to-date dashboard data with the overhead of polling managed environments.

## Overview

For standard environments, Portainer configures snapshot timing as a global application setting. A snapshot contains the information displayed on an environment home page along with other basic environment information, and the default interval is `5m`. For Edge Agent Async environments in Portainer Business Edition, you can also override snapshot timing per environment when you add the environment.

## Step-by-Step Instructions

### Via the Portainer UI

1. Log in to Portainer as an administrator
2. Navigate to **Settings** -> **General**
3. Under **Application settings**, find **Snapshot interval**
4. Enter a duration such as `30s`, `5m`, or `1h`
5. Save your changes

### Via the API

```bash
PORTAINER_URL="https://portainer.example.com:9443/api"
API_KEY="your-admin-access-token"

# View the current snapshot interval
curl -sS \
  "${PORTAINER_URL}/settings" \
  -H "X-API-Key: ${API_KEY}"

# Update the snapshot interval to 10 minutes
curl -sS -X PUT \
  "${PORTAINER_URL}/settings" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"SnapshotInterval":"10m"}'
```

## For Edge Agent Async Environments

If you are adding an Edge Agent Async environment in Portainer Business Edition, Portainer also lets you adjust snapshot timing for that specific environment during setup:

1. Go to **Environments** and click **Add environment**
2. Select **Docker Standalone** and choose **Edge Agent Async**
3. Expand **More settings**
4. Adjust the **Ping**, **Snapshot**, and **Command** intervals as needed
5. Create the environment and run the generated deployment command on the target system

## Best Practices

- Start with the default `5m` interval and reduce it only if you need fresher dashboard data
- Increase the interval for large or remote environments to reduce API, CPU, and network overhead
- Use per-environment snapshot overrides only for Edge Agent Async environments when the defaults are not sufficient
- Remember that snapshot settings affect how fresh environment summary data appears in the UI

---

*Monitor all your environments from a single pane of glass with [OneUptime](https://oneuptime.com).*
