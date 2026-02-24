# How to Handle Istio Helm Chart Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Kubernetes, Dependencies, Chart Management

Description: Learn how to manage Istio Helm chart dependencies including ordering, version constraints, and sub-chart configuration for reliable deployments.

---

Istio's Helm charts have a specific dependency chain that you need to respect. Install them out of order and things break in confusing ways. Forget to match versions across charts and you end up with incompatible control plane components. This is one of those areas where understanding the dependency graph saves you from hours of debugging.

This guide covers how to manage Istio chart dependencies properly, from installation ordering to building umbrella charts that handle everything automatically.

## The Istio Chart Dependency Chain

Istio splits its Helm installation into several charts, and they have a strict ordering requirement:

1. **istio/base** - Must be installed first. Contains CRDs and cluster-scoped resources.
2. **istio/istiod** - Depends on base. The control plane.
3. **istio/cni** (optional) - Can be installed alongside or after istiod.
4. **istio/gateway** - Depends on istiod being running.

If you install istiod before base, Kubernetes will reject the resources because the CRDs do not exist yet. If you install a gateway before istiod is healthy, the gateway pods will crash-loop because they cannot connect to the control plane for configuration.

## Version Alignment

All Istio charts in a single installation must be the same version. Mixing a 1.21 base with a 1.22 istiod is asking for trouble. The charts are tested together at each release, and cross-version compatibility is not guaranteed.

Always pin your versions explicitly:

```bash
ISTIO_VERSION="1.22.0"

helm install istio-base istio/base \
  --version ${ISTIO_VERSION} \
  -n istio-system --create-namespace

helm install istiod istio/istiod \
  --version ${ISTIO_VERSION} \
  -n istio-system

helm install istio-ingress istio/gateway \
  --version ${ISTIO_VERSION} \
  -n istio-ingress --create-namespace
```

## Building an Umbrella Chart

Managing three separate Helm commands gets old fast. An umbrella chart wraps all the Istio sub-charts into a single installable unit and handles the dependency ordering for you.

Create a new chart:

```bash
mkdir -p istio-umbrella/charts
```

Define the chart metadata:

```yaml
# istio-umbrella/Chart.yaml
apiVersion: v2
name: istio-umbrella
description: Umbrella chart for Istio installation
version: 1.0.0
type: application

dependencies:
  - name: base
    version: 1.22.0
    repository: https://istio-release.storage.googleapis.com/charts
    alias: istio-base
  - name: istiod
    version: 1.22.0
    repository: https://istio-release.storage.googleapis.com/charts
    condition: istiod.enabled
  - name: gateway
    version: 1.22.0
    repository: https://istio-release.storage.googleapis.com/charts
    alias: istio-ingress
    condition: istio-ingress.enabled
```

Now create a values file that configures each sub-chart:

```yaml
# istio-umbrella/values.yaml
istio-base:
  defaultRevision: default

istiod:
  enabled: true
  pilot:
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
    autoscaleEnabled: true
    autoscaleMin: 2
    autoscaleMax: 5
  meshConfig:
    accessLogFile: /dev/stdout
    enableAutoMtls: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true

istio-ingress:
  enabled: true
  service:
    type: LoadBalancer
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
```

Download the dependencies:

```bash
cd istio-umbrella
helm dependency build
```

This downloads the sub-charts into the `charts/` directory. Now you can install everything with one command:

```bash
helm install istio ./istio-umbrella \
  -n istio-system --create-namespace
```

## Handling Dependency Build and Update

When you change a version in `Chart.yaml`, you need to update the downloaded dependencies:

```bash
helm dependency update ./istio-umbrella
```

The `Chart.lock` file tracks the exact versions that were resolved. Commit this file to version control so that everyone on the team installs the same versions:

```bash
git add istio-umbrella/Chart.lock
git commit -m "pin istio chart dependencies to 1.22.0"
```

If the lock file gets out of sync, rebuild from scratch:

```bash
rm istio-umbrella/Chart.lock
rm -rf istio-umbrella/charts/
helm dependency build ./istio-umbrella
```

## Conditional Dependencies

Not every environment needs every component. Use the `condition` field in `Chart.yaml` to make sub-charts optional:

```yaml
dependencies:
  - name: gateway
    version: 1.22.0
    repository: https://istio-release.storage.googleapis.com/charts
    alias: istio-ingress
    condition: istio-ingress.enabled
  - name: gateway
    version: 1.22.0
    repository: https://istio-release.storage.googleapis.com/charts
    alias: istio-egress
    condition: istio-egress.enabled
```

Then in your values file, toggle components on or off:

```yaml
# values-dev.yaml
istio-ingress:
  enabled: true

istio-egress:
  enabled: false
```

## Handling CRD Updates

CRDs are tricky with Helm. By design, Helm installs CRDs but does not upgrade them. This means when you upgrade Istio, the new CRDs in the base chart might not get applied.

Check if CRDs need updating:

```bash
helm pull istio/base --version 1.22.0 --untar
kubectl diff -f base/crds/
```

If there are differences, apply them manually before upgrading:

```bash
kubectl apply -f base/crds/
```

Or use the `--skip-crds` flag and manage CRDs separately:

```bash
# Apply CRDs first
kubectl apply -f https://raw.githubusercontent.com/istio/istio/1.22.0/manifests/charts/base/crds/crd-all.gen.yaml

# Then install/upgrade charts without CRD management
helm upgrade --install istio ./istio-umbrella \
  -n istio-system \
  --skip-crds
```

## Version Constraints in Dependencies

You can use version constraints instead of exact versions. This is useful if you want to allow patch updates but not minor version bumps:

```yaml
dependencies:
  - name: istiod
    version: "~1.22.0"  # Allows 1.22.x but not 1.23.0
    repository: https://istio-release.storage.googleapis.com/charts
```

The `~` operator allows patch-level changes. The `^` operator allows minor changes:

```yaml
version: "^1.22.0"  # Allows 1.22.x and 1.23.x but not 2.0.0
```

For production, I strongly recommend pinning exact versions. Version ranges are fine for development and testing, but you want production deployments to be completely deterministic.

## Pre-install and Post-install Hooks

Helm hooks let you run jobs at specific points during the install lifecycle. Use them to verify prerequisites or run post-install validation:

```yaml
# istio-umbrella/templates/pre-install-check.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: istio-pre-install-check
  annotations:
    helm.sh/hook: pre-install
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  template:
    spec:
      containers:
      - name: check
        image: bitnami/kubectl:latest
        command:
        - /bin/sh
        - -c
        - |
          echo "Checking Kubernetes version..."
          kubectl version --short
          echo "Checking for conflicting Istio installations..."
          if kubectl get namespace istio-system 2>/dev/null; then
            echo "WARNING: istio-system namespace already exists"
          fi
      restartPolicy: Never
  backoffLimit: 1
```

## Upgrade Strategy with Dependencies

When upgrading Istio through an umbrella chart, the sub-charts upgrade in dependency order. But you should still be careful:

```bash
# Check what will change before applying
helm diff upgrade istio ./istio-umbrella \
  -n istio-system \
  -f values-production.yaml
```

The `helm-diff` plugin is invaluable here. It shows you exactly what resources will change before you commit to the upgrade.

```bash
# Install the diff plugin
helm plugin install https://github.com/databus23/helm-diff
```

Managing Istio Helm chart dependencies properly is about two things: getting the ordering right and keeping versions aligned. An umbrella chart handles both of these automatically, and once you set it up, Istio installations become a single command with predictable results. The investment in building that umbrella chart is worth it as soon as you have more than one environment to manage.
