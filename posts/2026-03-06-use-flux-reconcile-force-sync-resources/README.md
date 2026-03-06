# How to Use flux reconcile to Force Sync Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, CLI, Reconcile, Sync, GitOps, Kubernetes, Troubleshooting, force-sync

Description: A comprehensive guide to using the flux reconcile command to force synchronization of Flux resources including sources, kustomizations, helm releases, and image automation.

---

## Introduction

Flux CD reconciles your cluster state with your Git repository on a configured interval. But sometimes you need things to happen immediately -- after pushing a critical fix, during incident response, or when debugging reconciliation issues. The `flux reconcile` command lets you trigger immediate synchronization of any Flux resource without waiting for the next scheduled interval.

This guide covers all the ways to use `flux reconcile` to force sync resources in your cluster.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The Flux CLI installed locally
- kubectl configured to connect to your cluster
- Flux resources (sources, kustomizations, helm releases) configured

## Step 1: Understanding Reconciliation

Flux resources reconcile on a configured interval. For example:

```yaml
# A kustomization that reconciles every 10 minutes
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
```

When you run `flux reconcile`, you skip the wait and trigger reconciliation immediately. The resource still continues its regular interval-based reconciliation afterward.

## Step 2: Reconcile Git Sources

Force Flux to fetch the latest commits from a Git repository.

```bash
# Reconcile a specific git source
flux reconcile source git flux-system -n flux-system

# Expected output:
# > annotating GitRepository flux-system in flux-system namespace
# > GitRepository annotated
# > waiting for GitRepository reconciliation
# > GitRepository reconciliation completed
# > fetched revision main@sha1:abc1234f

# Reconcile with a timeout
flux reconcile source git flux-system -n flux-system --timeout=2m
```

### When to Reconcile Git Sources

- After pushing a commit that you want applied immediately
- When debugging source fetch errors
- After rotating Git credentials
- After fixing network connectivity issues

## Step 3: Reconcile Kustomizations

Force Flux to apply manifests from a source.

```bash
# Reconcile a specific kustomization
flux reconcile kustomization my-app -n flux-system

# Expected output:
# > annotating Kustomization my-app in flux-system namespace
# > Kustomization annotated
# > waiting for Kustomization reconciliation
# > Kustomization reconciliation completed
# > applied revision main@sha1:abc1234f

# Reconcile with source refresh (fetches latest from Git first)
flux reconcile kustomization my-app -n flux-system --with-source

# This is equivalent to running:
# flux reconcile source git flux-system -n flux-system
# flux reconcile kustomization my-app -n flux-system
```

### The --with-source Flag

The `--with-source` flag is extremely useful because it ensures you get the latest code before applying:

```bash
# Without --with-source: applies whatever revision the source already has
flux reconcile ks my-app -n flux-system

# With --with-source: fetches latest from Git, then applies
flux reconcile ks my-app -n flux-system --with-source
```

Always use `--with-source` when you have just pushed changes and want them applied.

## Step 4: Reconcile Helm Releases

Force a Helm release to reconcile.

```bash
# Reconcile a specific helm release
flux reconcile helmrelease nginx -n flux-system

# Reconcile with source (refreshes the Helm repository first)
flux reconcile helmrelease nginx -n flux-system --with-source

# Force reset of a stuck helm release
flux reconcile hr nginx -n flux-system --force
```

### Helm Release Reconciliation Scenarios

```bash
# Scenario 1: New chart version available
# Refresh the helm repo, then reconcile the release
flux reconcile source helm bitnami -n flux-system
flux reconcile hr nginx -n flux-system

# Scenario 2: Values changed in Git
# Refresh the git source, then the kustomization, then the release
flux reconcile source git flux-system -n flux-system
flux reconcile ks apps -n flux-system
flux reconcile hr nginx -n flux-system

# Scenario 3: Release stuck in failed state
# Use --force to reset and retry
flux reconcile hr nginx -n flux-system --force
```

