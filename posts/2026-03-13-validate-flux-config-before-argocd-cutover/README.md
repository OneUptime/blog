# How to Validate Flux Configuration Before Cutting Over from ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Migration, Validation, GitOps, Kubernetes, Cutover

Description: Learn how to thoroughly validate Flux CD configuration before switching production traffic management from ArgoCD to Flux CD to ensure a safe cutover.

---

## Introduction

The cutover moment—when you disable ArgoCD for an application and Flux CD becomes the sole manager—is the highest-risk point in any migration. A thorough validation process before this step prevents production incidents caused by misconfigured Flux resources, missing secrets, or incorrect path references.

This guide provides a comprehensive validation checklist and automation scripts to validate Flux configuration before cutover.

## Prerequisites

- Flux CD Kustomizations and HelmReleases configured in suspended state
- ArgoCD still managing the production applications
- A staging environment that mirrors production for validation
- `flux` CLI and `kubectl` installed

## Step 1: Pre-Cutover Checklist

```bash
#!/bin/bash
# validate-flux-before-cutover.sh

APP=$1
NAMESPACE="flux-system"
PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Validating Flux configuration for: $APP ==="

# Check 1: Kustomization exists
check "Kustomization exists" \
  "kubectl get kustomization $APP -n $NAMESPACE"

# Check 2: GitRepository source is healthy
SOURCE=$(kubectl get kustomization $APP -n $NAMESPACE \
  -o jsonpath='{.spec.sourceRef.name}')
check "GitRepository is Ready" \
  "kubectl get gitrepository $SOURCE -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type==\"Ready\")].status}' | grep -q True"

# Check 3: Source has recent commit
check "Source has fetched recent commit" \
  "kubectl get gitrepository $SOURCE -n $NAMESPACE -o jsonpath='{.status.artifact.revision}' | grep -q ."

# Check 4: Kustomization path exists in the source
PATH_VALUE=$(kubectl get kustomization $APP -n $NAMESPACE -o jsonpath='{.spec.path}')
check "Kustomization path is set" \
  "[ -n '$PATH_VALUE' ]"

# Check 5: Secrets referenced in Kustomization exist
DECRYPTION_SECRET=$(kubectl get kustomization $APP -n $NAMESPACE \
  -o jsonpath='{.spec.decryption.secretRef.name}')
if [ -n "$DECRYPTION_SECRET" ]; then
  check "SOPS decryption secret exists" \
    "kubectl get secret $DECRYPTION_SECRET -n $NAMESPACE"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] || exit 1
```

## Step 2: Validate in Staging First

```bash
# In staging: resume Flux and validate before production

# 1. Resume the Flux Kustomization in staging
flux resume kustomization myapp -n flux-system

# 2. Watch reconciliation
flux get kustomizations myapp -n flux-system --watch

# 3. Compare resource state with ArgoCD's view
echo "=== ArgoCD resource state ===" 
argocd app resources myapp

echo "=== Flux managed resources ==="
kubectl get all -n myapp -l 'kustomize.toolkit.fluxcd.io/name=myapp'

# 4. Run application smoke tests
curl -sf https://staging.your-app.com/health && echo "PASS: health check"
```

## Step 3: Dry-Run the Cutover

Before the real cutover, simulate it:

```bash
#!/bin/bash
# dry-run-cutover.sh

APP=$1
echo "=== Dry run cutover simulation for: $APP ==="

# Simulate disabling ArgoCD auto-sync
echo "[DRY RUN] Would disable ArgoCD auto-sync for $APP"
echo "Command: argocd app set $APP --sync-policy none"

# Simulate enabling Flux
echo "[DRY RUN] Would resume Flux Kustomization for $APP"
echo "Command: flux resume kustomization $APP -n flux-system"

# Show what Flux WOULD apply
flux diff kustomization $APP -n flux-system 2>/dev/null || \
  echo "Note: flux diff requires Flux to be active for this Kustomization"

# Show current vs desired state comparison
echo ""
echo "Current images in cluster:"
kubectl get deployment -n $APP \
  -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.template.spec.containers[0].image}{"\n"}{end}'

echo ""
echo "Images in Flux source (from Git):"
kubectl get kustomization $APP -n flux-system \
  -o jsonpath='{.status.lastAppliedRevision}'
```

## Step 4: Validate Health Checks Configuration

```bash
# Verify health checks are correctly defined
kubectl get kustomization myapp -n flux-system \
  -o jsonpath='{.spec.healthChecks}' | python3 -m json.tool

# Manually check each health check resource
HEALTH_CHECKS=$(kubectl get kustomization myapp -n flux-system \
  -o jsonpath='{range .spec.healthChecks[*]}{.kind}{" "}{.name}{" "}{.namespace}{"\n"}{end}')

while IFS= read -r line; do
  KIND=$(echo $line | awk '{print $1}')
  NAME=$(echo $line | awk '{print $2}')
  NS=$(echo $line | awk '{print $3}')
  
  echo -n "Health check $KIND/$NAME in $NS: "
  kubectl get $KIND $NAME -n $NS > /dev/null 2>&1 && echo "EXISTS" || echo "MISSING!"
done <<< "$HEALTH_CHECKS"
```

## Step 5: Execute the Cutover

Once all validations pass:

```bash
#!/bin/bash
# cutover.sh - Execute the cutover for one application

APP=$1
echo "=== Executing cutover for: $APP at $(date) ==="

# Safety check: ensure Flux Kustomization exists
kubectl get kustomization $APP -n flux-system || \
  { echo "ERROR: Flux Kustomization not found!"; exit 1; }

# Step 1: Disable ArgoCD auto-sync
echo "Disabling ArgoCD auto-sync..."
argocd app set $APP --sync-policy none

# Step 2: Resume Flux Kustomization
echo "Resuming Flux reconciliation..."
flux resume kustomization $APP -n flux-system

# Step 3: Wait for first successful reconciliation
echo "Waiting for Flux reconciliation..."
timeout 300 flux reconcile kustomization $APP -n flux-system --with-source

# Step 4: Verify resources are healthy
echo "Checking resource health..."
kubectl get all -n $APP

# Step 5: Delete ArgoCD Application (preserves resources with cascade=false)
echo "Removing ArgoCD Application..."
argocd app delete $APP --cascade=false

echo "=== Cutover complete for $APP at $(date) ==="
```

## Best Practices

- Run the full validation checklist in staging at least one week before the production cutover.
- Schedule production cutovers during low-traffic periods with the team available.
- Keep the rollback procedure documented and tested before executing cutover.
- Validate that all Flux Notifications are configured and delivering before cutover (so you get alerts if something goes wrong post-cutover).
- Take a kubectl snapshot of all resources before cutover: `kubectl get all -n myapp -o yaml > pre-cutover-snapshot.yaml`.
- After cutover, monitor application metrics and error rates for at least 24 hours.

## Conclusion

Thorough pre-cutover validation transforms a high-risk moment into a routine operational step. By validating source connectivity, secret availability, health check configuration, and application behavior in staging before touching production, you eliminate the most common failure modes. The goal is to make the production cutover a boring, predictable event rather than a stressful emergency.
