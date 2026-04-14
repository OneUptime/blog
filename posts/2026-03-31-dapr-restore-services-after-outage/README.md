# How to Restore Dapr Services After an Outage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Disaster Recovery, Restore, Kubernetes, Outage

Description: A step-by-step guide to restoring Dapr services after a cluster or component outage, covering configuration restoration, state recovery, and service health verification.

---

## Outage Recovery Sequence

Restoring Dapr services after an outage follows a specific sequence. Infrastructure must come up before Dapr system components, which must be healthy before application components, which must be ready before services. Skipping steps or restoring out of order leads to cascading failures.

## Step 1 - Restore Dapr System Components

First ensure the Dapr control plane is healthy:

```bash
#!/bin/bash
# restore-dapr-system.sh

NAMESPACE="dapr-system"

echo "[1] Checking Dapr system pod status..."
kubectl get pods -n "$NAMESPACE"

# If Dapr system is missing, reinstall
if kubectl get namespace dapr-system 2>/dev/null | grep -q Terminating; then
  echo "Waiting for namespace cleanup..."
  kubectl wait --for=delete namespace/dapr-system --timeout=120s
fi

echo "[2] Installing/upgrading Dapr..."
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --version 1.13.0 \
  --set global.ha.enabled=true \
  --wait

echo "[3] Verifying Dapr control plane health..."
kubectl rollout status deployment/dapr-operator -n dapr-system --timeout=120s
kubectl rollout status deployment/dapr-sentry -n dapr-system --timeout=120s
kubectl rollout status statefulset/dapr-placement-server -n dapr-system --timeout=120s

echo "Dapr system restored."
```

## Step 2 - Restore Component Configurations

Restore Dapr components from backup or Git:

```bash
#!/bin/bash
# restore-dapr-components.sh

NAMESPACE="${1:-production}"
BACKUP_SOURCE="${2:-git}"

if [ "$BACKUP_SOURCE" = "git" ]; then
  echo "Restoring from Git..."
  kubectl apply -f infrastructure/dapr/components/production/ \
    --namespace "$NAMESPACE"
elif [ "$BACKUP_SOURCE" = "s3" ]; then
  echo "Restoring from S3 backup..."
  LATEST_BACKUP=$(aws s3 ls s3://dapr-backups/ | sort | tail -1 | awk '{print $2}')
  for RESOURCE in components configurations subscriptions; do
    aws s3 cp "s3://dapr-backups/${LATEST_BACKUP}${RESOURCE}.yaml" - | \
      kubectl apply -f - --namespace "$NAMESPACE"
  done
fi

echo "Verifying components..."
kubectl get components -n "$NAMESPACE"
```

## Step 3 - Verify State Store Connectivity

Check that state stores are accessible and data is intact:

```bash
#!/bin/bash
# verify-state-stores.sh

NAMESPACE="${1:-production}"
DAPR_HTTP="http://localhost:3500"

# Port-forward to a service's Dapr sidecar for testing
kubectl port-forward -n "$NAMESPACE" deployment/test-service 3500:3500 &
PORT_FORWARD_PID=$!
sleep 3

echo "Testing state store read/write..."

# Write test key
curl -s -X POST "${DAPR_HTTP}/v1.0/state/statestore" \
  -H "Content-Type: application/json" \
  -d '[{"key": "restore-test", "value": "ok"}]'

# Read test key
RESULT=$(curl -s "${DAPR_HTTP}/v1.0/state/statestore/restore-test")

if echo "$RESULT" | grep -q "ok"; then
  echo "State store: OK"
else
  echo "State store: FAILED - $RESULT"
fi

kill $PORT_FORWARD_PID 2>/dev/null
```

## Step 4 - Restore Application Services

Scale up application deployments in dependency order:

```bash
#!/bin/bash
# restore-application-services.sh

NAMESPACE="${1:-production}"

# Define restore order (databases first, then dependent services)
RESTORE_ORDER=(
  "config-service"
  "user-service"
  "payment-service"
  "order-service"
  "notification-service"
)

for SERVICE in "${RESTORE_ORDER[@]}"; do
  echo "Restoring $SERVICE..."
  kubectl scale deployment "$SERVICE" --replicas=3 -n "$NAMESPACE"
  kubectl rollout status deployment/"$SERVICE" -n "$NAMESPACE" --timeout=120s
  echo "$SERVICE restored and healthy."
done
```

## Step 5 - Run Post-Restore Health Checks

```bash
#!/bin/bash
# post-restore-health-check.sh

NAMESPACE="${1:-production}"
PASS=0
FAIL=0

check() {
    local description="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "PASS: $description"
        PASS=$((PASS + 1))
    else
        echo "FAIL: $description"
        FAIL=$((FAIL + 1))
    fi
}

check "All Dapr system pods running" \
  "test -z \"\$(kubectl get pods -n dapr-system --no-headers | grep -v Running)\""
check "All application pods running" \
  "test -z \"\$(kubectl get pods -n $NAMESPACE --no-headers | grep -v Running)\""
check "Dapr sidecar injected on pods" \
  "kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.containers[*].name}' | grep -q daprd"

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

## Summary

Restoring Dapr services after an outage follows a five-step sequence: restore the Dapr control plane via Helm, restore component configurations from Git or object storage backup, verify state store connectivity and data integrity, then scale up application services in dependency order. Automate each step as a standalone script so your team can execute the recovery sequence reliably under pressure. Post-restore health checks confirm that all components are functional before declaring the incident resolved.
