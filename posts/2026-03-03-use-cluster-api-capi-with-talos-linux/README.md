# How to Use Cluster API (CAPI) with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster API, CAPI, Kubernetes, Cluster Management, Infrastructure

Description: Deploy and manage Talos Linux Kubernetes clusters at scale using the Cluster API framework with the Talos bootstrap provider.

---

Cluster API (CAPI) is a Kubernetes sub-project that brings declarative, Kubernetes-style APIs to cluster creation, configuration, and management. Instead of writing scripts or using CLI tools to provision clusters, you define clusters as Kubernetes resources. A management cluster watches these resources and creates workload clusters automatically. Talos Linux has official CAPI integration through the Talos bootstrap and control plane providers, making it possible to manage fleets of Talos clusters through standard Kubernetes APIs.

## What is Cluster API

Cluster API extends Kubernetes with custom resources for managing clusters:

- **Cluster**: The top-level resource representing a Kubernetes cluster
- **Machine**: Represents a single node in a cluster
- **MachineDeployment**: Manages a set of machines (like Deployment manages Pods)
- **MachineSet**: Maintains a stable set of machines (like ReplicaSet)

CAPI separates concerns into providers:

- **Infrastructure provider**: Creates VMs or bare metal machines (AWS, Azure, vSphere, etc.)
- **Bootstrap provider**: Configures the OS on each machine (Talos, kubeadm, etc.)
- **Control plane provider**: Manages the control plane lifecycle

## Architecture

```text
Management Cluster (runs CAPI controllers)
  |
  |-- CAPI Core Controllers
  |-- Talos Bootstrap Provider (CABPT)
  |-- Talos Control Plane Provider (CACPPT)
  |-- Infrastructure Provider (e.g., CAPA for AWS)
  |
  +--> Workload Cluster 1 (Talos Linux)
  +--> Workload Cluster 2 (Talos Linux)
  +--> Workload Cluster N (Talos Linux)
```

## Prerequisites

- An existing Kubernetes cluster to serve as the management cluster
- clusterctl CLI installed
- Cloud provider credentials (we will use AWS in this guide)
- kubectl configured for the management cluster

## Step 1: Install clusterctl

```bash
# macOS
brew install clusterctl

# Linux
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/latest/download/clusterctl-linux-amd64 -o clusterctl
chmod +x clusterctl
sudo mv clusterctl /usr/local/bin/
```

## Step 2: Initialize the Management Cluster

Initialize CAPI with the Talos providers:

```bash
# Set required environment variables for AWS
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

# Initialize CAPI with Talos bootstrap and control plane providers
clusterctl init \
  --infrastructure aws \
  --bootstrap talos \
  --control-plane talos
```

This installs the following components in your management cluster:

- CAPI core controllers
- AWS infrastructure provider (CAPA)
- Talos bootstrap provider (CABPT)
- Talos control plane provider (CACPPT)

Verify the installation:

```bash
# Check all CAPI pods
kubectl get pods -A | grep -E 'capi|cabpt|cacppt|capa'

# Check the provider versions
clusterctl describe --showspec
```

## Step 3: Create a Workload Cluster

Define the workload cluster using CAPI resources:

```yaml
# talos-workload-cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: talos-workload-1
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - 10.244.0.0/16
    services:
      cidrBlocks:
        - 10.96.0.0/12
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
    kind: TalosControlPlane
    name: talos-workload-1-cp
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: talos-workload-1
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: talos-workload-1
  namespace: default
spec:
  region: us-east-1
  sshKeyName: my-ssh-key
  network:
    vpc:
      cidrBlock: 10.0.0.0/16
    subnets:
      - availabilityZone: us-east-1a
        cidrBlock: 10.0.1.0/24
        isPublic: true
      - availabilityZone: us-east-1b
        cidrBlock: 10.0.2.0/24
        isPublic: true
      - availabilityZone: us-east-1c
        cidrBlock: 10.0.3.0/24
        isPublic: true
```

## Step 4: Define the Control Plane

```yaml
# talos-control-plane.yaml
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: talos-workload-1-cp
  namespace: default
spec:
  version: v1.29.0
  replicas: 3
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSMachineTemplate
    name: talos-workload-1-cp
  controlPlaneConfig:
    controlplane:
      generateType: controlplane
      talosVersion: v1.6
      configPatches:
        - op: add
          path: /machine/install
          value:
            disk: /dev/xvda
            image: ghcr.io/siderolabs/installer:v1.6.0
        - op: add
          path: /cluster/allowSchedulingOnControlPlanes
          value: false
        - op: add
          path: /cluster/proxy
          value:
            disabled: true  # Using Cilium
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: talos-workload-1-cp
  namespace: default
spec:
  template:
    spec:
      instanceType: m5.xlarge
      ami:
        id: ami-0xxxxxxxxxxxxxxxxx  # Talos AMI for your region
      iamInstanceProfile: control-plane.cluster-api-provider-aws.sigs.k8s.io
      rootVolume:
        size: 50
        type: gp3
```

