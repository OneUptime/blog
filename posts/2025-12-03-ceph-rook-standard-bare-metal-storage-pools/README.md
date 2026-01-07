# Why Ceph + Rook Is the Gold Standard for Bare-Metal Kubernetes Storage Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Ceph, Rook, Bare Metal, Self-Hosting, Reliability

Description: How Ceph paired with Rook turns commodity disks into a resilient, software-defined storage fabric tailor-made for bare-metal Kubernetes clusters.

---

## The Storage Problem Bare-Metal Teams Face

- **Petabyte ambition, startup budget**: You own the racks, but traditional SAN/NAS gear is expensive and inflexible.
- **Kubernetes-first workloads**: Stateful sets, databases, and AI jobs demand block, file, and object storage simultaneously.
- **Multi-tenant reliability expectations**: You wear both the platform and storage-admin hats; replacement needs to heal itself during office hours, not 3 a.m.

Ceph + Rook grew popular because it behaves like cloud storage but runs beside your nodes.

---

## Why Ceph + Rook Wins

1. **Unified Storage Primitives**
   - RBD (block), CephFS (file), and RGW (S3-compatible object) from one cluster.
   - Developers pick the interface they need without extra appliances.
2. **Self-Healing, Self-Balancing**
   - CRUSH maps spread data across hosts and racks; Rook watches hardware changes and leads rebalancing.
3. **Declarative Ops**
   - Storage clusters, pools, and placement rules live in Git via Custom Resources. Upgrades become `kubectl apply`, not CLI rituals.
4. **Horizontal Scalability**
   - Add OSDs when you add servers. No forklift upgrade required.
5. **Cost Transparency**
   - Commodity NVMe + spinning disks + Rook beats proprietary storage maintenance contracts by 5-10x.

---

## Architecture in Practice

```
[Rook Operator] → Reconciles Ceph CRDs
     ↓
[Ceph Mons] → Quorum + cluster map
     ↓
[Mgr + Dashboard] → Telemetry, autoscaler
     ↓
[OSD Pods] → One per disk, handle placement + recovery
     ↓
[Exposure]
  - RBD provisioner → PersistentVolumes
  - CephFS provisioner → Shared volumes
  - RGW → S3 endpoint for apps
```

On bare metal, each worker contributes disks advertised via Kubernetes `LocalVolume` or `LVM`. Rook deploys OSD pods on those nodes, so capacity grows linearly with cluster size.

---

## Operational Patterns That Matter

### 1. Zonal / Rack Awareness
- Label nodes with `topology.kubernetes.io/zone` or custom rack labels.
- Update the Ceph `CRUSH` map so replicas never land on the same power domain.

### 2. Pool Design for Workloads
| Workload | Pool Type | Notes |
|----------|-----------|-------|
| Databases | Replicated RBD (3x) | NVMe tier, strict placement for latency |
| Streaming / AI checkpoints | Erasure-coded RBD (k=6, m=3) | Higher efficiency, still resilient |
| CI artifact cache | CephFS | Easy POSIX semantics |
| Backup/object workloads | RGW + erasure-coded pool | S3 API parity |

### 3. Day-2 Operations
- **Upgrades**: Rook orchestrates blue/green Ceph version bumps node by node.
- **Autoscaling**: Ceph mgr module rebalances PGs when OSD counts change.
- **Monitoring**: Scrape Ceph exporter into OneUptime; track PG states, recovery rate, OSD availability.

---

## Bare-Metal Reliability Checklist

1. **Disks**: Mix NVMe for journals/WALs and HDD for capacity. Use Kubernetes device discovery (e.g., `rook-ceph-osd-prepare`) to prevent partition reuse.
2. **Networks**: Dual 25/40G NICs with dedicated VLAN for Ceph replication keeps client traffic clean.
3. **Failure Domains**: Minimum three control-plane racks; enable `stretch clusters` for metro DR if you have two sites.
4. **Capacity Planning**: Keep 10-15% free space; Ceph slows dramatically when pools hit 80%+.
5. **Automation Hooks**: When OneUptime sees more than 1% degraded PGs for >5 minutes, auto-page storage on-call.

---


## Quick Helm Deployment Example

Below is a "kitchen table" deployment you can run in a homelab or staging environment before rolling into production. It deploys the Rook operator plus a Ceph cluster that consumes raw devices advertised via the `local-storage` CSI driver.

### 1. Add the Chart Repos

First, register the official Rook Helm repository and update your local chart cache. This ensures you have access to the latest stable versions of both the operator and cluster charts.

```bash
# Add the official Rook Helm repository for production-ready charts
helm repo add rook-release https://charts.rook.io/release

# Update local cache to fetch the latest chart versions
helm repo update
```

### 2. Install the Rook Operator

The Rook operator watches for Ceph CRDs and manages the entire lifecycle of your storage cluster. Installing it first establishes the foundation that all subsequent Ceph components depend on.

