# How to Upgrade Flux Using Flux Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flux Operator, Upgrade, Kubernetes, GitOps

Description: Learn how to safely upgrade Flux CD using the Flux Operator with controlled rollouts and rollback capabilities.

---

## Introduction

Upgrading Flux CD is a routine maintenance task that keeps your GitOps infrastructure secure and up to date with the latest features and bug fixes. The Flux Operator simplifies this process by allowing you to update the Flux version through a simple change to the FluxInstance resource. The operator handles the rolling update of all Flux components, ensuring minimal disruption to your GitOps workflows.

This guide covers the complete Flux upgrade process using the Flux Operator, including pre-upgrade checks, performing the upgrade, validating the new version, and rolling back if issues arise.

## Prerequisites

Before you begin, ensure you have:

- The Flux Operator installed on your Kubernetes cluster.
- A running FluxInstance managing your Flux installation.
- `kubectl` installed and configured.
- Access to the Flux release notes for the target version.

## Pre-Upgrade Checklist

Before upgrading, verify the current state of your Flux installation.

```bash
# Check current FluxInstance status
kubectl get fluxinstance -n flux-system

# Verify all Flux components are healthy
kubectl get pods -n flux-system

# Check the current Flux version
kubectl get fluxinstance flux -n flux-system \
  -o jsonpath='{.spec.distribution.version}'

# Check for any ongoing reconciliations
kubectl get kustomizations --all-namespaces
kubectl get helmreleases --all-namespaces
```

Ensure all resources are in a Ready state before proceeding. If any Kustomization or HelmRelease resources are failing, resolve those issues first to avoid confusing pre-existing failures with upgrade-related problems.

## Checking Available Versions

Review the available Flux versions before deciding which version to upgrade to.

```bash
# Check the Flux releases
curl -s https://api.github.com/repos/fluxcd/flux2/releases | \
  jq -r '.[0:5] | .[] | .tag_name'
```

Review the release notes for breaking changes, new features, and deprecations between your current version and the target version.

## Performing the Upgrade

Update the FluxInstance resource with the new version.

### Method 1: Using kubectl patch

```bash
# Upgrade to a specific version
kubectl patch fluxinstance flux -n flux-system \
  --type merge \
  -p '{"spec":{"distribution":{"version":"2.5.0"}}}'
```

### Method 2: Using kubectl apply

Update the FluxInstance manifest and apply it.

```yaml
# flux-instance-upgrade.yaml
# FluxInstance with updated version
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.5.0"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
    networkPolicy: true
```

```bash
kubectl apply -f flux-instance-upgrade.yaml
```

### Method 3: Using GitOps

If your FluxInstance is managed through GitOps, update the version in your Git repository and commit the change. Flux will reconcile the FluxInstance resource automatically.

```bash
# Edit the FluxInstance manifest in your repository
# Update spec.distribution.version to "2.5.0"
git add clusters/production/flux-instance.yaml
git commit -m "Upgrade Flux to v2.5.0"
git push
```

## Monitoring the Upgrade Process

Watch the upgrade as the Flux Operator rolls out the new version.

```bash
# Watch the FluxInstance status
kubectl get fluxinstance flux -n flux-system -w

# Watch the pod rollouts
kubectl get pods -n flux-system -w

# Check the operator logs for upgrade progress
kubectl logs -l app.kubernetes.io/name=flux-operator \
  -n flux-system -f
```

The Flux Operator will update each controller deployment one at a time. The old pods will be terminated as new pods with the updated version become ready.

## Validating the Upgrade

After the upgrade completes, verify that everything is working correctly.

```bash
# Verify all pods are running with the new version
kubectl get pods -n flux-system \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Check FluxInstance status
kubectl describe fluxinstance flux -n flux-system

# Verify all Flux resources are reconciling
kubectl get kustomizations --all-namespaces
kubectl get helmreleases --all-namespaces
kubectl get gitrepositories --all-namespaces

# Check for any errors in controller logs
kubectl logs -l app=source-controller -n flux-system --tail=20
kubectl logs -l app=kustomize-controller -n flux-system --tail=20
kubectl logs -l app=helm-controller -n flux-system --tail=20
```

All resources should show a Ready status. If any resources show errors, check the controller logs for details.

## Rolling Back an Upgrade

If the upgrade introduces issues, roll back to the previous version by updating the FluxInstance.

```bash
# Rollback to the previous version
kubectl patch fluxinstance flux -n flux-system \
  --type merge \
  -p '{"spec":{"distribution":{"version":"2.4.0"}}}'

# Watch the rollback
kubectl get pods -n flux-system -w
```

The Flux Operator will roll back all controllers to the specified version.

For GitOps-managed FluxInstances, revert the commit that upgraded the version.

```bash
git revert HEAD
git push
```

## Staged Upgrade Strategy

For organizations managing multiple clusters, use a staged upgrade strategy to minimize risk.

```yaml
# Stage 1: Development cluster
# clusters/development/flux-instance-patch.yaml
spec:
  distribution:
    version: "2.5.0"

# Stage 2: Staging cluster (after development validation)
# clusters/staging/flux-instance-patch.yaml
spec:
  distribution:
    version: "2.5.0"

# Stage 3: Production clusters (after staging validation)
# base/flux-instance.yaml
spec:
  distribution:
    version: "2.5.0"
```

Commit each stage change separately, validating the upgrade at each stage before proceeding to the next.

## Automating Upgrade Notifications

Configure the Flux Operator to notify your team when upgrades complete or fail by using the notification-controller.

```yaml
# upgrade-notification.yaml
# Alert for Flux upgrade events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: flux-upgrade-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: FluxInstance
      name: flux
      namespace: flux-system
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook-url
```

## Handling Breaking Changes

When upgrading across versions with breaking changes, you may need to update your Flux resources before or after the upgrade. Common breaking changes include API version updates, deprecated field removals, and changed default behaviors.

```bash
# Check for deprecated API versions in your Flux resources
kubectl get kustomizations --all-namespaces -o yaml | grep "apiVersion"
kubectl get helmreleases --all-namespaces -o yaml | grep "apiVersion"
```

Update any resources using deprecated API versions before upgrading Flux to avoid reconciliation failures.

## Conclusion

Upgrading Flux using the Flux Operator is a straightforward process that involves updating the version field in the FluxInstance resource. The operator handles the rolling update of all components, minimizing downtime. By following a staged upgrade strategy across environments, validating at each stage, and having a clear rollback plan, you can upgrade Flux with confidence. The declarative nature of the FluxInstance resource means upgrades are tracked in version control and can be managed through the same GitOps workflows used for your applications.
