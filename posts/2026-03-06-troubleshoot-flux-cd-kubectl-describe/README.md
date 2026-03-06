# How to Troubleshoot Flux CD with kubectl describe

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Troubleshooting, kubectl, Kubernetes, GitOps, Debugging

Description: Learn how to use kubectl describe to inspect Flux CD resources, interpret conditions and events, and quickly diagnose reconciliation failures.

---

The `kubectl describe` command is one of the most powerful tools for troubleshooting Flux CD. It reveals the full state of any Flux resource, including conditions, events, and configuration details that are not visible in the standard `kubectl get` output. This guide covers how to use `kubectl describe` effectively across every Flux resource type.

## Why kubectl describe Matters for Flux CD

Flux CD resources store their status in Kubernetes conditions, which follow a standard pattern. The `describe` command surfaces these conditions in a readable format alongside recent events, making it the fastest way to understand why a resource is failing.

## Describing GitRepository Resources

The GitRepository resource is often the starting point for troubleshooting, since it handles fetching source code:

```bash
# Describe a specific GitRepository
kubectl describe gitrepository fleet-infra -n flux-system
```

Key sections to look for in the output:

```yaml
Name:         fleet-infra
Namespace:    flux-system
Labels:       kustomize.toolkit.fluxcd.io/name=flux-system
API Version:  source.toolkit.fluxcd.io/v1
Kind:         GitRepository
Spec:
  Interval:  1m0s
  Ref:
    Branch:  main
  URL:       https://github.com/my-org/fleet-infra.git
Status:
  Artifact:
    Digest:            sha256:abc123...
    Last Update Time:  2026-03-06T10:00:00Z
    Path:              gitrepository/flux-system/fleet-infra/abc123.tar.gz
    Revision:          main@sha1:abc123def456
    URL:               http://source-controller.flux-system.svc.cluster.local./gitrepository/flux-system/fleet-infra/abc123.tar.gz
  Conditions:
    Last Transition Time:  2026-03-06T10:00:00Z
    Message:               stored artifact for revision 'main@sha1:abc123def456'
    Reason:                Succeeded
    Status:                True
    Type:                  Ready
Events:
  Type    Reason  Age   From               Message
  ----    ------  ----  ----               -------
  Normal  info    2m    source-controller  stored artifact for revision 'main@sha1:abc123def456'
```

### What to check:

- **Conditions**: Look at the `Ready` condition. `Status: True` means healthy. `Status: False` means something is wrong -- read the `Message` field.
- **Artifact**: Confirms the last successfully fetched revision.
- **Events**: Shows recent activity including errors and warnings.

## Describing Kustomization Resources

```bash
# Describe a Kustomization
kubectl describe kustomization my-app -n flux-system
```

Example output with a failure:

```python
Status:
  Conditions:
    Last Transition Time:  2026-03-06T10:05:00Z
    Message:               kustomize build failed: accumulating resources: accumulating resources from 'deployment.yaml': open /tmp/kustomization-123/deployment.yaml: no such file or directory
    Reason:                BuildFailed
    Status:                False
    Type:                  Ready
Events:
  Type     Reason  Age   From                  Message
  ----     ------  ----  ----                  -------
  Warning  error   1m    kustomize-controller  kustomize build failed: accumulating resources...
```

### Common Kustomization conditions:

| Reason | Meaning |
|--------|---------|
| `Succeeded` | Kustomization applied successfully |
| `BuildFailed` | Kustomize build failed (missing files, invalid YAML) |
| `HealthCheckFailed` | Deployed resources failed health checks |
| `DependencyNotReady` | A dependency Kustomization is not ready |
| `ReconciliationFailed` | General reconciliation failure |
| `ArtifactFailed` | Source artifact could not be fetched |

## Describing HelmRepository Resources

```bash
# Describe a HelmRepository
kubectl describe helmrepository bitnami -n flux-system
```

```yaml
Status:
  Conditions:
    Last Transition Time:  2026-03-06T09:00:00Z
    Message:               stored artifact: revision 'sha256:def456...'
    Reason:                Succeeded
    Status:                True
    Type:                  Ready
  URL:  http://source-controller.flux-system.svc.cluster.local./helmrepository/flux-system/bitnami/index-def456.yaml
```

### What to check:

- **URL**: Confirms the index file is being served.
- **Conditions**: `IndexationFailed` means the repository index could not be downloaded.

## Describing HelmRelease Resources

```bash
# Describe a HelmRelease
kubectl describe helmrelease nginx -n default
```

Example output with a failure:

```yaml
Status:
  Conditions:
    Last Transition Time:  2026-03-06T10:10:00Z
    Message:               Helm install failed: rendered manifests contain a resource that already exists
    Reason:                InstallFailed
    Status:                False
    Type:                  Ready
  Failures:  3
  Install Failures:  3
  Last Applied Revision:  14.2.1
  Last Attempted Revision:  14.2.1
Events:
  Type     Reason  Age   From             Message
  ----     ------  ----  ----             -------
  Warning  error   30s   helm-controller  Helm install failed: rendered manifests contain a resource that already exists
```

