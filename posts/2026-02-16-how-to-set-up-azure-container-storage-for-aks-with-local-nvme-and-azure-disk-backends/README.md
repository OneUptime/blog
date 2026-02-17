# How to Set Up Azure Container Storage for AKS with Local NVMe and Azure Disk Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Azure Container Storage, NVMe, Azure Disk, Kubernetes, Storage, Azure

Description: Learn how to configure Azure Container Storage for AKS clusters using local NVMe and Azure Disk backends for persistent volume management.

---

Azure Container Storage is a volume management service built natively for containers. It provides a Kubernetes-native storage stack that manages persistent volumes for stateful applications running on AKS. If you have been wrestling with storage provisioning, performance tuning, or dealing with the limitations of standard CSI drivers, Azure Container Storage gives you a much better path forward.

In this guide, I will walk through setting up Azure Container Storage on AKS with two backend options: local NVMe disks for ultra-low latency workloads, and Azure Disk for durable, replicated storage.

## Why Azure Container Storage

Traditional storage provisioning in Kubernetes involves creating StorageClasses, PersistentVolumeClaims, and hoping that the underlying CSI driver handles things properly. Azure Container Storage sits on top of this and adds a management layer that handles volume replication, snapshots, and performance tiering.

The two backends we will cover serve different use cases:

- **Local NVMe**: Ideal for workloads that need the lowest possible latency. The data lives on the physical NVMe drives attached to your nodes. Think databases, caches, and real-time analytics.
- **Azure Disk**: Best for workloads that need durability and can tolerate slightly higher latency. Data is stored on Azure Managed Disks with built-in redundancy.

## Prerequisites

Before you start, make sure you have:

- An AKS cluster running Kubernetes 1.26 or later
- Azure CLI version 2.50 or newer
- The `k8s-extension` Azure CLI extension installed
- Node pools with NVMe-capable VMs (for the NVMe backend), such as the Lsv3 series

## Step 1: Register the Required Feature Flags

Azure Container Storage requires a couple of feature flags to be enabled on your subscription.

The following commands register the necessary providers and feature flags for Azure Container Storage.

```bash
# Register the Azure Container Storage feature flag
az feature register --namespace "Microsoft.ContainerService" --name "AzureContainerStorageInterface"

# Wait for the registration to complete (this can take a few minutes)
az feature show --namespace "Microsoft.ContainerService" --name "AzureContainerStorageInterface" --query properties.state -o tsv

# Once registered, refresh the provider
az provider register --namespace Microsoft.ContainerService
```

You can check the status periodically. Once it shows "Registered", you are good to proceed.

## Step 2: Install the Azure Container Storage Extension

The extension installs as a Kubernetes extension on your AKS cluster. This deploys the necessary controllers and agents.

This command installs the Azure Container Storage extension onto your AKS cluster with both NVMe and Azure Disk enabled.

```bash
# Install Azure Container Storage extension on your cluster
az k8s-extension create \
  --cluster-type managedClusters \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --name azurecontainerstorage \
  --extension-type microsoft.azurecontainerstorage \
  --scope cluster \
  --release-train stable \
  --release-namespace acstor
```

The installation takes around 10 minutes. You can monitor the progress with:

```bash
# Check the extension installation status
az k8s-extension show \
  --cluster-type managedClusters \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --name azurecontainerstorage \
  --query provisioningState -o tsv
```

## Step 3: Label Your Node Pool for NVMe

For local NVMe storage, you need to label the nodes that have NVMe drives. Azure Container Storage uses these labels to identify which nodes can provide local storage.

```bash
# Label the node pool that has NVMe-capable VMs
az aks nodepool update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name nvmepool \
  --labels acstor.azure.com/io-engine=acstor
```

## Step 4: Create Storage Pools

Storage pools are the fundamental building block in Azure Container Storage. Each pool defines a collection of storage resources that back your persistent volumes.

### NVMe Storage Pool

This YAML defines a storage pool backed by local NVMe drives on your nodes.

```yaml
# nvme-storage-pool.yaml
# Creates a storage pool using local NVMe disks for low-latency workloads
apiVersion: containerstorage.azure.com/v1
kind: StoragePool
metadata:
  name: nvme-pool
  namespace: acstor
spec:
  poolType:
    ephemeralDisk:
      diskType: nvme
      # Replicas set to 3 for data protection across nodes
      replicas: 3
  # Resources allocated from each node's NVMe capacity
  resources:
    requests:
      storage: 1Ti
```

### Azure Disk Storage Pool

This YAML defines a storage pool backed by Azure Managed Disks for durable storage.

