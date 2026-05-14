# How to Use Cluster API with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, GitOps, Kubernetes, Multi-Cluster, Infrastructure as Code

Description: Learn how to use Cluster API (CAPI) with Flux CD to declaratively provision and manage Kubernetes clusters through GitOps workflows.

---

## Introduction

Cluster API (CAPI) is a Kubernetes sub-project that brings declarative, Kubernetes-style APIs to cluster creation, configuration, and management. When combined with Flux CD, you can manage your entire fleet of Kubernetes clusters through Git: commit a cluster definition, and CAPI provisions it; commit workload definitions, and Flux deploys them.

This guide shows how to set up a management cluster with CAPI and Flux CD, provision workload clusters, and automatically bootstrap Flux on each new cluster.

## Prerequisites

- A management Kubernetes cluster (can be a local kind cluster for testing)
- Flux CD installed on the management cluster
- clusterctl CLI installed
- kubectl and flux CLI installed
- Cloud provider credentials (AWS examples used here)

## Architecture Overview

```mermaid
graph TD
    A[Git Repository] -->|Flux syncs| B[Management Cluster]
    B -->|CAPI provisions| C[Workload Cluster 1]
    B -->|CAPI provisions| D[Workload Cluster 2]
    B -->|CAPI provisions| E[Workload Cluster 3]
    A -->|Flux syncs| C
    A -->|Flux syncs| D
    A -->|Flux syncs| E
    B --> F[CAPI Controllers]
    B --> G[Flux Controllers]
```

## Setting Up the Management Cluster

Initialize CAPI on the management cluster with the AWS infrastructure provider.

```bash
# Set AWS environment variables for CAPI

export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Create the IAM resources required by CAPA
clusterawsadm bootstrap iam create-cloudformation-stack

# Encode credentials for CAPI
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

# Initialize CAPI with the AWS provider
clusterctl init --infrastructure aws
```

## Installing CAPI via Flux

Instead of using clusterctl directly, manage CAPI installation through Flux for full GitOps.

```yaml
# infrastructure/capi/namespace.yaml
# Namespace for CAPI system components
apiVersion: v1
kind: Namespace
metadata:
  name: capi-operator-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: capi-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: capi-kubeadm-bootstrap-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: capi-kubeadm-control-plane-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: capa-system
```

```yaml
# infrastructure/capi/helmrepository.yaml
# Helm repository for the Cluster API Operator
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: capi-operator
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/cluster-api-operator
```

```yaml
# infrastructure/capi/operator-helmrelease.yaml
# Install the Cluster API Operator
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: capi-operator
  namespace: capi-operator-system
spec:
  interval: 15m
  chart:
    spec:
      chart: cluster-api-operator
      sourceRef:
        kind: HelmRepository
        name: capi-operator
        namespace: flux-system
```

```yaml
# infrastructure/capi/providers.yaml
# Install CAPI providers through the Cluster API Operator
apiVersion: operator.cluster.x-k8s.io/v1alpha2
kind: CoreProvider
metadata:
  name: cluster-api
  namespace: capi-system
spec:
  version: v1.13.0
---
apiVersion: operator.cluster.x-k8s.io/v1alpha2
kind: BootstrapProvider
metadata:
  name: kubeadm
  namespace: capi-kubeadm-bootstrap-system
spec:
  version: v1.13.0
---
apiVersion: operator.cluster.x-k8s.io/v1alpha2
kind: ControlPlaneProvider
metadata:
  name: kubeadm
  namespace: capi-kubeadm-control-plane-system
spec:
  version: v1.13.0
---
apiVersion: v1
kind: Secret
metadata:
  name: capa-variables
  namespace: capa-system
type: Opaque
stringData:
  AWS_B64ENCODED_CREDENTIALS: <output-from-clusterawsadm-bootstrap-credentials>
---
apiVersion: operator.cluster.x-k8s.io/v1alpha2
kind: InfrastructureProvider
metadata:
  name: aws
  namespace: capa-system
spec:
  version: v2.11.1
  configSecret:
    name: capa-variables
```

