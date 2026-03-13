# How to Configure Flux with AKS Automatic Cluster Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Cluster Upgrades, Maintenance, Node Pools

Description: Learn how to configure AKS automatic cluster upgrades alongside Flux CD to maintain compatibility between your GitOps workflows and Kubernetes version updates.

---

## Introduction

AKS supports automatic cluster upgrades that keep your Kubernetes version current without manual intervention. When combined with Flux CD for GitOps, you need to ensure that automatic upgrades do not break your deployments, Helm charts, or custom resources that may depend on specific API versions.

This guide covers configuring AKS automatic upgrades, setting up maintenance windows, and implementing Flux-based safeguards that keep your GitOps pipeline resilient through Kubernetes version changes.

## Prerequisites

- An Azure subscription
- An AKS cluster running Kubernetes 1.27 or later
- Flux CLI version 2.0 or later bootstrapped on the cluster
- Azure CLI version 2.40 or later

## Step 1: Configure Auto-Upgrade Channel

AKS offers several auto-upgrade channels. Choose the one that matches your risk tolerance:

```bash
# Patch: auto-upgrades to the latest patch version (e.g., 1.28.3 -> 1.28.5)
az aks update \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --auto-upgrade-channel patch

# Stable: upgrades to the latest supported patch of the second-latest minor version
az aks update \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --auto-upgrade-channel stable

# Rapid: upgrades to the latest supported patch of the latest minor version
az aks update \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --auto-upgrade-channel rapid

# Node-image: only upgrades the node OS image, not Kubernetes version
az aks update \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --auto-upgrade-channel node-image
```

For most production clusters running Flux, `patch` or `stable` channels are recommended. They provide security updates without introducing breaking API changes.

## Step 2: Set Up a Maintenance Window

Define when upgrades can occur to avoid disrupting peak traffic:

```bash
az aks maintenancewindow add \
  --resource-group my-resource-group \
  --cluster-name my-flux-cluster \
  --name default \
  --schedule-type Weekly \
  --day-of-week Saturday \
  --start-time 02:00 \
  --duration 4 \
  --utc-offset -08:00
```

For node OS upgrades, set a separate maintenance window:

```bash
az aks maintenancewindow add \
  --resource-group my-resource-group \
  --cluster-name my-flux-cluster \
  --name aksManagedNodeOSUpgradeSchedule \
  --schedule-type Weekly \
  --day-of-week Sunday \
  --start-time 02:00 \
  --duration 4 \
  --utc-offset -08:00
```

## Step 3: Configure Node Surge for Upgrades

Control how nodes are upgraded to minimize disruption:

```bash
az aks nodepool update \
  --resource-group my-resource-group \
  --cluster-name my-flux-cluster \
  --name nodepool1 \
  --max-surge 1
```

A `max-surge` of 1 means one extra node is provisioned during upgrades. This ensures workloads can be drained and rescheduled without downtime.

## Step 4: Deploy Pod Disruption Budgets Through Flux

Ensure your Flux-managed workloads have Pod Disruption Budgets to survive node drains during upgrades:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: default
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-app
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: flux-source-controller-pdb
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: source-controller
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: flux-kustomize-controller-pdb
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: kustomize-controller
```

## Step 5: Version-Pin Helm Charts for Compatibility

In your Flux HelmRelease resources, use version constraints that account for Kubernetes version changes:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: ">=2.0.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
  targetNamespace: default
  values:
    image:
      tag: latest
  # Test the release after install/upgrade
  test:
    enable: true
  # Rollback on failure
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
  install:
    remediation:
      retries: 3
```

## Step 6: Set Up Flux Health Checks

Add health checks to your Kustomizations to detect issues after upgrades:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: critical-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
    - apiVersion: apps/v1
      kind: Deployment
      name: api-gateway
      namespace: default
    - apiVersion: apps/v1
      kind: StatefulSet
      name: database
      namespace: default
```

## Step 7: Monitor Upgrade Events with Flux Alerts

Configure Flux to send notifications when reconciliation fails, which could indicate upgrade compatibility issues:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: cluster-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: upgrade-watch
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 8: Implement Pre-Upgrade Validation

Create a Flux Kustomization that runs validation jobs before critical workloads are deployed:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: pre-upgrade-checks
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./validation
  prune: true
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: api-compatibility-check
      namespace: default
```

## Verifying the Configuration

Check the auto-upgrade settings:

```bash
az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query "autoUpgradeProfile"

az aks maintenancewindow list \
  --resource-group my-resource-group \
  --cluster-name my-flux-cluster
```

Verify Flux health after an upgrade:

```bash
flux get all -A
flux logs --level=error
```

## Troubleshooting

**Flux controllers down after upgrade**: If Flux controllers are not running after a cluster upgrade, check if the Flux CRDs are still present. Some upgrade paths may require re-bootstrapping Flux.

**Deprecated API errors**: After a Kubernetes minor version upgrade, previously deprecated APIs may be removed. Use `kubectl convert` or update your manifests to use current API versions before the upgrade.

**PDB blocking upgrades**: If Pod Disruption Budgets are too restrictive, node drains will stall. Ensure PDBs allow at least one pod to be evicted during maintenance.

## Conclusion

Combining AKS automatic cluster upgrades with Flux requires thoughtful configuration of maintenance windows, disruption budgets, and health checks. By managing these safeguards through GitOps, you create a self-maintaining cluster that stays current with Kubernetes versions while keeping your workloads stable. The key is to balance automation with protective measures that catch compatibility issues before they affect users.
