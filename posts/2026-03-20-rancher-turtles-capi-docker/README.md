# How to Use CAPI with Docker Provider for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Docker, Kubernetes, Testing

Description: Use the Cluster API Docker provider for local development and testing of CAPI workflows with Rancher Turtles.

## Introduction

How to Use CAPI with Docker Provider for Testing is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. This guide provides a comprehensive walkthrough with practical examples and best practices.

## Prerequisites

- Rancher Turtles installed and configured
- kubectl access to the management cluster
- Docker available on the host used by the Docker provider
- Cluster API core, Docker infrastructure, and RKE2 providers installed

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. The Cluster API Docker provider (CAPD) is intended for local development and testing, making it a good fit for validating CAPI workflows before moving to production infrastructure.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles is running

kubectl get pods -n cattle-turtles-system

# Verify the core, Docker, and RKE2 providers are running
kubectl get pods -n cattle-capi-system
kubectl get pods -n capd-system
kubectl get pods -n rke2-bootstrap-system
kubectl get pods -n rke2-control-plane-system

# Verify management cluster connectivity
kubectl cluster-info
```

## Step 2: Configure Resources

```yaml
# Example cluster manifest based on the official Rancher Turtles Docker + RKE2 example
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: docker-rke2-example
  labels:
    cluster-api.cattle.io/rancher-auto-import: "true"
  annotations:
    cluster-api.cattle.io/upstream-system-agent: "true"
spec:
  topology:
    classRef:
      name: docker-rke2-example
    variables:
      - name: rke2CNI
        value: ""
      - name: dockerImage
        value: kindest/node:v1.35.0
    version: v1.35.0+rke2r1
    controlPlane:
      replicas: 1
    workers:
      machineDeployments:
        - class: default-worker
          name: md-0
          replicas: 1
```

```bash
# Create a dedicated namespace for the workload cluster resources
kubectl create namespace capi-clusters

# Apply the ClusterClass and related templates
kubectl apply -n capi-clusters -f https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/clusterclasses/docker/rke2/clusterclass-docker-rke2.yaml

# Apply the Docker load balancer configuration
kubectl apply -n capi-clusters -f https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/applications/lb/docker/configmap.yaml

# Create the cluster
kubectl apply -n capi-clusters -f https://raw.githubusercontent.com/rancher/turtles/refs/heads/main/examples/clusters/docker/rke2/cluster.yaml

# Monitor progress
kubectl get clusters -n capi-clusters --watch
```

## Step 3: Verify the Configuration

```bash
# Check cluster status
kubectl get clusters -n capi-clusters

# Describe the cluster for detailed status
kubectl describe cluster docker-rke2-example -n capi-clusters

# View all CAPI resources
kubectl get clusters,machines,machinedeployments -n capi-clusters

# Check Rancher import status
kubectl get clusters.management.cattle.io \
  -l cluster-api.cattle.io/capi-cluster-owner=docker-rke2-example \
  -l cluster-api.cattle.io/capi-cluster-owner-ns=capi-clusters
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher
2. Verify the cluster appears in the list
3. Check cluster health indicators
4. Review node status and resource utilization

## Common Operations

```bash
# Scale worker nodes through the Cluster topology
kubectl patch cluster docker-rke2-example -n capi-clusters \
  --type json \
  --patch '[{"op":"replace","path":"/spec/topology/workers/machineDeployments/0/replicas","value":2}]'

# Get cluster kubeconfig on Docker Engine for Linux
clusterctl get kubeconfig docker-rke2-example --namespace capi-clusters > cluster-kubeconfig.yaml

# On Docker Desktop, use kind instead
# kind get kubeconfig --name docker-rke2-example > cluster-kubeconfig.yaml

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

# Check CAPI controller logs
kubectl logs -n cattle-capi-system -l control-plane=controller-manager --since=30m
kubectl logs -n capd-system -l control-plane=controller-manager --since=30m
kubectl logs -n rke2-bootstrap-system -l control-plane=controller-manager --since=30m
kubectl logs -n rke2-control-plane-system -l control-plane=controller-manager --since=30m

# Get events for a cluster
kubectl get events -n capi-clusters --field-selector involvedObject.name=docker-rke2-example --sort-by=.lastTimestamp
```

## Conclusion

How to Use CAPI with Docker Provider for Testing with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By leveraging the Cluster API ecosystem alongside Rancher's management capabilities, you get a powerful, unified platform for managing Kubernetes clusters at scale across any infrastructure.
