# How to Use Namespaced Actors in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Namespace, Kubernetes, Multi-Tenancy

Description: Learn how to use Dapr namespaced actors to isolate actor instances by Kubernetes namespace, enabling multi-tenant deployments with separate state and routing.

---

Namespaced actors in Dapr allow you to run the same actor type in multiple Kubernetes namespaces, each with fully isolated state and placement. This is essential for multi-tenant SaaS architectures where different tenants must not share actor state.

## How Namespaced Actors Work

By default, Dapr's placement service treats actor types globally. With namespace support enabled, the placement service partitions actor placement by namespace, so `Counter/001` in `tenant-a` is distinct from `Counter/001` in `tenant-b`.

## How Namespace-Scoped Actor Placement Works

Dapr's placement service automatically partitions actor placement by namespace when actors are deployed in separate Kubernetes namespaces. Sidecars in one namespace do not receive placement information for applications in another namespace. No special Helm configuration is needed to enable this — it is the default behavior of the placement service.

To use namespaced actors, deploy your actor services and their state store components in separate Kubernetes namespaces, as shown in the sections below.

## Deploying Actor Services Per Namespace

Deploy the same actor service image in each namespace with namespace-specific component configurations:

```yaml
# tenant-a/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: tenant-a
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-tenant-a:6379"
  - name: actorStateStore
    value: "true"
```

```yaml
# tenant-b/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: tenant-b
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-tenant-b:6379"
  - name: actorStateStore
    value: "true"
```

## Calling Actors Across Namespaces

Actors in different namespaces cannot call each other directly. The placement service does not share placement information across namespaces, so an actor in `tenant-a` has no way to route to an actor in `tenant-b`. If you need cross-namespace communication, use Dapr service invocation with namespace-qualified app IDs:

```bash
# Invoke a service (not an actor) in tenant-a from another namespace
curl -X POST http://localhost:3500/v1.0/invoke/counter-service.tenant-a/method/increment \
  -H "Content-Type: application/json" \
  -d '{"amount": 1}'
```

Note that this invokes a service method, not an actor method directly. The target service can then interact with its local actors within its own namespace.

## Self-Hosted Namespaces

In self-hosted mode, namespaces are simulated using the `NAMESPACE` environment variable:

```bash
NAMESPACE=tenant-a dapr run --app-id counter-service \
  --app-port 8080 \
  -- ./counter-service
```

## Verifying Namespace Isolation

Check that actors are registered in the correct namespace via the placement HTTP endpoint:

First, ensure the placement metadata endpoint is enabled. In Helm, set:

```yaml
dapr_placement:
  metadataEnabled: true
```

Then query the placement state:

```bash
curl http://localhost:8080/placement/state
```

The response includes actor type registrations with their namespace tags.

## Best Practices

- Use separate Redis instances per namespace for hard state isolation between tenants.
- Never share the `statestore` component across namespaces in multi-tenant deployments.
- Apply Kubernetes NetworkPolicy to prevent cross-namespace Dapr sidecar communication.
- Monitor per-namespace actor counts using Dapr's Prometheus metrics endpoint.

## Summary

Namespaced actors in Dapr enable clean multi-tenant isolation by partitioning actor placement and state by Kubernetes namespace. This pattern is well-suited for SaaS platforms where tenant data must remain strictly separated. Configuring namespace-scoped placement and dedicated state stores per namespace provides both operational and security isolation.
