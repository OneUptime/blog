# How to Perform a Rolling Dapr Upgrade on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Upgrade, Kubernetes, Rolling Update, Zero Downtime

Description: Learn how to perform a zero-downtime rolling upgrade of Dapr on Kubernetes, updating the control plane first and then rolling out new sidecar versions to application pods.

---

## Rolling Upgrade Strategy

Dapr's rolling upgrade strategy updates the control plane first, then incrementally restarts application pods to pick up the new sidecar version. Because Dapr maintains backward compatibility within minor versions, the control plane can run a newer version while some sidecars are still on the older version during the rollout window.

## Step 1 - Pre-Upgrade Preparation

```bash
#!/bin/bash
# pre-upgrade-prep.sh

TARGET_VERSION="${1:-1.14.0}"

echo "=== Pre-upgrade Preparation ==="

echo "[1] Backing up current Dapr configuration..."
kubectl get components,configurations,subscriptions --all-namespaces \
  -o yaml > dapr-config-backup-$(date +%Y%m%d).yaml

echo "[2] Recording current versions..."
helm list -n dapr-system
kubectl get pods -n dapr-system \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[0].image}{"\n"}{end}'

echo "[3] Checking cluster node count (for rolling capacity)..."
kubectl get nodes --no-headers | wc -l

echo "[4] Verifying Helm chart availability..."
helm search repo dapr/dapr --version "$TARGET_VERSION"
```

## Step 2 - Upgrade Dapr Control Plane

```bash
#!/bin/bash
# upgrade-control-plane.sh

TARGET_VERSION="${1:-1.14.0}"

echo "=== Upgrading Dapr Control Plane to ${TARGET_VERSION} ==="

# Upgrade with rolling strategy - control plane components update one by one
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --version "$TARGET_VERSION" \
  --set global.ha.enabled=true \
  --atomic \
  --timeout 15m

echo "Waiting for control plane to stabilize..."
kubectl rollout status deployment/dapr-operator -n dapr-system --timeout=5m
kubectl rollout status deployment/dapr-sentry -n dapr-system --timeout=5m
kubectl rollout status statefulset/dapr-placement-server -n dapr-system --timeout=5m

echo "Control plane upgraded to ${TARGET_VERSION}"
kubectl get pods -n dapr-system
```

## Step 3 - Rolling Restart of Application Pods

Update sidecar versions by rolling restart per namespace:

```bash
#!/bin/bash
# rolling-sidecar-update.sh

# Update sidecars in order: non-critical first, then critical
NAMESPACES=("development" "staging" "production")

for NS in "${NAMESPACES[@]}"; do
  echo "=== Rolling restart of $NS namespace ==="

  DEPLOYMENTS=$(kubectl get deployments -n "$NS" -o json | \
    jq -r '.items[] | select(.spec.template.metadata.annotations["dapr.io/enabled"] == "true") | .metadata.name')

  for DEPLOYMENT in $DEPLOYMENTS; do
    echo "  Restarting $DEPLOYMENT in $NS..."
    kubectl rollout restart deployment/"$DEPLOYMENT" -n "$NS"
    kubectl rollout status deployment/"$DEPLOYMENT" -n "$NS" --timeout=5m

    # Brief pause between deployments to avoid thundering herd
    sleep 5
  done

  echo "Namespace $NS updated. Verifying sidecar versions..."
  kubectl get pods -n "$NS" -o json | \
    jq '.items[].spec.containers[] | select(.name == "daprd") | .image' | \
    sort -u
done
```

## Step 4 - Verify Rolling Upgrade Progress

Monitor the upgrade while it runs:

```bash
#!/bin/bash
# monitor-upgrade.sh

NAMESPACE="${1:-production}"

while true; do
    TOTAL=$(kubectl get pods -n "$NAMESPACE" -o json | \
      jq '[.items[] | select(.spec.containers[].name == "daprd")] | length')
    UPDATED=$(kubectl get pods -n "$NAMESPACE" \
      -o json | jq '[.items[] |
      select(.spec.containers[] | .name == "daprd" and (.image | test("1.14")))] |
      length')

    echo "$(date): $UPDATED/$TOTAL pods updated to new sidecar version"

    if [ "$UPDATED" -eq "$TOTAL" ]; then
        echo "All sidecars updated. Upgrade complete."
        break
    fi
    sleep 30
done
```

## Step 5 - Post-Upgrade Verification

```bash
#!/bin/bash
# post-upgrade-verify.sh

echo "=== Post-Upgrade Verification ==="

echo "[1] Control plane version..."
kubectl get pods -n dapr-system \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[0].image}{"\n"}{end}'

echo "[2] Sidecar versions across namespaces..."
kubectl get pods --all-namespaces -o json | \
  jq '.items[].spec.containers[] | select(.name == "daprd") | .image' | \
  sort | uniq -c

echo "[3] Dapr health check..."
kubectl get pods -n dapr-system | grep -v Running | grep -v NAME

echo "[4] Check for any component errors..."
kubectl get events --all-namespaces \
  --field-selector reason=Failed \
  --sort-by='.metadata.creationTimestamp' | \
  grep -i dapr | tail -10
```

## Summary

A rolling Dapr upgrade on Kubernetes upgrades the control plane first via `helm upgrade`, then incrementally restarts application pods to pick up the new sidecar version. Use `--atomic` on the control plane upgrade to auto-rollback on failure, restart application pods namespace by namespace starting with non-critical environments, and verify sidecar image versions after each namespace completes. Monitor error rates throughout the rollout and be prepared to pause or rollback if anomalies are detected.
