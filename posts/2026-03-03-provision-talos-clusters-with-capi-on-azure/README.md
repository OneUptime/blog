# How to Provision Talos Clusters with CAPI on Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, Azure, Kubernetes, Cluster Provisioning

Description: Learn how to provision Talos Linux Kubernetes clusters on Microsoft Azure using Cluster API for automated and declarative cluster management.

---

Running Talos Linux on Azure through Cluster API gives you the best of all three worlds: the security of an immutable operating system, the scale of Azure infrastructure, and the declarative management model of CAPI. This guide covers the complete process of provisioning a Talos cluster on Azure using CAPI, from setting up the management cluster through verifying a healthy workload cluster.

## Prerequisites

You need the following before starting:

- A management Kubernetes cluster with CAPI installed
- Azure credentials with permissions to create resource groups, VMs, VNets, load balancers, and managed identities
- The Talos Linux VHD uploaded to Azure or available as a managed image
- `clusterctl`, `kubectl`, `az` CLI, and `talosctl` installed

## Setting Up Azure Credentials

Configure the Azure infrastructure provider:

```bash
# Login to Azure
az login

# Set the subscription
az account set --subscription "<subscription-id>"

# Create a service principal for CAPI
az ad sp create-for-rbac --name "capi-azure" --role contributor \
  --scopes /subscriptions/<subscription-id>

# Export the credentials
export AZURE_SUBSCRIPTION_ID="<subscription-id>"
export AZURE_TENANT_ID="<tenant-id>"
export AZURE_CLIENT_ID="<client-id>"
export AZURE_CLIENT_SECRET="<client-secret>"

# Base64 encode for CAPI
export AZURE_SUBSCRIPTION_ID_B64="$(echo -n "$AZURE_SUBSCRIPTION_ID" | base64)"
export AZURE_TENANT_ID_B64="$(echo -n "$AZURE_TENANT_ID" | base64)"
export AZURE_CLIENT_ID_B64="$(echo -n "$AZURE_CLIENT_ID" | base64)"
export AZURE_CLIENT_SECRET_B64="$(echo -n "$AZURE_CLIENT_SECRET" | base64)"

# Initialize CAPI with Azure and Talos providers
clusterctl init --bootstrap talos --control-plane talos --infrastructure azure
```

## Preparing the Talos Image

Upload the Talos Linux VHD to Azure:

```bash
# Create a resource group for images
az group create --name talos-images --location eastus

# Create a storage account
az storage account create \
  --name talosimages \
  --resource-group talos-images \
  --location eastus \
  --sku Standard_LRS

# Create a container for the VHD
az storage container create \
  --name vhds \
  --account-name talosimages

# Upload the Talos VHD
az storage blob upload \
  --account-name talosimages \
  --container-name vhds \
  --name talos-v1.7.0.vhd \
  --file talos-azure-amd64.vhd

# Create a managed image from the VHD
az image create \
  --name talos-v1.7.0 \
  --resource-group talos-images \
  --location eastus \
  --source "https://talosimages.blob.core.windows.net/vhds/talos-v1.7.0.vhd" \
  --os-type linux
```

## Defining the Cluster

Create the Azure-specific cluster manifests:

```yaml
# cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: talos-azure-prod
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
    name: talos-azure-prod-cp
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AzureCluster
    name: talos-azure-prod
```

```yaml
# azure-cluster.yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureCluster
metadata:
  name: talos-azure-prod
  namespace: default
spec:
  location: eastus
  resourceGroup: talos-azure-prod-rg
  subscriptionID: "<subscription-id>"
  networkSpec:
    vnet:
      name: talos-azure-prod-vnet
      cidrBlocks:
        - "10.0.0.0/16"
    subnets:
      - name: control-plane-subnet
        role: control-plane
        cidrBlocks:
          - "10.0.1.0/24"
        securityGroup:
          name: cp-nsg
          securityRules:
            - name: allow-talos-api
              protocol: "Tcp"
              direction: "Inbound"
              priority: 100
              sourceAddressPrefix: "*"
              destinationPortRange: "50000"
              access: "Allow"
            - name: allow-k8s-api
              protocol: "Tcp"
              direction: "Inbound"
              priority: 110
              sourceAddressPrefix: "*"
              destinationPortRange: "6443"
              access: "Allow"
      - name: worker-subnet
        role: node
        cidrBlocks:
          - "10.0.2.0/24"
```

