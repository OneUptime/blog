# How to Install Dapr on Azure Kubernetes Service (AKS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AKS, Azure, Kubernetes, Installation

Description: Install and configure Dapr on Azure Kubernetes Service using the Dapr CLI or Helm, with tips for AKS-specific networking and RBAC settings.

---

## Prerequisites

```bash
# Install Azure CLI and log in
az login

# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Create an AKS Cluster

```bash
az group create --name dapr-rg --location eastus

az aks create \
  --resource-group dapr-rg \
  --name dapr-aks \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-managed-identity \
  --network-plugin azure \
  --generate-ssh-keys

az aks get-credentials --resource-group dapr-rg --name dapr-aks
```

## Install Dapr with Helm on AKS

For production AKS clusters, use Helm for better control over configuration:

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

kubectl create namespace dapr-system

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --wait
```

## Verify Installation

```bash
dapr status -k

kubectl get pods -n dapr-system
# All pods should show READY 1/1 or 2/2 (for HA)
```

## Configure Azure Key Vault Secret Store

AKS clusters with managed identity can use Azure Key Vault directly:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
  namespace: default
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-keyvault"
  - name: azureClientId
    value: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

```bash
kubectl apply -f azurekeyvault-component.yaml
```

## Configure Workload Identity for Dapr

Enable AKS OIDC issuer and workload identity for secure Dapr component auth:

```bash
az aks update \
  --resource-group dapr-rg \
  --name dapr-aks \
  --enable-oidc-issuer \
  --enable-workload-identity
```

## Enable Dapr Metrics in Azure Monitor

```bash
az aks enable-addons \
  --addons monitoring \
  --name dapr-aks \
  --resource-group dapr-rg \
  --workspace-resource-id /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.OperationalInsights/workspaces/<workspace-name>
```

## Summary

Installing Dapr on AKS is straightforward with Helm and supports high-availability mode for production workloads. Leverage AKS workload identity and Azure Key Vault integration for secure, certificate-free authentication to Dapr components. Enable HA mode to ensure the Dapr control plane survives node failures.
