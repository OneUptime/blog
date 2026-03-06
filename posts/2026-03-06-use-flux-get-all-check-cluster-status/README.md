# How to Use flux get all to Check Cluster Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, CLI, Cluster-status, GitOps, Kubernetes, flux-get, Troubleshooting

Description: A comprehensive guide to using the flux get all command to check the status of all Flux resources in your Kubernetes cluster.

---

## Introduction

The `flux get all` command is one of the most useful commands in the Flux CLI toolkit. It provides a consolidated view of every Flux resource in your cluster, including sources, kustomizations, helm releases, and image automation resources. This single command can quickly tell you whether your GitOps pipeline is healthy or if something needs attention.

This guide covers how to use `flux get all` effectively, interpret its output, and combine it with other commands for thorough cluster status checks.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The Flux CLI installed locally
- kubectl configured to connect to your cluster
- At least one Flux source and kustomization configured

## Step 1: Install the Flux CLI

If you do not already have the Flux CLI installed:

```bash
# Install on macOS
brew install fluxcd/tap/flux

# Install on Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify installation
flux --version

# Check that Flux is installed in your cluster
flux check
```

## Step 2: Run flux get all

The basic command shows all Flux resources across all namespaces.

```bash
# Get all Flux resources in the flux-system namespace (default)
flux get all

# Get all Flux resources across all namespaces
flux get all -A

# Get all resources with additional status details
flux get all -A --status-selector ready=false
```

## Step 3: Understanding the Output

The `flux get all` command groups resources by type. Here is what typical output looks like:

```text
NAME                        REVISION        SUSPENDED  READY  MESSAGE
gitrepository/flux-system   main@sha1:abc1  False      True   stored artifact for revision 'main@sha1:abc1234'
gitrepository/my-app        main@sha1:def5  False      True   stored artifact for revision 'main@sha1:def5678'

NAME                            REVISION    SUSPENDED  READY  MESSAGE
helmrepository/bitnami          sha256:9a8  False      True   stored artifact: revision 'sha256:9a8b7c6'
helmrepository/ingress-nginx    sha256:1b2  False      True   stored artifact: revision 'sha256:1b2c3d4'

NAME                              REVISION  SUSPENDED  READY  MESSAGE
helmchart/flux-system-nginx       4.8.3     False      True   pulled 'nginx' chart with version '4.8.3'

NAME                              REVISION        SUSPENDED  READY  MESSAGE
kustomization/flux-system         main@sha1:abc1  False      True   Applied revision: main@sha1:abc1234
kustomization/my-app              main@sha1:def5  False      True   Applied revision: main@sha1:def5678
kustomization/monitoring          main@sha1:abc1  False      False  health check failed

NAME                              REVISION  SUSPENDED  READY  MESSAGE
helmrelease/nginx                 4.8.3     False      True   Helm install succeeded
helmrelease/prometheus            45.0.0    False      True   Helm upgrade succeeded
```

Each line shows:

- **NAME**: The resource type and name
- **REVISION**: The current applied revision (git SHA, chart version, etc.)
- **SUSPENDED**: Whether reconciliation is paused
- **READY**: Whether the resource is healthy
- **MESSAGE**: The latest status message

## Step 4: Filter by Namespace

When working with multi-tenant or multi-environment clusters, filter by namespace.

```bash
# Check resources in a specific namespace
flux get all -n production

# Check resources in the flux-system namespace
flux get all -n flux-system

# Compare two namespaces
echo "=== Staging ===" && flux get all -n staging
echo "=== Production ===" && flux get all -n production
```

## Step 5: Identify Unhealthy Resources

Quickly find resources that are not ready.

```bash
# List all resources that are not ready
flux get all -A --status-selector ready=false

# Pipe through grep for quick filtering
flux get all -A | grep "False"

# Get detailed information about a specific failing resource
flux get kustomizations monitoring -n flux-system
```

When a resource shows `READY: False`, the MESSAGE column usually explains why. Common messages include:

- `health check failed`: A dependent resource is unhealthy
- `Source not found`: The referenced source does not exist
- `dependency not ready`: A dependent kustomization has not reconciled
- `install retries exhausted`: A Helm release failed to install

## Step 6: Check Resource Revisions

Verify that your cluster is running the expected versions.

