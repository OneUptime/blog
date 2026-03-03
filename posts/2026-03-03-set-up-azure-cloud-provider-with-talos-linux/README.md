# How to Set Up Azure Cloud Provider with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Azure, Cloud Provider, Kubernetes, Infrastructure

Description: Complete guide to integrating the Azure cloud provider with Talos Linux for native Azure resource management in Kubernetes.

---

Azure is a popular choice for running Kubernetes in the enterprise, and Talos Linux gives you an immutable, API-driven operating system that simplifies cluster management. To take full advantage of Azure's native features like managed load balancers, Azure Disk provisioning, and node metadata, you need the Azure cloud provider configured correctly. This guide walks through every step of the setup process.

## What the Azure Cloud Provider Does

The Azure cloud provider integration connects your Kubernetes cluster to Azure Resource Manager APIs. When enabled, it handles several things automatically. Nodes get labeled with Azure-specific metadata like region, zone, and VM size. Services of type LoadBalancer get backed by Azure Load Balancers. Persistent volumes can be provisioned on Azure Managed Disks. Route tables get updated so pods on different nodes can communicate.

Without the cloud provider, your cluster runs in a bubble. It works, but you lose all the automation that makes cloud-native Kubernetes convenient.

## Prerequisites

Before starting, make sure you have:

- An Azure subscription with Contributor access
- A resource group for your cluster resources
- A virtual network and subnet configured
- `talosctl` and `kubectl` installed
- The Azure CLI (`az`) installed and authenticated
- A service principal or managed identity for the cloud provider

## Creating the Service Principal

The Azure cloud provider needs credentials to interact with Azure APIs. Create a service principal with Contributor access to your resource group:

```bash
# Create a service principal for the cloud provider
az ad sp create-for-rbac \
  --name "talos-cloud-provider" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group>
```

Save the output. You will need the `appId`, `password`, and `tenant` values for the cloud provider configuration.

## Preparing the Azure Cloud Config

The Azure cloud provider reads its configuration from a JSON file. Create this configuration:

```json
{
  "cloud": "AzurePublicCloud",
  "tenantId": "<tenant-id>",
  "subscriptionId": "<subscription-id>",
  "aadClientId": "<service-principal-app-id>",
  "aadClientSecret": "<service-principal-password>",
  "resourceGroup": "<resource-group>",
  "location": "<region>",
  "subnetName": "<subnet-name>",
  "securityGroupName": "<nsg-name>",
  "securityGroupResourceGroup": "<resource-group>",
  "vnetName": "<vnet-name>",
  "vnetResourceGroup": "<resource-group>",
  "routeTableName": "<route-table-name>",
  "routeTableResourceGroup": "<resource-group>",
  "cloudProviderBackoff": true,
  "cloudProviderBackoffRetries": 6,
  "cloudProviderBackoffDuration": 5,
  "cloudProviderRateLimit": true,
  "cloudProviderRateLimitQPS": 10,
  "cloudProviderRateLimitBucket": 100,
  "useManagedIdentityExtension": false,
  "useInstanceMetadata": true,
  "loadBalancerSku": "Standard"
}
```

## Configuring Talos Machine Config

Talos needs to be told to use the external cloud provider. Generate your config with the right patches:

```bash
# Generate Talos config with Azure cloud provider settings
talosctl gen config my-cluster https://my-cluster-endpoint:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {
      "enabled": true,
      "manifests": [
        "https://raw.githubusercontent.com/kubernetes-sigs/cloud-provider-azure/master/helm/cloud-provider-azure/templates/cloud-provider-azure.yaml"
      ]
    }}
  ]'
```

You also need to make the Azure cloud config available to the cloud controller manager. Store it as a Kubernetes secret:

```bash
# Create the secret containing the Azure cloud config
kubectl create secret generic azure-cloud-provider \
  --namespace kube-system \
  --from-file=cloud-config=azure-cloud-config.json
```

## Deploying the Azure Cloud Controller Manager

