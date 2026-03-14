# How to Provision Azure Clusters with Cluster API and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, Azure, CAPZ, GitOps, Kubernetes, Multi-Cluster

Description: Provision Azure Kubernetes clusters using Cluster API and Flux CD for GitOps-driven cluster lifecycle management on Microsoft Azure.

---

## Introduction

The Cluster API Azure provider (CAPZ) enables declarative provisioning of Kubernetes clusters on Azure virtual machines. Combined with Flux CD, the cluster definition is stored in Git and continuously reconciled by the management cluster. This approach makes Azure cluster provisioning reproducible, auditable, and self-healing.

CAPZ supports both self-managed Kubernetes on Azure VMs and managed AKS clusters through the `AzureManagedCluster` resource. This guide focuses on self-managed clusters using Azure VMs, which provides full control over the Kubernetes distribution, CNI, and cluster configuration. AKS-managed clusters are simpler but offer less configurability.

## Prerequisites

- Cluster API with CAPZ installed on the management cluster
- Flux CD bootstrapped on the management cluster
- An Azure service principal with Contributor role
- An existing Azure VNet with subnets
- `kubectl`, `clusterctl`, and `az` CLIs installed

## Step 1: Install the CAPZ Provider

```bash
# Initialize clusterctl with the Azure provider
export AZURE_SUBSCRIPTION_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export AZURE_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export AZURE_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export AZURE_CLIENT_SECRET="your-service-principal-secret"

# Generate CAPZ components
clusterctl generate provider --infrastructure azure:v1.13.0 \
  > infrastructure/cluster-api/components/provider-azure.yaml
```

## Step 2: Define the Azure Cluster

```yaml
# clusters/workloads/azure-production-01/cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: azure-production-01
  namespace: default
  labels:
    environment: production
    cloud: azure
    region: eastus
spec:
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AzureCluster
    name: azure-production-01
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: azure-production-01-control-plane
```

## Step 3: Define the AzureCluster Resource

```yaml
# clusters/workloads/azure-production-01/azurecluster.yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureCluster
metadata:
  name: azure-production-01
  namespace: default
spec:
  location: eastus
  resourceGroup: production-cluster-rg
  subscriptionID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  # Use an existing virtual network
  networkSpec:
    vnet:
      name: production-vnet
      resourceGroup: production-network-rg
      cidrBlocks:
        - "10.0.0.0/16"
    subnets:
      # Control plane nodes subnet
      - name: control-plane-subnet
        role: control-plane
        cidrBlocks:
          - "10.0.1.0/24"
      # Worker nodes subnet
      - name: node-subnet
        role: node
        cidrBlocks:
          - "10.0.2.0/24"
  # Identity for CAPZ to authenticate with Azure
  identityRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AzureClusterIdentity
    name: capz-identity
```

## Step 4: Define the AzureClusterIdentity

```yaml
# clusters/workloads/azure-production-01/identity.yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureClusterIdentity
metadata:
  name: capz-identity
  namespace: default
spec:
  type: ServicePrincipal
  tenantID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  clientID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  clientSecret:
    name: capz-service-principal
    namespace: default
  allowedNamespaces:
    list:
      - default

---
# This secret should be SOPS-encrypted before committing
apiVersion: v1
kind: Secret
metadata:
  name: capz-service-principal
  namespace: default
type: Opaque
stringData:
  clientSecret: "your-service-principal-secret"
```

## Step 5: Define the Control Plane

```yaml
# clusters/workloads/azure-production-01/control-plane.yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: azure-production-01-control-plane
  namespace: default
spec:
  version: v1.29.2
  replicas: 3
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
      kind: AzureMachineTemplate
      name: azure-production-01-control-plane
  kubeadmConfigSpec:
    initConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: azure
          cloud-config: /etc/kubernetes/azure.json
    joinConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: azure
          cloud-config: /etc/kubernetes/azure.json

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureMachineTemplate
metadata:
  name: azure-production-01-control-plane
  namespace: default
spec:
  template:
    spec:
      location: eastus
      vmSize: Standard_D4s_v5
      osDisk:
        osType: Linux
        diskSizeGB: 128
        managedDisk:
          storageAccountType: Premium_LRS
      image:
        marketplace:
          publisher: cncf-upstream
          offer: capi
          sku: ubuntu-2004-gen1
          version: latest
```

## Step 6: Define Worker MachineDeployment

```yaml
# clusters/workloads/azure-production-01/workers.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: azure-production-01-workers
  namespace: default
spec:
  clusterName: azure-production-01
  replicas: 3
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: azure-production-01
  template:
    spec:
      clusterName: azure-production-01
      version: v1.29.2
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: azure-production-01-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: AzureMachineTemplate
        name: azure-production-01-workers

---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: KubeadmConfigTemplate
metadata:
  name: azure-production-01-workers
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          kubeletExtraArgs:
            cloud-provider: azure
            cloud-config: /etc/kubernetes/azure.json

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureMachineTemplate
metadata:
  name: azure-production-01-workers
  namespace: default
spec:
  template:
    spec:
      location: eastus
      vmSize: Standard_D8s_v5
      osDisk:
        osType: Linux
        diskSizeGB: 100
        managedDisk:
          storageAccountType: Premium_LRS
      image:
        marketplace:
          publisher: cncf-upstream
          offer: capi
          sku: ubuntu-2004-gen1
          version: latest
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/management/workloads/azure-production-01.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: workload-cluster-azure-production-01
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/workloads/azure-production-01
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cluster-api
  decryption:
    provider: sops
    secretRef:
      name: sops-age
  healthChecks:
    - apiVersion: cluster.x-k8s.io/v1beta1
      kind: Cluster
      name: azure-production-01
      namespace: default
  timeout: 45m
```

## Step 8: Access the Cluster

```bash
# Wait for the cluster to provision (takes 15-30 minutes)
kubectl get cluster azure-production-01 --watch

# Get the workload cluster kubeconfig
clusterctl get kubeconfig azure-production-01 > azure-production-01.kubeconfig

# Check node status
kubectl --kubeconfig=azure-production-01.kubeconfig get nodes

# Install Calico CNI
kubectl --kubeconfig=azure-production-01.kubeconfig apply \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Best Practices

- Use `AzureClusterIdentity` with Managed Identity when running CAPZ on Azure infrastructure. This eliminates service principal secret management.
- Place control plane VMs in a dedicated subnet with network security groups that restrict API server access to authorized CIDRs.
- Use Azure Availability Zones by specifying `failureDomain` on MachineDeployment to distribute nodes across zones.
- Use Premium_LRS managed disks for control plane nodes to ensure consistent IOPS for etcd.
- Bootstrap Flux CD on the workload cluster immediately after provisioning to bring it under GitOps management.

## Conclusion

An Azure Kubernetes cluster is now provisioned and managed through Cluster API and Flux CD. The cluster definition is stored in Git and continuously reconciled by the management cluster. CAPZ handles all Azure-specific provisioning details, while Flux ensures the cluster manifests are always applied from Git.
