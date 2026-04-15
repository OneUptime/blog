# How to Use Dapr with Cloudflare Workers KV

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cloudflare, KV, State, Edge

Description: Configure Dapr's state store with Cloudflare Workers KV to leverage globally distributed edge storage for low-latency microservice state management.

---

## Overview

Cloudflare Workers KV is a globally distributed key-value store with low read latency across Cloudflare's edge network. Dapr supports Workers KV as a state store, allowing microservices to persist state in a globally replicated store that is ideal for session data, configuration caches, and geographically distributed applications.

## Prerequisites

- Cloudflare account with Workers KV enabled
- Dapr CLI installed
- A KV namespace created in Cloudflare

## Creating a KV Namespace

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a KV namespace
wrangler kv:namespace create "DAPR_STATE"
# Output: id = "abc123xyz..."
```

## Getting Your API Token

```bash
# Create an API token with KV edit permissions
# In Cloudflare dashboard: My Profile -> API Tokens -> Create Token
# Use "Edit Cloudflare Workers" template
```

## Configuring the Dapr State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.cloudflare.workerskv
  version: v1
  metadata:
  - name: cfAccountID
    value: "YOUR_ACCOUNT_ID"
  - name: cfAPIToken
    secretKeyRef:
      name: cloudflare-credentials
      key: apiToken
  - name: kvNamespaceID
    value: "YOUR_NAMESPACE_ID"
```

Store credentials:

```bash
kubectl create secret generic cloudflare-credentials \
  --from-literal=apiToken=YOUR_CLOUDFLARE_API_TOKEN
```

## Saving and Retrieving State

```bash
# Save session state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "session-user-42",
    "value": {"userId": "user-42", "permissions": ["read", "write"], "ttl": 3600},
    "metadata": {"ttlInSeconds": "3600"}
  }]'

# Get session state
curl http://localhost:3500/v1.0/state/statestore/session-user-42
```

## Feature Flag Caching Pattern

Use Workers KV as a global feature flag cache:

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient();

async function isFeatureEnabled(featureName) {
    try {
        const state = await client.state.get("statestore", `feature-flag-${featureName}`);
        if (state && state.enabled !== undefined) {
            return state.enabled;
        }
        // Fall back to default
        return false;
    } catch (err) {
        console.error("Feature flag fetch failed, defaulting to false", err);
        return false;
    }
}

async function syncFeatureFlags(flags) {
    const items = flags.map(flag => ({
        key: `feature-flag-${flag.name}`,
        value: { enabled: flag.enabled, rolloutPercentage: flag.percentage }
    }));
    await client.state.save("statestore", items);
}
```

## TTL Support for Expiring State

Workers KV natively supports TTL. Dapr passes TTL through the state options:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "rate-limit-ip-1.2.3.4",
    "value": {"count": 1, "window": "1m"},
    "metadata": {"ttlInSeconds": "60"}
  }]'
```

## Summary

Dapr's Cloudflare Workers KV state store provides globally distributed, low-latency state storage ideal for session management, feature flags, and rate limiting caches. The Dapr abstraction keeps application code decoupled from Cloudflare's API while benefiting from KV's edge replication capabilities.
