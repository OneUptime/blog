# How to Handle Dapr Breaking Changes During Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Breaking Change, Upgrade, Compatibility, Migration

Description: Learn how to identify, assess, and migrate through Dapr breaking changes during version upgrades, including API deprecations, component spec changes, and SDK migrations.

---

## Types of Breaking Changes in Dapr Upgrades

Dapr breaking changes typically fall into three categories:
1. **Runtime API changes** - HTTP/gRPC API endpoints that change behavior or are removed
2. **Component spec changes** - Required or renamed fields in component YAML
3. **SDK breaking changes** - Changed method signatures or removed APIs in language SDKs

Each requires a different migration approach.

## Detecting Breaking Changes Before Upgrading

Scan your codebase and components for usage of deprecated APIs:

```bash
#!/bin/bash
# detect-breaking-changes.sh

TARGET_VERSION="${1:-1.14.0}"

echo "=== Checking for Dapr $TARGET_VERSION Breaking Changes ==="

# Check for deprecated component API versions
echo "[1] Components using deprecated API versions..."
kubectl get components --all-namespaces -o json | \
  jq '.items[] | select(.apiVersion | test("v1alpha1")) |
  {name: .metadata.name, apiVersion: .apiVersion}'

# Check for deprecated state store options
echo "[2] State stores using deprecated options..."
kubectl get components --all-namespaces -o json | \
  jq '.items[] | select(.spec.type | test("state")) |
  .spec.metadata[] | select(.name | test("keyPrefix|stateStorePrefix"; "i"))'

# Scan application code for deprecated SDK calls
echo "[3] Scanning for deprecated SDK calls in Go code..."
grep -r "GetSecret\|ExecuteStateTransaction" --include="*.go" src/ 2>/dev/null || true
```

## Migrating Component Spec Changes

When a component spec field is renamed or required fields are added, update components proactively:

```yaml
# Before upgrade - old component spec (Dapr 1.12)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: keyPrefix
    value: "name"
```

```yaml
# After upgrade - updated component spec (Dapr 1.14)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: keyPrefix
    value: "appid"
  - name: enableTLS
    value: "false"
```

## Handling API Breaking Changes in Application Code

When a Dapr building block API changes, use version negotiation:

```go
package main

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
)

func getSecretCompat(ctx context.Context, client dapr.Client, store, name string) (string, error) {
    // Wrap the secret call so migration logic stays in one place
    secret, err := client.GetSecret(ctx, store, name, nil)
    if err != nil {
        return "", err
    }
    return secret[name], nil
}
```

## SDK Migration Script

When upgrading Go SDK with breaking changes:

```bash
#!/bin/bash
# migrate-go-sdk.sh

OLD_VERSION="v1.10.0"
NEW_VERSION="v1.13.0"

echo "Updating Go SDK from $OLD_VERSION to $NEW_VERSION..."
go get github.com/dapr/go-sdk@$NEW_VERSION
go mod tidy

# Check for compilation errors that reveal breaking changes
go build ./... 2>&1 | grep -E "error:|undefined:" | head -20

echo "Run 'go build ./...' to see all breaking changes that need addressing."
```

## Gradual Migration with Feature Flags

Use feature flags to migrate incrementally through breaking changes:

```python
import os
from dapr.clients import DaprClient

DAPR_LEGACY_STATE_API = os.environ.get("DAPR_LEGACY_STATE_API", "false") == "true"

def get_state(key: str) -> str:
    with DaprClient() as client:
        if DAPR_LEGACY_STATE_API:
            # Old API for Dapr < 1.13
            result = client.get_state("statestore", key)
        else:
            # New API for Dapr >= 1.13
            result = client.get_state(
                store_name="statestore",
                key=key,
                state_metadata=None
            )
        return result.data.decode("utf-8") if result.data else None
```

## Rollback-Safe Migration

Always apply component spec changes in a backward-compatible way:

```bash
# Step 1: Add new fields without removing old ones
kubectl patch component statestore -n production \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/metadata/-", "value": {"name": "enableTLS", "value": "false"}}]'

# Step 2: Verify new fields work with upgraded runtime
# Step 3: Only then remove deprecated fields
kubectl patch component statestore -n production \
  --type='json' \
  -p='[{"op": "remove", "path": "/spec/metadata/2"}]'
```

## Summary

Handling Dapr breaking changes during upgrades requires pre-upgrade scanning to identify deprecated API usage in component YAML and application code, migrating component specs and SDK calls before or during the upgrade window, and using feature flags to enable gradual migration. Apply component changes in a backward-compatible sequence: add new fields first, verify functionality, then remove deprecated fields. Maintain a breaking changes log in your upgrade runbook so all team members know what changed and why.
