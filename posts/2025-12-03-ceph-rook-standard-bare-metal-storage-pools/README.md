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

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update
```

### 2. Install the Rook Operator

```bash
kubectl create namespace rook-ceph
helm upgrade --install rook-ceph rook-release/rook-ceph \
   --namespace rook-ceph \
   --set csi.enableRbdDriver=true \
   --set csi.enableCephfsDriver=true
```

This chart deploys the operator, CRDs, CSI sidecars, and default RBAC.

### 3. Define Storage in Values

Create `rook-ceph-cluster-values.yaml` describing your nodes and devices:

```yaml
cephClusterSpec:
   dataDirHostPath: /var/lib/rook
   network:
      provider: host
   mon:
      count: 3
   storage:
      useAllDevices: false
      useAllNodes: false
      nodes:
         - name: worker-a
            devices:
               - name: "/dev/nvme0n1"
               - name: "/dev/sdb"
         - name: worker-b
            devices:
               - name: "/dev/nvme0n1"
               - name: "/dev/sdb"
         - name: worker-c
            devices:
               - name: "/dev/nvme0n1"
               - name: "/dev/sdb"
   dashboard:
      enabled: true
cephBlockPools:
   - name: fast-rbd
      spec:
         replicated:
            size: 3
         crushRoot: host
      storageClass:
         enabled: true
         name: fast-rbd
         reclaimPolicy: Delete
         parameters:
            csi.storage.k8s.io/fstype: xfs
            imageFeatures: layering
```

### 4. Deploy the CephCluster CR via Helm

```bash
helm upgrade --install rook-ceph-cluster rook-release/rook-ceph-cluster \
   --namespace rook-ceph \
   -f rook-ceph-cluster-values.yaml
```

Within a few minutes you should see mons, mgr, and OSD pods running. The Helm chart also provisions the `fast-rbd` StorageClass so developers can claim block volumes:

```bash
kubectl get storageclass fast-rbd
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
   name: postgres-data
spec:
   accessModes: ["ReadWriteOnce"]
   storageClassName: fast-rbd
   resources:
      requests:
         storage: 200Gi
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
