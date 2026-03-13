# How to Configure FluxInstance with Specific Flux Version

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, FluxInstance, Version Management, Kubernetes, GitOps

Description: Learn how to configure a FluxInstance to use a specific Flux version for controlled upgrades and consistent deployments.

---

## Introduction

Controlling the exact version of Flux running on your clusters is important for stability, reproducibility, and compliance. The FluxInstance resource allows you to pin Flux to a specific version, use semantic version ranges, or track the latest release. This gives you flexibility in how you manage Flux upgrades across development, staging, and production environments.

This guide covers the different version pinning strategies available in the FluxInstance resource, how to configure specific versions, and best practices for managing Flux versions across multiple clusters.

## Prerequisites

Before you begin, ensure you have:

- The Flux Operator installed on your Kubernetes cluster.
- `kubectl` installed and configured.
- Understanding of semantic versioning.

## Pinning to an Exact Version

To ensure a specific, tested version of Flux runs on your cluster, pin the version to an exact release.

```yaml
# flux-instance-exact-version.yaml
# FluxInstance pinned to an exact Flux version
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.0"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
```

This configuration ensures that Flux version 2.4.0 is installed and will not change until you update the FluxInstance resource.

## Using Semantic Version Ranges

For environments where you want to automatically receive patch updates but control minor and major version changes, use a semver range.

```yaml
# flux-instance-semver-range.yaml
# FluxInstance with semver range for automatic patch updates
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.x"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
```

With `2.4.x`, the operator will use the latest patch release within the 2.4 minor version. You can also use broader ranges.

```yaml
# Track the latest 2.x release
spec:
  distribution:
    version: "2.x"

# Track a specific minor version range
spec:
  distribution:
    version: ">=2.3.0 <2.5.0"
```

## Version Strategies for Different Environments

A common pattern is to use different version strategies across environments. Development clusters track the latest version, staging clusters use semver ranges, and production clusters pin to exact versions.

Development environment:

```yaml
# flux-instance-dev.yaml
# Development FluxInstance tracking latest
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
```

Staging environment:

```yaml
# flux-instance-staging.yaml
# Staging FluxInstance with semver range
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.x"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
```

Production environment:

```yaml
# flux-instance-production.yaml
# Production FluxInstance pinned to exact version
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.0"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
```

## Using a Private Registry

For air-gapped environments or organizations with strict image policies, configure FluxInstance to pull Flux images from a private registry.

```yaml
# flux-instance-private-registry.yaml
# FluxInstance using a private container registry
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.0"
    registry: registry.internal.company.com/fluxcd
    imagePullSecret: registry-credentials
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
```

Create the image pull secret for the private registry.

```bash
kubectl create secret docker-registry registry-credentials \
  --namespace flux-system \
  --docker-server=registry.internal.company.com \
  --docker-username=admin \
  --docker-password=YOUR_PASSWORD
```

## Checking the Current Flux Version

After applying the FluxInstance, verify which version of Flux is running.

```bash
# Check the FluxInstance status for version information
kubectl get fluxinstance flux -n flux-system -o yaml | grep -A 5 lastAppliedRevision

# Check the image tags on running Flux pods
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Check the deployment images
kubectl get deployments -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}'
```

## Upgrading Flux Version

To upgrade Flux, update the version in the FluxInstance resource.

```bash
# Update the version field
kubectl patch fluxinstance flux -n flux-system \
  --type merge \
  -p '{"spec":{"distribution":{"version":"2.5.0"}}}'

# Or apply an updated manifest
kubectl apply -f flux-instance-updated.yaml

# Watch the rollout
kubectl get pods -n flux-system -w
```

The Flux Operator will perform a rolling update of all Flux components to the new version.

## Rolling Back a Version

If a new version introduces issues, roll back by setting the version to the previous release.

```yaml
# Rollback to the previous version
spec:
  distribution:
    version: "2.4.0"  # Previous known-good version
```

```bash
kubectl apply -f flux-instance-rollback.yaml

# Verify the rollback
kubectl get pods -n flux-system
kubectl get fluxinstance flux -n flux-system
```

## Monitoring Version Compliance

You can use Prometheus to monitor whether your Flux installations are running the expected versions. The Flux Operator exposes metrics about the FluxInstance status.

```yaml
# prometheus-rule.yaml
# Alert when Flux version does not match expected
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-version-compliance
  namespace: monitoring
spec:
  groups:
    - name: flux-operator
      rules:
        - alert: FluxVersionMismatch
          expr: flux_instance_info{version!="2.4.0"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux version does not match expected version"
```

## Conclusion

Configuring FluxInstance with specific Flux versions gives you precise control over your GitOps tooling across environments. Whether you pin to exact versions for production stability, use semver ranges for automated patch updates, or track the latest version in development, the FluxInstance resource provides the flexibility to implement a version management strategy that fits your organization's needs. Combined with private registries for air-gapped environments, this approach ensures your Flux installations are consistent, reproducible, and compliant.
