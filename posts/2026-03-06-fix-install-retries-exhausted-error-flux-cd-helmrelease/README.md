# How to Fix 'install retries exhausted' Error in Flux CD HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, install retries exhausted, Helm, Troubleshooting, Kubernetes, GitOps

Description: A step-by-step guide to resolving the 'install retries exhausted' error in Flux CD HelmRelease resources with remediation strategies.

---

## Introduction

The "install retries exhausted" error in Flux CD occurs when a HelmRelease fails to install and has used up all its configured retry attempts. This means the initial Helm chart installation failed repeatedly, and Flux has given up trying. This guide covers the common causes and shows you how to fix the chart issues and properly configure retry behavior.

## Understanding the Error

Check the HelmRelease status to see the error:

```bash
# List all HelmReleases and their status
flux get helmreleases -A

# Get detailed information
kubectl describe helmrelease <name> -n <namespace>

# Check the Helm-controller logs for more detail
kubectl logs -n flux-system deploy/helm-controller --tail=100 | grep <release-name>
```

The error message looks like:

```text
install retries exhausted
```

Or more specifically:

```text
Helm install failed: <underlying error>
install retries exhausted, no remediation configured
```

## Cause 1: Invalid Helm Values

The most common cause is providing values that the chart does not accept or that produce invalid Kubernetes manifests.

### Diagnosing

```bash
# Check the values being passed
kubectl get helmrelease <name> -n <namespace> -o jsonpath='{.spec.values}' | jq .

# Try rendering the chart locally to see the error
helm template <release-name> <chart> --values values.yaml
```

### Fix

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
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
  # Fix the values to match what the chart expects
  values:
    replicaCount: 2
    image:
      repository: my-app
      tag: "v1.0.0"        # Ensure this is a string
    service:
      type: ClusterIP
      port: 80
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

### Common Value Mistakes

```yaml
# WRONG: Numeric value where string is expected
image:
  tag: 1.0  # Helm might interpret this as a float

# CORRECT: Quote the value
image:
  tag: "1.0"

# WRONG: Wrong nesting level
ingress:
  enabled: true
  host: example.com  # Should be nested under hosts

# CORRECT: Follow the chart's values schema
ingress:
  enabled: true
  hosts:
    - host: example.com
      paths:
        - path: /
          pathType: Prefix
```

## Cause 2: Chart Version Not Found

The specified chart version might not exist in the repository.

### Diagnosing

```bash
# Check the configured chart version
kubectl get helmrelease <name> -n <namespace> -o jsonpath='{.spec.chart.spec.version}'

# Check the HelmChart resource status
kubectl get helmcharts -A
kubectl describe helmchart <namespace>-<name> -n flux-system
```

### Fix

```yaml
spec:
  chart:
    spec:
      chart: my-chart
      # Use a valid version or version range
      version: ">=1.0.0 <2.0.0"  # Semver range
      # Or pin to a specific version
      # version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

Update the Helm repository index:

```bash
# Force the HelmRepository to refresh
flux reconcile source helm my-repo -n flux-system
```

## Cause 3: Namespace Does Not Exist

If the target namespace for the Helm release does not exist, the install will fail.

### Diagnosing

```bash
# Check if the target namespace exists
kubectl get namespace <target-namespace>
```

### Fix

Either create the namespace manually or let Flux create it:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  # Tell Flux to create the namespace if it does not exist
  install:
    createNamespace: true
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

## Cause 4: CRDs Not Installed

If the Helm chart creates resources that depend on CRDs not yet installed in the cluster, the install will fail.

### Diagnosing

```bash
# Look for CRD-related errors in helm-controller logs
kubectl logs -n flux-system deploy/helm-controller --tail=100 | grep -i "crd\|custom resource\|no matches"
```

### Fix: Install CRDs Before the HelmRelease

```yaml
# Step 1: Create a Kustomization for CRDs
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
  prune: false  # Never prune CRDs
---
# Step 2: Make HelmRelease depend on CRDs
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  dependsOn:
    - name: my-app-crds
      namespace: flux-system
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

Or configure the chart's CRD installation method:

```yaml
spec:
  install:
    crds: CreateReplace  # Create CRDs if missing, replace if they exist
  upgrade:
    crds: CreateReplace
```

## Cause 5: RBAC Permissions

The Helm controller may lack permissions to create certain resources.

### Diagnosing

```bash
# Check for RBAC errors
kubectl logs -n flux-system deploy/helm-controller --tail=100 | grep -i "forbidden\|rbac\|unauthorized"
```

### Fix

If using a custom service account for the HelmRelease:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  # Specify a service account with sufficient permissions
  serviceAccountName: helm-deployer
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

Create the service account and RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: helm-deployer
  namespace: my-namespace
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: helm-deployer-admin
subjects:
  - kind: ServiceAccount
    name: helm-deployer
    namespace: my-namespace
roleRef:
  kind: ClusterRole
  name: cluster-admin  # Use a more restrictive role in production
  apiGroup: rbac.authorization.k8s.io
```

## Configuring Install Remediation

Configure how Flux handles install failures:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
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
  # Configure install retry behavior
  install:
    # Number of retries before giving up
    retries: 5
    # Remediation actions
    remediation:
      # Number of retries (overrides install.retries)
      retries: 5
      # Whether to retry on a transient error
      retryOn: ""
```

## Resetting a Failed HelmRelease

When retries are exhausted, you need to reset the HelmRelease:

### Option 1: Suspend and Resume

```bash
# Suspend the HelmRelease
flux suspend helmrelease <name> -n <namespace>

# Resume it to restart the installation process
flux resume helmrelease <name> -n <namespace>

# Force reconciliation
flux reconcile helmrelease <name> -n <namespace>
```

### Option 2: Delete the Failed Helm Secret

```bash
# List Helm secrets for the release
kubectl get secrets -n <namespace> -l name=<release-name>,owner=helm

# Delete the failed release secret to reset state
kubectl delete secret -n <namespace> -l name=<release-name>,owner=helm,status=failed

# Force reconciliation
flux reconcile helmrelease <name> -n <namespace>
```

### Option 3: Patch the Status

```bash
# Remove the failure condition by editing the resource
kubectl patch helmrelease <name> -n <namespace> \
  --type=json \
  -p='[{"op": "remove", "path": "/status/conditions"}]'
```

## Testing Chart Installation Locally

Before pushing changes, test the installation locally:

```bash
# Add the Helm repository
helm repo add my-repo https://charts.example.com
helm repo update

# Try a dry-run installation
helm install my-app my-repo/my-chart \
  --version 1.2.3 \
  --namespace my-namespace \
  --values values.yaml \
  --dry-run

# Or template the chart to see the rendered manifests
helm template my-app my-repo/my-chart \
  --version 1.2.3 \
  --namespace my-namespace \
  --values values.yaml > rendered.yaml

# Validate the rendered manifests
kubectl apply --dry-run=server -f rendered.yaml
```

## Summary

The "install retries exhausted" error means Flux tried to install a Helm chart multiple times and failed each time. The fix involves identifying the root cause (bad values, missing CRDs, RBAC issues), correcting it, and then resetting the HelmRelease so Flux can try again. Always configure appropriate retry counts and test chart installations locally before deploying through Flux.
