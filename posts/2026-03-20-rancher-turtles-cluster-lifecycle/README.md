# How to Manage CAPI Cluster Lifecycle with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Kubernetes, Lifecycle, Rancher

Description: Manage the complete lifecycle of CAPI clusters including creation, scaling, upgrades, and deletion through Rancher Turtles.

## Introduction

How to Manage CAPI Cluster Lifecycle with Rancher is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. This guide provides a comprehensive walkthrough with practical examples and best practices.

## Prerequisites

- Rancher v2.13 or later, or Rancher Turtles installed and configured
- `kubectl` access to the management cluster
- Appropriate cloud provider credentials (if applicable)
- Required Cluster API providers installed

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. This guide walks through the specifics of How to Manage CAPI Cluster Lifecycle with Rancher.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles is running

kubectl get pods -n cattle-turtles-system

# Check configured CAPI providers
kubectl get capiproviders -A

# Verify management cluster connectivity
kubectl cluster-info
```

## Step 2: Configure Resources

```bash
# Example workflow using the official CAPRKE2 Docker template
export NAMESPACE=capi-clusters
export CLUSTER_NAME=example-cluster
export CONTROL_PLANE_MACHINE_COUNT=1
export WORKER_MACHINE_COUNT=2
export KIND_IMAGE_VERSION=v1.31.4
export RKE2_VERSION=v1.31.4+rke2r1

clusterctl generate yaml \
  --from https://raw.githubusercontent.com/rancher/cluster-api-provider-rke2/main/examples/templates/docker/cluster-template.yaml \
  > cluster-config.yaml

# Apply the generated configuration
kubectl apply -f cluster-config.yaml

# Mark the cluster for Rancher auto-import
kubectl label clusters.cluster.x-k8s.io -n "${NAMESPACE}" "${CLUSTER_NAME}" \
  cluster-api.cattle.io/rancher-auto-import=true --overwrite

# Monitor progress
kubectl get clusters.cluster.x-k8s.io -n "${NAMESPACE}" "${CLUSTER_NAME}" --watch
```

## Step 3: Verify the Configuration

```bash
# Check cluster status
kubectl get clusters.cluster.x-k8s.io -n capi-clusters

# Describe the cluster for detailed status
kubectl describe clusters.cluster.x-k8s.io example-cluster -n capi-clusters

# View all CAPI resources
kubectl get clusters.cluster.x-k8s.io,machines.cluster.x-k8s.io,machinedeployments.cluster.x-k8s.io -n capi-clusters

# Check Rancher import status
kubectl get clusters.management.cattle.io
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher
2. Verify the cluster appears in the list
3. Check cluster health indicators
4. Review node status and resource utilization

## Common Operations

```bash
# Scale worker nodes
kubectl scale machinedeployment.cluster.x-k8s.io worker-md-0 -n capi-clusters --replicas=5

# Get cluster kubeconfig
clusterctl get kubeconfig example-cluster --namespace capi-clusters > cluster-kubeconfig.yaml

# Test connectivity
export KUBECONFIG=cluster-kubeconfig.yaml
kubectl get nodes

# Return to management cluster
unset KUBECONFIG
```

## Troubleshooting

```bash
# Check Turtles controller logs
kubectl logs -n cattle-turtles-system   -l control-plane=controller-manager   --follow

# Check CAPI controller logs
kubectl logs -n cattle-capi-system   -l control-plane=controller-manager   --since=30m

# Get events for a cluster
kubectl get events -n capi-clusters   --field-selector involvedObject.name=example-cluster   --sort-by=.lastTimestamp
```

## Conclusion

How to Manage CAPI Cluster Lifecycle with Rancher with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By leveraging the Cluster API ecosystem alongside Rancher's management capabilities, you get a powerful, unified platform for managing Kubernetes clusters at scale across any infrastructure.