```bash
# Check what revision each source is at
flux get sources all -A

# Compare the git repository revision with the kustomization revision
# They should match when everything is in sync
flux get all -A | grep "main@sha1"

# Check if any resources are behind
# Look for kustomizations with older revisions than their sources
flux get sources git -A
flux get kustomizations -A
```

## Step 7: Check Suspended Resources

Suspended resources do not reconcile automatically. Find them with:

```bash
# List all suspended resources
flux get all -A | grep "True" | grep -v "READY"

# More precise: check for suspended sources
flux get sources all -A --status-selector suspended=true

# Check for suspended kustomizations
flux get kustomizations -A --status-selector suspended=true
```

To resume a suspended resource:

```bash
# Resume a suspended kustomization
flux resume kustomization my-app -n flux-system

# Resume a suspended helm release
flux resume helmrelease nginx -n flux-system

# Resume a suspended source
flux resume source git my-app -n flux-system
```

## Step 8: Combine with Watch for Real-Time Monitoring

Monitor your cluster status in real time.

```bash
# Watch all resources for changes
watch -n 5 'flux get all -A'

# Watch only failing resources
watch -n 5 'flux get all -A --status-selector ready=false'

# Monitor a specific namespace during deployment
watch -n 2 'flux get all -n production'
```

## Step 9: Automate Cluster Health Checks

Create a simple health check script using `flux get all`.

```bash
#!/bin/bash
# flux-health-check.sh
# Check the health of all Flux resources in the cluster

echo "Flux Cluster Health Check"
echo "========================="
echo ""

# Check Flux components first
echo "Flux Components:"
flux check 2>&1
echo ""

# Get all resources
echo "All Flux Resources:"
flux get all -A
echo ""

# Count unhealthy resources
UNHEALTHY=$(flux get all -A 2>/dev/null | grep -c "False")

if [ "$UNHEALTHY" -gt 0 ]; then
    echo "WARNING: $UNHEALTHY resource(s) are not ready:"
    echo ""
    flux get all -A | grep "False"
    exit 1
else
    echo "All resources are healthy."
    exit 0
fi
```

## Step 10: Export Output for Reporting

Generate reports from `flux get all` output.

```bash
# Export to JSON format for programmatic processing
flux get all -A -o json > flux-status.json

# Export as YAML
flux get all -A -o yaml > flux-status.yaml

# Create a summary report
echo "Flux Status Report - $(date)" > flux-report.txt
echo "" >> flux-report.txt
flux get all -A >> flux-report.txt
echo "" >> flux-report.txt
echo "Unhealthy Resources:" >> flux-report.txt
flux get all -A | grep "False" >> flux-report.txt
```

## Quick Reference: flux get all Flags

| Flag | Description | Example |
|------|-------------|---------|
| `-A` | All namespaces | `flux get all -A` |
| `-n` | Specific namespace | `flux get all -n production` |
| `--status-selector` | Filter by status | `flux get all --status-selector ready=false` |
| `-o json` | JSON output | `flux get all -o json` |
| `-o yaml` | YAML output | `flux get all -o yaml` |
| `--no-header` | Suppress header row | `flux get all --no-header` |

## Troubleshooting

### Command Returns No Resources

```bash
# Verify Flux is installed
flux check

# Check that you are connected to the correct cluster
kubectl config current-context

# Check that Flux resources exist
kubectl get gitrepositories -A
kubectl get kustomizations -A
```

### Stale Revision Shown

If a resource shows an old revision, it may need manual reconciliation:

```bash
# Force reconciliation of a git source
flux reconcile source git flux-system

# Force reconciliation of a kustomization
flux reconcile kustomization my-app

# Force reconciliation of all sources
flux reconcile source git --all
```

### Output Too Wide for Terminal

```bash
# Use a narrower output format
flux get all -A --no-header | column -t

# Or pipe to less for scrollable output
flux get all -A | less -S
```

## Summary

The `flux get all` command is your primary tool for checking the overall health of a Flux-managed cluster. It provides a single-pane view of all sources, kustomizations, helm releases, and image automation resources. By combining it with namespace filters, status selectors, and watch mode, you can quickly identify and diagnose issues. Integrate it into health check scripts and CI/CD pipelines to maintain continuous visibility into your GitOps pipeline status.