## Step 5: Reconcile Helm Sources

Force Helm repository and chart reconciliation.

```bash
# Reconcile a Helm repository (re-download the index)
flux reconcile source helm bitnami -n flux-system

# Reconcile a specific Helm chart
flux reconcile source chart flux-system-nginx -n flux-system

# Reconcile an OCI repository
flux reconcile source oci my-app-oci -n flux-system

# Reconcile a bucket source
flux reconcile source bucket config-bucket -n flux-system
```

## Step 6: Reconcile Image Automation Resources

Force image automation components to run.

```bash
# Force rescan of a container registry
flux reconcile image repository my-app -n flux-system

# Force re-evaluation of an image policy
flux reconcile image policy my-app -n flux-system

# Force the image update automation to run
flux reconcile image update flux-system -n flux-system

# Full image automation chain
flux reconcile image repository my-app -n flux-system && \
flux reconcile image policy my-app -n flux-system && \
flux reconcile image update flux-system -n flux-system
```

## Step 7: Reconcile All Resources

When you need to force sync everything.

```bash
#!/bin/bash
# reconcile-all.sh
# Force reconciliation of all Flux resources in order

NAMESPACE=${1:-flux-system}

echo "Force reconciling all Flux resources in $NAMESPACE"
echo "===================================================="

# Step 1: Reconcile all sources first
echo ""
echo "--- Reconciling Sources ---"
for source in $(flux get sources git -n $NAMESPACE --no-header 2>/dev/null | awk '{print $1}'); do
    echo "Reconciling git source: $source"
    flux reconcile source git $source -n $NAMESPACE
done

for source in $(flux get sources helm -n $NAMESPACE --no-header 2>/dev/null | awk '{print $1}'); do
    echo "Reconciling helm source: $source"
    flux reconcile source helm $source -n $NAMESPACE
done

for source in $(flux get sources oci -n $NAMESPACE --no-header 2>/dev/null | awk '{print $1}'); do
    echo "Reconciling oci source: $source"
    flux reconcile source oci $source -n $NAMESPACE
done

# Step 2: Reconcile all kustomizations
echo ""
echo "--- Reconciling Kustomizations ---"
for ks in $(flux get ks -n $NAMESPACE --no-header 2>/dev/null | awk '{print $1}'); do
    echo "Reconciling kustomization: $ks"
    flux reconcile ks $ks -n $NAMESPACE
done

# Step 3: Reconcile all helm releases
echo ""
echo "--- Reconciling Helm Releases ---"
for hr in $(flux get hr -n $NAMESPACE --no-header 2>/dev/null | awk '{print $1}'); do
    echo "Reconciling helm release: $hr"
    flux reconcile hr $hr -n $NAMESPACE
done

# Step 4: Reconcile image automation
echo ""
echo "--- Reconciling Image Automation ---"
for repo in $(flux get images repository -n $NAMESPACE --no-header 2>/dev/null | awk '{print $1}'); do
    echo "Reconciling image repository: $repo"
    flux reconcile image repository $repo -n $NAMESPACE
done

for policy in $(flux get images policy -n $NAMESPACE --no-header 2>/dev/null | awk '{print $1}'); do
    echo "Reconciling image policy: $policy"
    flux reconcile image policy $policy -n $NAMESPACE
done

echo ""
echo "Reconciliation complete. Checking status..."
echo ""
flux get all -n $NAMESPACE
```

## Step 8: Reconcile with Dependencies

When resources have dependencies, reconcile them in the correct order.

```bash
# Check dependency chain first
kubectl get kustomizations -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.dependsOn[*].name}{"\n"}{end}'

# Example dependency chain:
# infrastructure: (none)
# databases: infrastructure
# apps: infrastructure, databases
# monitoring: apps

# Reconcile in dependency order
flux reconcile ks infrastructure -n flux-system --with-source
flux reconcile ks databases -n flux-system
flux reconcile ks apps -n flux-system
flux reconcile ks monitoring -n flux-system
```

