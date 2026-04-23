# How to Use CAPI with AWS Provider via Rancher Turtles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, AWS, Kubernetes, Cloud

Description: Provision Kubernetes clusters on AWS EC2 using the Cluster API AWS provider integrated with Rancher Turtles.

## Introduction

How to Use CAPI with AWS Provider via Rancher Turtles is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. This guide provides a comprehensive walkthrough with practical examples and best practices.

## Prerequisites

- Rancher Turtles installed and configured
- kubectl access to the management cluster
- clusterctl installed locally
- AWS IAM roles and credentials configured for CAPA
- An AWS EC2 SSH key pair and an AMI built for the RKE2 version you plan to deploy
- Cluster API providers installed, including CAPA and CAPRKE2

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. This guide walks through the specifics of How to Use CAPI with AWS Provider via Rancher Turtles.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles is running

kubectl get pods -n rancher-turtles-system

# Check installed CAPI providers
kubectl get capiproviders -A

# Verify management cluster connectivity
kubectl cluster-info
```

## Step 2: Configure Resources

```bash
# Set the values required by the CAPRKE2 AWS template
export CONTROL_PLANE_MACHINE_COUNT=3
export WORKER_MACHINE_COUNT=2
export RKE2_VERSION=v1.34.6+rke2r3
export AWS_NODE_MACHINE_TYPE=t3a.large
export AWS_CONTROL_PLANE_MACHINE_TYPE=t3a.large
export AWS_SSH_KEY_NAME="aws-ssh-key"
export AWS_REGION="us-east-1"
export AWS_AMI_ID="ami-xxxxxxxxxxxxxxxxx"

# Render the upstream CAPRKE2 AWS template.
# The published template is air-gapped by default, so switch it to non-air-gapped
# mode for a standard internet-connected AWS deployment.
clusterctl generate cluster \
  --from https://github.com/rancher/cluster-api-provider-rke2/blob/main/examples/templates/aws/cluster-template.yaml \
  -n default example-cluster \
  | sed 's/airGapped: true/airGapped: false/g' \
  > cluster-config.yaml

# Apply the configuration
kubectl apply -f cluster-config.yaml

# Mark the cluster for automatic import into Rancher
kubectl label cluster.cluster.x-k8s.io -n default example-cluster \
  cluster-api.cattle.io/rancher-auto-import=true --overwrite

# Monitor progress
kubectl get cluster example-cluster -n default --watch
```

## Step 3: Verify the Configuration

```bash
# Check cluster status
kubectl get clusters -A

# Describe the cluster for detailed status
kubectl describe cluster example-cluster -n default

# View core CAPI resources
kubectl get clusters,machines,machinedeployments -n default

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
kubectl scale machinedeployment example-cluster-md-0 --replicas=5

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
kubectl logs -n rancher-turtles-system   -l control-plane=controller-manager   --follow

# Check CAPI controller logs
kubectl logs -n capi-system   -l control-plane=controller-manager   --since=30m

# Get events for a cluster
kubectl get events -n default   --field-selector involvedObject.name=example-cluster   --sort-by=.lastTimestamp
```

## Conclusion

How to Use CAPI with AWS Provider via Rancher Turtles with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By leveraging the Cluster API ecosystem alongside Rancher's management capabilities, you get a powerful, unified platform for managing Kubernetes clusters at scale across any infrastructure.
