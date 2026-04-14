# How to Test Dapr Upgrades in Staging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Upgrade, Testing, Staging, Kubernetes

Description: Learn how to safely test Dapr version upgrades in a staging environment with integration tests, canary validation, and rollback verification before promoting to production.

---

## Why Staging Validation Is Non-Negotiable

Staging validation catches upgrade-related regressions that would otherwise hit production users. A staging environment that closely mirrors production - with the same component types, SDK versions, and service topology - provides high confidence that the upgrade will succeed in production.

## Setting Up a Production-Mirror Staging Environment

Create a staging namespace that mirrors production Dapr configuration:

```bash
#!/bin/bash
# setup-staging-mirror.sh

SOURCE_NS="production"
TARGET_NS="staging"

kubectl create namespace "$TARGET_NS" 2>/dev/null || true

echo "Copying Dapr components from $SOURCE_NS to $TARGET_NS..."
kubectl get components -n "$SOURCE_NS" -o json | \
  jq --arg ns "$TARGET_NS" '
    .items[] |
    .metadata.namespace = $ns |
    del(.metadata.resourceVersion) |
    del(.metadata.uid) |
    del(.metadata.creationTimestamp)
  ' | kubectl apply -f -

echo "Copying secrets..."
kubectl get secrets -n "$SOURCE_NS" \
  -l dapr-component=true \
  -o json | \
  jq --arg ns "$TARGET_NS" '
    .items[] |
    .metadata.namespace = $ns |
    del(.metadata.resourceVersion) |
    del(.metadata.uid)
  ' | kubectl apply -f -
```

## Running the Upgrade in Staging

Upgrade Dapr control plane in staging and verify:

```bash
#!/bin/bash
# upgrade-dapr-staging.sh

TARGET_VERSION="${1:-1.14.0}"

echo "=== Upgrading Dapr to ${TARGET_VERSION} in staging ==="

echo "[1] Current staging version..."
kubectl get pods -n dapr-system -o jsonpath='{.items[0].spec.containers[0].image}'

echo "[2] Performing upgrade..."
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --version "$TARGET_VERSION" \
  --set global.tag="$TARGET_VERSION" \
  --wait --timeout 10m

echo "[3] Verifying control plane pods..."
kubectl rollout status deployment/dapr-operator -n dapr-system
kubectl rollout status deployment/dapr-sentry -n dapr-system

echo "[4] Restarting staging services to update sidecars..."
kubectl rollout restart deployment -n staging

echo "[5] Waiting for services to come up..."
kubectl rollout status deployment -n staging --timeout=5m
```

## Integration Test Suite for Dapr Upgrade Validation

Run a comprehensive integration test suite after the upgrade:

```python
# tests/integration/test_dapr_upgrade.py
import pytest
import httpx
import time

BASE_URL = "http://staging-dapr-service"

class TestDaprUpgrade:

    def test_state_store_read_write(self):
        """Verify state store operations work after upgrade."""
        # Write state
        resp = httpx.post(f"{BASE_URL}/v1.0/state/statestore",
            json=[{"key": "upgrade-test", "value": "ok"}])
        assert resp.status_code == 204

        # Read state
        resp = httpx.get(f"{BASE_URL}/v1.0/state/statestore/upgrade-test")
        assert resp.status_code == 200
        assert resp.json() == "ok"

    def test_pubsub_publish_subscribe(self):
        """Verify pub/sub operations work after upgrade."""
        resp = httpx.post(f"{BASE_URL}/v1.0/publish/pubsub/test-topic",
            json={"message": "upgrade-test", "timestamp": time.time()})
        assert resp.status_code == 204

    def test_service_invocation(self):
        """Verify service invocation works after upgrade."""
        resp = httpx.get(
            f"{BASE_URL}/v1.0/invoke/target-service/method/health",
            headers={"dapr-app-id": "caller-service"}
        )
        assert resp.status_code == 200

    def test_sidecar_health(self):
        """Verify Dapr sidecar health endpoint responds."""
        resp = httpx.get(f"{BASE_URL}/v1.0/healthz")
        assert resp.status_code == 204

    def test_metadata_api(self):
        """Verify Dapr metadata API returns correct version."""
        resp = httpx.get(f"{BASE_URL}/v1.0/metadata")
        assert resp.status_code == 200
        metadata = resp.json()
        assert "runtimeVersion" in metadata
```

Run the tests:

```bash
# Run integration tests against staging
pytest tests/integration/test_dapr_upgrade.py -v \
  --html=reports/upgrade-test-$(date +%Y%m%d).html \
  --self-contained-html
```

## Rollback Verification

Always verify rollback works before promoting to production:

```bash
#!/bin/bash
# verify-rollback-staging.sh

echo "Testing rollback capability..."
PREVIOUS_VERSION=$(helm history dapr -n dapr-system \
  --output json | jq -r '.[-2].app_version')

helm rollback dapr -n dapr-system --wait
kubectl rollout restart deployment -n staging
kubectl rollout status deployment -n staging --timeout=5m

echo "Rollback to $PREVIOUS_VERSION succeeded."
echo "Re-upgrading to proceed with staging validation..."
```

## Summary

Testing Dapr upgrades in staging requires a staging environment that mirrors production components and service topology. Upgrade the Dapr control plane via Helm, restart services to update sidecars, run a comprehensive integration test suite covering state store, pub/sub, and service invocation, and always verify rollback succeeds before promoting to production. Document test results with HTML reports and archive them as evidence of the upgrade validation process.
