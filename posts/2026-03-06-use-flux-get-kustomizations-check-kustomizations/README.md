# How to Use flux get kustomizations to Check Kustomizations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, CLI, Kustomization, GitOps, Kubernetes, Flux-get, Troubleshooting, Reconciliation

Description: A comprehensive guide to using flux get kustomizations to monitor, inspect, and troubleshoot Flux Kustomization resources in your cluster.

---

## Introduction

Kustomizations are the primary mechanism Flux CD uses to apply Kubernetes manifests from Git repositories to your cluster. They define what to deploy, where to find the manifests, and how to handle dependencies and health checks. The `flux get kustomizations` command lets you quickly assess whether your GitOps pipeline is successfully applying configurations.

This guide covers how to use this command for daily operations, debugging, and automation.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The Flux CLI installed locally
- kubectl configured to connect to your cluster
- At least one Flux Kustomization resource configured

## Step 1: Basic Usage

Check the status of all Kustomizations.

```bash
# List kustomizations in the default namespace
flux get kustomizations

# List kustomizations across all namespaces
flux get kustomizations -A

# Short alias
flux get ks -A
```

Sample output:

```text
NAMESPACE    NAME            REVISION              SUSPENDED  READY  MESSAGE
flux-system  flux-system     main@sha1:abc1234f    False      True   Applied revision: main@sha1:abc1234f
flux-system  infrastructure  main@sha1:abc1234f    False      True   Applied revision: main@sha1:abc1234f
flux-system  apps            main@sha1:abc1234f    False      True   Applied revision: main@sha1:abc1234f
flux-system  monitoring      main@sha1:abc1234f    False      False  health check failed after 5m0s timeout
flux-system  my-app-staging  main@sha1:def5678a    False      True   Applied revision: main@sha1:def5678a
flux-system  my-app-prod     main@sha1:789bcde1    True       True   Applied revision: main@sha1:789bcde1
```

## Step 2: Understanding the Output

Each column provides critical information:

- **NAMESPACE**: Where the Kustomization resource is defined
- **NAME**: The Kustomization resource name
- **REVISION**: The Git revision that was last applied (branch@sha1:commit)
- **SUSPENDED**: Whether automatic reconciliation is paused
- **READY**: Whether the Kustomization and its health checks are passing
- **MESSAGE**: Detailed status of the last reconciliation

### Interpreting the REVISION Field

The revision format tells you exactly what is deployed:

```text
main@sha1:abc1234f     -> Branch "main", commit abc1234f
v1.2.3@sha1:def5678a   -> Tag "v1.2.3", commit def5678a
```

When the revision matches the source Git repository revision, the cluster is in sync with Git.

## Step 3: Check Synchronization Status

Verify that kustomizations are in sync with their sources.

```bash
# Compare source revision to kustomization revision
echo "=== Sources ==="
flux get sources git -A --no-header | awk '{print $1, $2}'
echo ""
echo "=== Kustomizations ==="
flux get ks -A --no-header | awk '{print $1, $2}'
```

If a kustomization shows a different revision than its source, it may still be reconciling or may have encountered an error.

```bash
# Check if a kustomization is behind its source
SOURCE_REV=$(flux get source git flux-system -n flux-system --no-header | awk '{print $2}')
KS_REV=$(flux get ks flux-system -n flux-system --no-header | awk '{print $2}')

if [ "$SOURCE_REV" = "$KS_REV" ]; then
    echo "In sync: $KS_REV"
else
    echo "Out of sync!"
    echo "Source:        $SOURCE_REV"
    echo "Kustomization: $KS_REV"
fi
```

## Step 4: Find and Diagnose Failed Kustomizations

Quickly identify and investigate failures.

```bash
# List only failed kustomizations
flux get ks -A --status-selector ready=false

# Get detailed status for a failing kustomization
kubectl describe kustomization monitoring -n flux-system

# Check the kustomize controller logs
kubectl logs -n flux-system deployment/kustomize-controller --tail=100 | grep monitoring

# Check events related to the kustomization
kubectl get events -n flux-system --field-selector involvedObject.name=monitoring
```

### Common Failure Messages

#### Health Check Failures

```bash
# Symptom
# MESSAGE: health check failed after 5m0s timeout

# Diagnosis: Find which health check is failing
kubectl get kustomization monitoring -n flux-system -o yaml | grep -A 20 healthChecks

# Check the referenced resource
kubectl get deployment prometheus -n monitoring
kubectl describe deployment prometheus -n monitoring
```

#### Dependency Not Ready

```bash
# Symptom
# MESSAGE: dependency 'flux-system/infrastructure' is not ready

# Diagnosis: Check the dependency kustomization
flux get ks infrastructure -n flux-system

# View the dependency chain
kubectl get kustomization my-app -n flux-system -o yaml | grep -A 10 dependsOn
```

#### Validation Errors

```bash
# Symptom
# MESSAGE: kustomize build failed: ... invalid YAML

# Diagnosis: Try building locally
kustomize build ./path/to/kustomization

# Check the source path
kubectl get kustomization my-app -n flux-system -o yaml | grep path
```

#### Prune Errors

```bash
# Symptom
# MESSAGE: pruning failed: ... forbidden

# Diagnosis: Check RBAC permissions
kubectl get kustomization my-app -n flux-system -o yaml | grep serviceAccountName

# Check the service account permissions
kubectl auth can-i delete deployments -n production --as system:serviceaccount:flux-system:kustomize-controller
```

## Step 5: Inspect Kustomization Dependencies

Understand the dependency chain between kustomizations.

