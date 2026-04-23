# How to Configure Auto-Import for CAPI Clusters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Kubernetes, Auto-Import, Rancher

Description: Enable automatic import of CAPI-provisioned clusters into Rancher using namespace labels and Turtles configuration.

## Introduction

How to Configure Auto-Import for CAPI Clusters in Rancher is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. This guide provides a comprehensive walkthrough with practical examples and best practices.

## Prerequisites

- Rancher Turtles installed and configured
- kubectl access to the management cluster
- clusterctl installed
- Appropriate cloud provider credentials (if applicable)
- Cluster API providers installed

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. Auto-import is configured by adding the `cluster-api.cattle.io/rancher-auto-import` label to a namespace or an individual CAPI cluster. Rancher Turtles waits until the cluster reports `ControlPlaneAvailable=True`, then creates the Rancher `clusters.management.cattle.io` resource and installs the `cattle-cluster-agent`.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles is running

kubectl get pods -n cattle-turtles-system

# Check installed CAPI providers
kubectl get capiproviders -A

# Verify management cluster connectivity
kubectl cluster-info
```

## Step 2: Configure Resources

```bash
# Option 1: Import all CAPI clusters in the namespace
kubectl label namespace default cluster-api.cattle.io/rancher-auto-import=true

# Option 2: Import a single existing cluster
kubectl label clusters.cluster.x-k8s.io -n default example-cluster cluster-api.cattle.io/rancher-auto-import=true

# Monitor progress
kubectl get clusters.cluster.x-k8s.io -n default --watch
```

## Step 3: Verify the Configuration

```bash
# Check cluster status
kubectl get clusters.cluster.x-k8s.io -A

# Describe the cluster for detailed status
kubectl describe clusters.cluster.x-k8s.io example-cluster -n default

# View all CAPI resources
kubectl get clusters.cluster.x-k8s.io,machines.cluster.x-k8s.io,machinedeployments.cluster.x-k8s.io -n default

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
kubectl scale machinedeployment example-cluster-workers -n default --replicas=5

# Get cluster kubeconfig
clusterctl get kubeconfig example-cluster --namespace default > cluster-kubeconfig.yaml

# Test connectivity
export KUBECONFIG=cluster-kubeconfig.yaml
kubectl get nodes

# Return to the default kubeconfig
unset KUBECONFIG
```

## Troubleshooting

```bash
# Check Turtles controller logs
kubectl logs -n cattle-turtles-system   -l control-plane=controller-manager   --follow

# Check CAPI controller logs
kubectl logs -n cattle-capi-system   -l control-plane=controller-manager   --since=30m

# Get events for a cluster
kubectl get events -n default   --field-selector involvedObject.name=example-cluster   --sort-by=.metadata.creationTimestamp
```

## Conclusion

How to Configure Auto-Import for CAPI Clusters in Rancher with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By leveraging the Cluster API ecosystem alongside Rancher's management capabilities, you get a powerful, unified platform for managing Kubernetes clusters at scale across any infrastructure.
