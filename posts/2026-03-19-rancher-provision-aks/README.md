# How to Provision an AKS Cluster from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AKS, Cluster Management

Description: Learn how to provision an Azure Kubernetes Service cluster directly from the Rancher management interface.

Rancher can provision AKS clusters in your Azure subscription, giving you Azure's managed Kubernetes with Rancher's multi-cluster management on top. This guide walks you through the entire process from Azure credentials to a running AKS cluster managed by Rancher.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- An Azure subscription
- An Azure service principal with appropriate permissions
- Azure CLI (`az`) installed for initial setup

## Step 1: Create an Azure Service Principal

Create a service principal with the permissions Rancher needs:

```bash
az login

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name rancher-aks-provisioner \
  --role "Contributor" \
  --scopes /subscriptions/$SUBSCRIPTION_ID
```

Output:

```json
{
  "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "displayName": "rancher-aks-provisioner",
  "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

For more granular permissions, Rancher documents a custom `Rancher AKSv2` role scoped to the target resource group. The subscription-wide `Contributor` assignment above is the simplest supported option.

## Step 2: Create a Cloud Credential in Rancher

1. Log in to the Rancher UI
2. Go to **Cluster Management > Cloud Credentials**
3. Click **Create**
4. Select **Azure**
5. Enter:
   - **Subscription ID**: Your Azure subscription ID
   - **Client ID**: The `appId` value
   - **Client Secret**: The `password` value
   - **Tenant ID**: The `tenant` value
6. Name the credential and click **Create**

## Step 3: Start AKS Provisioning

1. Go to **Cluster Management**
2. Click **Create**
3. Select **Azure AKS** under hosted Kubernetes providers

## Step 4: Configure the AKS Cluster

### Basic Settings

- **Cluster Name**: Enter a name (e.g., `production-aks`)
- **Cloud Credential**: Select your Azure credential
- **Resource Group**: Select an existing resource group or create a new one
- **Region**: Choose an Azure region (e.g., `eastus`)

### Kubernetes Version

Select the AKS Kubernetes version from the available options.

### Networking

#### Network Plugin

- **Azure CNI** (recommended): Assigns VNet IPs directly to pods
- **Kubenet**: Uses NAT for pod networking, fewer IPs required, but AKS retires kubenet on March 31, 2028

#### Network Configuration (Azure CNI)

```plaintext
Virtual Network: Select existing or create new
Subnet: Select a subnet with sufficient IP space
Service CIDR: 10.0.0.0/16
DNS Service IP: 10.0.0.10
Pod CIDR: (auto-assigned with Azure CNI)
```

#### Network Policy

Select a network policy provider:

- **Azure**: Azure-native network policies (requires Azure CNI)
- **Calico**: Calico network policies
- **None**: No network policies

### API Server Access

Configure authorized IP ranges for the API server:

```plaintext
Authorized IP Ranges: 203.0.113.0/24, <RANCHER_IP>/32
```

### Private Cluster

Enable for a private AKS cluster where the API server has no public endpoint:

- **Private Cluster**: Enable
- **Private DNS Zone**: System or none

### Role-Based Access Control

Rancher requires Kubernetes RBAC for AKS clusters:

- **RBAC**: Enabled by default and required for Rancher-managed AKS clusters
- **Local Accounts**: Leave enabled so Rancher can register or import the cluster

## Step 5: Configure Node Pools

### System Node Pool

The system node pool runs essential cluster components:

- **Name**: `system`
- **VM Size**: `Standard_D4s_v3` (4 vCPUs, 16 GB)
- **Node Count**: 3
- **OS Disk Size**: 128 GB
- **OS Disk Type**: Managed SSD
- **Mode**: System

### User Node Pool

Add a user node pool for application workloads:

- **Name**: `userpool`
- **VM Size**: `Standard_D8s_v3` (8 vCPUs, 32 GB)
- **Node Count**: 3
- **Min Count** (autoscaling): 2
- **Max Count** (autoscaling): 10
- **Mode**: User

### Availability Zones

Select availability zones for node distribution:

```plaintext
Zones: 1, 2, 3
```

### Node Labels and Taints

Add labels:

```plaintext
environment: production
workload-type: general
```

Add taints for specialized pools:

```plaintext
dedicated=high-memory:NoSchedule
```

## Step 6: Configure Additional Settings

### Tags

Add Azure resource tags:

```plaintext
team: platform
cost-center: engineering
managed-by: rancher
```

### Monitoring

Enable Azure Monitor for containers:

```plaintext
Container Insights: Enabled
Log Analytics Workspace: Select or create
```

## Step 7: Create the Cluster

Review settings and click **Create**. Rancher provisions the AKS cluster, which includes:

1. Creating the AKS cluster resource in Azure
2. Provisioning the node pools
3. Deploying Rancher agents
4. Registering the cluster

Provisioning takes approximately 10 to 15 minutes.

## Step 8: Verify the Cluster

Once Active and your kubeconfig is configured:

```bash
kubectl get nodes -o wide
kubectl get pods -n kube-system
```

Check in Rancher:

- Node pools display correctly
- System pods are healthy
- Cluster dashboard shows metrics

Verify from Azure CLI:

```bash
az aks show --resource-group <RESOURCE_GROUP> --name <CLUSTER_NAME> --query provisioningState
```

## Step 9: Post-Provisioning

### Install Rancher Monitoring

Go to **Apps** and install the **Monitoring** chart for Rancher-specific dashboards.

### Configure Storage

AKS provides Azure Disk and Azure File storage classes by default:

```bash
kubectl get storageclasses
```

On AKS, the built-in `managed-csi` class is already the default, and AKS can overwrite changes to built-in storage class defaults.

### Set Up RBAC

Configure Rancher RBAC after provisioning:

1. Add cluster members in Rancher
2. Configure project-level access
3. Map external identity provider groups to Rancher roles if Rancher is integrated with one

## Troubleshooting

- **Quota exceeded**: Check Azure subscription quotas for the selected region and VM sizes.
- **Network conflicts**: Ensure CIDR ranges do not overlap with existing networks.
- **Service principal issues**: Verify the service principal has not expired and has the correct role assignments.
- **Provisioning timeout**: Check the Azure Activity Log for error details.

## Conclusion

Provisioning AKS clusters from Rancher combines Azure's managed Kubernetes infrastructure with Rancher's multi-cluster management capabilities. Configure your cluster settings, node pools, and networking through the Rancher UI, and Rancher handles the provisioning in your Azure subscription. The result is an AKS cluster that you can manage alongside all your other Kubernetes clusters from a single interface.
