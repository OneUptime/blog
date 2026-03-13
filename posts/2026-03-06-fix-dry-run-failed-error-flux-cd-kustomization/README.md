# How to Fix 'dry-run failed' Error in Flux CD Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kustomization, Dry-run failed, Server-Side Apply, Troubleshooting, Kubernetes, GitOps, CRDs

Description: A comprehensive guide to resolving 'dry-run failed' errors in Flux CD Kustomization caused by missing CRDs, API version mismatches, and RBAC issues.

---

## Introduction

Flux CD performs a server-side dry-run before applying manifests to catch errors early. When this dry-run fails, the Kustomization reports a "dry-run failed" error and the manifests are not applied. This guide covers the common causes and provides specific fixes for each scenario.

## Understanding the Error

Check the Kustomization status for the error:

```bash
# Check Kustomization status
flux get kustomizations -A

# Get detailed error
kubectl describe kustomization <name> -n flux-system

# Check kustomize-controller logs
kubectl logs -n flux-system deploy/kustomize-controller --tail=100
```

The error typically appears as:

```text
dry-run failed: no matches for kind "MyCustomResource" in version "example.com/v1alpha1"
```

Or:

```text
dry-run failed: the server could not find the requested resource
```

## Cause 1: CRDs Not Installed

The most common cause is deploying custom resources before their CRDs are installed in the cluster.

### Diagnosing

```bash
# Check if the required CRD exists
kubectl get crd <crd-name>

# List all available CRDs
kubectl get crds | grep <keyword>

# Check what API resources are available
kubectl api-resources | grep <resource-kind>
```

### Fix: Install CRDs Before Custom Resources

Create a separate Kustomization for CRDs that runs first:

```yaml
# crds-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./crds
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: false  # Never delete CRDs automatically
  # CRDs should not use server-side apply validation
  wait: true
---
# app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  # Wait for CRDs to be installed first
  dependsOn:
    - name: my-app-crds
```

### Fix: Install CRDs via HelmRelease

If the CRDs come from a Helm chart:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 10m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.0"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    # Install CRDs with the chart
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    installCRDs: true  # Chart-specific CRD installation
```

Then make your Kustomization depend on the HelmRelease:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-resources
  namespace: flux-system
spec:
  interval: 10m
  path: ./certificates
  sourceRef:
    kind: GitRepository
    name: my-app
  dependsOn:
    - name: cert-manager  # Wait for the HelmRelease
```

## Cause 2: API Version Mismatch

Using a deprecated or removed API version will cause dry-run to fail.

### Diagnosing

```bash
# Check what API versions are available on the cluster
kubectl api-versions

# Check if a specific API version exists
kubectl api-versions | grep "networking.k8s.io"

# Check deprecation warnings
kubectl apply --dry-run=server -f manifest.yaml 2>&1 | grep -i "deprecated\|removed"
```

### Common API Version Changes

```yaml
# WRONG: Removed in Kubernetes 1.22+
apiVersion: extensions/v1beta1
kind: Ingress

# CORRECT: Use the stable API
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

```yaml
# WRONG: Removed in Kubernetes 1.25+
apiVersion: policy/v1beta1
kind: PodDisruptionBudget

# CORRECT: Use the stable API
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-app
```

```yaml
# WRONG: Removed in Kubernetes 1.25+
apiVersion: batch/v1beta1
kind: CronJob

# CORRECT: Use the stable API
apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-cronjob
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: worker
              image: busybox
              command: ["echo", "hello"]
          restartPolicy: OnFailure
```

### Fix: Update API Versions

Use `kubectl convert` or manually update the API versions in your manifests:

```bash
# Check which API versions need updating
kubectl get all -A -o json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
    api = item['apiVersion']
    kind = item['kind']
    name = item['metadata']['name']
    if 'beta' in api:
        print(f'WARNING: {kind}/{name} uses beta API: {api}')
"
```

## Cause 3: RBAC Permissions for Dry-Run

The kustomize-controller service account may lack permissions to perform dry-run operations on certain resources.

### Diagnosing

```bash
# Check for RBAC errors in the kustomize-controller logs
kubectl logs -n flux-system deploy/kustomize-controller --tail=100 | grep -i "forbidden\|rbac\|unauthorized"

# Check the service account permissions
kubectl auth can-i --list --as=system:serviceaccount:flux-system:kustomize-controller
```

### Fix: Grant Additional RBAC Permissions

```yaml
# Grant the kustomize-controller permission to manage custom resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-custom-resources
rules:
  - apiGroups: ["example.com"]
    resources: ["myresources"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-custom-resources
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
roleRef:
  kind: ClusterRole
  name: flux-custom-resources
  apiGroup: rbac.authorization.k8s.io
```

### Fix: Use a Custom Service Account

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  # Use a service account with sufficient permissions
  serviceAccountName: my-app-deployer
```

## Cause 4: Server-Side Apply Field Conflicts

When multiple controllers manage the same field, server-side apply can report conflicts.

### Diagnosing

```yaml
dry-run failed: Apply failed with 1 conflict: conflict with "helm-controller" using apps/v1: .spec.replicas
```

### Fix: Force Server-Side Apply

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  # Force server-side apply to take ownership of conflicting fields
  force: true
```

Use `force: true` with caution. It overrides ownership of fields managed by other controllers. Make sure you understand which fields are in conflict and that taking ownership is the right approach.

### Fix: Remove Conflicting Fields

A better approach is to remove the conflicting fields from your manifests:

```yaml
# If an HPA manages replicas, remove it from the Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  # Do NOT set replicas when using HPA
  # replicas: 3  # Remove this line
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

## Cause 5: Namespace Mismatch

Dry-run fails when the target namespace does not exist or the manifest references a namespace that is different from the Kustomization target.

### Diagnosing

```bash
# Check the target namespace configuration
kubectl get kustomization <name> -n flux-system -o jsonpath='{.spec.targetNamespace}'
```

### Fix

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  # Set the target namespace for all resources
  targetNamespace: my-namespace
```

Make sure the namespace exists or is created by a dependency:

```yaml
# namespace.yaml in your Git repo
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
```

## Skipping Dry-Run Validation

As a last resort, you can skip the dry-run validation entirely. This is not recommended for production but can help when dealing with edge cases:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
  annotations:
    # Skip dry-run for this specific Kustomization
    kustomize.toolkit.fluxcd.io/ssa: "IfNotPresent"
spec:
  interval: 10m
  path: ./deploy
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  # Force apply without dry-run validation
  force: true
```

## Debugging Dry-Run Locally

Test the dry-run locally before pushing:

```bash
# Build the kustomize output
kustomize build ./deploy > rendered.yaml

# Perform a server-side dry-run against the cluster
kubectl apply --dry-run=server -f rendered.yaml

# If that fails, try client-side dry-run for basic validation
kubectl apply --dry-run=client -f rendered.yaml

# Check for deprecated APIs
kubectl apply --dry-run=server -f rendered.yaml 2>&1 | grep -i "warning"
```

## Summary

The "dry-run failed" error in Flux CD is a safety mechanism that catches problems before manifests are applied. The most common causes are missing CRDs, deprecated API versions, RBAC permission issues, and field ownership conflicts. Fix the underlying issue rather than bypassing the dry-run check whenever possible. Use `dependsOn` to ensure CRDs are installed before custom resources, update deprecated API versions, grant necessary RBAC permissions, and resolve field conflicts by removing duplicate management.
