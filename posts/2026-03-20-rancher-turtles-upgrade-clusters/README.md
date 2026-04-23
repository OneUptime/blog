# How to Upgrade CAPI Clusters via Rancher Turtles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Kubernetes, Upgrade, Rancher

Description: Perform rolling Kubernetes version upgrades on CAPI-managed clusters using Rancher Turtles upgrade workflows.

## Introduction

Upgrading CAPI-managed clusters through Rancher Turtles is done by updating the Cluster API resources on the management cluster. Rancher Turtles keeps the CAPI `Cluster` as the source of truth and imports the workload cluster into Rancher, while the rolling upgrade itself is handled by Cluster API and the provider controllers.

## Prerequisites

- Rancher v2.13 or later, or a management cluster with Rancher Turtles already installed
- `kubectl` and `clusterctl` access to the management cluster
- A healthy CAPI-managed workload cluster
- The required Cluster API providers installed for your cluster type
- A target Kubernetes/RKE2 version supported by your Cluster API and provider versions
- Provider-specific machine images or templates prepared for the target version, if your infrastructure provider requires them

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher, but workload cluster upgrades are still driven from the Cluster API resources in the management cluster. For ClusterClass-managed clusters, upgrade by changing `Cluster.spec.topology.version`. For non-topology RKE2 clusters, patch the `RKE2ControlPlane` version first and then update each worker `MachineDeployment`. Upgrade one Kubernetes minor version at a time.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles and Cluster API controllers are running
kubectl get pods -n cattle-turtles-system
kubectl get pods -n cattle-capi-system

# Check installed Rancher Turtles-managed providers
kubectl get capiproviders.turtles-capi.cattle.io -A

# Verify management cluster connectivity
kubectl cluster-info

# Inspect the current cluster objects before starting the upgrade
kubectl get clusters.cluster.x-k8s.io example-cluster -n capi-clusters
kubectl get rke2controlplanes.controlplane.cluster.x-k8s.io,machinedeployments.cluster.x-k8s.io -n capi-clusters
```

## Step 2: Configure Resources

```bash
# If your provider pins machine images, update the referenced machine template
# or image to a version compatible with the target Kubernetes release first.

# ClusterClass-managed cluster: patch the target Kubernetes/RKE2 version
kubectl patch clusters.cluster.x-k8s.io example-cluster -n capi-clusters \
  --type json \
  --patch '[{"op":"replace","path":"/spec/topology/version","value":"v1.35.0+rke2r1"}]'

# Non-topology RKE2 cluster: upgrade the control plane first
kubectl patch rke2controlplanes.controlplane.cluster.x-k8s.io example-cluster-control-plane -n capi-clusters \
  --type merge \
  -p '{"spec":{"version":"v1.35.0+rke2r1"}}'

# Then upgrade each worker MachineDeployment
kubectl patch machinedeployments.cluster.x-k8s.io example-cluster-md-0 -n capi-clusters \
  --type merge \
  -p '{"spec":{"template":{"spec":{"version":"v1.35.0+rke2r1"}}}}'
```

## Step 3: Verify the Configuration

```bash
# Describe cluster readiness and upgrade progress
clusterctl describe cluster example-cluster -n capi-clusters

# Check control plane, worker, and machine versions
kubectl get rke2controlplanes.controlplane.cluster.x-k8s.io,machinedeployments.cluster.x-k8s.io,machines.cluster.x-k8s.io -n capi-clusters

# Check Rancher import status
kubectl get clusters.management.cattle.io \
  -l cluster-api.cattle.io/capi-cluster-owner=example-cluster \
  -l cluster-api.cattle.io/capi-cluster-owner-ns=capi-clusters
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher
2. Open the imported cluster
3. Verify the cluster remains available while control plane and worker nodes roll forward
4. Confirm the reported Kubernetes version matches the target version after the rollout finishes

## Common Operations

```bash
# Get the workload cluster kubeconfig
clusterctl get kubeconfig example-cluster --namespace capi-clusters > cluster-kubeconfig.yaml

# Test the upgraded cluster
export KUBECONFIG=cluster-kubeconfig.yaml
kubectl get nodes -o wide

# Return to management cluster
unset KUBECONFIG
```

## Troubleshooting

```bash
# Check Turtles controller logs
kubectl logs -n cattle-turtles-system -l control-plane=controller-manager --follow

# Check core CAPI controller logs
kubectl logs -n cattle-capi-system -l control-plane=controller-manager --since=30m

# Check CAPRKE2 controller logs
kubectl logs -n rke2-control-plane-system -l control-plane=controller-manager --since=30m
kubectl logs -n rke2-bootstrap-system -l control-plane=controller-manager --since=30m

# Inspect upgrade conditions and recent events
clusterctl describe cluster example-cluster -n capi-clusters
kubectl get events -n capi-clusters --sort-by=.lastTimestamp
```

## Conclusion

With Rancher Turtles, cluster upgrades are driven from Cluster API resources on the management cluster and rolled out by the CAPI controllers. For ClusterClass-managed clusters, update `spec.topology.version`; for non-topology RKE2 clusters, patch the control plane and worker versions directly, upgrading one Kubernetes minor version at a time.
