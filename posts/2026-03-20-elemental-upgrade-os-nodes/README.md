# How to Upgrade Elemental OS on Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Kubernetes, Upgrade, Edge, OS Management

Description: A complete guide to upgrading the Elemental OS on registered nodes using ManagedOSImage resources for rolling, controlled updates across your fleet.

## Introduction

One of Elemental's most powerful features is its support for rolling, declarative OS upgrades. Rather than manually SSHing into nodes, you create a ManagedOSImage resource that targets specific machines and the Elemental Operator orchestrates the upgrade process, including reboots, in a controlled manner.

## Prerequisites

- Elemental Operator installed
- Machines registered in MachineInventory
- New OS container image pushed to a registry
- Target machines running Elemental OS

## Step 1: Build and Push the New OS Image

```bash
# Build the new OS version

docker build \
  -t my-registry.example.com/elemental-os:v1.1.0 \
  -f Dockerfile.elemental \
  .

# Push to registry
docker push my-registry.example.com/elemental-os:v1.1.0
```

## Step 2: Create a ManagedOSImage Resource

The ManagedOSImage resource defines which machines to upgrade and to which OS version:

```yaml
# managed-os-upgrade.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: ManagedOSImage
metadata:
  name: upgrade-to-v1.1.0
  namespace: fleet-default
spec:
  # The new OS container image
  osImage: "my-registry.example.com/elemental-os:v1.1.0"

  # Target clusters with this label
  clusterTargets:
    - clusterSelector:
        matchLabels:
          environment: production

  # Node selector within the cluster
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/worker
        operator: Exists

  # Concurrency settings
  concurrency: 2

  # Drain nodes before upgrade
  drain:
    force: false
    timeout: "300s"
    gracePeriod: 30
    ignoreDaemonSets: true
    deleteLocalData: false
```

```bash
kubectl apply -f managed-os-upgrade.yaml
```

## Step 3: Monitor Upgrade Progress

```bash
# Watch the ManagedOSImage status
kubectl get managedosimage -n fleet-default upgrade-to-v1.1.0 --watch

# Get detailed status
kubectl describe managedosimage -n fleet-default upgrade-to-v1.1.0

# Check upgrade jobs
kubectl get jobs -n cattle-system -l upgrade.cattle.io/plan=os-upgrader-upgrade-to-v1.1.0

# Watch pods during upgrade
kubectl get pods -n cattle-system -l upgrade.cattle.io/plan=os-upgrader-upgrade-to-v1.1.0 --watch
```

## Step 4: Verify the Upgrade

```bash
# SSH into a node and check OS version
ssh root@node-ip cat /etc/os-release

# Check via kubectl
kubectl get node <node-name> -o jsonpath='{.status.nodeInfo.osImage}{"\n"}'

# Verify all nodes are at the new version
kubectl get nodes -o custom-columns=\
'NAME:.metadata.name,OS-IMAGE:.status.nodeInfo.osImage'
```

## Rolling Upgrade Strategy

For production environments, use a rolling upgrade approach:

```yaml
# rolling-upgrade.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: ManagedOSImage
metadata:
  name: rolling-upgrade-v1.1.0
  namespace: fleet-default
spec:
  osImage: "my-registry.example.com/elemental-os:v1.1.0"

  clusterTargets:
    - clusterSelector:
        matchLabels:
          environment: production

  # Only upgrade worker nodes initially
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/worker
        operator: Exists

  # Upgrade one node at a time
  concurrency: 1

  # Allow up to 10 minutes for drain to complete
  drain:
    timeout: "600s"
```

## Upgrading via ManagedOSVersionChannel

```yaml
# Use a channel to populate ManagedOSVersions
apiVersion: elemental.cattle.io/v1beta1
kind: ManagedOSVersionChannel
metadata:
  name: elemental-channel
  namespace: fleet-default
spec:
  options:
    image: registry.suse.com/rancher/elemental-channel:latest
  type: custom
---
# Then reference one of the synced ManagedOSVersions
apiVersion: elemental.cattle.io/v1beta1
kind: ManagedOSImage
metadata:
  name: channel-upgrade
  namespace: fleet-default
spec:
  managedOSVersionName: v2.0.2
  clusterTargets:
    - clusterName: my-cluster
```

## Rollback on Failure

Elemental OS uses an A/B partition scheme with automatic fallback if booting the upgraded system fails. If you need to intentionally revert to an older image, create or update a ManagedOSImage that points to the previous version and set `FORCE=true`, because downgrades are skipped by default:

```yaml
apiVersion: elemental.cattle.io/v1beta1
kind: ManagedOSImage
metadata:
  name: rollback-to-v1.0.0
  namespace: fleet-default
spec:
  osImage: "my-registry.example.com/elemental-os:v1.0.0"
  clusterTargets:
    - clusterName: my-cluster
  upgradeContainer:
    envs:
      - name: FORCE
        value: "true"
```

## Conclusion

Elemental's declarative OS upgrade system transforms the traditionally painful process of updating bare metal nodes into a Kubernetes-native operation. ManagedOSImage resources allow you to target specific machines, control upgrade concurrency, and leverage drain/cordon settings for controlled rolling upgrades. Combined with Elemental's A/B partitioning and recovery model, Elemental OS upgrades are safe, repeatable, and auditable.
