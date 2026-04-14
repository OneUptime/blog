# How to Use the Dapr Placement API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement, API, Actor, Cluster

Description: A practical reference for the Dapr Placement service API covering actor host registration, hash ring management, and placement table queries.

---

## Overview

The Dapr Placement service maintains a consistent hash ring that maps actor type-ID combinations to specific host pods. Sidecars register their supported actor types with the Placement service, which then distributes placement tables to all connected sidecars. Applications and operators rarely call the Placement API directly, but understanding it helps with debugging actor routing issues.

## Placement Service Default Address

```yaml
localhost:50005  (self-hosted)
dapr-placement-server.dapr-system.svc.cluster.local:50005  (Kubernetes)
```

## Checking Placement Service Health

The Placement service exposes a gRPC health check:

```bash
grpc_health_probe -addr=localhost:50005
```

Or check via the Dapr status command:

```bash
dapr status --kubernetes | grep placement
```

## Viewing Active Hosts via the Metadata API

The sidecar metadata endpoint shows registered actor types from the Placement table:

```bash
curl http://localhost:3500/v1.0/metadata | jq '.actors'
```

Response:

```json
[
  {"type": "OrderActor", "count": 15},
  {"type": "CartActor", "count": 203}
]
```

## Querying Placement Tables (Internal gRPC API)

The Placement service exposes a gRPC API used by Dapr sidecars. While not meant for direct application use, you can query it for debugging:

```bash
# Using grpcurl to inspect the placement service
grpcurl -plaintext localhost:50005 list
```

Expected services:

```text
dapr.proto.placement.v1.Placement
grpc.health.v1.Health
```

## Actor Registration Flow

When your app starts with actor types registered, the sidecar:

1. Connects to the Placement service via gRPC streaming
2. Sends a `Host` message via the `ReportDaprStatus` stream with the actor types it hosts
3. Receives updated placement tables as a stream
4. The Placement service disseminates updated placement tables to all connected sidecars

Your app declares actor types by returning them from the `/dapr/config` endpoint:

```javascript
app.get("/dapr/config", (req, res) => {
  res.json({
    entities: ["OrderActor", "CartActor"],
    actorIdleTimeout: "1h",
    actorScanInterval: "30s",
    drainOngoingCallTimeout: "30s",
    drainRebalancedActors: true
  });
});
```

## Diagnosing Actor Routing Problems

When actor calls return 500 errors, check:

1. The Placement service is running:

```bash
kubectl get pods -n dapr-system -l app=dapr-placement-server
```

2. Your app is registering its actor types:

```bash
dapr logs --app-id order-service --kubernetes | grep -i "actor"
```

3. The sidecar received the placement table:

```bash
dapr logs --app-id order-service --kubernetes | grep -i "placement"
```

Expected log line:

```text
level=info msg="actors: placement tables updated"
```

## Placement in High Availability Mode

For production, run the Placement service with at least 3 replicas for leader election:

```bash
dapr init --kubernetes \
          --set dapr_placement.ha=true \
          --wait
```

## Summary

The Dapr Placement service is the backbone of the virtual actor system, maintaining the hash ring that routes actor calls to the correct host. While most developers never call its API directly, understanding the registration flow and table propagation is essential for diagnosing actor routing failures and planning high-availability actor deployments.
