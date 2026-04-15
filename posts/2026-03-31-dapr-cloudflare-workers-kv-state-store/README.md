# How to Configure Dapr with Cloudflare Workers KV State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cloudflare, Workers KV, State Store, Edge

Description: Learn how to configure Dapr with Cloudflare Workers KV as a state store for edge-deployed microservices requiring globally distributed, low-latency key-value storage.

---

## Overview

Cloudflare Workers KV is a globally distributed key-value store that replicates data to Cloudflare's 300+ edge locations worldwide. As a Dapr state store, Workers KV is ideal for edge-deployed microservices or applications where you need low read latency globally. Note that KV offers eventual consistency with strong last-write-wins semantics.

## Prerequisites

- A Cloudflare account with Workers and Workers KV enabled
- Dapr CLI and runtime installed
- Wrangler CLI or Cloudflare API access

## Setting Up Cloudflare Workers KV

Create a KV namespace for Dapr state:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Create a KV namespace
wrangler kv namespace create "DAPR_STATE"
```

Note the namespace ID from the output. You will need it for the component configuration.

Get your Cloudflare API token:

```bash
# Create a token via Cloudflare dashboard:
# Profile -> API Tokens -> Create Token -> Edit Cloudflare Workers
```

## Configuring the Dapr Component

Create a Kubernetes secret with your Cloudflare credentials:

```bash
kubectl create secret generic cloudflare-secret \
  --from-literal=apiToken=YOUR_CLOUDFLARE_API_TOKEN
```

Create the Dapr state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cfkv-statestore
  namespace: default
spec:
  type: state.cloudflare.workerskv
  version: v1
  metadata:
  - name: cfAccountID
    value: "your-cloudflare-account-id"
  - name: cfAPIToken
    secretKeyRef:
      name: cloudflare-secret
      key: apiToken
  - name: kvNamespaceID
    value: "your-kv-namespace-id"
  - name: workerName
    value: "dapr-kv-worker"
  - name: key
    value: |
      -----BEGIN PRIVATE KEY-----
      your-ed25519-private-key-pem
      -----END PRIVATE KEY-----
```

Apply the component:

```bash
kubectl apply -f cfkv-statestore.yaml
```

## Using the Cloudflare Workers KV State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store CDN configuration state at the edge
await client.state.save("cfkv-statestore", [
  {
    key: "cdn-config-v2",
    value: {
      cacheControl: "public, max-age=86400",
      origins: ["origin1.example.com", "origin2.example.com"],
      geoblocking: ["KP", "IR"],
      minifyHTML: true
    }
  }
]);

const config = await client.state.get("cfkv-statestore", "cdn-config-v2");
console.log("CDN config:", config);
```

## Verifying State via the Cloudflare API

```bash
# List keys in the namespace
curl -X GET \
  "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/storage/kv/namespaces/YOUR_NAMESPACE_ID/keys" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Read a specific key
curl -X GET \
  "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/storage/kv/namespaces/YOUR_NAMESPACE_ID/values/cdn-config-v2" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## Consistency Considerations

Cloudflare Workers KV uses eventual consistency with global replication:

- Writes are usually immediately visible at the location where they are made, but this is not guaranteed
- Global propagation may take up to 60 seconds or more
- Reads from the edge serve the locally cached value

Use Workers KV for read-heavy, globally distributed state where eventual consistency is acceptable.

## Summary

Cloudflare Workers KV as a Dapr state store is uniquely suited for edge-deployed microservices that need globally distributed, low-latency reads. Its eventual consistency model and global replication make it ideal for configuration data and read-heavy workloads, while its integration with Cloudflare's edge network minimizes latency for end users worldwide.