```bash
# List all kustomizations with their dependencies
kubectl get kustomizations -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}:{range .spec.dependsOn[*]} {.namespace}/{.name}{end}{"\n"}{end}'

# Visualize dependency order
echo "Kustomization Dependency Chain:"
echo "================================"
for ks in $(flux get ks -A --no-header | awk '{print $1}'); do
    deps=$(kubectl get kustomization $ks -n flux-system -o jsonpath='{.spec.dependsOn[*].name}' 2>/dev/null)
    if [ -z "$deps" ]; then
        echo "$ks -> (no dependencies)"
    else
        echo "$ks -> depends on: $deps"
    fi
done
```

## Step 6: Monitor Kustomizations During Deployments

Watch reconciliation progress in real time.

```bash
# Watch all kustomizations for status changes
flux get ks -A -w

# Watch a specific kustomization
flux get ks my-app -n flux-system -w

# Periodic refresh with additional context
watch -n 5 'echo "=== Kustomizations ===" && flux get ks -A && echo "" && echo "=== Recent Events ===" && kubectl get events -n flux-system --sort-by=.lastTimestamp | tail -10'
```

## Step 7: Manage Kustomization Lifecycle

Common operations for managing kustomizations.

```bash
# Suspend reconciliation (useful during maintenance)
flux suspend ks my-app -n flux-system

# Resume reconciliation
flux resume ks my-app -n flux-system

# Force immediate reconciliation
flux reconcile ks my-app -n flux-system

# Force reconciliation with source refresh
flux reconcile ks my-app -n flux-system --with-source

# Reconcile all kustomizations
for ks in $(flux get ks -n flux-system --no-header | awk '{print $1}'); do
    echo "Reconciling $ks..."
    flux reconcile ks $ks -n flux-system
done
```

## Step 8: Check Kustomization Inventory

Flux tracks which resources each kustomization manages (its inventory).

```bash
# View the inventory of a kustomization (resources it manages)
kubectl get kustomization my-app -n flux-system \
  -o jsonpath='{.status.inventory.entries[*].id}' | tr ' ' '\n'

# Count resources managed by each kustomization
for ks in $(flux get ks -n flux-system --no-header | awk '{print $1}'); do
    count=$(kubectl get kustomization $ks -n flux-system \
      -o jsonpath='{.status.inventory.entries}' 2>/dev/null | jq 'length' 2>/dev/null)
    echo "$ks: ${count:-0} resources"
done
```

## Step 9: Detailed Output Formats

Use different output formats for different needs.

```bash
# YAML output for full resource details
flux get ks my-app -n flux-system -o yaml

# JSON output for scripting
flux get ks -A -o json | jq '.[] | {
  name: .metadata.name,
  path: .spec.path,
  source: .spec.sourceRef.name,
  revision: .status.lastAppliedRevision,
  ready: (.status.conditions[] | select(.type=="Ready") | .status)
}'

# Table output without headers (for scripting)
flux get ks -A --no-header
```

## Step 10: Automated Health Check Script

```bash
#!/bin/bash
# check-kustomizations.sh
# Comprehensive health check for Flux Kustomizations

echo "Kustomization Health Check - $(date)"
echo "======================================="
echo ""

# Display all kustomizations
flux get ks -A
echo ""

# Statistics
total=$(flux get ks -A --no-header 2>/dev/null | wc -l | tr -d ' ')
ready=$(flux get ks -A --no-header 2>/dev/null | awk '$5=="True"' | wc -l | tr -d ' ')
not_ready=$(flux get ks -A --no-header 2>/dev/null | awk '$5=="False"' | wc -l | tr -d ' ')
suspended=$(flux get ks -A --no-header 2>/dev/null | awk '$4=="True"' | wc -l | tr -d ' ')

echo "Summary"
echo "-------"
echo "Total:      $total"
echo "Ready:      $ready"
echo "Not Ready:  $not_ready"
echo "Suspended:  $suspended"
echo ""

# Check for out-of-sync kustomizations
echo "Sync Status"
echo "-----------"
flux get ks -A --no-header 2>/dev/null | while read -r ns name rev susp ready msg; do
    # Get the source for this kustomization
    source=$(kubectl get kustomization "$name" -n "$ns" \
      -o jsonpath='{.spec.sourceRef.name}' 2>/dev/null)
    source_rev=$(kubectl get gitrepository "$source" -n "$ns" \
      -o jsonpath='{.status.artifact.revision}' 2>/dev/null)
    if [ "$rev" != "$source_rev" ] && [ -n "$source_rev" ]; then
        echo "  OUT OF SYNC: $ns/$name (ks: $rev, source: $source_rev)"
    fi
done
echo ""

# Exit with error if any kustomizations are not ready
if [ "$not_ready" -gt 0 ]; then
    echo "FAILED: $not_ready kustomization(s) are not ready."
    flux get ks -A --status-selector ready=false
    exit 1
fi

echo "PASSED: All kustomizations are healthy."
exit 0
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `flux get ks -A` | All kustomizations across namespaces |
| `flux get ks <name> -n <ns>` | Specific kustomization |
| `flux get ks -A --status-selector ready=false` | Failed kustomizations |
| `flux get ks -A -o json` | JSON output for scripting |
| `flux reconcile ks <name>` | Force reconciliation |
| `flux reconcile ks <name> --with-source` | Reconcile with source refresh |
| `flux suspend ks <name>` | Pause reconciliation |
| `flux resume ks <name>` | Resume reconciliation |

## Summary

The `flux get kustomizations` command is your window into whether Flux is successfully applying Git configurations to your cluster. It shows you which revision is deployed, whether health checks are passing, and what errors exist. By combining it with dependency inspection, inventory checks, and synchronization verification, you can maintain full visibility into your GitOps pipeline. Automated health check scripts make it easy to integrate kustomization monitoring into your operational workflows.