## Step 9: Common Reconciliation Patterns

### After Pushing a Hotfix

```bash
# Quick command chain for applying a hotfix immediately
# 1. Push your fix to Git
git push origin main

# 2. Force Flux to pick it up
flux reconcile ks my-app -n flux-system --with-source

# 3. Verify it was applied
flux get ks my-app -n flux-system
kubectl get pods -n production -l app=my-app
```

### After Fixing Credentials

```bash
# After updating a secret used by a source
kubectl create secret generic flux-system \
  --from-file=identity=./new-deploy-key \
  --from-file=identity.pub=./new-deploy-key.pub \
  --from-file=known_hosts=./known_hosts \
  -n flux-system --dry-run=client -o yaml | kubectl apply -f -

# Force the source to retry with new credentials
flux reconcile source git flux-system -n flux-system
```

### During Incident Response

```bash
# Rapid reconciliation during an incident
# Suspend non-critical resources to reduce load
flux suspend ks monitoring -n flux-system
flux suspend ks logging -n flux-system

# Force reconcile the critical fix
flux reconcile ks my-app -n flux-system --with-source

# Verify the fix is applied
flux get ks my-app -n flux-system
kubectl get pods -n production -l app=my-app -w

# Resume suspended resources after the incident
flux resume ks monitoring -n flux-system
flux resume ks logging -n flux-system
```

### Debugging Reconciliation Failures

```bash
# Step 1: Try reconciling and observe the error
flux reconcile ks my-app -n flux-system 2>&1

# Step 2: Check the controller logs during reconciliation
# In one terminal:
kubectl logs -n flux-system deployment/kustomize-controller -f | grep my-app

# In another terminal:
flux reconcile ks my-app -n flux-system

# Step 3: Check events
kubectl get events -n flux-system --sort-by=.lastTimestamp | tail -20
```

## Step 10: Monitoring Reconciliation

Track reconciliation timing and success.

```bash
# Check when each resource was last reconciled
flux get all -A -o json | jq '.[] | {
  kind: .kind,
  name: .metadata.name,
  lastReconcile: .status.lastHandledReconcileAt
}'

# Check reconciliation duration from Prometheus metrics
# gotk_reconcile_duration_seconds_bucket
# gotk_reconcile_condition

# Create a simple reconciliation status check
flux get all -A | while IFS= read -r line; do
    if echo "$line" | grep -q "False"; then
        echo "NEEDS ATTENTION: $line"
    fi
done
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `flux reconcile source git <name>` | Force Git source fetch |
| `flux reconcile source helm <name>` | Force Helm repo index refresh |
| `flux reconcile source oci <name>` | Force OCI source fetch |
| `flux reconcile source bucket <name>` | Force bucket source fetch |
| `flux reconcile ks <name>` | Force kustomization apply |
| `flux reconcile ks <name> --with-source` | Fetch source then apply |
| `flux reconcile hr <name>` | Force Helm release reconcile |
| `flux reconcile hr <name> --with-source` | Refresh chart then reconcile |
| `flux reconcile hr <name> --force` | Force reset and retry |
| `flux reconcile image repository <name>` | Force registry scan |
| `flux reconcile image policy <name>` | Force policy evaluation |
| `flux reconcile image update <name>` | Force image update run |

## Summary

The `flux reconcile` command is your primary tool for forcing immediate synchronization in a Flux CD environment. Whether you are applying a hotfix, recovering from an incident, or debugging a reconciliation failure, it lets you bypass the configured interval and trigger immediate action. Use `--with-source` to ensure you get the latest code, reconcile in dependency order when resources depend on each other, and combine with `flux get` commands to verify results. For routine operations, the automated interval-based reconciliation handles everything, but knowing how to force sync is essential for time-sensitive situations.