## Step 5: Define Worker Nodes

```yaml
# talos-workers.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: talos-workload-1-workers
  namespace: default
spec:
  clusterName: talos-workload-1
  replicas: 3
  selector:
    matchLabels: {}
  template:
    spec:
      clusterName: talos-workload-1
      version: v1.29.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: talos-workload-1-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: talos-workload-1-workers
---
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfigTemplate
metadata:
  name: talos-workload-1-workers
  namespace: default
spec:
  template:
    spec:
      generateType: worker
      talosVersion: v1.6
      configPatches:
        - op: add
          path: /machine/install
          value:
            disk: /dev/xvda
            image: ghcr.io/siderolabs/installer:v1.6.0
        - op: add
          path: /machine/nodeLabels
          value:
            node.kubernetes.io/pool: general
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: talos-workload-1-workers
  namespace: default
spec:
  template:
    spec:
      instanceType: m5.2xlarge
      ami:
        id: ami-0xxxxxxxxxxxxxxxxx  # Talos AMI
      iamInstanceProfile: nodes.cluster-api-provider-aws.sigs.k8s.io
      rootVolume:
        size: 100
        type: gp3
```

## Step 6: Deploy the Cluster

Apply all the resources:

```bash
kubectl apply -f talos-workload-cluster.yaml
kubectl apply -f talos-control-plane.yaml
kubectl apply -f talos-workers.yaml
```

Watch the cluster provisioning:

```bash
# Watch cluster status
kubectl get cluster talos-workload-1 --watch

# Watch machine status
kubectl get machines --watch

# Detailed cluster status
clusterctl describe cluster talos-workload-1

# Check CAPI events
kubectl get events --field-selector involvedObject.name=talos-workload-1
```

## Step 7: Access the Workload Cluster

Once the cluster is ready, get the kubeconfig:

```bash
# Get the workload cluster kubeconfig
clusterctl get kubeconfig talos-workload-1 > talos-workload-1.kubeconfig

# Use the kubeconfig
export KUBECONFIG=talos-workload-1.kubeconfig
kubectl get nodes
```

## Step 8: Scale the Cluster

Scaling is as simple as updating the replica count:

```bash
# Scale workers to 5
kubectl patch machinedeployment talos-workload-1-workers \
  --type merge \
  -p '{"spec":{"replicas": 5}}'

# Scale control plane to 5 (for larger clusters)
kubectl patch taloscontrolplane talos-workload-1-cp \
  --type merge \
  -p '{"spec":{"replicas": 5}}'

# Watch the scaling
kubectl get machines --watch
```

## Step 9: Upgrade the Cluster

Upgrade both Kubernetes and Talos versions:

```yaml
# Update the control plane version
kubectl patch taloscontrolplane talos-workload-1-cp --type merge -p '{
  "spec": {
    "version": "v1.29.1",
    "controlPlaneConfig": {
      "controlplane": {
        "configPatches": [
          {
            "op": "replace",
            "path": "/machine/install/image",
            "value": "ghcr.io/siderolabs/installer:v1.6.1"
          }
        ]
      }
    }
  }
}'
```

CAPI handles the rolling upgrade automatically, one node at a time, with health checks between each node.

## Step 10: Manage Multiple Clusters

The real power of CAPI is managing many clusters. Create a second cluster by duplicating the resources with different names:

```bash
# List all managed clusters
kubectl get clusters

# Describe a specific cluster
clusterctl describe cluster talos-workload-1
clusterctl describe cluster talos-workload-2

# Get kubeconfig for any cluster
clusterctl get kubeconfig talos-workload-2
```

## GitOps Integration

Store your CAPI resources in Git and use Flux or ArgoCD to manage them:

```yaml
# flux-capi-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: capi-clusters
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/capi
  prune: true
  healthChecks:
    - apiVersion: cluster.x-k8s.io/v1beta1
      kind: Cluster
      name: talos-workload-1
      namespace: default
```

## Cleanup

To delete a workload cluster:

```bash
# Delete the cluster (CAPI will clean up all associated resources)
kubectl delete cluster talos-workload-1

# Watch the cleanup
kubectl get machines --watch
```

## Conclusion

Cluster API with Talos Linux brings Kubernetes-style management to your cluster fleet. Instead of writing scripts for each cloud provider, you define clusters as Kubernetes resources and let CAPI handle the provisioning, scaling, and upgrading. The Talos bootstrap and control plane providers ensure that each node gets a proper Talos configuration, and CAPI's machine management handles the lifecycle of individual nodes. For organizations running multiple Talos Linux clusters across different environments, CAPI provides a standardized, declarative way to manage them all from a single management cluster.
