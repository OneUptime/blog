# How to Use Rancher with Azure Marketplace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Azure, Marketplace

Description: Deploy and manage Rancher through Azure Marketplace on AKS, including Marketplace subscription activation, AKS deployment, and Azure billing integration.

## Introduction

Azure Marketplace offers SUSE Rancher as a marketplace offering, enabling deployment on Azure Kubernetes Service (AKS) with integrated billing through your Azure subscription. This guide walks through subscribing, deploying, and operating Rancher on AKS via Azure Marketplace.

## Prerequisites

- An Azure subscription with Owner or Contributor access
- Microsoft Entra ID permissions to register applications and grant admin consent if you plan to enable Azure AD authentication
- `az`, `kubectl`, and `helm` CLIs installed
- A domain name for Rancher hostname with DNS access

## Step 1: Subscribe via Azure Marketplace

1. Navigate to [Azure Marketplace → SUSE Rancher Prime](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/suse.rancher-prime-llc?tab=Overview).
2. Review the available plan and click **Get It Now**.
3. Continue to the Azure portal to complete the marketplace subscription flow.
4. Click **Create** to proceed to deployment.

## Step 2: Create an AKS Cluster for Rancher

```bash
# Set variables

RESOURCE_GROUP="rancher-management-rg"
CLUSTER_NAME="rancher-aks"
LOCATION="eastus"

# Create a resource group
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}"

# Review supported Kubernetes versions for this region if you want to pin one
az aks get-versions \
  --location "${LOCATION}" \
  --output table

# Create the AKS cluster
az aks create \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${CLUSTER_NAME}" \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-managed-identity \
  --generate-ssh-keys

# Get AKS credentials
az aks get-credentials \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${CLUSTER_NAME}" \
  --overwrite-existing

kubectl get nodes
```

## Step 3: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io --force-update
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

kubectl rollout status deployment/cert-manager -n cert-manager
kubectl rollout status deployment/cert-manager-webhook -n cert-manager
```

## Step 4: Deploy Rancher from Azure Marketplace

The Azure Marketplace offer deploys the Rancher control plane into AKS. If you need a manual Helm-based installation on AKS instead, install an ingress controller first and then install Rancher:

```bash
# Install an ingress controller for AKS
helm repo add traefik https://traefik.github.io/charts
helm repo update

helm upgrade --install \
  traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --version 39.0.0 \
  --set service.type=LoadBalancer \
  --set ping.enabled=true \
  --set service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/ping

# Add Rancher Helm repo
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Install Rancher
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set ingress.ingressClassName=traefik \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.ingress.class=traefik \
  --set letsEncrypt.email=admin@example.com \
  --set replicas=3

kubectl rollout status deployment/rancher -n cattle-system --timeout=10m
```

## Step 5: Configure an Azure DNS Zone

```bash
# Create an Azure DNS zone (if not existing)
az network dns zone create \
  --resource-group "${RESOURCE_GROUP}" \
  --name example.com

# Get the Rancher ingress IP
RANCHER_IP=$(kubectl get service -n traefik traefik \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Create DNS A record
az network dns record-set a add-record \
  --resource-group "${RESOURCE_GROUP}" \
  --zone-name example.com \
  --record-set-name rancher \
  --ipv4-address "${RANCHER_IP}"
```

## Step 6: Enable Azure AD Integration

Rancher supports Microsoft Entra ID (Azure AD) as an identity provider:

```bash
# Create an Azure AD App Registration for Rancher
APP_NAME="Rancher-OIDC"
RANCHER_URL="https://rancher.example.com"

APP_ID=$(az ad app create \
  --display-name "${APP_NAME}" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "${RANCHER_URL}/verify-auth-azure" \
  --query appId -o tsv)

# Grant Microsoft Graph application permission required by Rancher
az ad app permission add \
  --id "${APP_ID}" \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions 7ab1d382-f21e-4acd-a863-ba3e13f7da61=Role

az ad app permission admin-consent \
  --id "${APP_ID}"

# Create a client secret
APP_SECRET=$(az ad app credential reset \
  --id "${APP_ID}" \
  --append \
  --query password -o tsv)

echo "Application ID: ${APP_ID}"
echo "Application Secret: ${APP_SECRET}"
echo "Tenant ID: $(az account show --query tenantId -o tsv)"
```

In Rancher UI:
1. Navigate to **☰ → Users & Authentication → Auth Provider → AzureAD**.
2. Enter the Application ID, Secret, and Tenant ID.
3. Click **Enable**.

## Step 7: Configure AKS Auto-Scaling

```bash
# Enable cluster autoscaler
az aks update \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${CLUSTER_NAME}" \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10

# Update the node pool
az aks nodepool update \
  --resource-group "${RESOURCE_GROUP}" \
  --cluster-name "${CLUSTER_NAME}" \
  --name nodepool1 \
  --update-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

## Step 8: Monitor Azure Marketplace Billing

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
STORAGE_ACCOUNT_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/<storage-rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>"

# Export month-to-date usage data to Azure Storage
az costmanagement export create \
  --name RancherUsageExport \
  --type Usage \
  --scope "subscriptions/${SUBSCRIPTION_ID}" \
  --storage-account-id "${STORAGE_ACCOUNT_ID}" \
  --storage-container exports \
  --storage-directory rancher \
  --timeframe MonthToDate \
  --dataset-configuration columns="Date" columns="ProductName" columns="PublisherName" columns="PreTaxCost"

# Check the export status and recent runs
az costmanagement export show \
  --name RancherUsageExport \
  --scope "subscriptions/${SUBSCRIPTION_ID}"
```

## Conclusion

Azure Marketplace deployment of Rancher simplifies procurement and consolidates billing within your Azure subscription. Running Rancher on AKS ensures a Microsoft-managed Kubernetes control plane, while Rancher provides multi-cluster management across all your Azure and non-Azure clusters. Azure AD integration provides seamless SSO for your team, and Azure Cost Management gives visibility into platform costs.