## Defining Workload Clusters

Create cluster definitions as YAML manifests in Git.

```yaml
# clusters/definitions/production-east.yaml
# Define a production Kubernetes cluster on AWS
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: production-east
  namespace: default
  labels:
    environment: production
    region: us-east-1
    gitops: flux
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - 192.168.0.0/16
    services:
      cidrBlocks:
        - 10.128.0.0/12
  controlPlaneRef:
    apiGroup: controlplane.cluster.x-k8s.io
    kind: KubeadmControlPlane
    name: production-east-control-plane
  infrastructureRef:
    apiGroup: infrastructure.cluster.x-k8s.io
    kind: AWSCluster
    name: production-east
---
# AWS-specific cluster configuration
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: production-east
  namespace: default
spec:
  region: us-east-1
  sshKeyName: capi-cluster-key
  # Use existing VPC or let CAPI create one
  network:
    vpc:
      cidrBlock: 10.0.0.0/16
    subnets:
      - availabilityZone: us-east-1a
        cidrBlock: 10.0.1.0/24
        id: subnet-0123456789abcdef0
        isPublic: true
      - availabilityZone: us-east-1a
        cidrBlock: 10.0.2.0/24
        id: subnet-0123456789abcdef1
        isPublic: false
```

## Defining the Control Plane

Configure the Kubernetes control plane for the workload cluster.

```yaml
# clusters/definitions/production-east-control-plane.yaml
# Kubeadm control plane configuration
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: KubeadmControlPlane
metadata:
  name: production-east-control-plane
  namespace: default
spec:
  # Number of control plane replicas (use odd numbers)
  replicas: 3
  version: v1.31.0
  machineTemplate:
    spec:
      infrastructureRef:
        apiGroup: infrastructure.cluster.x-k8s.io
        kind: AWSMachineTemplate
        name: production-east-control-plane
  kubeadmConfigSpec:
    # Control plane kubeadm configuration
    clusterConfiguration:
      apiServer:
        extraArgs:
          # Enable audit logging
          - name: audit-log-maxage
            value: "30"
          - name: audit-log-maxbackup
            value: "10"
          - name: audit-log-maxsize
            value: "100"
    initConfiguration:
      nodeRegistration:
        name: "{{ ds.meta_data.local_hostname }}"
        kubeletExtraArgs:
          # Use the cloud provider for node identification
          - name: cloud-provider
            value: external
    joinConfiguration:
      nodeRegistration:
        name: "{{ ds.meta_data.local_hostname }}"
        kubeletExtraArgs:
          - name: cloud-provider
            value: external
---
# Machine template for control plane nodes
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-east-control-plane
  namespace: default
spec:
  template:
    spec:
      instanceType: t3.large
      iamInstanceProfile: control-plane.cluster-api-provider-aws.sigs.k8s.io
      # Use a specific AMI or let CAPI discover one
      sshKeyName: capi-cluster-key
      rootVolume:
        size: 50
        type: gp3
```

## Defining Worker Nodes

Configure the worker node pool using MachineDeployment.

