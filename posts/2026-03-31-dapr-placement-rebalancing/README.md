# How to Handle Dapr Placement Rebalancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Placement, Rebalancing, Kubernetes

Description: Learn how to handle Dapr placement rebalancing events to minimize actor redistribution disruptions and keep your distributed actor system stable.

---

## What Is Placement Rebalancing?

Dapr's Placement service maintains a consistent hash ring that maps actor types to specific host instances. When actor hosts join or leave the cluster, the placement service recalculates the ring and disseminates an updated table to connected sidecars. During rebalancing, in-flight actor calls may fail briefly until the new table is applied.

## How Rebalancing Works

When a new Dapr sidecar registers actor types or an existing sidecar disconnects, the service recalculates the hash ring and pushes an updated placement table to all connected sidecars.

```bash
# Watch placement rebalancing events in logs
kubectl logs -n dapr-system -l app=dapr-placement-server --follow | grep -i "rebalance\|table"
```

## Configure HA for Stable Rebalancing

The supported placement settings are the HA and keep-alive values exposed by the Helm chart. Use them to keep leader failover predictable during rebalancing events.

```yaml
dapr_placement:
  ha: true
  keepAliveTime: 2s
  keepAliveTimeout: 3s
```

Apply the configuration:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --set dapr_placement.ha=true \
  --reuse-values
```

## Graceful Shutdown During Rebalancing

Configure actor hosts to drain active actors before shutdown to reduce lost work during rebalancing:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: actor-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/graceful-shutdown-seconds: "25"
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: actor-service
```

## Detecting Rebalancing in Your Application

Use the Dapr health endpoint to detect when your sidecar is in a rebalancing state and pause outgoing calls if needed:

```javascript
const axios = require('axios');

async function waitForSidecarReady() {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await axios.get('http://localhost:3500/v1.0/healthz/outbound');
      if (res.status === 204) return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Sidecar did not become ready after rebalancing');
}
```

## Monitoring Rebalancing Frequency

Use Prometheus to track how often rebalancing occurs:

```bash
# Query placement rebalancing metrics
dapr_placement_runtimes_total
dapr_placement_actorruntimes_total
```

Set up an alert if rebalancing is too frequent, which may indicate unstable node membership.

## Summary

Dapr Placement rebalancing redistributes actors when cluster membership changes. By using the documented HA settings, configuring graceful shutdown, and monitoring rebalancing frequency with Prometheus metrics, you can minimize disruptions and keep actor workloads stable during scaling events or node failures.
