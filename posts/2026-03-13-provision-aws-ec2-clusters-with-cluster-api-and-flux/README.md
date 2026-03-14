# How to Provision AWS EC2 Clusters with Cluster API and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, AWS, EC2, GitOps, Kubernetes, Multi-Cluster

Description: Provision AWS EKS/EC2-based Kubernetes clusters using Cluster API managed by Flux CD for GitOps-driven cluster lifecycle management.

---

## Introduction

Cluster API with the AWS provider (CAPA) enables you to provision Kubernetes clusters on AWS EC2 instances using declarative Kubernetes manifests. The cluster definition-control plane configuration, node pools, networking-is stored in Git and continuously reconciled by CAPI. Flux CD manages the cluster manifests, ensuring the cluster state is always synchronized with the desired configuration in your repository.

Each workload cluster is represented by a set of CAPI resources: a `Cluster` object (the root), `AWSCluster` (AWS-specific network configuration), `KubeadmControlPlane` (control plane bootstrapping), and `MachineDeployment` (worker node pools). These objects work together to provision a fully functional Kubernetes cluster on EC2.

This guide provisions a production-grade Kubernetes cluster on AWS EC2 using CAPI and Flux.

## Prerequisites

- Cluster API with CAPA installed on the management cluster
- Flux CD bootstrapped on the management cluster
- An existing VPC with subnets (or CAPA will create one)
- `kubectl` and `clusterctl` CLIs installed

## Step 1: Generate the Cluster Template

```bash
# Set environment variables for cluster generation
export CLUSTER_NAME="production-workload-01"
export KUBERNETES_VERSION="v1.29.2"
export AWS_REGION="us-east-1"
export AWS_SSH_KEY_NAME="capi-key"
export AWS_CONTROL_PLANE_MACHINE_TYPE="t3.large"
export AWS_NODE_MACHINE_TYPE="m6i.xlarge"
export CONTROL_PLANE_MACHINE_COUNT="3"  # Odd number for etcd quorum
export WORKER_MACHINE_COUNT="3"

# Generate the cluster manifest
clusterctl generate cluster "${CLUSTER_NAME}" \
  --kubernetes-version "${KUBERNETES_VERSION}" \
  --control-plane-machine-count "${CONTROL_PLANE_MACHINE_COUNT}" \
  --worker-machine-count "${WORKER_MACHINE_COUNT}" \
  --infrastructure aws \
  > /tmp/cluster-template.yaml
```

## Step 2: Create the Cluster Manifest

Review and customize the generated template, then store it in Git.

```yaml
# clusters/workloads/production-workload-01/cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-workload-01
  namespace: default
  labels:
    environment: production
    region: us-east-1
spec:
  # Reference the AWS-specific cluster configuration
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: production-workload-01
  # Reference the control plane provider
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: production-workload-01-control-plane
```

## Step 3: Define the AWS Cluster Configuration

```yaml
# clusters/workloads/production-workload-01/awscluster.yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: production-workload-01
  namespace: default
spec:
  region: us-east-1
  sshKeyName: capi-key
  # Use an existing VPC instead of letting CAPA create one
  network:
    vpc:
      id: vpc-0a1b2c3d4e5f60000  # Your existing VPC ID
    subnets:
      # Control plane subnet (private)
      - id: subnet-0a1b2c3d4e5f60011
        availabilityZone: us-east-1a
        isPublic: false
      - id: subnet-0a1b2c3d4e5f60012
        availabilityZone: us-east-1b
        isPublic: false
      - id: subnet-0a1b2c3d4e5f60013
        availabilityZone: us-east-1c
        isPublic: false
      # Public subnets for the load balancer
      - id: subnet-0a1b2c3d4e5f60001
        availabilityZone: us-east-1a
        isPublic: true
      - id: subnet-0a1b2c3d4e5f60002
        availabilityZone: us-east-1b
        isPublic: true
  # Control plane load balancer configuration
  controlPlaneLoadBalancer:
    loadBalancerType: nlb
    scheme: internet-facing
```

## Step 4: Define the Control Plane

```yaml
# clusters/workloads/production-workload-01/control-plane.yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: production-workload-01-control-plane
  namespace: default
spec:
  version: v1.29.2
  replicas: 3  # 3 control plane nodes for HA
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
      kind: AWSMachineTemplate
      name: production-workload-01-control-plane
  kubeadmConfigSpec:
    initConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: aws
    joinConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: aws
    clusterConfiguration:
      apiServer:
        extraArgs:
          cloud-provider: aws
      controllerManager:
        extraArgs:
          cloud-provider: aws

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-workload-01-control-plane
  namespace: default
spec:
  template:
    spec:
      instanceType: t3.large
      iamInstanceProfile: control-plane.cluster-api-provider-aws.sigs.k8s.io
      sshKeyName: capi-key
      rootVolume:
        size: 50
        type: gp3
      ami:
        # Use the latest validated AMI for the Kubernetes version
        lookupType: AnyOwner
```

## Step 5: Define Worker Node Pool

```yaml
# clusters/workloads/production-workload-01/workers.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-workload-01-workers
  namespace: default
spec:
  clusterName: production-workload-01
  replicas: 3
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: production-workload-01
  template:
    spec:
      clusterName: production-workload-01
      version: v1.29.2
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: production-workload-01-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: production-workload-01-workers

---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: KubeadmConfigTemplate
metadata:
  name: production-workload-01-workers
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          kubeletExtraArgs:
            cloud-provider: aws

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-workload-01-workers
  namespace: default
spec:
  template:
    spec:
      instanceType: m6i.xlarge
      iamInstanceProfile: nodes.cluster-api-provider-aws.sigs.k8s.io
      sshKeyName: capi-key
      rootVolume:
        size: 100
        type: gp3
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/management/workloads/production-workload-01.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: workload-cluster-production-01
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/workloads/production-workload-01
  prune: false  # Never auto-delete cluster resources
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cluster-api
  healthChecks:
    - apiVersion: cluster.x-k8s.io/v1beta1
      kind: Cluster
      name: production-workload-01
      namespace: default
  timeout: 30m
```

## Step 7: Get the Workload Cluster Kubeconfig

```bash
# Wait for the cluster to become ready
kubectl get cluster production-workload-01 --watch

# Get the kubeconfig for the workload cluster
clusterctl get kubeconfig production-workload-01 > production-workload-01.kubeconfig

# Verify connectivity to the workload cluster
kubectl --kubeconfig=production-workload-01.kubeconfig get nodes

# Install a CNI plugin (required before nodes become Ready)
kubectl --kubeconfig=production-workload-01.kubeconfig apply -f \
  https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Best Practices

- Use 3 or 5 control plane nodes for production clusters. An odd number is required for etcd quorum.
- Use private subnets for control plane and worker nodes. Place the API server load balancer in public subnets.
- Store kubeconfigs as Kubernetes Secrets in the management cluster, not as local files. CAPI creates them automatically in the cluster's namespace.
- Deploy a CNI plugin immediately after cluster creation-CAPI does not install CNI for you, and nodes will remain NotReady until a CNI is present.
- Use `MachineHealthCheck` resources to enable automatic remediation of unhealthy nodes.

## Conclusion

A production Kubernetes cluster on AWS EC2 is now provisioned and managed through Cluster API and Flux CD. The cluster definition is version-controlled in Git, and CAPI continuously reconciles the cluster state. Control plane nodes are distributed across availability zones for high availability, and the worker node pool is ready for application workloads.
