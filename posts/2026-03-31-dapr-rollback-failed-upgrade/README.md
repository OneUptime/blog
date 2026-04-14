# How to Roll Back a Failed Dapr Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rollback, Upgrade, Kubernetes, Incident Response

Description: Learn how to quickly roll back a failed Dapr upgrade, including Helm rollback, sidecar version pinning, and post-rollback verification to restore service health.

---

## When to Roll Back

Roll back a Dapr upgrade immediately when you observe:
- Increased error rates in service invocation or state operations
- Dapr sidecar crash loops after restart
- Component initialization failures after the upgrade
- Breaking changes in behavior affecting application functionality

The faster you roll back, the less user impact. Have your rollback command ready before starting any upgrade.

## Rolling Back the Control Plane with Helm

```bash
#!/bin/bash
# rollback-dapr-control-plane.sh

echo "=== Rolling Back Dapr Control Plane ==="

echo "[1] Current Helm history..."
helm history dapr -n dapr-system --output table

echo "[2] Identifying previous stable revision..."
PREVIOUS_REVISION=$(helm history dapr -n dapr-system \
  --output json | jq -r 'map(select(.status == "deployed")) | .[-1].revision')

echo "Rolling back to revision $PREVIOUS_REVISION..."
helm rollback dapr "$PREVIOUS_REVISION" \
  --namespace dapr-system \
  --wait \
  --timeout 10m

echo "[3] Verifying control plane health after rollback..."
kubectl rollout status deployment/dapr-operator -n dapr-system --timeout=5m
kubectl rollout status deployment/dapr-sentry -n dapr-system --timeout=5m
kubectl rollout status deployment/dapr-sidecar-injector -n dapr-system --timeout=5m

echo "Control plane rolled back successfully."
kubectl get pods -n dapr-system
```

## Rolling Back Application Sidecars

After rolling back the control plane, restart application pods to revert to the old sidecar version:

```bash
#!/bin/bash
# rollback-sidecars.sh

NAMESPACE="${1:-production}"

echo "=== Rolling Back Sidecars in $NAMESPACE ==="

# Rollout undo for all dapr-enabled deployments
DEPLOYMENTS=$(kubectl get deployments -n "$NAMESPACE" -o json | \
  jq -r '.items[] | select(.spec.template.metadata.annotations["dapr.io/enabled"]=="true") | .metadata.name')

for DEPLOYMENT in $DEPLOYMENTS; do
    if kubectl rollout undo deployment/"$DEPLOYMENT" -n "$NAMESPACE"; then
        kubectl rollout status deployment/"$DEPLOYMENT" \
          -n "$NAMESPACE" --timeout=3m
        echo "  Rolled back $DEPLOYMENT"
    else
        echo "  No rollout history for $DEPLOYMENT - restarting to pull old sidecar"
        kubectl rollout restart deployment/"$DEPLOYMENT" -n "$NAMESPACE"
    fi
done
```

## Emergency Sidecar Version Pin

If rollout undo is insufficient, pin the sidecar version explicitly:

```bash
# Pin sidecar to a specific version using annotations
kubectl patch deployment payment-service \
  -n production \
  --type='json' \
  -p='[
    {"op": "add", "path": "/spec/template/metadata/annotations/dapr.io~1sidecar-image", "value": "docker.io/daprio/daprd:1.13.0"}
  ]'

kubectl rollout restart deployment/payment-service -n production
kubectl rollout status deployment/payment-service -n production --timeout=5m
```

## Rollback Verification Checklist

```bash
#!/bin/bash
# verify-rollback.sh

NAMESPACE="${1:-production}"
EXPECTED_VERSION="${2:-1.13.0}"
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

check "Dapr control plane on expected version" \
  "kubectl get pods -n dapr-system -o json | \
    jq -e '.items[0].spec.containers[0].image' | grep -q $EXPECTED_VERSION"

check "No crash looping pods in dapr-system" \
  "! kubectl get pods -n dapr-system | grep -q CrashLoopBackOff"

check "No crash looping pods in $NAMESPACE" \
  "! kubectl get pods -n $NAMESPACE | grep -q CrashLoopBackOff"

check "Service invocation working" \
  "kubectl exec -n $NAMESPACE deployment/test-service -- \
    curl -sf http://localhost:3500/v1.0/healthz"

echo ""
echo "Rollback verification: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "ROLLBACK SUCCESSFUL" || echo "ROLLBACK NEEDS ATTENTION"
```

## Post-Rollback Actions

After a successful rollback, conduct a blameless post-mortem:

```markdown
## Rollback Post-Mortem Template

**Date:** {date}
**Dapr version attempted:** {version}
**Rolled back to:** {previous_version}
**Duration of impact:** {minutes}

### What happened
{description}

### Root cause
{root_cause}

### What we changed to address the issue
{changes_made}

### How we will prevent this in future
{prevention_steps}
```

## Summary

Rolling back a failed Dapr upgrade requires two steps: rolling back the Helm release to the previous revision with `helm rollback`, then restarting application pods to revert to the older sidecar version. Use `kubectl rollout undo` for individual deployments and pin the sidecar version explicitly as a last resort. Always verify the rollback with health checks before declaring the incident resolved, and conduct a post-mortem to understand what failed and how to prevent it during the next upgrade attempt.
