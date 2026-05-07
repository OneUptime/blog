# How to Import an AKS Cluster into Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AKS, Cluster Management

Description: A step-by-step guide to importing an existing Azure Kubernetes Service cluster into Rancher for centralized management.

Azure Kubernetes Service (AKS) is Microsoft's managed Kubernetes offering. Importing your AKS clusters into Rancher lets you manage them alongside clusters from other providers through a single interface. This guide covers the complete process of importing an existing AKS cluster into Rancher.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- An existing AKS cluster in Azure
- Local accounts enabled on the AKS cluster
- Azure CLI (`az`) installed and configured
- `kubectl` installed
- `cluster-admin` access in the AKS cluster
- An Azure service principal with appropriate permissions if you want Rancher to import the cluster as an AKS cluster type
- Network connectivity from the AKS cluster to the Rancher server

## Step 1: Configure kubectl for the AKS Cluster

Log in to Azure and get the cluster credentials:

```bash
az login

az aks get-credentials \
  --resource-group <RESOURCE_GROUP> \
  --name <AKS_CLUSTER_NAME>
```

Verify access:

```bash
kubectl get nodes
kubectl cluster-info
```

## Step 2: Create an Azure Service Principal (AKS-Type Import Only)

If you want Rancher to import and manage the cluster as an AKS cluster type, Rancher needs Azure credentials to manage the cluster. Create a service principal:

```bash
az ad sp create-for-rbac \
  --name rancher-aks-import \
  --role "Contributor" \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>
```

This outputs:

```json
{
  "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "displayName": "rancher-aks-import",
  "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

Save these values. You will also need your Azure Subscription ID:

```bash
az account show --query id -o tsv
```

## Step 3: Create a Cloud Credential in Rancher (AKS-Type Import Only)

1. Log in to the Rancher UI
2. Navigate to **Cluster Management > Cloud Credentials**
3. Click **Create**
4. Select **Azure**
5. Fill in:
   - **Subscription ID**: Your Azure subscription ID
   - **Client ID**: The `appId` from the service principal
   - **Client Secret**: The `password` from the service principal
   - **Tenant ID**: Your Azure tenant ID
6. Name the credential (e.g., `azure-production`)
7. Click **Create**

## Step 4: Import the AKS Cluster

### Option A: Import as an AKS Cluster (Recommended)

1. Go to **Cluster Management**
2. Click **Import Existing**
3. Select **Azure AKS**
4. Select your Azure cloud credential
5. Choose the resource group containing your AKS cluster
6. Rancher lists available AKS clusters; if your cluster does not appear immediately, wait and refresh because existing AKS clusters can take some time to show up
7. Select your cluster and click **Register**

### Option B: Import as a Generic Cluster

For a simpler import without AKS-specific management:

1. Go to **Cluster Management**
2. Click **Import Existing**
3. Select **Generic**
4. Name the cluster
5. Copy the kubectl command

Apply on the AKS cluster:

```bash
kubectl apply -f https://rancher.yourdomain.com/v3/import/<token>.yaml
```

## Step 5: Monitor the Import

Watch the agent deployment:

```bash
kubectl get pods -n cattle-system -w
kubectl get pods -n cattle-fleet-system -w
```

The cluster status in Rancher should progress to `Active`.

## Step 6: Verify the Import

Check that the cluster is properly imported:

```bash
# Agent health

kubectl get deployments -n cattle-system

# Node visibility
kubectl get nodes -o wide
```

In the Rancher UI:

- Verify the cluster dashboard displays correct information
- If you used AKS-type import, verify the node pool configuration and node counts
- Verify the Kubernetes version matches
- Test kubectl access through the Rancher UI shell

## Step 7: Configure AKS-Specific Features

When imported as an AKS cluster type, Rancher provides enhanced management:

### Node Pool Visibility

View AKS node pools and their configurations:

1. Navigate to the cluster
2. Open **Edit Config**
3. Review node pool details including VM size, node count, and autoscaling settings

### Azure Integration

With AKS-type import, Rancher can display:

- Azure resource group information
- Network profile details such as the network plugin and load balancer settings
- Node pool scaling and autoscaling settings

## Step 8: Set Up RBAC and Projects

Configure access control:

1. Navigate to the cluster in Rancher
2. Go to **Cluster Members**
3. Add users or groups with appropriate roles
4. Create projects and assign namespaces

If your AKS cluster uses Microsoft Entra ID integration, make sure local accounts are enabled before importing it into Rancher.

## Step 9: Install Monitoring

Deploy the Rancher monitoring stack:

1. Go to **Cluster Tools** or **Apps > Charts** in the cluster
2. Install the **Monitoring** chart
3. Configure resource limits appropriate for your cluster size

```yaml
# Example monitoring values
prometheus:
  prometheusSpec:
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    retention: 7d
```

## Networking Considerations

### Network Security Groups

Ensure the AKS nodes can reach the Rancher server. Check the network security group (NSG) rules:

```bash
# List NSGs associated with the AKS cluster
az network nsg list --resource-group <MC_RESOURCE_GROUP> -o table
```

Outbound HTTPS (port 443) to the Rancher server must be allowed.

### Private AKS Clusters

For private AKS clusters:

1. The Rancher agents inside the cluster need outbound connectivity to the Rancher server
2. Set up Azure Private Link, VPN Gateway, or ExpressRoute if Rancher is outside the Azure network
3. Configure a NAT Gateway for outbound internet access if Rancher is hosted externally

### Azure CNI vs Kubenet

Rancher agents work with both Azure CNI and kubenet networking plugins. No additional configuration is needed for either.

## Troubleshooting

- **Authentication errors**: Verify the service principal credentials and role assignments. Check that the service principal has not expired.
- **Agent pods failing**: Check pod logs with `kubectl logs -l app=cattle-cluster-agent -n cattle-system`. Verify DNS resolution and outbound network connectivity.
- **AKS API errors**: Ensure the service principal has the `Contributor` role on the resource group or subscription.
- **Cluster stuck in Pending**: Check the Rancher server logs for error messages. Verify the cloud credential is valid.

## Conclusion

Importing AKS clusters into Rancher provides a unified management experience for your Azure Kubernetes infrastructure. The AKS-specific import gives you visibility into node pools, Azure networking, and cloud-specific configurations. Combined with Rancher's RBAC, monitoring, and multi-cluster management, you get a comprehensive platform for managing Kubernetes across Azure and any other environment.
