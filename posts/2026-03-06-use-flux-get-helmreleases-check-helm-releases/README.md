# How to Use flux get helmreleases to Check Helm Releases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, CLI, Helm, HelmRelease, GitOps, Kubernetes, Flux-get, Troubleshooting

Description: A practical guide to using flux get helmreleases to monitor, inspect, and troubleshoot Helm releases managed by Flux CD.

---

## Introduction

Helm releases are a core part of many Flux CD deployments. The `flux get helmreleases` command provides a quick way to check the status of all Helm-managed applications in your cluster. Whether you need to verify a deployment succeeded, debug a failed upgrade, or audit which chart versions are running, this command is your starting point.

This guide walks through using `flux get helmreleases` for everyday operations and troubleshooting.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The Flux CLI installed locally
- kubectl configured to connect to your cluster
- At least one HelmRelease resource deployed

## Step 1: Basic Usage

Check the status of all Helm releases.

```bash
# List all helm releases in the default namespace (flux-system)
flux get helmreleases

# List all helm releases across all namespaces
flux get helmreleases -A

# Short alias
flux get hr -A
```

Sample output:

```text
NAMESPACE    NAME          REVISION  SUSPENDED  READY  MESSAGE
flux-system  nginx         4.8.3     False      True   Helm install succeeded
flux-system  prometheus    45.0.0    False      True   Helm upgrade succeeded
flux-system  grafana       7.0.0     False      True   Helm upgrade succeeded
production   my-app        1.5.2     False      False  Helm upgrade failed: timed out waiting for condition
staging      my-app        1.5.3     False      True   Helm install succeeded
```

## Step 2: Understanding the Output Fields

Each field in the output tells you something specific:

- **NAMESPACE**: Where the HelmRelease resource lives (not necessarily where the chart is installed)
- **NAME**: The name of the HelmRelease resource
- **REVISION**: The chart version currently installed
- **SUSPENDED**: Whether automatic reconciliation is paused
- **READY**: Whether the release is in a healthy state
- **MESSAGE**: The latest status message from Helm

### Key Status Messages

| Message | Meaning |
|---------|---------|
| `Helm install succeeded` | Fresh installation completed |
| `Helm upgrade succeeded` | Upgrade to a new version completed |
| `Helm test succeeded` | Post-install/upgrade tests passed |
| `Helm upgrade failed` | The upgrade operation failed |
| `Helm install failed` | The initial installation failed |
| `dependency not ready` | A required dependency has not reconciled |
| `install retries exhausted` | Maximum retry attempts reached |

## Step 3: Filter and Search

Narrow down results to find specific releases.

```bash
# Check a specific helm release
flux get hr nginx -n flux-system

# Check releases in a specific namespace
flux get hr -n production

# Filter by ready status (find failures)
flux get hr -A --status-selector ready=false

# Find suspended releases
flux get hr -A | grep "True" | head -20
```

## Step 4: Get Detailed Information

When you need more than the summary view.

```bash
# Get YAML output with full status details
flux get hr nginx -n flux-system -o yaml

# Get JSON output for scripting
flux get hr -A -o json

# Extract specific fields with jq
flux get hr -A -o json | jq '.[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  revision: .status.lastAppliedRevision,
  ready: .status.conditions[-1].status,
  message: .status.conditions[-1].message
}'
```

## Step 5: Diagnose Failed Helm Releases

When a Helm release shows `READY: False`, follow these steps to diagnose.

```bash
# Step 1: Check the flux output for the error message
flux get hr my-app -n production

# Step 2: Get detailed conditions
kubectl describe helmrelease my-app -n production

# Step 3: Check the Helm history for the release
# Note: the release may be in a different namespace than the HelmRelease
helm history my-app -n production

# Step 4: Check the Helm controller logs
kubectl logs -n flux-system deployment/helm-controller --tail=50 | grep my-app

# Step 5: Check if the source chart is available
flux get sources chart -A | grep my-app
```

### Common Failure Scenarios

#### Chart Not Found

```bash
# Symptom
# MESSAGE: chart pull error: chart "my-app" version "99.0.0" not found

# Diagnosis
flux get sources chart -A | grep my-app
flux get sources helm -A

# Fix: Update the chart version in your HelmRelease
kubectl get helmrelease my-app -n flux-system -o yaml | grep -A 5 "chart:"
```

#### Values Validation Error

```bash
# Symptom
# MESSAGE: Helm install failed: values don't meet the specifications

# Diagnosis: Check the values being applied
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.spec.values}' | jq .

# Check values from ConfigMaps or Secrets
kubectl get helmrelease my-app -n flux-system -o yaml | grep -A 10 valuesFrom
```

#### Resource Conflict