```yaml
# azure-disk-storage-pool.yaml
# Creates a storage pool using Azure Managed Disks for durable storage
apiVersion: containerstorage.azure.com/v1
kind: StoragePool
metadata:
  name: azuredisk-pool
  namespace: acstor
spec:
  poolType:
    azureDisk:
      # Premium SSD for production workloads
      skuName: Premium_LRS
  resources:
    requests:
      storage: 1Ti
```

Apply both of these:

```bash
# Create the NVMe storage pool
kubectl apply -f nvme-storage-pool.yaml

# Create the Azure Disk storage pool
kubectl apply -f azure-disk-storage-pool.yaml
```

## Step 5: Verify Storage Pool Status

Check that your storage pools are healthy and have available capacity.

```bash
# List all storage pools and their status
kubectl get storagepool -n acstor

# Get detailed info about the NVMe pool
kubectl describe storagepool nvme-pool -n acstor
```

You should see the pools in a "Ready" state with the requested capacity available.

## Step 6: Create StorageClasses

Each storage pool needs a corresponding StorageClass that Kubernetes workloads can reference.

```yaml
# nvme-storageclass.yaml
# StorageClass for workloads needing local NVMe-backed volumes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: acstor-nvme
parameters:
  # Reference the NVMe storage pool we created
  acstor.azure.com/storagepool: nvme-pool
provisioner: containerstorage.csi.azure.com
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

```yaml
# azuredisk-storageclass.yaml
# StorageClass for workloads needing Azure Disk-backed volumes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: acstor-azuredisk
parameters:
  # Reference the Azure Disk storage pool
  acstor.azure.com/storagepool: azuredisk-pool
provisioner: containerstorage.csi.azure.com
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Step 7: Deploy a Workload with NVMe Storage

Let's deploy a sample stateful application that uses NVMe storage. This is a good pattern for databases or caches.

```yaml
# redis-nvme.yaml
# Redis deployment using NVMe-backed persistent storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-nvme
spec:
  serviceName: redis-nvme
  replicas: 3
  selector:
    matchLabels:
      app: redis-nvme
  template:
    metadata:
      labels:
        app: redis-nvme
    spec:
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
  # PVC template requests NVMe-backed storage
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: acstor-nvme
      resources:
        requests:
          storage: 100Gi
```

## Step 8: Deploy a Workload with Azure Disk Storage

For workloads that prioritize durability over raw speed, use the Azure Disk backend.

```yaml
# postgres-azuredisk.yaml
# PostgreSQL deployment using Azure Disk-backed persistent storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-durable
spec:
  serviceName: postgres-durable
  replicas: 1
  selector:
    matchLabels:
      app: postgres-durable
  template:
    metadata:
      labels:
        app: postgres-durable
    spec:
      containers:
      - name: postgres
        image: postgres:16
        env:
        - name: POSTGRES_PASSWORD
          value: "changeme"
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: pgdata
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: acstor-azuredisk
      resources:
        requests:
          storage: 256Gi
```

## Monitoring and Troubleshooting

Once everything is running, you should keep an eye on storage pool utilization. Azure Container Storage exposes metrics that you can scrape with Prometheus or view in Azure Monitor.

```bash
# Check PVC status
kubectl get pvc -A

# Check storage pool capacity and usage
kubectl get storagepool -n acstor -o yaml

# View Azure Container Storage component logs
kubectl logs -n acstor -l app=acstor-controller --tail=100
```

Common issues include nodes not having the NVMe label, storage pools not having enough capacity, and PVCs stuck in Pending state because no node matches the topology constraints.

## Choosing Between NVMe and Azure Disk

The decision comes down to your workload profile. If you are running something like Redis, Memcached, or a real-time analytics engine that needs sub-millisecond latency, local NVMe is the obvious choice. The tradeoff is that data lives on the physical node, so if the node goes down, you rely on replication across other NVMe nodes.

Azure Disk is the better pick for traditional databases, content management systems, and anything where you need the data to survive node failures without relying on application-level replication. Azure Managed Disks have built-in redundancy at the infrastructure level.

You can also run both backends simultaneously on the same cluster, which is what many production setups look like. Different workloads get different StorageClasses, and Azure Container Storage handles the rest.

## Cleaning Up

If you need to remove Azure Container Storage, delete the workloads first, then the storage pools, and finally the extension.

```bash
# Delete workloads using the storage
kubectl delete statefulset redis-nvme postgres-durable

# Delete PVCs
kubectl delete pvc --all

# Delete storage pools
kubectl delete storagepool nvme-pool azuredisk-pool -n acstor

# Remove the extension
az k8s-extension delete \
  --cluster-type managedClusters \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --name azurecontainerstorage
```

Azure Container Storage is a solid choice for teams that want a managed, Kubernetes-native storage experience on AKS. Setting up both NVMe and Azure Disk backends gives you the flexibility to match storage characteristics to workload requirements without juggling multiple CSI drivers or third-party tools.
