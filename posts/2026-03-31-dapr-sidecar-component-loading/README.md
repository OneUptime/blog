# How to Configure Dapr Sidecar Component Loading

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Component, Configuration, Kubernetes

Description: Control how the Dapr sidecar discovers and loads components using namespaces, scopes, and hot reload settings to manage component visibility across services.

---

When the Dapr sidecar starts, it loads component definitions from Kubernetes CRDs (or a local directory in self-hosted mode). Understanding how component loading works lets you control which services have access to which components, prevent accidental cross-service access, and troubleshoot initialization failures.

## How Component Discovery Works

In Kubernetes mode, daprd reads `Component` CRDs from the Kubernetes API server. It loads components that are deployed in the same namespace as the pod. Components in other namespaces are not visible to the sidecar.

## Scoping Components to Specific Apps

By default, all components in a namespace are available to all apps in that namespace. Use the `scopes` field to restrict a component to specific app IDs:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
scopes:
  - order-service
  - payment-service
```

With this configuration, only pods with `dapr.io/app-id: order-service` or `dapr.io/app-id: payment-service` load this component. Other apps in the same namespace are not affected.

## Ignoring Specific Components

To prevent a component from being loaded by any app, set its namespace to one that no app uses, or use scopes with an empty list. A cleaner approach is to simply not deploy the component to environments where it should not exist.

## Component Loading Order

Dapr loads components in an unspecified order. If component B depends on component A (for example, a pub/sub component that uses a secret from a secret store), the secret store must be loaded first.

Dapr handles this by retrying component initialization. You can see these retries in the logs:

```bash
kubectl logs my-pod -c daprd | grep "component failed to init"
```

## Hot Reloading Components

Dapr supports hot reloading of components without restarting the sidecar. Enable it in the Dapr Configuration CRD:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  features:
    - name: HotReload
      enabled: true
```

With hot reload enabled, updating a Component CRD causes daprd to reinitialize that component without pod restarts.

## Verifying Loaded Components

Use the Dapr CLI to check which components were loaded by a running sidecar:

```bash
dapr components -k --namespace production
```

Or query the sidecar metadata API directly:

```bash
curl http://localhost:3500/v1.0/metadata | jq '.components'
```

## Self-Hosted Component Loading

In self-hosted mode, Dapr loads components from a local directory:

```bash
dapr run --app-id my-service \
  --resources-path ./components \
  -- node app.js
```

Each `.yaml` file in the directory is loaded as a component.

## Summary

Controlling Dapr sidecar component loading through namespace scoping, app-level scopes, and hot reload settings gives you precise control over which services access which backends. This is essential for multi-tenant clusters and for preventing services from accidentally interacting with components they do not own.