The recommended approach is to deploy the Azure cloud controller manager using Helm:

```bash
# Add the Azure cloud provider Helm repository
helm repo add cloud-provider-azure https://raw.githubusercontent.com/kubernetes-sigs/cloud-provider-azure/master/helm/repo
helm repo update

# Install the cloud controller manager
helm install cloud-provider-azure cloud-provider-azure/cloud-provider-azure \
  --namespace kube-system \
  --set infra.clusterName=my-cluster \
  --set cloudControllerManager.clusterCIDR="10.244.0.0/16" \
  --set cloudControllerManager.cloudConfig=/etc/kubernetes/azure.json \
  --set cloudControllerManager.cloudConfigSecretName=azure-cloud-provider
```

## Networking Setup

Azure requires a route table for pod-to-pod communication across nodes. The cloud provider manages routes automatically, but you need to create the route table and associate it with your subnet:

```bash
# Create the route table
az network route-table create \
  --resource-group <resource-group> \
  --name talos-route-table \
  --location <region>

# Associate the route table with the subnet
az network vnet subnet update \
  --resource-group <resource-group> \
  --vnet-name <vnet-name> \
  --name <subnet-name> \
  --route-table talos-route-table
```

The cloud controller manager will add routes to this table as nodes join the cluster, allowing pods on different nodes to reach each other.

## Verifying the Setup

After everything is deployed, verify the cloud provider is working:

```bash
# Check cloud controller manager pods
kubectl get pods -n kube-system -l component=cloud-controller-manager

# Verify nodes have Azure labels
kubectl get nodes --show-labels | grep topology.kubernetes.io

# Check node providerID is set
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.providerID}{"\n"}{end}'
```

Each node should have a `providerID` starting with `azure://` and labels indicating the Azure region and zone.

## Testing Load Balancer Provisioning

Create a test service to verify that Azure Load Balancers get provisioned automatically:

```yaml
# test-lb.yaml
apiVersion: v1
kind: Service
metadata:
  name: test-lb
  annotations:
    # Use a Standard Load Balancer
    service.beta.kubernetes.io/azure-load-balancer-sku: Standard
spec:
  type: LoadBalancer
  selector:
    app: test
  ports:
    - port: 80
      targetPort: 8080
```

```bash
# Apply and watch for the external IP
kubectl apply -f test-lb.yaml
kubectl get svc test-lb --watch
```

Within a few minutes, the service should get an external IP from Azure.

## Internal Load Balancers

For services that should only be accessible within your VNet, use the internal load balancer annotation:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

## Network Security Groups

The cloud provider can manage NSG rules automatically. When you create a LoadBalancer service, it adds rules to allow traffic on the specified ports. Make sure the NSG associated with your subnet is the one referenced in the cloud config.

## Troubleshooting

Common issues and how to resolve them:

```bash
# Check cloud controller manager logs
kubectl logs -n kube-system -l component=cloud-controller-manager --tail=100

# Verify the cloud config secret exists
kubectl get secret -n kube-system azure-cloud-provider

# Check for RBAC issues
kubectl get clusterrolebinding | grep cloud
```

If nodes are stuck in NotReady state, verify that the service principal has the correct permissions and that the cloud config values match your actual Azure resource names. Typos in resource group names or VNet names are a frequent source of problems.

## Managed Identity Alternative

Instead of a service principal, you can use Azure Managed Identity. This eliminates the need to manage client secrets:

```json
{
  "useManagedIdentityExtension": true,
  "userAssignedIdentityID": "<managed-identity-client-id>"
}
```

Assign the Contributor role to the managed identity on the resource group level.

## Conclusion

Setting up the Azure cloud provider with Talos Linux involves creating a service principal, configuring the cloud config, and deploying the cloud controller manager. Once running, you get automatic load balancer provisioning, node metadata labeling, and route management. The initial setup has more moving parts than AWS, but the end result is a fully integrated Kubernetes cluster that leverages Azure's native capabilities.
