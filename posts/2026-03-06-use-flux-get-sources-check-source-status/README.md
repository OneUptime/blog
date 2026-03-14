# How to Use flux get sources to Check Source Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, CLI, Source, GitOps, Kubernetes, Flux-get, Git-repository, Helm-repository, OCI

Description: A practical guide to using flux get sources commands to monitor and troubleshoot all source types in your Flux CD managed cluster.

---

## Introduction

Sources are the foundation of every Flux CD pipeline. They define where Flux fetches configuration from -- Git repositories, Helm chart repositories, OCI registries, and S3-compatible buckets. If a source is unhealthy, nothing downstream can reconcile.

The `flux get sources` family of commands lets you inspect the status of all source types. This guide covers how to use these commands effectively to monitor, debug, and maintain your Flux sources.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The Flux CLI installed locally
- kubectl configured to connect to your cluster
- At least one Flux source configured

## Step 1: Check All Sources at Once

The quickest way to see every source in your cluster:

```bash
# List all source types across all namespaces
flux get sources all -A
```

Sample output:

```text
NAME                              REVISION          SUSPENDED  READY  MESSAGE
gitrepository/flux-system         main@sha1:abc123  False      True   stored artifact for revision 'main@sha1:abc1234'
gitrepository/my-app              main@sha1:def456  False      True   stored artifact for revision 'main@sha1:def4567'
gitrepository/infrastructure      main@sha1:789abc  False      False  failed to checkout: authentication required

NAME                              REVISION          SUSPENDED  READY  MESSAGE
helmrepository/bitnami            sha256:9a8b7c     False      True   stored artifact: revision 'sha256:9a8b7c6d'
helmrepository/ingress-nginx      sha256:1b2c3d     False      True   stored artifact: revision 'sha256:1b2c3d4e'

NAME                              REVISION          SUSPENDED  READY  MESSAGE
ocirepository/my-app-oci          v1.2.3@sha256:ab  False      True   stored artifact for digest 'v1.2.3@sha256:ab12cd'

NAME                              REVISION          SUSPENDED  READY  MESSAGE
bucket/config-bucket              sha256:ef01ab     False      True   stored artifact: revision 'sha256:ef01ab23'
```

## Step 2: Check Git Repository Sources

Git repositories are the most common source type in Flux.

```bash
# List all git repositories
flux get sources git -A

# Check a specific git repository
flux get sources git flux-system -n flux-system

# Watch git repositories for changes
flux get sources git -A -w
```

### Understanding Git Source Output

Key fields to examine:

- **REVISION**: Shows the branch and commit SHA (e.g., `main@sha1:abc1234`)
- **READY**: True when the latest revision has been fetched and stored
- **MESSAGE**: Details about the last operation

### Common Git Source Issues

```bash
# Authentication failure
# MESSAGE: failed to checkout: authentication required
# Fix: Check the secret reference in the GitRepository spec
kubectl get gitrepository flux-system -n flux-system -o yaml | grep -A 5 secretRef
kubectl get secret flux-system -n flux-system -o yaml

# Branch not found
# MESSAGE: failed to checkout: reference not found
# Fix: Verify the branch name in the spec
kubectl get gitrepository my-app -n flux-system -o yaml | grep ref -A 3

# Timeout fetching repository
# MESSAGE: failed to checkout: context deadline exceeded
# Fix: Increase the timeout or check network connectivity
```

## Step 3: Check Helm Repository Sources

Helm repositories provide charts for HelmRelease resources.

```bash
# List all helm repositories
flux get sources helm -A

# Check a specific helm repository
flux get sources helm bitnami -n flux-system

# Get detailed output
flux get sources helm -A -o yaml
```

### Verify Helm Chart Availability

```bash
# List all helm charts (pulled from repositories)
flux get sources chart -A
```

Sample output:

```text
NAME                                REVISION  SUSPENDED  READY  MESSAGE
helmchart/flux-system-nginx         4.8.3     False      True   pulled 'nginx' chart with version '4.8.3'
helmchart/flux-system-prometheus    45.0.0    False      True   pulled 'prometheus' chart with version '45.0.0'
helmchart/flux-system-grafana       7.0.0     False      False  chart pull error: chart version '99.0.0' not found
```

### Common Helm Source Issues

```bash
# Chart version not found
# MESSAGE: chart pull error: chart version not found
# Fix: Check available versions
helm repo add bitnami https://charts.bitnami.com/bitnami
helm search repo bitnami/nginx --versions

# Repository unreachable
# MESSAGE: failed to fetch index: 503 Service Unavailable
# Fix: Verify the repository URL and check for outages
kubectl get helmrepository bitnami -n flux-system -o yaml | grep url

# OCI registry authentication failure
# MESSAGE: failed to login to registry: unauthorized
# Fix: Check the secret reference
kubectl get helmrepository my-oci-repo -n flux-system -o yaml | grep -A 5 secretRef
```

