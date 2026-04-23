# How to Troubleshoot Rancher Turtles Cluster Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Troubleshooting, Kubernetes, Debugging

Description: Debug and resolve common cluster provisioning failures when using Rancher Turtles and Cluster API.

## Introduction

How to Troubleshoot Rancher Turtles Cluster Provisioning is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. This guide provides a comprehensive walkthrough with practical examples and best practices.

## Prerequisites

- Rancher Turtles installed and configured
- kubectl access to the management cluster
- clusterctl installed for Cluster API-specific troubleshooting
- Appropriate cloud provider credentials (if applicable)
- Cluster API providers installed
- Provider-specific ClusterClass templates or example manifests for your target infrastructure

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. This guide walks through the specifics of How to Troubleshoot Rancher Turtles Cluster Provisioning.

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

```yaml
# Example CAPI configuration for How to Troubleshoot Rancher Turtles Cluster Provisioning
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: example-cluster
  namespace: default
  labels:
    cluster-api.cattle.io/rancher-auto-import: "true"
  annotations:
    cluster-api.cattle.io/upstream-system-agent: "true"
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - 10.244.0.0/16
    services:
      cidrBlocks:
        - 10.96.0.0/12
    serviceDomain: cluster.local
  topology:
    classRef:
      name: docker-rke2-example
    controlPlane:
      replicas: 1
    variables:
      - name: rke2CNI
        value: ""
      - name: dockerImage
        value: kindest/node:v1.35.0
    version: v1.35.0+rke2r1
    workers:
      machineDeployments:
        - class: default-worker
          name: md-0
          replicas: 1
```

```bash
# Apply the Docker + RKE2 ClusterClass prerequisites
kubectl apply -f https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/clusterclasses/docker/rke2/clusterclass-docker-rke2.yaml
kubectl apply -f https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/applications/lb/docker/configmap.yaml

# Apply the configuration
kubectl apply -f cluster-config.yaml

# Monitor progress
kubectl get cluster example-cluster --watch
```

## Step 3: Verify the Configuration

```bash
# Check cluster status
kubectl get clusters -A

# Describe the cluster and related conditions
clusterctl describe cluster example-cluster --namespace default --show-conditions all

# View all CAPI resources
kubectl get clusters,machines,machinedeployments -n default

# Check Rancher import status
kubectl get clusters.management.cattle.io -A \
  -l cluster-api.cattle.io/capi-cluster-owner=example-cluster \
  -l cluster-api.cattle.io/capi-cluster-owner-ns=default
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher
2. Verify the cluster appears in the list
3. Check cluster health indicators
4. Review node status and resource utilization

## Common Operations

```bash
# Scale worker nodes in a ClusterClass-managed cluster
kubectl patch cluster example-cluster -n default --type json \
  --patch '[{"op":"replace","path":"/spec/topology/workers/machineDeployments/0/replicas","value":5}]'

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

# Check core CAPI controller logs
kubectl logs -n cattle-capi-system -l control-plane=controller-manager --since=30m

# Check RKE2 provider controller logs
kubectl logs -n rke2-bootstrap-system -l control-plane=controller-manager --since=30m
kubectl logs -n rke2-control-plane-system -l control-plane=controller-manager --since=30m

# Get events for a cluster
kubectl get events -n default \
  --field-selector involvedObject.name=example-cluster \
  --sort-by=.metadata.creationTimestamp
```

## Conclusion

How to Troubleshoot Rancher Turtles Cluster Provisioning with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By leveraging the Cluster API ecosystem alongside Rancher's management capabilities, you get a powerful, unified platform for managing Kubernetes clusters at scale across any infrastructure.