### Common HelmRelease conditions:

| Reason | Meaning |
|--------|---------|
| `InstallSucceeded` | Chart installed successfully |
| `UpgradeSucceeded` | Chart upgraded successfully |
| `InstallFailed` | Helm install command failed |
| `UpgradeFailed` | Helm upgrade command failed |
| `TestFailed` | Helm test hooks failed |
| `ArtifactFailed` | Chart could not be fetched |
| `DependencyNotReady` | A dependency HelmRelease is not ready |

## Describing HelmChart Resources

Flux automatically creates HelmChart resources for each HelmRelease:

```bash
# List HelmCharts to find the auto-generated name
kubectl get helmcharts -n flux-system

# Describe the HelmChart
kubectl describe helmchart flux-system-nginx -n flux-system
```

This is useful when the chart itself cannot be fetched from the repository.

## Describing ImageRepository Resources

```bash
# Describe an ImageRepository (used by image automation)
kubectl describe imagerepository my-app -n flux-system
```

```yaml
Status:
  Canonical Image Name:  docker.io/myorg/my-app
  Conditions:
    Last Transition Time:  2026-03-06T10:00:00Z
    Message:               successful scan: found 25 tags
    Reason:                Succeeded
    Status:                True
    Type:                  Ready
  Last Scan Result:
    Scan Time:  2026-03-06T10:00:00Z
    Tag Count:  25
```

## Describing ImagePolicy Resources

```bash
# Describe an ImagePolicy
kubectl describe imagepolicy my-app -n flux-system
```

```yaml
Status:
  Conditions:
    Last Transition Time:  2026-03-06T10:00:00Z
    Message:               Latest image tag for 'docker.io/myorg/my-app' resolved to v1.5.2
    Reason:                Succeeded
    Status:                True
    Type:                  Ready
  Latest Image:  docker.io/myorg/my-app:v1.5.2
```

## Describing Alert and Provider Resources

```bash
# Describe an Alert
kubectl describe alert slack-alert -n flux-system

# Describe a Provider
kubectl describe provider slack -n flux-system
```

Check that the Provider has a valid webhook URL and that the Alert references the correct Provider.

## Batch Describing All Flux Resources

To quickly scan the state of all Flux resources:

```bash
# Describe all GitRepositories
kubectl describe gitrepositories -n flux-system

# Describe all Kustomizations
kubectl describe kustomizations -n flux-system

# Describe all HelmReleases across all namespaces
kubectl describe helmreleases -A

# Describe all HelmRepositories
kubectl describe helmrepositories -n flux-system
```

## Using describe with JSON Output for Scripting

For automated troubleshooting, extract conditions programmatically:

```bash
# Get the Ready condition message for all Kustomizations
kubectl get kustomizations -n flux-system -o json \
  | jq -r '.items[] | "\(.metadata.name): \(.status.conditions[] | select(.type == "Ready") | .message)"'

# Get all resources that are not Ready
kubectl get kustomizations -n flux-system -o json \
  | jq -r '.items[] | select(.status.conditions[] | select(.type == "Ready" and .status == "False")) | .metadata.name'
```

## Quick Diagnostic Script

Use this script to get a complete overview of your Flux installation health:

```bash
#!/bin/bash
# flux-diagnostic.sh - Quick health check for all Flux resources

echo "=== GitRepositories ==="
kubectl get gitrepositories -A -o wide
echo ""

echo "=== Kustomizations ==="
kubectl get kustomizations -A -o wide
echo ""

echo "=== HelmReleases ==="
kubectl get helmreleases -A -o wide
echo ""

echo "=== HelmRepositories ==="
kubectl get helmrepositories -A -o wide
echo ""

echo "=== Failed Resources ==="
for resource in gitrepositories kustomizations helmreleases helmrepositories; do
  FAILED=$(kubectl get "$resource" -A -o json \
    | jq -r '.items[] | select(.status.conditions[]? | select(.type == "Ready" and .status == "False")) | "\(.metadata.namespace)/\(.metadata.name)"')
  if [ -n "$FAILED" ]; then
    echo "--- $resource ---"
    echo "$FAILED"
    for item in $FAILED; do
      NS=$(echo "$item" | cut -d'/' -f1)
      NAME=$(echo "$item" | cut -d'/' -f2)
      echo ""
      echo "Details for $item:"
      kubectl describe "$resource" "$NAME" -n "$NS" | grep -A 5 "Conditions:"
    done
  fi
done
```

## Summary

The `kubectl describe` command is your best friend when troubleshooting Flux CD. Always check the **Conditions** section first for the `Ready` condition status and message, then review **Events** for recent activity. For automated monitoring, use JSON output with `jq` to extract condition data programmatically.