## Step 4: Check OCI Repository Sources

OCI repositories store Kubernetes manifests as OCI artifacts.

```bash
# List all OCI repositories
flux get sources oci -A

# Check a specific OCI repository
flux get sources oci my-app-oci -n flux-system

# View detailed status
flux get sources oci my-app-oci -n flux-system -o yaml
```

## Step 5: Check Bucket Sources

Buckets are S3-compatible storage sources.

```bash
# List all bucket sources
flux get sources bucket -A

# Check a specific bucket
flux get sources bucket config-bucket -n flux-system
```

## Step 6: Monitor Source Reconciliation

Track when sources are being updated.

```bash
# Watch all sources in real time
watch -n 5 'flux get sources all -A'

# Watch only git repositories
flux get sources git -A -w

# Check the last reconciliation time
flux get sources git -A -o json | jq '.[] | {name: .metadata.name, lastHandledReconcileAt: .status.lastHandledReconcileAt}'
```

## Step 7: Force Source Reconciliation

When you need sources to update immediately rather than waiting for the next interval:

```bash
# Reconcile a specific git source
flux reconcile source git flux-system -n flux-system

# Reconcile a helm repository
flux reconcile source helm bitnami -n flux-system

# Reconcile an OCI repository
flux reconcile source oci my-app-oci -n flux-system

# Reconcile a bucket
flux reconcile source bucket config-bucket -n flux-system

# Reconcile with a specific revision (git only)
flux reconcile source git my-app -n flux-system --revision main
```

## Step 8: Inspect Source Artifacts

Every source produces an artifact that downstream resources consume.

```bash
# View the artifact details for a git repository
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.artifact}' | jq .

# Check artifact revision
kubectl get gitrepository flux-system -n flux-system \
  -o jsonpath='{.status.artifact.revision}'

# Check when the artifact was last updated
kubectl get gitrepository flux-system -n flux-system \
  -o jsonpath='{.status.artifact.lastUpdateTime}'

# Verify artifact checksum
kubectl get gitrepository flux-system -n flux-system \
  -o jsonpath='{.status.artifact.digest}'
```

## Step 9: Health Check Script for Sources

Create a script to monitor source health:

```bash
#!/bin/bash
# check-sources.sh
# Monitor the health of all Flux sources

echo "Flux Source Health Check - $(date)"
echo "==================================="
echo ""

# Check each source type
for source_type in git helm chart oci bucket; do
    echo "--- ${source_type} sources ---"
    output=$(flux get sources ${source_type} -A 2>/dev/null)
    if [ -z "$output" ]; then
        echo "  No ${source_type} sources found."
    else
        echo "$output"
        # Count failures
        failures=$(echo "$output" | grep -c "False")
        if [ "$failures" -gt 0 ]; then
            echo "  WARNING: ${failures} ${source_type} source(s) not ready!"
        fi
    fi
    echo ""
done

# Overall summary
total_failures=$(flux get sources all -A 2>/dev/null | grep -c "False")
if [ "$total_failures" -gt 0 ]; then
    echo "RESULT: ${total_failures} source(s) need attention."
    exit 1
else
    echo "RESULT: All sources are healthy."
    exit 0
fi
```

## Step 10: Source Configuration Best Practices

### Set Appropriate Intervals

```yaml
# High-frequency source for rapid deployments
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/my-app
  ref:
    branch: main
```

```yaml
# Low-frequency source for stable infrastructure
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  # Check less frequently for stable repos
  interval: 10m
  url: https://github.com/myorg/infrastructure
  ref:
    branch: main
```

### Verify Source Dependencies

Check that all kustomizations and helm releases reference existing sources:

```bash
# List all source references used by kustomizations
kubectl get kustomizations -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.sourceRef.kind}/{.spec.sourceRef.name}{"\n"}{end}'

# List all source references used by helm releases
kubectl get helmreleases -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.chart.spec.sourceRef.kind}/{.spec.chart.spec.sourceRef.name}{"\n"}{end}'

# Cross-reference with existing sources
flux get sources all -A --no-header | awk '{print $1}'
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `flux get sources all -A` | All sources across namespaces |
| `flux get sources git -A` | All Git repositories |
| `flux get sources helm -A` | All Helm repositories |
| `flux get sources chart -A` | All Helm charts |
| `flux get sources oci -A` | All OCI repositories |
| `flux get sources bucket -A` | All S3 buckets |
| `flux reconcile source git <name>` | Force Git source sync |
| `flux get sources all -A -o json` | JSON output for scripting |

## Summary

The `flux get sources` commands are essential for monitoring the health of your GitOps pipeline's foundation. Sources must be healthy for any downstream reconciliation to succeed. Regularly checking source status, watching for authentication failures, revision mismatches, and connectivity issues will help you maintain a reliable Flux deployment. Combine these commands with automated health check scripts to catch source problems before they affect your workloads.
