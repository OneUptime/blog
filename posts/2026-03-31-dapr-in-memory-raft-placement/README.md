# How to Use In-Memory Raft Store for Dapr Placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement Service, Raft, Testing, Configuration

Description: Configure the Dapr placement service to use an in-memory Raft store for local development and integration testing, eliminating the need for persistent storage volumes.

---

The Dapr placement service uses an in-memory Raft store by default (`inmem-store-enabled` defaults to `true`). This is ideal for local development, CI pipelines, and integration test environments as it does not require persistent volumes. For production Kubernetes deployments, you can configure disk-based persistence with the `raft-logstore-path` flag. This guide covers working with in-memory placement across different environments.

## When to Use In-Memory Raft

Use in-memory Raft for:
- Local development with `dapr init`
- Docker Compose integration test environments
- Kind clusters used for CI testing
- Ephemeral preview environments

Do NOT use in-memory Raft for production, as restarting the placement service loses all actor placement state, requiring all sidecars to re-register.

## Default Self-Hosted Mode

When you run `dapr init`, the placement service starts with in-memory storage by default:

```bash
dapr init
# Placement service starts at localhost:50005 with in-memory state
```

Verify it is running:

```bash
dapr status
# NAME       NAMESPACE  HEALTHY  STATUS   VERSION  ...
# placement  default    True     Running  1.14.0   ...
```

## Docker Compose with In-Memory Placement

Run a placement service without volumes in Docker Compose:

```yaml
# docker-compose.yml
services:
  placement:
    image: daprio/placement:1.14.0
    command:
      - "./placement"
      - "--port"
      - "50006"
      - "--log-level"
      - "error"
    ports:
      - "50006:50006"
```

## Kubernetes Deployment

In a Kubernetes test environment, deploy the placement service with the default in-memory Raft store. No persistent volumes are needed:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dapr-placement-test
  namespace: dapr-test
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: placement
          image: daprio/placement:1.14.0
          command: ["./placement"]
          args:
            - "--port"
            - "50006"
            - "--log-level"
            - "error"
```

Since in-memory Raft is the default, no volume mounts are required. Placement state is lost when the pod restarts - acceptable for test environments.

## Sidecar Connection to Test Placement

Configure sidecars to connect to the test placement service:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "test-actor-service"
  dapr.io/placement-host-address: "dapr-placement-test.dapr-test.svc.cluster.local:50006"
```

## Behavior After Restart

With in-memory or emptyDir storage, all sidecars must re-register their actor types after a placement service restart. This happens automatically - sidecars detect the connection drop and reconnect within seconds.

```bash
kubectl logs my-actor-pod -c daprd | grep "placement"
# "placement service connection lost, reconnecting..."
# "established connection to placement service"
# "actor runtime started"
```

## Performance Comparison

In-memory Raft is faster than disk-based Raft because it eliminates fsync calls:

```bash
# Measure actor activation latency with in-memory placement
time curl -X PUT http://localhost:3500/v1.0/actors/TestActor/test-1/method/Ping
# real 0m0.008s (vs ~0.015s with disk-based placement)
```

## Summary

The in-memory Raft store for Dapr placement service simplifies local development and CI/CD test environments by removing persistent volume requirements. While not suitable for production due to loss of placement state on restart, it provides a fast and lightweight placement service for actor-based integration testing.
