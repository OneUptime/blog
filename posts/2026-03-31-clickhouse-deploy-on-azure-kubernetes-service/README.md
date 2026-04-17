# How to Deploy ClickHouse on Azure Kubernetes Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Azure, AKS, Kubernetes, Deployment

Description: Deploy ClickHouse on Azure Kubernetes Service with dedicated node pools, managed disk storage classes, Workload Identity, and the ClickHouse Operator.

---

Azure Kubernetes Service (AKS) provides a managed Kubernetes environment with deep integration with Azure storage, identity, and networking services. This guide deploys a production ClickHouse cluster using the ClickHouse Operator on AKS.

## Creating a Dedicated Node Pool

```bash
az aks nodepool add \
  --resource-group clickhouse-rg \
  --cluster-name my-aks-cluster \
  --name clickhousepool \
  --node-count 3 \
  --node-vm-size Standard_E16s_v5 \
  --node-taints workload=clickhouse:NoSchedule \
  --labels workload=clickhouse \
  --node-osdisk-type Managed \
  --node-osdisk-size 100
```

## Installing the ClickHouse Operator

```bash
kubectl apply -f https://raw.githubusercontent.com/Altinity/clickhouse-operator/master/deploy/operator/clickhouse-operator-install-bundle.yaml
```

## Azure Managed Disk Storage Class

Create a storage class using Azure Premium SSD:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-premium-retain
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Deploying ClickHouse

```yaml
apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: clickhouse-aks
spec:
  configuration:
    clusters:
      - name: cluster1
        layout:
          shardsCount: 1
          replicasCount: 2
  templates:
    podTemplates:
      - name: clickhouse-pod
        spec:
          nodeSelector:
            workload: clickhouse
          tolerations:
            - key: workload
              operator: Equal
              value: clickhouse
              effect: NoSchedule
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.3
              resources:
                requests:
                  memory: "16Gi"
                  cpu: "4"
                limits:
                  memory: "32Gi"
                  cpu: "8"
    volumeClaimTemplates:
      - name: clickhouse-storage
        spec:
          storageClassName: azure-premium-retain
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 500Gi
```

## Workload Identity for Azure Blob Storage

Configure Workload Identity to allow ClickHouse to access Azure Blob Storage:

```bash
# Enable OIDC and Workload Identity on AKS
az aks update --resource-group clickhouse-rg \
  --name my-aks-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Create managed identity
az identity create --name clickhouse-identity --resource-group clickhouse-rg

# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee <identity-client-id> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<sub-id>/resourceGroups/clickhouse-rg/providers/Microsoft.Storage/storageAccounts/myaccount
```

## Monitoring with Azure Monitor

Enable Container Insights on the AKS cluster to automatically collect ClickHouse container logs and metrics:

```bash
az aks enable-addons \
  --resource-group clickhouse-rg \
  --name my-aks-cluster \
  --addons monitoring \
  --workspace-resource-id /subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace
```

## Summary

Deploying ClickHouse on AKS combines dedicated node pools with memory-optimized VMs, the ClickHouse Operator for cluster lifecycle management, Azure Premium SSD storage classes with Retain policy, and Workload Identity for secure access to Azure Blob Storage without storing credentials in the cluster.
