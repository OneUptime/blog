# How to Use Cluster API to Manage Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster API, CAPI, Kubernetes, Cluster Management

Description: Learn how to use Cluster API (CAPI) to manage the full lifecycle of Talos Linux Kubernetes clusters with declarative infrastructure management.

---

Cluster API (CAPI) brings the Kubernetes declarative model to cluster lifecycle management. Instead of writing scripts to provision and manage clusters, you define the desired state of your infrastructure as Kubernetes resources and let CAPI controllers reconcile the actual state to match. When combined with Talos Linux, CAPI provides a powerful way to manage fleets of Kubernetes clusters with minimal manual intervention.

## What is Cluster API?

Cluster API is a Kubernetes sub-project that extends the Kubernetes API to manage the lifecycle of Kubernetes clusters. It uses familiar Kubernetes concepts like controllers, custom resources, and reconciliation loops to handle cluster creation, scaling, upgrades, and deletion.

The key components in a CAPI deployment are:

- **Management Cluster** - A Kubernetes cluster that runs the CAPI controllers
- **Workload Clusters** - The clusters that CAPI creates and manages
- **Infrastructure Provider** - Handles cloud-specific resources (VMs, networks, load balancers)
- **Bootstrap Provider** - Generates the configuration to turn a machine into a Kubernetes node
- **Control Plane Provider** - Manages the control plane machines and their configuration

For Talos Linux, Sidero Labs provides both a bootstrap provider and a control plane provider, collectively known as CAPT (Cluster API Provider Talos).

## Why CAPI for Talos?

If you are managing a single cluster, CAPI might be more infrastructure than you need. But if you are running multiple clusters across different environments, or if you need to spin up and tear down clusters frequently, CAPI pays for itself quickly.

The benefits include declarative cluster definitions that live in version control, automatic reconciliation that corrects drift, built-in support for rolling upgrades and scaling, and a consistent management interface regardless of the underlying cloud provider.

## Setting Up the Management Cluster

You need a management cluster before you can create workload clusters. This can be a kind cluster for development or a dedicated cluster for production:

```bash
# Create a management cluster using kind for development
kind create cluster --name capi-management

# Install clusterctl - the CAPI CLI tool
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/v1.7.0/clusterctl-linux-amd64 -o clusterctl
chmod +x clusterctl
sudo mv clusterctl /usr/local/bin/

# Initialize CAPI with the Talos providers
clusterctl init \
  --bootstrap talos \
  --control-plane talos \
  --infrastructure aws  # or azure, vsphere, etc.
```

Verify the providers are installed:

```bash
# Check that all providers are running
kubectl get pods -n capi-system
kubectl get pods -n capt-system
kubectl get pods -n capa-system  # AWS infrastructure provider
```

## Understanding CAPI Resources

A Talos workload cluster is defined by several interconnected resources:

```yaml
# The Cluster resource ties everything together
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-cluster
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - "10.244.0.0/16"
    services:
      cidrBlocks:
        - "10.96.0.0/12"
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
    kind: TalosControlPlane
    name: production-cluster-cp
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: production-cluster
```

## Defining the Infrastructure

The infrastructure resource defines cloud-specific settings:

```yaml
# AWS infrastructure definition
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: production-cluster
  namespace: default
spec:
  region: us-east-1
  sshKeyName: ""  # Talos does not use SSH
  network:
    vpc:
      cidrBlock: "10.0.0.0/16"
    subnets:
      - availabilityZone: us-east-1a
        cidrBlock: "10.0.1.0/24"
        isPublic: true
      - availabilityZone: us-east-1b
        cidrBlock: "10.0.2.0/24"
        isPublic: true
      - availabilityZone: us-east-1c
        cidrBlock: "10.0.3.0/24"
        isPublic: true
```

## Defining the Control Plane

The TalosControlPlane resource manages control plane nodes:

```yaml
# Talos control plane definition
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: production-cluster-cp
  namespace: default
spec:
  version: v1.30.0
  replicas: 3
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSMachineTemplate
    name: production-cluster-cp
  controlPlaneConfig:
    controlplane:
      generateType: controlplane
      talosVersion: v1.7.0
      configPatches:
        - op: add
          path: /machine/time
          value:
            servers:
              - time.google.com
```

## Defining Machine Templates

Machine templates specify the compute resources for nodes:

```yaml
# Machine template for control plane nodes
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-cluster-cp
  namespace: default
spec:
  template:
    spec:
      instanceType: m5.xlarge
      ami:
        id: ami-xxxxxxxxxxxxxxxxx  # Talos AMI
      rootVolume:
        size: 50
        type: gp3

---
# Machine template for worker nodes
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-cluster-workers
  namespace: default
spec:
  template:
    spec:
      instanceType: m5.large
      ami:
        id: ami-xxxxxxxxxxxxxxxxx  # Talos AMI
      rootVolume:
        size: 100
        type: gp3
```

## Defining Worker Node Pools

Use MachineDeployment resources to manage worker node pools:

```yaml
# Worker node pool
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-cluster-workers
  namespace: default
spec:
  clusterName: production-cluster
  replicas: 3
  selector:
    matchLabels: {}
  template:
    spec:
      clusterName: production-cluster
      version: v1.30.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: production-cluster-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: production-cluster-workers

---
# Bootstrap config template for workers
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfigTemplate
metadata:
  name: production-cluster-workers
  namespace: default
spec:
  template:
    spec:
      generateType: worker
      talosVersion: v1.7.0
```

## Creating the Cluster

Apply all the resources to the management cluster:

```bash
# Apply the cluster definition
kubectl apply -f cluster.yaml

# Watch the cluster provisioning
kubectl get clusters -w

# Watch machines being created
kubectl get machines -w

# Check the Talos control plane status
kubectl get taloscontrolplane -w
```

## Accessing the Workload Cluster

Once the cluster is ready, retrieve the kubeconfig:

```bash
# Get the workload cluster kubeconfig
clusterctl get kubeconfig production-cluster > production-kubeconfig

# Verify the workload cluster
KUBECONFIG=production-kubeconfig kubectl get nodes
```

## Cluster Lifecycle Operations

CAPI handles common lifecycle operations through resource updates:

```bash
# Scale workers by updating the MachineDeployment
kubectl patch machinedeployment production-cluster-workers \
  --type merge -p '{"spec":{"replicas":5}}'

# Upgrade Kubernetes version
kubectl patch taloscontrolplane production-cluster-cp \
  --type merge -p '{"spec":{"version":"v1.31.0"}}'

# Delete the cluster
kubectl delete cluster production-cluster
```

## Monitoring Cluster Status

Check the status of your CAPI-managed clusters:

```bash
# Get cluster overview
clusterctl describe cluster production-cluster

# Check machine health
kubectl get machines -l cluster.x-k8s.io/cluster-name=production-cluster

# View cluster conditions
kubectl get cluster production-cluster -o yaml | grep -A 20 conditions
```

Cluster API transforms Talos Linux cluster management from an imperative scripting exercise into a declarative, self-healing system. The learning curve is steeper than using `talosctl` directly, but for organizations managing multiple clusters, the consistency and automation that CAPI provides is well worth the investment.
