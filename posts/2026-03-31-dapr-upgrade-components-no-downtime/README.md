# How to Upgrade Dapr Components Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Upgrade, Zero Downtime, Component, Kubernetes

Description: Learn how to upgrade Dapr component configurations including connection strings, backend versions, and spec changes without interrupting running services.

---

## Zero-Downtime Component Upgrades

Dapr component upgrades - such as updating a Redis connection string, migrating to a new broker, or adding new metadata fields - can be applied without downtime if done carefully. The key is that Dapr sidecars reload component configurations when the component Kubernetes resource is updated, so no pod restart is required for many types of changes.

## How Dapr Handles Component Updates

When a component custom resource is updated in Kubernetes, the Dapr operator detects the change and pushes the new configuration to all sidecars that are scoped to that component. The sidecar will reload the component without restarting the main application container.

Verify component hot-reload is enabled:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
  namespace: production
spec:
  features:
  - name: HotReload
    enabled: true
```

## Upgrading a Connection String Without Downtime

Rotate a Redis password without restarting services:

```bash
#!/bin/bash
# rotate-redis-secret.sh

OLD_PASSWORD=$(kubectl get secret redis-secret -n production \
  -o jsonpath='{.data.password}' | base64 -d)
NEW_PASSWORD=$(openssl rand -base64 32)

echo "[1] Update Redis itself to accept the new password..."
# Existing authenticated connections continue to work after this change.
redis-cli -h redis.internal -a "$OLD_PASSWORD" \
  CONFIG SET requirepass "$NEW_PASSWORD"

echo "[2] Updating Kubernetes secret with the new password..."
kubectl create secret generic redis-secret \
  --from-literal=password="$NEW_PASSWORD" \
  -n production \
  --dry-run=client -o yaml | kubectl apply -f -

echo "[3] Annotating the component to trigger a sidecar reload..."
# Dapr hot-reload watches Component CRs, not Secret resources.
# Annotating the component forces the Dapr operator to push the update.
kubectl annotate component statestore -n production \
  rotated-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" --overwrite

echo "[4] Wait for sidecar to pick up new configuration..."
sleep 10

echo "[5] Verify connectivity with new secret..."
kubectl exec -n production deployment/test-service -c daprd -- \
  curl -sf http://localhost:3500/v1.0/healthz

echo "Secret rotation complete with no downtime."
```

## Migrating to a New State Store Backend

Migrate from Redis to a new backend without service downtime using a dual-write pattern:

```go
package main

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
)

type DualWriteStateClient struct {
    client       dapr.Client
    oldStore     string
    newStore     string
    migrationPct int // % of writes going to new store
}

func (d *DualWriteStateClient) SaveState(ctx context.Context, key string, value []byte) error {
    // Always write to old store
    if err := d.client.SaveState(ctx, d.oldStore, key, value, nil); err != nil {
        return err
    }

    // Write to new store based on migration percentage
    if shouldMigrate(d.migrationPct) {
        _ = d.client.SaveState(ctx, d.newStore, key, value, nil)
    }
    return nil
}
```

## Adding Metadata Fields to Existing Components

Add new optional fields to a component without triggering a restart:

```bash
# Add enableTLS field to Redis component
kubectl patch component statestore \
  -n production \
  --type='json' \
  -p='[
    {
      "op": "add",
      "path": "/spec/metadata/-",
      "value": {
        "name": "enableTLS",
        "value": "true"
      }
    }
  ]'

# Verify the update was applied
kubectl get component statestore -n production -o yaml | grep -A 2 enableTLS

# Check sidecar logs for component reload message
kubectl logs -n production -l app=my-service -c daprd \
  --since=1m | grep -i "component\|reload"
```

## Canary Component Update

Test a new component configuration on a subset of pods before full rollout:

```yaml
# Create a canary version of the component with new settings
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-canary
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-new.internal:6379"
  - name: enableTLS
    value: "true"
scopes:
- payment-service-canary
```

```bash
# Deploy a canary deployment using the new component
kubectl patch deployment payment-service-canary \
  -n production \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/metadata/annotations/dapr.io~1app-id",
        "value": "payment-service-canary"}]'
```

## Summary

Dapr supports zero-downtime component upgrades through the hot-reload feature, which pushes component configuration changes to running sidecars without requiring pod restarts. Rotate secrets by updating Kubernetes Secret resources that components reference, add new metadata fields via `kubectl patch`, and use dual-write patterns when migrating to new backend systems. Test component changes on canary deployments scoped to a subset of pods before applying to the full production fleet.
