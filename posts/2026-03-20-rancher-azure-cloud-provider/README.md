# How to Configure Azure Cloud Provider in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Azure, Cloud Provider

Description: Configure the Azure cloud provider in Rancher-managed clusters to enable Azure Load Balancers, Azure Disks, and Azure Files integration.

## Introduction

The out-of-tree Azure cloud provider lets your Rancher-managed Kubernetes clusters provision Azure Load Balancers for Services. To use Azure Managed Disks or Azure Files for PersistentVolumes, install the corresponding Azure CSI driver. This guide covers configuring the out-of-tree Azure cloud provider and Azure Disk CSI driver for RKE2 clusters deployed on Azure VMs. On Kubernetes 1.30 and later, Azure must be configured as an out-of-tree cloud provider.

## Prerequisites

- Rancher managing an RKE2 cluster on Azure VMs
- An Azure Service Principal with Contributor rights to the resource group
- All VMs in the same resource group and availability set (or VMSS)

## Step 1: Create an Azure Service Principal

```bash
# Log in to Azure CLI

az login

# Create a service principal with Contributor role on the resource group
az ad sp create-for-rbac \
  --name "rancher-cloud-provider" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group>

# Output (save these values):
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",         ← client-id
#   "displayName": "rancher-cloud-provider",
#   "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",   ← client-secret
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"         ← tenant-id
# }
```

## Step 2: Create the cloud-config.json

```json
{
  "cloud": "AzurePublicCloud",
  "tenantId": "<tenant-id>",
  "subscriptionId": "<subscription-id>",
  "aadClientId": "<service-principal-app-id>",
  "aadClientSecret": "<service-principal-password>",
  "resourceGroup": "<resource-group-name>",
  "location": "eastus",
  "subnetName": "<subnet-name>",
  "securityGroupName": "<nsg-name>",
  "securityGroupResourceGroup": "<nsg-resource-group>",
  "vnetName": "<vnet-name>",
  "vnetResourceGroup": "<vnet-resource-group>",
  "primaryAvailabilitySetName": "<availability-set-name>",
  "routeTableResourceGroup": "<route-table-resource-group>",
  "cloudProviderBackoff": true,
  "cloudProviderBackoffRetries": 6,
  "cloudProviderBackoffDuration": 5,
  "cloudProviderRateLimit": true,
  "cloudProviderRateLimitQPS": 6,
  "cloudProviderRateLimitBucket": 20,
  "useManagedIdentityExtension": false,
  "useInstanceMetadata": true,
  "loadBalancerSku": "standard"
}
```

If your nodes run in a VMSS, use `primaryScaleSetName` instead of `primaryAvailabilitySetName`. Save this locally as `azure-cloud-config.json`; you'll use it to create a Kubernetes Secret in Step 5.

## Step 3: Configure RKE2 Nodes

```yaml
# /etc/rancher/rke2/config.yaml (if you are configuring RKE2 directly)
cloud-provider-name: external
```

For Rancher-managed clusters, selecting `External` in Rancher applies the equivalent setting.

## Step 4: Configure via Rancher UI

1. Navigate to **Cluster Management** → select the cluster → **⋮ → Edit Config**.
2. Under **Cloud Provider**, select **External**.
3. Under **Advanced**, add `--configure-cloud-routes=false` under **Additional Controller Manager Args**.
4. Click **Save**. The Azure cloud configuration itself is supplied to the cloud controller manager as a Kubernetes Secret in the next step.

## Step 5: Install the Azure Cloud Controller Manager

```bash
# Add the Azure CCM Helm chart repo
helm repo add azure-cloud-controller-manager \
  https://raw.githubusercontent.com/kubernetes-sigs/cloud-provider-azure/master/helm/repo
helm repo update

# Create the cloud-config secret
kubectl create secret generic azure-cloud-config \
  --from-file=cloud-config=azure-cloud-config.json \
  -n kube-system
```

```yaml
# values.yaml
infra:
  clusterName: "<cluster-name>"
cloudControllerManager:
  cloudConfigSecretName: azure-cloud-config
  cloudConfig: null
  clusterCIDR: null
  enableDynamicReloading: 'true'
  configureCloudRoutes: 'false'
  allocateNodeCidrs: 'false'
  caCertDir: /etc/ssl
  enabled: true
  replicas: 1
  nodeSelector:
    node-role.kubernetes.io/control-plane: 'true'
  tolerations:
    - effect: NoSchedule
      key: node-role.kubernetes.io/master
    - effect: NoSchedule
      key: node-role.kubernetes.io/control-plane
      value: 'true'
    - effect: NoSchedule
      key: node.cloudprovider.kubernetes.io/uninitialized
      value: 'true'
```

```bash
# Install Azure CCM
helm upgrade --install cloud-provider-azure \
  azure-cloud-controller-manager/cloud-provider-azure \
  --namespace kube-system \
  --values values.yaml
```

## Step 6: Install the Azure Disk CSI Driver

```bash
# Install Azure Disk CSI Driver
helm repo add azuredisk-csi-driver \
  https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts
helm repo update azuredisk-csi-driver

helm install azuredisk-csi-driver azuredisk-csi-driver/azuredisk-csi-driver \
  --namespace kube-system \
  --set controller.cloudConfigSecretName=azure-cloud-config \
  --set controller.cloudConfigSecretNamespace=kube-system \
  --set controller.runOnControlPlane=true \
  --set node.cloudConfigSecretName=azure-cloud-config \
  --set node.cloudConfigSecretNamespace=kube-system
```

## Step 7: Create Azure StorageClasses

```yaml
# azure-disk-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-managed-disk
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS      # or Standard_LRS
  kind: Managed
  cachingMode: ReadOnly
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f azure-disk-storageclass.yaml
```

## Step 8: Verify the Integration

```bash
# Test LoadBalancer provisioning
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx \
  --type=LoadBalancer \
  --name=azure-lb-test

# Watch for the Azure Load Balancer IP
kubectl get service azure-lb-test -w
# EXTERNAL-IP should show an Azure public IP within 1-2 minutes

# Test PVC with Azure Managed Disk
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: azure-disk-test
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: azure-managed-disk
  resources:
    requests:
      storage: 10Gi
EOF

kubectl get pvc azure-disk-test -w
```

## Common Issues

| Issue | Resolution |
|---|---|
| `EXTERNAL-IP` stays `<pending>` | Check that the cluster is using the external cloud provider, the `azure-cloud-config` Secret exists, and the Azure CCM deployment is running |
| `PVC stuck in Pending` | Verify the StorageClass uses `disk.csi.azure.com` and that the Azure Disk CSI driver is running |
| `AuthorizationFailed` | Service Principal lacks Contributor role on the resource group |

## Conclusion

Configuring the out-of-tree Azure cloud provider in Rancher enables Kubernetes-native Azure resource management. With the Azure CCM and Disk CSI Driver installed, your clusters can dynamically provision Azure Load Balancers and Managed Disks without manual Azure portal intervention. Keep your Service Principal credentials secure by storing them in a Kubernetes Secret rather than embedding them in ConfigMaps.
