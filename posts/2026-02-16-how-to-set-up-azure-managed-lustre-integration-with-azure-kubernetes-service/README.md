# How to Set Up Azure Managed Lustre Integration with Azure Kubernetes Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Lustre, AKS, Kubernetes, High Performance Storage, HPC, Parallel File System

Description: A step-by-step guide to integrating Azure Managed Lustre with Azure Kubernetes Service for high-throughput parallel file system access in containerized workloads.

---

When your Kubernetes workloads need parallel file system performance that Azure Files and Azure Blob Storage simply cannot deliver, Azure Managed Lustre fills the gap. Lustre is the industry-standard parallel file system used in HPC environments, and Azure Managed Lustre provides a fully managed deployment of it. Integrating it with Azure Kubernetes Service (AKS) lets you run containerized HPC workloads, AI training jobs, and data processing pipelines with the high-throughput, low-latency storage they require.

This guide walks through deploying Azure Managed Lustre, connecting it to an AKS cluster, and running workloads that use it.

## Why Lustre for Kubernetes?

Standard Kubernetes storage options have limitations for high-performance workloads:

| Storage Option | Max Throughput | Latency | Parallel Access |
|---------------|---------------|---------|----------------|
| Azure Files (Standard) | 300 MiB/s | ~10ms | Yes (SMB/NFS) |
| Azure Files (Premium) | 10 GiB/s | ~1-2ms | Yes (SMB/NFS) |
| Azure Managed Disk | 900 MiB/s (per disk) | <1ms | No (single node) |
| Azure Managed Lustre | 500+ GiB/s | <1ms | Yes (thousands of clients) |

Lustre delivers order-of-magnitude better throughput than Azure Files and supports thousands of concurrent clients reading and writing simultaneously. This makes it ideal for:

- AI/ML training with large datasets
- Genomics and bioinformatics pipelines
- Media rendering and transcoding
- Financial risk modeling
- Seismic data processing

## Prerequisites

You need:

- An Azure subscription with the Azure Managed Lustre resource provider registered
- An AKS cluster running in the same region as the Lustre file system
- A virtual network with a dedicated subnet for Lustre (at least /24)
- The AKS cluster's VNet must be peered with (or the same as) the Lustre VNet
- Kubernetes CSI driver for Lustre installed in the cluster

## Step 1: Register the Resource Provider

```bash
# Register the Azure Managed Lustre resource provider
az provider register --namespace Microsoft.StorageCache

# Wait for registration
az provider show --namespace Microsoft.StorageCache --query "registrationState" -o tsv
```

## Step 2: Create the Network Infrastructure

Azure Managed Lustre needs a dedicated subnet. If your AKS cluster uses a different VNet, you will need VNet peering.

```bash
# Create a VNet for Lustre (or use the AKS VNet)
az network vnet create \
  --resource-group rg-hpc \
  --name vnet-lustre \
  --address-prefix 10.1.0.0/16 \
  --location eastus2

# Create a dedicated subnet for Lustre
# Must be at least /24 and not have any NSGs attached
az network vnet subnet create \
  --resource-group rg-hpc \
  --vnet-name vnet-lustre \
  --name snet-lustre \
  --address-prefixes 10.1.0.0/24

# If AKS is in a different VNet, set up peering
az network vnet peering create \
  --resource-group rg-hpc \
  --name lustre-to-aks \
  --vnet-name vnet-lustre \
  --remote-vnet "/subscriptions/<sub-id>/resourceGroups/rg-aks/providers/Microsoft.Network/virtualNetworks/vnet-aks" \
  --allow-vnet-access

# Create the reverse peering
az network vnet peering create \
  --resource-group rg-aks \
  --name aks-to-lustre \
  --vnet-name vnet-aks \
  --remote-vnet "/subscriptions/<sub-id>/resourceGroups/rg-hpc/providers/Microsoft.Network/virtualNetworks/vnet-lustre" \
  --allow-vnet-access
```

## Step 3: Deploy Azure Managed Lustre