```bash
# Create a dedicated namespace to isolate Ceph components
kubectl create namespace rook-ceph

# Install the Rook operator with CSI drivers enabled for block and filesystem storage
helm upgrade --install rook-ceph rook-release/rook-ceph \
   --namespace rook-ceph \
   --set csi.enableRbdDriver=true \       # Enable RBD for block storage (databases, VMs)
   --set csi.enableCephfsDriver=true      # Enable CephFS for shared filesystem volumes
```

This chart deploys the operator, CRDs, CSI sidecars, and default RBAC.

### 3. Define Storage in Values

Create `rook-ceph-cluster-values.yaml` describing your nodes and devices. This configuration file explicitly maps physical disks to OSD pods, giving you precise control over which hardware participates in the storage cluster.

```yaml
cephClusterSpec:
   dataDirHostPath: /var/lib/rook       # Host path where Ceph stores metadata and logs
   network:
      provider: host                     # Use host networking for better performance
   mon:
      count: 3                           # Run 3 monitors for quorum (minimum for production)
   storage:
      useAllDevices: false               # Disable auto-discovery to prevent accidental data loss
      useAllNodes: false                 # Explicitly list nodes instead of using all available
      nodes:
         - name: worker-a                # First storage node
            devices:
               - name: "/dev/nvme0n1"    # Fast NVMe for hot data and WAL/DB
               - name: "/dev/sdb"        # Spinning disk for bulk capacity
         - name: worker-b                # Second storage node
            devices:
               - name: "/dev/nvme0n1"    # Each node contributes NVMe and HDD
               - name: "/dev/sdb"
         - name: worker-c                # Third storage node - ensures data survives any single failure
            devices:
               - name: "/dev/nvme0n1"
               - name: "/dev/sdb"
   dashboard:
      enabled: true                      # Enable Ceph dashboard for visual cluster management
cephBlockPools:
   - name: fast-rbd                      # Pool name referenced by StorageClass
      spec:
         replicated:
            size: 3                      # Triple replication for high durability
         crushRoot: host                 # Spread replicas across hosts, not just OSDs
      storageClass:
         enabled: true                   # Automatically create a StorageClass for this pool
         name: fast-rbd                  # StorageClass name developers will reference
         reclaimPolicy: Delete           # Clean up RBD images when PVCs are deleted
         parameters:
            csi.storage.k8s.io/fstype: xfs        # XFS performs well for database workloads
            imageFeatures: layering               # Enable layering for snapshot support
```

### 4. Deploy the CephCluster CR via Helm

Now deploy the actual Ceph cluster using your values file. This triggers the operator to create monitor pods, manager pods, and OSD pods on the nodes you specified.

```bash
# Deploy the Ceph cluster with your custom storage configuration
helm upgrade --install rook-ceph-cluster rook-release/rook-ceph-cluster \
   --namespace rook-ceph \
   -f rook-ceph-cluster-values.yaml    # Apply your node and device mappings
```

Within a few minutes you should see mons, mgr, and OSD pods running. The Helm chart also provisions the `fast-rbd` StorageClass so developers can claim block volumes:

The following commands verify your StorageClass exists and demonstrate provisioning a 200GB volume for a PostgreSQL database. This proves end-to-end functionality from Ceph pools through CSI to actual workloads.

```bash
# Verify the StorageClass was created by the Helm chart
kubectl get storageclass fast-rbd

# Create a test PVC to prove storage provisioning works
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
   name: postgres-data              # Name your PVC descriptively for the workload
spec:
   accessModes: ["ReadWriteOnce"]   # Block storage for single-pod access (typical for databases)
   storageClassName: fast-rbd       # Reference the Ceph RBD StorageClass we created
   resources:
      requests:
         storage: 200Gi             # Request 200GB - Ceph will carve this from the pool
EOF
```

Because everything is declarative, you can commit both the Helm values and PVC manifests into Git, gate them through CI, and promote the same storage topology across clusters.

---


## Comparisons vs. Alternatives

| Option | Pros | Cons |
|--------|------|------|
| Traditional SAN + CSI | Known vendor support | Expensive, scaling bottlenecks, still needs FC/iSCSI plumbing |
| Local PV + Replication in App | Simple for one workload | Every team must reimplement replication, no shared object storage |
| GlusterFS/Longhorn | Easier to start | Limited object support, less efficient at petabyte scale |
| Ceph + Rook | Unified interfaces, cloud-like durability, GitOps control | Requires operational maturity (monitoring, hardware planning) |

Ceph wins when you need one platform for many storage personalities without paying for separate boxes.

---

## Final Word

Bare-metal Kubernetes needs storage that scales like the control plane itself. Ceph brings the battle-tested distributed storage engine; Rook turns it into Kubernetes-native building blocks. Together they eliminate the last excuse for keeping old SANs around, while giving developers block, file, and object snapshots on demand. If you own your hardware, Ceph with Rook is no longer an experiment-it is the baseline for serious, multi-tenant storage pools.
