# How to Install Talos Linux on Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Azure, Kubernetes, Cloud, Infrastructure

Description: A complete walkthrough for deploying Talos Linux on Microsoft Azure and bootstrapping a Kubernetes cluster from scratch.

---

Microsoft Azure is a solid platform for running Talos Linux, and the deployment process is well supported through both the Azure CLI and Terraform. Talos publishes official VHD images for Azure, making it easy to get started. This guide takes you through the full process of standing up a Talos Kubernetes cluster on Azure, including all the networking and infrastructure you need.

## Prerequisites

Install the necessary tools before you begin:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install the Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Log in to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Creating the Resource Group

Start by creating a resource group to hold all your Talos cluster resources:

```bash
# Create a resource group
RESOURCE_GROUP="talos-cluster-rg"
LOCATION="eastus"

az group create \
  --name ${RESOURCE_GROUP} \
  --location ${LOCATION}
```

## Setting Up Networking

Create a virtual network with subnets for your cluster:

```bash
# Create a virtual network
az network vnet create \
  --resource-group ${RESOURCE_GROUP} \
  --name talos-vnet \
  --address-prefix 10.0.0.0/16

# Create subnet for control plane nodes
az network vnet subnet create \
  --resource-group ${RESOURCE_GROUP} \
  --vnet-name talos-vnet \
  --name controlplane-subnet \
  --address-prefix 10.0.1.0/24

# Create subnet for worker nodes
az network vnet subnet create \
  --resource-group ${RESOURCE_GROUP} \
  --vnet-name talos-vnet \
  --name worker-subnet \
  --address-prefix 10.0.2.0/24
```

Create network security groups to control traffic:

```bash
# Create NSG for control plane
az network nsg create \
  --resource-group ${RESOURCE_GROUP} \
  --name talos-cp-nsg

# Allow Kubernetes API access
az network nsg rule create \
  --resource-group ${RESOURCE_GROUP} \
  --nsg-name talos-cp-nsg \
  --name allow-k8s-api \
  --priority 100 \
  --direction Inbound \
  --protocol TCP \
  --destination-port-range 6443 \
  --access Allow

# Allow Talos API access
az network nsg rule create \
  --resource-group ${RESOURCE_GROUP} \
  --nsg-name talos-cp-nsg \
  --name allow-talos-api \
  --priority 110 \
  --direction Inbound \
  --protocol TCP \
  --destination-port-range 50000 \
  --access Allow

# Allow etcd peer traffic within the subnet
az network nsg rule create \
  --resource-group ${RESOURCE_GROUP} \
  --nsg-name talos-cp-nsg \
  --name allow-etcd \
  --priority 120 \
  --direction Inbound \
  --protocol TCP \
  --destination-port-range 2379-2380 \
  --source-address-prefix 10.0.1.0/24 \
  --access Allow

# Associate NSG with control plane subnet
az network vnet subnet update \
  --resource-group ${RESOURCE_GROUP} \
  --vnet-name talos-vnet \
  --name controlplane-subnet \
  --network-security-group talos-cp-nsg
```

## Creating the Load Balancer

Set up an Azure Load Balancer for the Kubernetes API endpoint:

```bash
# Create a public IP for the load balancer
az network public-ip create \
  --resource-group ${RESOURCE_GROUP} \
  --name talos-lb-ip \
  --sku Standard \
  --allocation-method Static

# Get the public IP address
LB_IP=$(az network public-ip show \
  --resource-group ${RESOURCE_GROUP} \
  --name talos-lb-ip \
  --query 'ipAddress' --output tsv)

echo "Load Balancer IP: ${LB_IP}"

# Create the load balancer
az network lb create \
  --resource-group ${RESOURCE_GROUP} \
  --name talos-lb \
  --sku Standard \
  --frontend-ip-name talos-frontend \
  --public-ip-address talos-lb-ip \
  --backend-pool-name talos-cp-pool

# Create a health probe for the Kubernetes API
az network lb probe create \
  --resource-group ${RESOURCE_GROUP} \
  --lb-name talos-lb \
  --name k8s-api-probe \
  --protocol Tcp \
  --port 6443

# Create a load balancing rule
az network lb rule create \
  --resource-group ${RESOURCE_GROUP} \
  --lb-name talos-lb \
  --name k8s-api-rule \
  --protocol Tcp \
  --frontend-port 6443 \
  --backend-port 6443 \
  --frontend-ip-name talos-frontend \
  --backend-pool-name talos-cp-pool \
  --probe-name k8s-api-probe
```

## Uploading the Talos Image

Upload the Talos VHD image to Azure:

