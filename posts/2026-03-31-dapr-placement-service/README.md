# How to Understand the Dapr Placement Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement Service, Actor, Control Plane, Distributed System

Description: Understand how the Dapr Placement service tracks actor host locations using consistent hashing, distributes placement tables to sidecars, and supports high availability.

---

## What Is the Dapr Placement Service?

The Dapr Placement service is a control plane component that manages the location of virtual actor instances. It maintains a distributed hash table that maps actor types and IDs to the specific host (sidecar) that is currently running them. Every sidecar hosting actors registers with the Placement service and receives placement table updates.

```mermaid
flowchart TD
    subgraph dapr-system
        P[Placement Service\nport 50005]
    end
    subgraph Sidecars
        S1[Sidecar: order-service\nhost: pod-1]
        S2[Sidecar: order-service\nhost: pod-2]
        S3[Sidecar: order-service\nhost: pod-3]
    end
    S1 -->|register actor types| P
    S2 -->|register actor types| P
    S3 -->|register actor types| P
    P -->|distribute placement table| S1
    P -->|distribute placement table| S2
    P -->|distribute placement table| S3
```

## What Problem Does It Solve?

Virtual actors are single-threaded objects. Only one instance of `OrderActor` with ID `"order-123"` can be active at any time, regardless of how many replicas of the hosting service are running. The Placement service ensures every sidecar knows which pod is running which actor, preventing concurrent activation of the same actor instance.

## How Consistent Hashing Works

The Placement service uses consistent hashing (a hash ring) to assign actor instances to hosts. When the cluster topology changes (a pod starts or stops), only a small fraction of actor assignments change.

```mermaid
flowchart LR
    Actor["OrderActor/order-123"] -->|hash| Ring[Hash Ring]
    Ring -->|maps to| Host[pod-2: order-service]
    Note[When pod-2 leaves, only actors\non pod-2 are rehashed] --> Ring
```

## Registration Flow

1. The application declares its actor types via the actors API.
2. The sidecar connects to the Placement service and streams the available actor types.
3. The Placement service distributes an updated placement table to all connected sidecars.
4. When a sidecar needs to invoke an actor, it looks up the placement table to find the correct host.

```mermaid
sequenceDiagram
    participant App as App (declares actor types)
    participant Sidecar as daprd
    participant Placement as Placement Service
    participant OtherSidecar as Other daprd instances
    Sidecar->>App: GET /dapr/config (discover actor types)
    Sidecar->>Placement: Stream: RegisterHost {appId, actorTypes}
    Placement->>Placement: Update hash ring
    Placement->>Sidecar: Stream: PlacementOrder {operation, tables}
    Placement->>OtherSidecar: Stream: PlacementOrder (updated table)
    Note over Sidecar: Placement table cached in memory
```

## Actor Invocation Routing

When sidecar A wants to call `OrderActor/order-123` on sidecar B:

```mermaid
sequenceDiagram
    participant SA as Sidecar A
    participant P as Placement Table (local cache)
    participant SB as Sidecar B
    SA->>P: Lookup: OrderActor/order-123
    P->>SA: Host: pod-2 (10.0.0.5:50001)
    SA->>SB: gRPC Actor Invocation (mTLS)
    SB->>SB: Activate or reuse actor instance
    SB->>SA: Response
```

## Placement Service in Self-Hosted Mode

When you run `dapr init`, a Placement service container starts automatically:

```bash
docker ps | grep placement
```

Output:

```text
... daprio/dapr:1.14.0  0.0.0.0:50005->50005/tcp  dapr_placement
```

You can also start it manually:

```bash
placement -port 50005
```

## Placement Service on Kubernetes

Check the Placement service:

```bash
kubectl get pods -n dapr-system -l app=dapr-placement-server
kubectl get svc -n dapr-system dapr-placement-server
```

The service listens on port `50005` for sidecar registration gRPC streams.

## High Availability Mode

In production, run Placement with 3 replicas using Raft consensus for leader election:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_placement.replicaCount=3 \
  --set dapr_placement.volumeclaims.storageClassName=fast-ssd
```

Raft requires an odd number of nodes (1, 3, or 5) to achieve a quorum. With 3 replicas, the cluster can tolerate one failure.

```yaml
# Helm values
dapr_placement:
  replicaCount: 3
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 1000m
      memory: 512Mi
```

## Monitoring Placement

Check Placement logs for actor registration events:

```bash
kubectl logs -n dapr-system -l app=dapr-placement-server --tail=50
```

Check which actors are registered via the sidecar metadata:

```bash
curl http://localhost:3500/v1.0/metadata | jq '.actors'
```

Response:

```json
[
  {
    "type": "OrderActor",
    "count": 42
  },
  {
    "type": "UserActor",
    "count": 7
  }
]
```

## Key Configuration Points

The Placement service port is configured during Dapr initialization:

```bash
# Custom placement address in dapr run
dapr run \
  --app-id myapp \
  --placement-host-address localhost:50005 \
  -- node app.js
```

On Kubernetes, the sidecar discovers the Placement service address automatically through the `dapr-placement-server` Kubernetes service.

## Placement vs. Name Resolution

| Feature | Placement Service | Name Resolution |
|---------|------------------|-----------------|
| Purpose | Actor instance location | Service endpoint discovery |
| Used by | Actor building block | Service Invocation building block |
| Protocol | gRPC streaming | DNS / mDNS / Consul |
| Scope | Actor type + ID | App ID |

## Summary

The Dapr Placement service is a control plane component that maintains a consistent hash ring mapping actor instance IDs to the specific sidecar hosts running them. Sidecars register their actor types on startup and receive a distributed placement table. When an actor is invoked, the sidecar consults its local table copy to route the call to the correct host. In production, run Placement with 3 replicas using Raft consensus for high availability.
