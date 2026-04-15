# How to Debug Dapr Applications on Kubernetes with kubectl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Debugging, kubectl, Troubleshooting

Description: Learn how to debug Dapr applications on Kubernetes using kubectl commands to inspect sidecar logs, pod status, component loading, and network issues.

---

## Debugging Dapr on Kubernetes

When a Dapr application misbehaves on Kubernetes, debugging involves inspecting both the application container and the `daprd` sidecar container. kubectl is the primary tool for this - it lets you view logs, exec into containers, inspect events, and check component status.

## Checking Pod and Sidecar Status

First, verify the pod is running and both containers are ready:

```bash
kubectl get pods -n default -l app=order-service
```

Look for `2/2` in the `READY` column, confirming both the app container and the Dapr sidecar are running. If you see `1/2`, one container is failing.

Describe the pod for detailed status and events:

```bash
kubectl describe pod order-service-7b4c8d9f6-xk2pq -n default
```

Look for `Events` at the bottom - these show CrashLoopBackOff reasons, failed image pulls, and liveness probe failures.

## Viewing Dapr Sidecar Logs

Each Dapr-enabled pod has a container named `daprd`. Stream its logs:

```bash
kubectl logs order-service-7b4c8d9f6-xk2pq -c daprd -n default
```

Follow logs in real time:

```bash
kubectl logs -f order-service-7b4c8d9f6-xk2pq -c daprd -n default
```

Filter for errors:

```bash
kubectl logs order-service-7b4c8d9f6-xk2pq -c daprd -n default | grep -i error
```

Common messages to look for:
- `Component loaded` - confirms successful component initialization
- `Error loading component` - component YAML is invalid or dependencies are unavailable
- `Failed to connect to app channel` - sidecar cannot reach the app on the configured port

## Checking Component Status

List all loaded Dapr components in the cluster:

```bash
kubectl get components -n default
```

Describe a specific component to check its configuration:

```bash
kubectl describe component statestore -n default
```

## Inspecting Dapr System Services

Check the health of Dapr system services:

```bash
kubectl get pods -n dapr-system
kubectl logs -n dapr-system -l app=dapr-operator
kubectl logs -n dapr-system -l app=dapr-placement-server
kubectl logs -n dapr-system -l app=dapr-sentry
```

If `dapr-operator` is failing, components will not be injected into new pods.

## Using Dapr CLI on Kubernetes

The Dapr CLI can show runtime status of applications:

```bash
dapr status -k
dapr list -k
```

Check a specific application's status:

```bash
dapr logs -k --app-id order-service --namespace default
```

## Port-Forwarding for Direct API Access

Forward the sidecar port to your local machine to call the Dapr HTTP API directly:

```bash
kubectl port-forward order-service-7b4c8d9f6-xk2pq 3500:3500 -n default
```

Then test sidecar health and invoke methods:

```bash
curl http://localhost:3500/v1.0/healthz
curl http://localhost:3500/v1.0/metadata
curl http://localhost:3500/v1.0/invoke/order-service/method/orders/order-123
```

The metadata endpoint is especially useful - it lists all loaded components and subscriptions the sidecar knows about.

## Summary

Debugging Dapr applications on Kubernetes starts with `kubectl get pods` to verify both containers are ready, then `kubectl logs -c daprd` to inspect the sidecar for component loading errors and connectivity issues. The Dapr CLI's `dapr status -k` and `dapr logs -k` commands provide a higher-level view, while `kubectl port-forward` gives direct access to the sidecar HTTP API for testing components in isolation.