```yaml
# clusters/definitions/production-east-workers.yaml
# Worker node machine deployment
apiVersion: cluster.x-k8s.io/v1beta2
kind: MachineDeployment
metadata:
  name: production-east-workers
  namespace: default
spec:
  clusterName: production-east
  replicas: 3
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: production-east
      nodepool: production-east-workers
  template:
    metadata:
      labels:
        cluster.x-k8s.io/cluster-name: production-east
        nodepool: production-east-workers
    spec:
      clusterName: production-east
      version: v1.31.0
      bootstrap:
        configRef:
          apiGroup: bootstrap.cluster.x-k8s.io
          kind: KubeadmConfigTemplate
          name: production-east-workers
      infrastructureRef:
        apiGroup: infrastructure.cluster.x-k8s.io
        kind: AWSMachineTemplate
        name: production-east-workers
---
# Kubeadm configuration for worker nodes
apiVersion: bootstrap.cluster.x-k8s.io/v1beta2
kind: KubeadmConfigTemplate
metadata:
  name: production-east-workers
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          name: "{{ ds.meta_data.local_hostname }}"
          kubeletExtraArgs:
            - name: cloud-provider
              value: external
---
# Machine template for worker nodes
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-east-workers
  namespace: default
spec:
  template:
    spec:
      instanceType: t3.xlarge
      iamInstanceProfile: nodes.cluster-api-provider-aws.sigs.k8s.io
      sshKeyName: capi-cluster-key
      rootVolume:
        size: 100
        type: gp3
```

## Syncing Cluster Definitions with Flux

Create Flux Kustomizations to sync the cluster definitions.

```yaml
# clusters/management/cluster-definitions.yaml
# Flux Kustomization to sync workload cluster definitions
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-definitions
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/definitions
  prune: true
  # Wait for CAPI controllers to be ready
  dependsOn:
    - name: capi-infrastructure
  # Give clusters time to provision
  timeout: "30m"
```

## Auto-Bootstrapping Flux on Workload Clusters

Use CAPI's ClusterResourceSet to automatically install Flux on new clusters.

```yaml
# infrastructure/capi/flux-bootstrap-set.yaml
# Automatically install Flux on every new workload cluster
apiVersion: addons.cluster.x-k8s.io/v1beta2
kind: ClusterResourceSet
metadata:
  name: flux-bootstrap
  namespace: default
spec:
  # Apply to all clusters with the gitops label
  clusterSelector:
    matchLabels:
      gitops: flux
  resources:
    - kind: ConfigMap
      name: flux-install-manifests
  strategy: Reconcile
---
# ConfigMap containing Flux installation manifests
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-install-manifests
  namespace: default
data:
  flux-namespace.yaml: |
    apiVersion: v1
    kind: Namespace
    metadata:
      name: flux-system
  # Additional Flux manifests would be included here
  # In practice, use a Helm chart or kustomize to generate these
```

## Monitoring Cluster Provisioning

Check the status of your clusters.

```bash
# List all CAPI clusters
kubectl get clusters -A

# Check cluster provisioning status
kubectl describe cluster production-east

# View machine status
kubectl get machines -A

# Check control plane status
kubectl get kubeadmcontrolplane -A

# View worker node status
kubectl get machinedeployment -A

# Get the kubeconfig for a workload cluster
clusterctl get kubeconfig production-east > production-east.kubeconfig

# Verify Flux on the workload cluster
KUBECONFIG=production-east.kubeconfig kubectl get pods -n flux-system
```

## Scaling Clusters Through Git

To scale a cluster, update the YAML in Git and let Flux sync the change.

```yaml
# clusters/definitions/production-east-workers.yaml
# Update the replica count to scale the worker pool
apiVersion: cluster.x-k8s.io/v1beta2
kind: MachineDeployment
metadata:
  name: production-east-workers
  namespace: default
spec:
  clusterName: production-east
  # Scaled from 3 to 5 workers
  replicas: 5
  # ... rest of spec unchanged
```

```bash
# Commit and push the change
git add clusters/definitions/production-east-workers.yaml
git commit -m "Scale production-east workers to 5 replicas"
git push

# Flux will detect the change and apply it
# CAPI will then provision the additional worker nodes
flux reconcile kustomization cluster-definitions
```

## Conclusion

Cluster API and Flux CD together enable a fully declarative approach to managing Kubernetes clusters at scale. Every cluster is defined as YAML in Git, provisioned by CAPI, and kept in sync by Flux. Scaling, upgrading, or adding new clusters is a Git commit away. This approach brings the same GitOps benefits you use for applications (pull requests, audit trails, rollback) to the clusters themselves.
