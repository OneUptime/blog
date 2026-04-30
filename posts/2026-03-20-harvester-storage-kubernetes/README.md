# How to Set Up Harvester Storage for Kubernetes - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Storage, Kubernetes, Longhorn, CSI, PersistentVolume, SUSE Rancher, HCI

Description: Learn how to configure Harvester's built-in Longhorn storage for Kubernetes clusters provisioned on Harvester, including StorageClasses, PVC creation, and storage topology for VM-based workloads.

---

Harvester uses Longhorn as its built-in storage backend, providing hyperconverged storage that is shared between virtual machines and Kubernetes workloads. Kubernetes clusters provisioned on Harvester consume this storage through the Harvester CSI driver, which hot-plugs host-cluster volumes into the guest cluster VMs.

---

## Storage Architecture in Harvester

```text
┌─────────────────────────────────────────┐
│           Harvester Cluster             │
│                                         │
│  ┌─────────┐      ┌──────────────────┐  │
│  │  VMs    │      │  K8s Clusters    │  │
│  │  (QCOW) │      │  (RKE2 / K3s)   │  │
│  └────┬────┘      └────────┬─────────┘  │
│       │                    │            │
│       └──────────┬─────────┘            │
│                  │                      │
│           ┌──────▼──────┐               │
│           │  Longhorn   │               │
│           │  (Storage)  │               │
│           └─────────────┘               │
└─────────────────────────────────────────┘
```

---

## Step 1: Verify Longhorn is Running on Harvester

```bash
# Connect to the Harvester management cluster

export KUBECONFIG=/path/to/harvester-kubeconfig

# Check Longhorn is running
kubectl get pods -n longhorn-system | head -20

# Check available storage nodes
kubectl get node.longhorn.io -n longhorn-system
```

---

## Step 2: Review Harvester Default StorageClasses

```bash
# List available StorageClasses on the Harvester management cluster
kubectl get storageclass

# Harvester provides this default StorageClass on the host cluster:
# harvester-longhorn (default) - 3 replicas by default
```

---

## Step 3: Create a Custom StorageClass for Kubernetes Workloads

```yaml
# k8s-workloads-storageclass.yaml (on the Harvester management cluster)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: harvester-ssd
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
parameters:
  numberOfReplicas: "2"
  staleReplicaTimeout: "30"
  dataLocality: "best-effort"
  diskSelector: "ssd"           # Target SSDs if tagged in Longhorn
  fsType: "ext4"
```

---

## Step 4: Provision K8s Clusters on Harvester via Rancher

When creating an RKE2 or K3s cluster on Harvester through Rancher, select the `Harvester` cloud provider. Rancher deploys the Harvester cloud provider and Harvester CSI driver automatically. In the guest cluster, the default StorageClass is `harvester`.

```yaml
# guest-storageclass.yaml (on the guest Kubernetes cluster)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: harvester-ssd
provisioner: driver.harvesterhci.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  hostStorageClass: harvester-ssd
```

---

## Step 5: Create PVCs on the Guest Kubernetes Cluster

Once the K8s cluster is running on Harvester VMs, create PVCs:

```yaml
# database-pvc.yaml (on the guest Kubernetes cluster)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: harvester-ssd        # Guest-cluster StorageClass backed by Harvester
  resources:
    requests:
      storage: 50Gi
```

```bash
kubectl apply -f database-pvc.yaml

# Verify PVC is bound
kubectl get pvc -n production
```

---

## Step 6: Configure Storage Topology for Multi-Node K8s on Harvester

For multi-node Kubernetes clusters on Harvester, tune the host Harvester StorageClass so provisioning waits for a consumer, and use Harvester-supported data locality:

```yaml
# StorageClass with WaitForFirstConsumer binding mode
# Create this on the Harvester management cluster
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: harvester-local
provisioner: driver.longhorn.io
volumeBindingMode: WaitForFirstConsumer   # Wait until a VM uses the PVC
reclaimPolicy: Delete
parameters:
  numberOfReplicas: "2"
  dataLocality: "best-effort"
```

---

## Step 7: Monitor Storage Usage from Harvester

```bash
# Check Longhorn volume status from the Harvester cluster
kubectl get volume -n longhorn-system

# Check storage capacity per node
kubectl get node.longhorn.io -n longhorn-system \
  -o custom-columns='NODE:.metadata.name,STORAGE:.status.diskStatus'

# Access the Longhorn UI (from Harvester dashboard)
# Navigate to: Harvester → More → Longhorn
```

---

## Step 8: Configure Backup Target for Guest Cluster PVCs

Guest-cluster PVCs are backed by Longhorn volumes on the Harvester management cluster, so configure backup targets and recurring jobs on the Harvester management cluster rather than inside the guest cluster.

```bash
# Configure the backup target on the Harvester management cluster first.
# One supported path is the embedded Longhorn UI:
# Harvester -> More -> Longhorn -> Settings -> Backup Target

# Create a recurring backup job on the Harvester management cluster
kubectl apply -f - <<EOF
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"
  task: "backup"
  groups:
    - default
  retain: 7
  concurrency: 1
EOF
```

---

## Best Practices

- Use `WaitForFirstConsumer` on host Harvester StorageClasses when provisioning should wait until a VM consumer exists, and use `dataLocality: best-effort` for Harvester-supported locality tuning.
- Size Harvester node disks generously - Longhorn volumes for both the VMs and the guest Kubernetes workloads compete for the same physical storage.
- Tag SSDs and HDDs differently in Longhorn (`disk-type=ssd`, `disk-type=hdd`) and create separate StorageClasses for each - this lets you route database workloads to SSDs and archival workloads to HDDs.