Create the Lustre file system. Choose the SKU based on your throughput requirements:

```bash
# Create an Azure Managed Lustre file system
az amlfs create \
  --resource-group rg-hpc \
  --name amlfs-hpc-cluster \
  --location eastus2 \
  --sku-name AMLFS-Durable-Premium-250 \
  --storage-capacity 16 \
  --filesystem-subnet "/subscriptions/<sub-id>/resourceGroups/rg-hpc/providers/Microsoft.Network/virtualNetworks/vnet-lustre/subnets/snet-lustre" \
  --maintenance-window '{"dayOfWeek": "Sunday", "timeOfDay": "02:00"}'
```

Available SKUs and their characteristics:

| SKU | Throughput per TiB | Use Case |
|-----|-------------------|----------|
| AMLFS-Durable-Premium-40 | 40 MiB/s | Cost-efficient HPC |
| AMLFS-Durable-Premium-125 | 125 MiB/s | General HPC |
| AMLFS-Durable-Premium-250 | 250 MiB/s | High-performance HPC |
| AMLFS-Durable-Premium-500 | 500 MiB/s | Maximum performance |

The `--storage-capacity` is in TiB. Minimum is 16 TiB for most SKUs. With the Premium-250 SKU and 16 TiB, you get 4 GiB/s aggregate throughput.

Deployment takes 15-30 minutes. Check the status:

```bash
# Check deployment status
az amlfs show \
  --resource-group rg-hpc \
  --name amlfs-hpc-cluster \
  --query "{name:name, provisioningState:provisioningState, mgsAddress:mgsAddress}" \
  --output json
```

Note the `mgsAddress` - this is the MGS (Management Service) IP address you will use to mount the file system.

## Step 4: Install the Lustre CSI Driver in AKS

The Lustre CSI driver allows Kubernetes pods to mount Lustre file systems as persistent volumes.

```bash
# Add the Azure Managed Lustre CSI driver Helm repository
helm repo add azurelustre-csi-driver https://raw.githubusercontent.com/kubernetes-sigs/azurelustre-csi-driver/main/charts

helm repo update

# Install the CSI driver into the AKS cluster
helm install azurelustre-csi-driver \
  azurelustre-csi-driver/azurelustre-csi-driver \
  --namespace kube-system \
  --set node.supportedNodeOS=linux

# Verify the driver pods are running
kubectl get pods -n kube-system -l app=azurelustre-csi-driver
```

## Step 5: Create a Persistent Volume and Persistent Volume Claim

Create Kubernetes resources that reference the Lustre file system:

```yaml
# lustre-pv.yaml
# Persistent Volume pointing to the Azure Managed Lustre file system
apiVersion: v1
kind: PersistentVolume
metadata:
  name: lustre-pv
spec:
  capacity:
    storage: 16Ti
  accessModes:
    - ReadWriteMany  # Lustre supports many readers and writers
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""
  csi:
    driver: azurelustre.csi.azure.com
    readOnly: false
    # The volume handle must be unique
    volumeHandle: amlfs-hpc-cluster-vol1
    volumeAttributes:
      # MGS address from the Lustre deployment
      mgs-ip-address: "10.1.0.4"
      # File system name (default is "lustrefs")
      fs-name: "lustrefs"
```

```yaml
# lustre-pvc.yaml
# Persistent Volume Claim that binds to the Lustre PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: lustre-pvc
  namespace: hpc-workloads
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 16Ti
  storageClassName: ""
  volumeName: lustre-pv
```

Apply these resources:

```bash
# Create the namespace for HPC workloads
kubectl create namespace hpc-workloads

# Apply the PV and PVC
kubectl apply -f lustre-pv.yaml
kubectl apply -f lustre-pvc.yaml

# Verify the PVC is bound
kubectl get pvc -n hpc-workloads
```

## Step 6: Deploy a Workload That Uses Lustre

Here is an example deployment that mounts the Lustre file system:

```yaml
# ml-training-job.yaml
# Example AI training job that uses Lustre for high-throughput data access
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training-job
  namespace: hpc-workloads
spec:
  parallelism: 4  # Run 4 parallel workers
  completions: 4
  template:
    spec:
      containers:
        - name: trainer
          image: myregistry.azurecr.io/ml-trainer:latest
          command: ["/bin/bash", "-c"]
          args:
            - |
              echo "Starting training on $(hostname)"
              echo "Lustre mount at /data"
              ls -la /data/training-dataset/
              python /app/train.py \
                --data-dir /data/training-dataset/ \
                --output-dir /data/model-output/$(hostname)/ \
                --epochs 50
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: "32Gi"
              nvidia.com/gpu: 1
          volumeMounts:
            - name: lustre-storage
              mountPath: /data
      volumes:
        - name: lustre-storage
          persistentVolumeClaim:
            claimName: lustre-pvc
      restartPolicy: Never
      nodeSelector:
        agentpool: gpunodes
  backoffLimit: 3
```

Deploy the job:

```bash
# Deploy the training job
kubectl apply -f ml-training-job.yaml

# Watch the pods start and run
kubectl get pods -n hpc-workloads -w

# Check logs from a specific pod
kubectl logs -n hpc-workloads ml-training-job-xxxxx
```

## Step 7: Import Data from Blob Storage

Azure Managed Lustre can import data from Azure Blob Storage, which is useful for loading large datasets:

```bash
# Create an import job to load data from blob storage into Lustre
az amlfs import-job create \
  --resource-group rg-hpc \
  --amlfs-name amlfs-hpc-cluster \
  --import-job-name import-training-data \
  --import-prefixes '["training-dataset/"]' \
  --maximum-bandwidth 500 \
  --conflict-resolution-mode "OverwriteAlways"
```

This imports the `training-dataset/` prefix from the linked blob container into the Lustre file system. Once imported, the data is accessible at Lustre speeds from all mounted clients.

## Step 8: Export Results Back to Blob Storage

After your workload completes, export results from Lustre to blob storage for long-term retention:

```bash
# Create an export job to save results to blob storage
az amlfs export-job create \
  --resource-group rg-hpc \
  --amlfs-name amlfs-hpc-cluster \
  --export-job-name export-model-output \
  --export-prefixes '["model-output/"]'
```

## Step 9: Monitor Performance

Monitor the Lustre file system performance through Azure Monitor:

```bash
# View Lustre metrics
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-hpc/providers/Microsoft.StorageCache/amlFilesystems/amlfs-hpc-cluster" \
  --metric "ClientReadThroughput" "ClientWriteThroughput" "ClientIOPS" \
  --interval PT5M \
  --output table
```

From within a pod, you can also use Lustre client tools to check performance:

```bash
# Inside a pod with Lustre mounted, check client stats
lctl get_param llite.*.stats

# Check the file system capacity
lfs df -h /data
```

## Scaling Considerations

When scaling your AKS workload, keep these points in mind:

- **Lustre handles many concurrent clients well** - hundreds or thousands of pods can mount the same file system
- **Throughput scales with capacity** - if you need more throughput, increase the file system size
- **AKS node pools should be in the same region** as the Lustre file system for lowest latency
- **Use node pools with accelerated networking** for best network performance to Lustre

```bash
# Create a GPU node pool with accelerated networking for HPC workloads
az aks nodepool add \
  --resource-group rg-aks \
  --cluster-name aks-hpc \
  --name gpunodes \
  --node-count 4 \
  --node-vm-size Standard_NC24ads_A100_v4 \
  --enable-accelerated-networking \
  --max-pods 30
```

## Wrapping Up

Integrating Azure Managed Lustre with AKS gives your containerized workloads access to a high-performance parallel file system without managing the underlying infrastructure. The setup involves deploying the Lustre file system, installing the CSI driver in your AKS cluster, and creating PVs and PVCs that reference the Lustre MGS address. From there, any pod can mount the file system and access data at full Lustre speeds. This is the go-to solution for AI training, HPC, and other workloads that need throughput measured in gigabytes per second across many concurrent clients.
