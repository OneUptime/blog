# How to Fix "request entity too large" Error in Flux CD HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, helmrelease, request entity too large, helm, secret size, troubleshooting, kubernetes, gitops

Description: A guide to resolving the "request entity too large" error in Flux CD HelmRelease caused by Helm release secret size limits in etcd.

---

## Introduction

The "request entity too large" error in Flux CD occurs when a Helm release creates a Kubernetes Secret that exceeds the etcd storage limit. Helm stores the entire rendered manifest of each release as a Secret in the cluster, and etcd has a hard limit of approximately 1.5 MB per object. This guide explains why this happens and provides multiple strategies to fix it.

## Understanding the Error

The error appears in the HelmRelease status:

```bash
# Check HelmRelease status
flux get helmreleases -A

# Get detailed error
kubectl describe helmrelease <name> -n <namespace>
```

The error message looks like:

```
Helm install failed: create: failed to create: Secret "sh.helm.release.v1.my-app.v1" is invalid:
data: Too long: must have at most 1048576 bytes
```

Or:

```
request entity too large: limit is 3145728
```

### Why This Happens

Helm stores each release revision as a Kubernetes Secret. This Secret contains:
- The full rendered manifest (all templates with values applied)
- The chart metadata
- The release metadata
- The values used

When a chart has many templates, large ConfigMaps, or embedded data, the resulting Secret can exceed etcd limits.

```bash
# Check the size of existing Helm release secrets
kubectl get secrets -n <namespace> -l owner=helm -o json | \
  python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
for item in data['items']:
    total = sum(len(v) for v in item['data'].values())
    print(f\"{item['metadata']['name']}: {total/1024:.0f} KB\")
"
```

## Fix 1: Reduce Release History with maxHistory

The most common fix is to limit how many release revisions Helm keeps:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # Limit the number of release revisions stored
  # Each revision is a separate Secret
  maxHistory: 2  # Keep only the 2 most recent revisions
```

While this does not fix the per-Secret size limit, it reduces the total number of Secrets and prevents accumulation.

### Clean Up Old Release Secrets

```bash
# List all release secrets sorted by revision
kubectl get secrets -n <namespace> \
  -l name=<release-name>,owner=helm \
  --sort-by='{.metadata.creationTimestamp}'

# Delete old revisions manually (keep the latest)
kubectl delete secret sh.helm.release.v1.<release-name>.v1 -n <namespace>
kubectl delete secret sh.helm.release.v1.<release-name>.v2 -n <namespace>
# Keep the latest revision
```

## Fix 2: Use Helm Storage Driver as ConfigMap or SQL

By default, Helm stores releases as Secrets. You can change this to use ConfigMaps (which have the same size limit) or an external SQL database.

### Using SQL Storage (Advanced)

This requires running a SQL database and configuring the helm-controller to use it. This is typically only done in very large deployments.

## Fix 3: Reduce Chart Output Size

The most sustainable fix is to make the rendered chart smaller.

### Remove Unnecessary Resources

```yaml
# In your HelmRelease values, disable components you do not need
values:
  # Disable optional components
  metrics:
    enabled: false
  dashboard:
    enabled: false
  # Disable test resources
  tests:
    enabled: false
```

### Externalize Large ConfigMaps

Instead of embedding large configuration files in the chart, store them externally:

```yaml
# BEFORE: Large inline config in values
# This bloats the Helm release Secret
values:
  config:
    largeConfigFile: |
      # Hundreds of lines of configuration...
      # This all gets stored in the Helm release Secret

# AFTER: Reference an external ConfigMap
values:
  config:
    existingConfigMap: my-app-config
```

Create the ConfigMap separately through a Kustomization:

```yaml
# configmap.yaml (managed by Kustomization, not Helm)
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: my-namespace
data:
  config.yaml: |
    # Your large configuration here
    # This is NOT stored in the Helm release Secret
```

### Split Large Charts into Multiple HelmReleases

```yaml
# Split a monolithic chart into smaller, focused releases
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app-core
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  maxHistory: 2
  values:
    # Only enable core components
    core:
      enabled: true
    monitoring:
      enabled: false
    ingress:
      enabled: false
---
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app-monitoring
  namespace: my-namespace
spec:
  interval: 10m
  dependsOn:
    - name: my-app-core
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  maxHistory: 2
  values:
    # Only enable monitoring components
    core:
      enabled: false
    monitoring:
      enabled: true
```

## Fix 4: Enable Helm Release Compression

Helm compresses release data by default using gzip. Verify compression is working:

```bash
# Check the compression of a release secret
kubectl get secret sh.helm.release.v1.<release-name>.v1 -n <namespace> -o jsonpath='{.data.release}' | base64 -d | head -c 2 | xxd
# If it starts with 1f 8b, it is gzip compressed
```

If for some reason compression is disabled, ensure the helm-controller does not have `--storage-driver` flags that bypass it.

## Fix 5: Increase etcd Object Size Limit

If you control the Kubernetes cluster, you can increase the etcd limit. This is a cluster-level change and should be done with caution.

### For kubeadm Clusters

```yaml
# In the kubeadm config or kube-apiserver manifest
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  extraArgs:
    # Increase the max request body size (default is 3MB)
    max-request-bytes: "10485760"  # 10MB
```

### For Managed Kubernetes

Most managed Kubernetes services (EKS, GKE, AKS) do not allow changing etcd limits. In these cases, you must reduce the chart output size instead.

## Fix 6: Post-Renderer to Strip Unnecessary Data

Use a post-renderer to strip comments, labels, or other unnecessary data before the release is stored:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  maxHistory: 2
  # Use a post-renderer with kustomize to modify output
  postRenderers:
    - kustomize:
        patches:
          # Remove large annotations that are not needed
          - target:
              kind: ConfigMap
              name: ".*"
            patch: |
              - op: remove
                path: /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
```

## Diagnosing the Exact Size Issue

```bash
# Render the chart and measure the output size
helm template my-app my-repo/my-chart \
  --version 1.2.3 \
  --namespace my-namespace \
  --values values.yaml | wc -c
# If this is over 1MB, the release Secret will likely hit the limit

# Find the largest rendered templates
helm template my-app my-repo/my-chart \
  --version 1.2.3 \
  --namespace my-namespace \
  --values values.yaml \
  --show-only templates/ 2>/dev/null | \
  awk '/^---/{if(name && size>0) print size, name; name=""; size=0} /^# Source:/{name=$3} {size+=length($0)+1}' | \
  sort -rn | head -10
```

## Complete Example: Fixing a Large HelmRelease

Here is a complete example showing all the recommended settings:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-large-app
  namespace: my-namespace
spec:
  interval: 10m
  # Keep minimal release history
  maxHistory: 2
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  # Disable components to reduce chart size
  values:
    # Use external ConfigMaps for large configs
    config:
      existingConfigMap: my-app-external-config
    # Disable features you do not need
    tests:
      enabled: false
    docs:
      enabled: false
```

## Summary

The "request entity too large" error is caused by Helm release Secrets exceeding etcd size limits. The most effective fixes are: setting `maxHistory: 2` to limit stored revisions, externalizing large ConfigMaps out of the Helm chart, splitting large charts into smaller releases, and disabling unnecessary chart components. For most cases, reducing chart output size combined with a low `maxHistory` value resolves the issue without requiring cluster-level changes.
