# How to Use CAPI with Azure Provider via Rancher Turtles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Azure, Kubernetes, Cloud

Description: Deploy Kubernetes clusters on Azure using the Cluster API Azure provider (CAPZ) managed through Rancher Turtles.

## Introduction

How to Use CAPI with Azure Provider via Rancher Turtles is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. This guide provides a comprehensive walkthrough with practical examples and best practices.

## Prerequisites

- Rancher v2.13 or later, or Rancher Turtles installed and configured
- `kubectl` and `clusterctl` access to the management cluster
- CAPZ infrastructure provider, CAPRKE2 bootstrap/control plane providers, and Cluster API Add-on Provider Fleet (CAAPF) installed
- An Azure Service Principal with Contributor access to the target subscription

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher and manages providers through the `CAPIProvider` resource. For Azure RKE2 clusters, the current workflow uses a Rancher Turtles `ClusterClass`, CAPZ for Azure infrastructure, CAPRKE2 for bootstrap and control plane resources, and CAAPF to install the Azure cloud controller manager and Calico on the downstream cluster.

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

```yaml
# Example Rancher Turtles configuration for Azure RKE2 clusters
apiVersion: v1
kind: Secret
metadata:
  name: cluster-identity-secret
  namespace: default
type: Opaque
stringData:
  clientSecret: <AZURE_CLIENT_SECRET>
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureClusterIdentity
metadata:
  labels:
    clusterctl.cluster.x-k8s.io/move-hierarchy: "true"
  name: cluster-identity
  namespace: default
spec:
  allowedNamespaces: {}
  clientID: <AZURE_APP_ID>
  clientSecret:
    name: cluster-identity-secret
    namespace: default
  tenantID: <AZURE_TENANT_ID>
  type: ServicePrincipal
---
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: example-cluster
  namespace: default
  labels:
    cluster-api.cattle.io/rancher-auto-import: "true"
    cloud-provider: azure
    cni: calico
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - 192.168.0.0/16
  topology:
    classRef:
      name: azure-rke2-example
    controlPlane:
      replicas: 1
    variables:
      - name: subscriptionID
        value: <AZURE_SUBSCRIPTION_ID>
      - name: location
        value: <AZURE_LOCATION>
      - name: resourceGroup
        value: <AZURE_RESOURCE_GROUP>
      - name: azureClusterIdentityName
        value: cluster-identity
    version: "<RKE2_VERSION>"
    workers:
      machineDeployments:
        - class: rke2-default-worker
          name: md-0
          replicas: 1
```

```bash
# Apply the official Rancher Turtles Azure RKE2 ClusterClass example
kubectl apply -f https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/clusterclasses/azure/rke2/clusterclass-rke2-example.yaml

# Install the Azure cloud controller manager and Calico CNI add-ons used by the example
kubectl apply -f https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/applications/ccm/azure/helm-chart.yaml
kubectl apply -f https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/applications/cni/calico/helm-chart.yaml

# Apply the cluster configuration
kubectl apply -f cluster-config.yaml

# Monitor progress
kubectl get clusters.cluster.x-k8s.io -n default example-cluster --watch
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
# Scale worker nodes through the Cluster topology
kubectl patch clusters.cluster.x-k8s.io example-cluster -n default --type='json' \
  -p='[{"op":"replace","path":"/spec/topology/workers/machineDeployments/0/replicas","value":5}]'

# Get cluster kubeconfig
clusterctl get kubeconfig example-cluster --namespace default > cluster-kubeconfig.yaml

# Test connectivity
export KUBECONFIG=cluster-kubeconfig.yaml
kubectl get nodes

# Return to management cluster
unset KUBECONFIG
```

## Troubleshooting

```bash
# Check Turtles controller logs
kubectl logs -n cattle-turtles-system -l control-plane=controller-manager --follow

# Check CAPZ controller logs
kubectl logs -n capz-system -l control-plane=capz-controller-manager --since=30m

# Get events for a cluster
kubectl get events -n default --field-selector involvedObject.kind=Cluster,involvedObject.name=example-cluster --sort-by=.lastTimestamp
```

## Conclusion

How to Use CAPI with Azure Provider via Rancher Turtles with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By leveraging the Cluster API ecosystem alongside Rancher's management capabilities, you get a powerful, unified platform for managing Kubernetes clusters at scale across any infrastructure.
