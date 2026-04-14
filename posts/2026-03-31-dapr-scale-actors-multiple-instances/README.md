# How to Scale Actors Across Multiple Instances in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Scaling, Placement Service, Kubernetes

Description: Learn how Dapr distributes actor instances across multiple app replicas using the placement service, and how to configure your deployment for horizontal scaling.

---

One of the key benefits of Dapr's virtual actor model is transparent distribution. As you scale your application from one instance to many, Dapr's placement service automatically redistributes actor instances across available hosts.

## How the Placement Service Works

The Dapr placement service maintains a hash ring of all registered actor hosts. When a client calls an actor method, the Dapr sidecar:

1. Queries the placement service for the current host of that actor ID.
2. Forwards the call to the sidecar on that host.
3. The receiving sidecar activates the actor locally if not already active.

Actor IDs are consistently mapped to hosts using a consistent hashing algorithm, so the same actor ID always routes to the same host (unless that host goes down or is rebalanced).

## Scaling the Actor Service on Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: counter-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: counter-service
  template:
    metadata:
      labels:
        app: counter-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "counter-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: counter-service
        image: myregistry/counter-service:latest
        ports:
        - containerPort: 8080
```

Scaling to 3 replicas means Dapr distributes actor IDs across all 3 pods.

## Horizontal Pod Autoscaling

Configure HPA based on CPU or custom metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: counter-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: counter-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Actor Rebalancing During Scaling

When new instances are added or removed, Dapr rebalances actor assignments. Enable draining to handle rebalancing gracefully:

```json
{
  "entities": ["Counter"],
  "drainOngoingCallTimeout": "15s",
  "drainRebalancedActors": true
}
```

## Monitoring Distribution

Check how actors are distributed across instances using the Dapr metrics endpoint:

```bash
# Per-instance actor count
curl http://localhost:9090/metrics | grep dapr_runtime_actor
```

Expected output shows balanced distribution:

```text
dapr_runtime_actor_active_actors{app_id="counter-service",actor_type="Counter",namespace="default"} 342
```

## State Store Considerations

Since actor state is stored in a shared external state store (Redis, Cosmos DB, etc.), scaling app instances does not duplicate or fragment state. All instances read from and write to the same backend:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-cluster:6379"
  - name: actorStateStore
    value: "true"
```

## Summary

Dapr's placement service handles actor distribution transparently as you scale your application horizontally. Simply increase the replica count and Dapr rebalances actor assignments across the new instances. Enabling drain settings and using a highly available state store backend ensures zero actor state loss during scale-out and scale-in events.
