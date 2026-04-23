# How to Create CAPI Clusters with Rancher Turtles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Kubernetes, Rancher, Cluster Provisioning

Description: Create and manage Kubernetes clusters using Cluster API resources through Rancher Turtles with declarative YAML manifests.

## Introduction

With Rancher Turtles installed, you can create Kubernetes clusters by applying standard Cluster API (CAPI) resources. If you label the CAPI cluster or its namespace with `cluster-api.cattle.io/rancher-auto-import=true`, Rancher Turtles automatically imports the cluster into Rancher for centralized management.

## Prerequisites

- Rancher Turtles installed
- `kubectl` and `clusterctl` installed and configured for the management cluster
- At least one CAPI infrastructure provider installed
- Bootstrap and control plane providers configured
- Infrastructure credentials configured

## Cluster API Resource Structure

A typical CAPI cluster uses these resources:

```text
Cluster (cluster.x-k8s.io)
├── InfrastructureCluster (e.g., AWSCluster)
├── ControlPlane (e.g., RKE2ControlPlane)
└── MachineDeployments
    ├── MachineTemplate (e.g., AWSMachineTemplate)
    └── BootstrapConfigTemplate (e.g., RKE2ConfigTemplate)
```

## Creating a Cluster with Docker Provider (Testing)

The Docker provider is useful for testing CAPI workflows locally:

```bash
# Create a namespace and enable Rancher auto-import
kubectl create namespace capi-test
kubectl label namespace capi-test cluster-api.cattle.io/rancher-auto-import=true

# Set variables for the CAPRKE2 Docker template
export CONTROL_PLANE_MACHINE_COUNT=1
export WORKER_MACHINE_COUNT=2
export RKE2_VERSION=v1.30.2+rke2r1
export KIND_IMAGE_VERSION=v1.30.0

# Generate cluster manifest
clusterctl generate cluster --from https://github.com/rancher/cluster-api-provider-rke2/blob/main/examples/templates/docker/cluster-template.yaml \
  -n capi-test my-test-cluster \
  > my-test-cluster.yaml

# Apply the cluster
kubectl apply -f my-test-cluster.yaml
```

## Creating a Production Cluster

```bash
# Set variables for the CAPRKE2 AWS template
export CONTROL_PLANE_MACHINE_COUNT=3
export WORKER_MACHINE_COUNT=3
export RKE2_VERSION=v1.30.2+rke2r1
export AWS_NODE_MACHINE_TYPE=t3a.large
export AWS_CONTROL_PLANE_MACHINE_TYPE=t3a.large
export AWS_SSH_KEY_NAME=my-aws-key
export AWS_REGION=us-west-2
export AWS_AMI_ID=ami-xxxxxxxxxxxxxxxxx

# Create a namespace and enable Rancher auto-import
kubectl create namespace capi-clusters
kubectl label namespace capi-clusters cluster-api.cattle.io/rancher-auto-import=true

# Generate the production cluster manifest
clusterctl generate cluster --from https://github.com/rancher/cluster-api-provider-rke2/blob/main/examples/templates/aws/cluster-template.yaml \
  -n capi-clusters production-cluster \
  > production-cluster.yaml

# For non air-gapped environments, set airGapped: false in the generated YAML before applying it.
kubectl apply -f production-cluster.yaml
```

## Monitoring Cluster Provisioning

```bash
# Watch cluster status
kubectl get clusters.cluster.x-k8s.io production-cluster -n capi-clusters --watch

# Check all CAPI resources
kubectl get clusters.cluster.x-k8s.io,machines.cluster.x-k8s.io,machinedeployments.cluster.x-k8s.io -n capi-clusters

# View control plane status
kubectl get rke2controlplanes.controlplane.cluster.x-k8s.io -n capi-clusters

# Get cluster kubeconfig once ready
clusterctl get kubeconfig production-cluster --namespace capi-clusters > production-kubeconfig.yaml

# Test connectivity to new cluster
export KUBECONFIG=production-kubeconfig.yaml
kubectl get nodes
```

## Verifying Import into Rancher

```bash
# Check if Rancher has imported the cluster
kubectl get clusters.management.cattle.io \
  -l cluster-api.cattle.io/capi-cluster-owner=production-cluster \
  -l cluster-api.cattle.io/capi-cluster-owner-ns=capi-clusters

# Or check in Rancher UI:
# Cluster Management > Clusters > production-cluster
```

## Scaling the Cluster

```bash
# Scale worker nodes
kubectl scale machinedeployment production-cluster-md-0 \
  -n capi-clusters \
  --replicas=5

# Or patch the MachineDeployment
kubectl patch machinedeployment production-cluster-md-0 \
  -n capi-clusters \
  --type merge \
  -p '{"spec":{"replicas":5}}'
```

## Conclusion

Creating clusters with Rancher Turtles combines the declarative power of Cluster API with Rancher's management capabilities. CAPI's resource model provides fine-grained control over cluster infrastructure, while Rancher Turtles' auto-import label makes marked clusters visible and manageable through the Rancher UI.
