# How to Fix metadata.annotations too long Error in Flux HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, HelmRelease, Annotation, Helm

Description: Learn how to diagnose and fix the 'metadata.annotations too long' error in Flux HelmRelease caused by the last-applied-configuration annotation exceeding Kubernetes limits.

---

When Flux manages HelmReleases with large values or many resources, you may encounter:

```text
helm-controller: failed to create resource: metadata.annotations: Too long: must have at most 262144 bytes
```

or:

```text
The ConfigMap "my-config" is invalid: metadata.annotations: Too long: must have at most 262144 bytes
```

This error occurs when the total size of a resource's annotation keys and values exceeds the 262144-byte (256 KiB) limit imposed by Kubernetes. A common cause is the `kubectl.kubernetes.io/last-applied-configuration` annotation, which stores the applied configuration of the resource and is added by client-side apply. In a Flux HelmRelease, the error can also come from annotations rendered directly by the Helm chart.

## Root Causes

### 1. Large ConfigMaps or Secrets

Resources with large data fields (like ConfigMaps containing entire configuration files or dashboards) can push the last-applied-configuration annotation past the size limit if they are managed with client-side apply.

### 2. Large Helm Values

When HelmRelease values render large annotations into Kubernetes resources, the generated resources may exceed the annotation size limit.

### 3. Client-Side Apply Adding Large Annotations

When a resource is applied with client-side apply, kubectl stores the applied manifest in the `last-applied-configuration` annotation, which can effectively duplicate a large object into metadata. Modern Flux Kustomizations use server-side apply, and current Flux HelmRelease installs use server-side apply by default unless Helm 3 defaults are enabled.

### 4. Embedded JSON in ConfigMaps

ConfigMaps containing embedded JSON files (such as Grafana dashboards or complex application configs) are frequently the cause when those large objects are also stored in an annotation.

## Diagnostic Steps

### Step 1: Identify the Failing Resource

```bash
flux get helmreleases -A
```

Check the status for the specific error message.

### Step 2: Check Resource Annotation Size

```bash
kubectl get configmap my-config -n default -o jsonpath='{.metadata.annotations}' | wc -c
```

### Step 3: Check Controller Logs

```bash
kubectl logs -n flux-system deploy/helm-controller --since=5m | grep "Too long"
kubectl logs -n flux-system deploy/kustomize-controller --since=5m | grep "Too long"
```

### Step 4: Check the Resource Size

```bash
kubectl get configmap my-config -n default -o json | wc -c
```

## How to Fix

### Fix 1: Enable Server-Side Apply

The most effective fix for client-side-apply failures is to switch to server-side apply, which uses managed fields instead of the `last-applied-configuration` annotation. For HelmReleases, make sure install and upgrade actions use server-side apply:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      sourceRef:
        kind: HelmRepository
        name: my-repo
  install:
    serverSideApply: true
  upgrade:
    serverSideApply: enabled
```

Flux v2 Kustomizations use server-side apply by default, and current Flux HelmRelease installs default to server-side apply. Ensure you are running an up-to-date version of Flux.

### Fix 2: Remove the Last-Applied-Configuration Annotation

Remove the oversized annotation from existing resources:

```bash
kubectl annotate configmap my-config -n default kubectl.kubernetes.io/last-applied-configuration-
```

The trailing `-` removes the annotation.

### Fix 3: Split Large ConfigMaps

Break large ConfigMaps into smaller ones:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-part-1
  namespace: monitoring
data:
  dashboard-1.json: |
    { "title": "Dashboard 1" }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-part-2
  namespace: monitoring
data:
  dashboard-2.json: |
    { "title": "Dashboard 2" }
```

### Fix 4: Use External Configuration Sources

Instead of embedding large configurations in ConfigMaps, store a reference that your application or configuration loader can use to fetch the external content:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
  annotations:
    config.kubernetes.io/origin: "external"
data:
  config-url: "https://config.example.com/app/config.json"
```

### Fix 5: Use Sidecar Loading for Grafana Dashboards

For Grafana dashboards, use the sidecar approach instead of embedding dashboard JSON directly in HelmRelease values:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: grafana
      sourceRef:
        kind: HelmRepository
        name: grafana
  values:
    sidecar:
      dashboards:
        enabled: true
        searchNamespace: ALL
        folderAnnotation: grafana_folder
        provider:
          foldersFromFilesStructure: true
```

### Fix 6: Force Reconciliation

```bash
flux reconcile helmrelease my-app -n flux-system
```

## Prevention

Use server-side apply (the default in modern Flux versions) to avoid the last-applied-configuration annotation when client-side apply is the cause. Keep ConfigMap and Secret sizes reasonable by splitting large configurations into multiple resources. For Grafana dashboards and similar large embedded content, use sidecar or operator-based approaches instead of embedding large content directly in HelmRelease values.
