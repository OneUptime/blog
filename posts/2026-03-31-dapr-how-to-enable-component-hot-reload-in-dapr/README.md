# How to Enable Component Hot Reload in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Hot Reload, Component, Operation, Configuration

Description: Learn how to enable Dapr component hot reload so that changes to component configurations take effect without restarting your application or the Dapr sidecar.

---

## What Is Dapr Component Hot Reload

Dapr component hot reload allows the Dapr sidecar to detect and apply changes to component configurations (state stores, pub/sub brokers, bindings, etc.) at runtime without requiring a pod restart or application restart. This is useful for configuration updates like rotating credentials, changing endpoints, or updating TTL settings in production with minimal disruption.

## Prerequisites

- Dapr v1.13+ installed
- Dapr operator running in the cluster (Kubernetes mode)
- Basic familiarity with Dapr components and configurations

## Enable Hot Reload in the Dapr Configuration

Hot reload is controlled by a feature flag in the Dapr `Configuration` resource. Enable it per application:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: hot-reload-config
  namespace: default
spec:
  features:
  - name: HotReload
    enabled: true
```

Apply it:

```bash
kubectl apply -f hot-reload-config.yaml
```

## Attach the Configuration to Your Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-port: "3000"
        dapr.io/config: "hot-reload-config"
```

## Verify Hot Reload Is Active

Check the Dapr sidecar logs for hot reload initialization:

```bash
kubectl logs deployment/my-service -c daprd | grep -i "hot\|reload\|watch"
```

You should see:

```text
INFO  Hot reload is enabled. Watching for component changes.
INFO  Component watcher started for namespace: default
```

## Update a Component Configuration

After enabling hot reload, edit a component and Dapr picks up the change automatically.

Example - update a Redis state store to point to a new endpoint:

```bash
# Edit the component in-place
kubectl edit component statestore -n default
```

Change the `redisHost` value:

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "new-redis.example.com:6379"   # changed
  - name: redisPassword
    value: ""
```

Save and close. Dapr detects the change and reloads the component without restarting the pod.

## Update via kubectl apply

```yaml
# statestore-updated.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "new-redis.example.com:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: actorStateStore
    value: "true"
```

```bash
kubectl apply -f statestore-updated.yaml
```

Dapr observes the change via the Kubernetes watch API and reloads within seconds.

## Rotate Secrets with Hot Reload

Hot reload is especially useful for secret rotation. When you update the underlying Kubernetes secret referenced by a component, update the component to trigger a reload:

```bash
# Step 1: Update the Kubernetes secret with the new password
kubectl create secret generic redis-secret \
  --from-literal=password="new-rotated-password" \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 2: Add an annotation to the component to trigger reload
kubectl annotate component statestore \
  dapr.io/reloaded-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --overwrite
```

## What Happens During a Hot Reload

When Dapr detects a component change:

1. The sidecar detects the component update (via Kubernetes watch API or file system change)
2. The current component is closed
3. The new component configuration is initialized
4. The new component replaces the old one
5. New requests use the updated component

Note: The component is briefly unavailable during the close and reinitialize cycle. If initialization fails and `spec.ignoreErrors` is `false` (the default), the sidecar will gracefully shut down. If `spec.ignoreErrors` is `true`, the sidecar continues running without the component registered.

## Observe Hot Reload Events in Logs

```bash
kubectl logs deployment/my-service -c daprd --follow | grep -i "reload\|component"
```

Expected output during a reload (actual log messages may vary by version):

```text
INFO  Component statestore changed. Reloading...
INFO  Closing current state.redis component
INFO  Initializing state.redis with updated configuration
INFO  Component statestore reloaded successfully
```

## Limitations of Hot Reload

```text
- Actor state stores cannot be hot-reloaded; changes are ignored and require a sidecar restart
- Workflow backends cannot be hot-reloaded; changes are ignored and require a sidecar restart
- The component is briefly unavailable during the close and reinitialize cycle
- If reinitialization fails and spec.ignoreErrors is false (default), the sidecar shuts down gracefully
```

## Use in Self-Hosted Mode

For self-hosted mode, hot reload watches the components directory for file changes:

```bash
dapr run \
  --app-id my-service \
  --app-port 3000 \
  --resources-path ./components \
  --config ./config.yaml \
  --enable-api-logging \
  node app.js
```

Where `config.yaml` contains the `HotReload` feature flag enabled (as shown in the configuration section above). Edit any file in `./components/` and Dapr detects the change automatically.

## Summary

Dapr component hot reload allows configuration changes to state stores, pub/sub brokers, and bindings to take effect at runtime without pod restarts. Enable the `HotReload` feature flag in your Dapr `Configuration`, apply it to your deployment, and Dapr will watch for component changes via Kubernetes API (or file system in self-hosted mode) and reload them automatically. Note that the component is briefly unavailable during the reload cycle. This is particularly valuable for credential rotation, endpoint migration, and TTL configuration updates in production systems.