```bash
# Create a storage account for the Talos image
STORAGE_ACCOUNT="talosimages$(date +%s)"
az storage account create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${STORAGE_ACCOUNT} \
  --sku Standard_LRS

# Create a container
az storage container create \
  --account-name ${STORAGE_ACCOUNT} \
  --name images

# Download the Talos Azure VHD
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/azure-amd64.vhd.xz
xz -d azure-amd64.vhd.xz

# Upload to Azure blob storage
az storage blob upload \
  --account-name ${STORAGE_ACCOUNT} \
  --container-name images \
  --name talos-v1.7.0.vhd \
  --file azure-amd64.vhd

# Create a managed image from the VHD
BLOB_URL=$(az storage blob url \
  --account-name ${STORAGE_ACCOUNT} \
  --container-name images \
  --name talos-v1.7.0.vhd --output tsv)

az image create \
  --resource-group ${RESOURCE_GROUP} \
  --name talos-v1.7.0 \
  --os-type Linux \
  --source ${BLOB_URL}
```

## Generating Talos Configuration

Generate the configuration files for your cluster:

```bash
# Generate Talos cluster configuration
talosctl gen config talos-azure-cluster "https://${LB_IP}:6443" \
  --output-dir _out

# The output includes:
# _out/controlplane.yaml  - control plane configuration
# _out/worker.yaml         - worker node configuration
# _out/talosconfig         - talosctl client configuration
```

## Launching Control Plane Nodes

Create the control plane virtual machines:

```bash
# Create control plane VMs
for i in 1 2 3; do
  # Create a NIC
  az network nic create \
    --resource-group ${RESOURCE_GROUP} \
    --name talos-cp-${i}-nic \
    --vnet-name talos-vnet \
    --subnet controlplane-subnet \
    --lb-name talos-lb \
    --lb-address-pools talos-cp-pool \
    --public-ip-address ""

  # Create the VM
  az vm create \
    --resource-group ${RESOURCE_GROUP} \
    --name talos-cp-${i} \
    --image talos-v1.7.0 \
    --size Standard_D4s_v3 \
    --nics talos-cp-${i}-nic \
    --custom-data _out/controlplane.yaml \
    --admin-username talos \
    --generate-ssh-keys \
    --no-wait
done
```

## Launching Worker Nodes

Create worker nodes:

```bash
# Create worker VMs
for i in 1 2 3; do
  az network nic create \
    --resource-group ${RESOURCE_GROUP} \
    --name talos-worker-${i}-nic \
    --vnet-name talos-vnet \
    --subnet worker-subnet

  az vm create \
    --resource-group ${RESOURCE_GROUP} \
    --name talos-worker-${i} \
    --image talos-v1.7.0 \
    --size Standard_D4s_v3 \
    --nics talos-worker-${i}-nic \
    --custom-data _out/worker.yaml \
    --admin-username talos \
    --generate-ssh-keys \
    --no-wait
done
```

## Bootstrapping the Cluster

Once the VMs are running, bootstrap the Kubernetes cluster:

```bash
# Get the private IP of the first control plane node
CP1_IP=$(az vm show \
  --resource-group ${RESOURCE_GROUP} \
  --name talos-cp-1 \
  --show-details \
  --query 'privateIps' --output tsv)

# Set up talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${LB_IP}
talosctl config node ${CP1_IP}

# Bootstrap the cluster
talosctl bootstrap --nodes ${CP1_IP}

# Wait for the cluster to be healthy
talosctl health --wait-timeout 10m

# Get the kubeconfig
talosctl kubeconfig

# Verify the cluster is running
kubectl get nodes -o wide
kubectl get pods -A
```

## Post-Installation Configuration

After the cluster is running, install the Azure cloud provider for native integration:

```bash
# Install the Azure disk CSI driver for persistent volumes
helm repo add azuredisk-csi-driver https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts
helm install azuredisk-csi-driver azuredisk-csi-driver/azuredisk-csi-driver \
  --namespace kube-system

# Install a CNI (Cilium example)
cilium install --helm-set ipam.mode=kubernetes
```

Create a storage class for Azure managed disks:

```yaml
# azure-storageclass.yaml
# Storage class for Azure managed disks
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
# Apply the storage class
kubectl apply -f azure-storageclass.yaml
```

## Cleaning Up

If you need to tear down the cluster:

```bash
# Delete the entire resource group and all resources in it
az group delete --name ${RESOURCE_GROUP} --yes --no-wait
```

## Conclusion

Deploying Talos Linux on Azure follows a predictable pattern: set up networking, create a load balancer, launch VMs with the Talos image, and bootstrap the cluster. The Azure CLI makes this process scriptable and repeatable. For production deployments, consider using Terraform or Pulumi to manage the infrastructure as code, and add Azure-specific integrations like the disk CSI driver and cloud controller manager for a fully integrated experience.