## Control Plane Definition

```yaml
# control-plane.yaml
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: talos-azure-prod-cp
  namespace: default
spec:
  version: v1.30.0
  replicas: 3
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AzureMachineTemplate
    name: talos-azure-prod-cp
  controlPlaneConfig:
    controlplane:
      generateType: controlplane
      talosVersion: v1.7.0
      configPatches:
        - op: add
          path: /machine/kubelet/extraArgs
          value:
            cloud-provider: external
        - op: add
          path: /machine/time
          value:
            servers:
              - time.google.com

---
# Control plane machine template
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureMachineTemplate
metadata:
  name: talos-azure-prod-cp
  namespace: default
spec:
  template:
    spec:
      vmSize: Standard_D4s_v3
      image:
        id: "/subscriptions/<sub-id>/resourceGroups/talos-images/providers/Microsoft.Compute/images/talos-v1.7.0"
      osDisk:
        osType: "Linux"
        diskSizeGB: 50
        managedDisk:
          storageAccountType: "Premium_LRS"
      sshPublicKey: ""
```

## Worker Node Pool

```yaml
# workers.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: talos-azure-prod-workers
  namespace: default
spec:
  clusterName: talos-azure-prod
  replicas: 3
  selector:
    matchLabels: {}
  template:
    spec:
      clusterName: talos-azure-prod
      version: v1.30.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: talos-azure-prod-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: AzureMachineTemplate
        name: talos-azure-prod-workers

---
# Worker bootstrap config
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfigTemplate
metadata:
  name: talos-azure-prod-workers
  namespace: default
spec:
  template:
    spec:
      generateType: worker
      talosVersion: v1.7.0
      configPatches:
        - op: add
          path: /machine/kubelet/extraArgs
          value:
            cloud-provider: external

---
# Worker machine template
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureMachineTemplate
metadata:
  name: talos-azure-prod-workers
  namespace: default
spec:
  template:
    spec:
      vmSize: Standard_D2s_v3
      image:
        id: "/subscriptions/<sub-id>/resourceGroups/talos-images/providers/Microsoft.Compute/images/talos-v1.7.0"
      osDisk:
        osType: "Linux"
        diskSizeGB: 100
        managedDisk:
          storageAccountType: "Premium_LRS"
      sshPublicKey: ""
```

## Deploying the Cluster

Apply all the manifests and monitor the provisioning:

```bash
# Apply the cluster definition
kubectl apply -f cluster.yaml
kubectl apply -f azure-cluster.yaml
kubectl apply -f control-plane.yaml
kubectl apply -f workers.yaml

# Monitor provisioning progress
clusterctl describe cluster talos-azure-prod

# Watch machines come up
kubectl get machines -l cluster.x-k8s.io/cluster-name=talos-azure-prod -w

# Check for errors
kubectl get events --sort-by='.metadata.creationTimestamp' | grep talos-azure-prod
```

## Post-Provisioning Setup

Once the cluster is ready:

```bash
# Get the kubeconfig
clusterctl get kubeconfig talos-azure-prod > kubeconfig-azure

# Install CNI
KUBECONFIG=kubeconfig-azure helm install cilium cilium/cilium -n kube-system

# Install Azure cloud controller manager
KUBECONFIG=kubeconfig-azure helm install azure-ccm \
  cloud-provider-azure/cloud-controller-manager -n kube-system

# Verify nodes
KUBECONFIG=kubeconfig-azure kubectl get nodes -o wide
```

## Scaling and Management

```bash
# Scale workers
kubectl patch machinedeployment talos-azure-prod-workers \
  --type merge -p '{"spec":{"replicas":5}}'

# Check cluster status
clusterctl describe cluster talos-azure-prod

# Delete the cluster when done
kubectl delete cluster talos-azure-prod
```

## Production Considerations

For production Azure deployments, consider using availability zones for the control plane nodes. Set up Azure Monitor integration for infrastructure-level monitoring. Use Azure Private Link for the API server endpoint if the cluster should not be publicly accessible. Enable Azure Disk encryption for all VM disks. Store your CAPI manifests in version control and apply them through a CI/CD pipeline for auditability.

Provisioning Talos on Azure through CAPI gives you a production-grade cluster management workflow that handles the complexity of Azure infrastructure while maintaining the security benefits of Talos Linux.