```bash
# Symptom
# MESSAGE: Helm upgrade failed: rendered manifests contain a resource that already exists

# Diagnosis: Find the conflicting resource
kubectl logs -n flux-system deployment/helm-controller --tail=100 | grep "already exists"

# Fix: Either remove the existing resource or add it to the Helm release
```

#### Timeout

```bash
# Symptom
# MESSAGE: Helm upgrade failed: timed out waiting for condition

# Diagnosis: Check which pods are not ready
kubectl get pods -n production -l app.kubernetes.io/instance=my-app
kubectl describe pod <failing-pod> -n production

# Fix: Increase the timeout in the HelmRelease spec
# Or fix the underlying pod issue
```

## Step 6: Compare Helm Release Versions Across Environments

Check version consistency across environments.

```bash
# List all instances of a specific chart across namespaces
flux get hr -A | grep my-app

# Create a version comparison report
echo "Environment Version Comparison"
echo "=============================="
for ns in staging production; do
    version=$(flux get hr my-app -n $ns --no-header 2>/dev/null | awk '{print $2}')
    ready=$(flux get hr my-app -n $ns --no-header 2>/dev/null | awk '{print $4}')
    echo "$ns: version=$version ready=$ready"
done
```

## Step 7: Monitor Helm Releases in Real Time

Watch Helm releases during deployments.

```bash
# Watch all helm releases for changes
flux get hr -A -w

# Watch a specific release during an upgrade
flux get hr my-app -n production -w

# Combine with watch for periodic refresh
watch -n 5 'flux get hr -A'

# Monitor the helm controller for events
kubectl get events -n flux-system --field-selector reason=info --watch
```

## Step 8: Manage Helm Release Lifecycle

Common lifecycle operations using the Flux CLI.

```bash
# Suspend a helm release (stop automatic reconciliation)
flux suspend hr my-app -n production

# Resume a suspended helm release
flux resume hr my-app -n production

# Force reconciliation of a helm release
flux reconcile hr my-app -n production

# Force reconciliation with its source
flux reconcile hr my-app -n production --with-source

# Reset a failed helm release (forces a reinstall)
flux suspend hr my-app -n production
helm uninstall my-app -n production
flux resume hr my-app -n production
```

## Step 9: Audit Helm Release Configuration

Review the full configuration of Helm releases.

```bash
# Export all HelmRelease specs for review
kubectl get helmreleases -A -o yaml > all-helmreleases.yaml

# Check which values are being applied
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.spec.values}' | yq .

# Check chart source references
kubectl get helmreleases -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.chart.spec.chart}@{.spec.chart.spec.version} from {.spec.chart.spec.sourceRef.name}{"\n"}{end}'

# Check for helm releases with custom install/upgrade options
kubectl get helmreleases -A -o yaml | grep -A 5 "install:\|upgrade:"
```

## Step 10: Health Check Script for Helm Releases

Automate Helm release monitoring.

```bash
#!/bin/bash
# check-helmreleases.sh
# Monitor the health of all Flux Helm releases

echo "Helm Release Health Check - $(date)"
echo "======================================"
echo ""

# Get all helm releases
flux get hr -A
echo ""

# Count statistics
total=$(flux get hr -A --no-header 2>/dev/null | wc -l)
healthy=$(flux get hr -A --no-header 2>/dev/null | grep "True" | wc -l)
unhealthy=$(flux get hr -A --no-header 2>/dev/null | grep "False" | wc -l)
suspended=$(flux get hr -A --no-header 2>/dev/null | awk '$3=="True"' | wc -l)

echo "Summary:"
echo "  Total releases: $total"
echo "  Healthy: $healthy"
echo "  Unhealthy: $unhealthy"
echo "  Suspended: $suspended"
echo ""

# Show details for unhealthy releases
if [ "$unhealthy" -gt 0 ]; then
    echo "Unhealthy Releases:"
    echo "-------------------"
    flux get hr -A --status-selector ready=false
    exit 1
fi

echo "All Helm releases are healthy."
exit 0
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `flux get hr -A` | All Helm releases across namespaces |
| `flux get hr <name> -n <ns>` | Specific Helm release |
| `flux get hr -A -o json` | JSON output |
| `flux get hr -A --status-selector ready=false` | Failed releases only |
| `flux reconcile hr <name>` | Force reconciliation |
| `flux suspend hr <name>` | Pause reconciliation |
| `flux resume hr <name>` | Resume reconciliation |
| `flux reconcile hr <name> --with-source` | Reconcile with source refresh |

## Summary

The `flux get helmreleases` command is essential for managing Helm-based applications in a Flux CD environment. It gives you immediate visibility into which chart versions are deployed, whether releases are healthy, and what errors are occurring. By combining it with detailed kubectl inspection, Helm history, and controller logs, you can quickly diagnose and resolve any Helm release issues. Regular monitoring with automated scripts helps catch problems early before they affect your users.
