# How to Install Rancher on Azure Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Azure, Cloud, Installation

Description: Learn how to deploy Rancher on an Azure Virtual Machine using K3s and Helm for centralized Kubernetes management.

Microsoft Azure provides a robust cloud platform for running Kubernetes workloads. Installing Rancher on an Azure Virtual Machine gives you a central control plane to manage multiple Kubernetes clusters across any infrastructure. This guide walks you through the complete setup process from creating Azure resources to accessing the Rancher dashboard.

## Prerequisites

- An Azure account with an active subscription
- Azure CLI installed and configured (`az login` completed)
- A DNS hostname that resolves to the VM public IP (for testing, a name such as `<public-ip>.sslip.io` also works)
- SSH key pair for VM access

## Step 1: Create a Resource Group

Start by creating a resource group to contain all Rancher-related resources:

```bash
az group create \
  --name rancher-rg \
  --location eastus
```

## Step 2: Create a Network Security Group

Create a network security group with the required access rules for this setup:

```bash
az network nsg create \
  --resource-group rancher-rg \
  --name rancher-nsg

az network nsg rule create \
  --resource-group rancher-rg \
  --nsg-name rancher-nsg \
  --name allow-ssh \
  --priority 100 \
  --destination-port-ranges 22 \
  --protocol Tcp

az network nsg rule create \
  --resource-group rancher-rg \
  --nsg-name rancher-nsg \
  --name allow-http \
  --priority 200 \
  --destination-port-ranges 80 \
  --protocol Tcp

az network nsg rule create \
  --resource-group rancher-rg \
  --nsg-name rancher-nsg \
  --name allow-https \
  --priority 300 \
  --destination-port-ranges 443 \
  --protocol Tcp
```

## Step 3: Create the Virtual Machine

Create an Ubuntu VM with sufficient resources:

```bash
az vm create \
  --resource-group rancher-rg \
  --name rancher-server \
  --image Ubuntu2204 \
  --size Standard_B2ms \
  --admin-username azureuser \
  --generate-ssh-keys \
  --nsg rancher-nsg \
  --os-disk-size-gb 50 \
  --public-ip-sku Standard
```

Note the public IP address from the output. You will need it later.

## Step 4: SSH into the VM

```bash
ssh azureuser@<public-ip>
```

## Step 5: Install K3s

Install the lightweight K3s Kubernetes distribution:

```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
```

Verify the installation:

```bash
sudo k3s kubectl get nodes
```

Configure the kubeconfig:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## Step 6: Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Step 7: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Confirm all cert-manager pods are running:

```bash
kubectl get pods -n cert-manager
```

## Step 8: Install Rancher

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

kubectl create namespace cattle-system

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set replicas=1
```

Replace `rancher.example.com` with a hostname that resolves to the VM public IP. For a proof-of-concept, you can use `<public-ip>.sslip.io`.

## Step 9: Configure DNS

Create a DNS A record pointing your domain to the VM public IP. If you are using Azure DNS:

```bash
az network dns record-set a add-record \
  --resource-group rancher-rg \
  --zone-name example.com \
  --record-set-name rancher \
  --ipv4-address <public-ip>
```

## Step 10: Verify and Access Rancher

Check the deployment status:

```bash
kubectl -n cattle-system rollout status deploy/rancher
kubectl -n cattle-system get pods
```

Open `https://rancher.example.com` in your browser. If you use Rancher's default certificate configuration, your browser will warn because the certificate is self-signed. Log in with the bootstrap password and configure your admin credentials.

## Using the Azure Node Driver

Once Rancher is running, you can use Rancher to provision RKE2 or K3s clusters on Azure Virtual Machines. In the Rancher UI, navigate to Cluster Management and select Create. Toggle to RKE2/K3s, choose Azure, create or select your Azure cloud credentials, and define machine pools. Rancher will create Azure VMs and install Kubernetes on them automatically.

## Cleanup

If you need to tear down the environment:

```bash
az group delete --name rancher-rg --yes --no-wait
```

This removes all resources in the resource group including the VM, disks, network interfaces, and public IP.

## Summary

You have deployed Rancher on an Azure Virtual Machine with K3s as the underlying Kubernetes distribution. This setup provides a central management interface for your Kubernetes infrastructure. You can now create new clusters on Azure or import existing clusters from any cloud provider into Rancher for unified management.
