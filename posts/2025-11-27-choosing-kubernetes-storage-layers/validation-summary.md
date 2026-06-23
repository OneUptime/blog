# Validation Summary: Kubernetes Storage Layers: Ceph vs. Longhorn vs. Everything Else

## Status
validated

## Post Type
Decision guide / comparison (architectural overview, no executable code — conceptual and operational guidance with one Mermaid decision diagram)

## Technologies Covered
- Kubernetes Container Storage Interface (CSI)
- Ceph + Rook operator (RBD, CephFS, RGW, CRUSH maps, BlueStore RocksDB/WAL, monitors/OSDs)
- Longhorn (replicated block storage, engine/replica pods, RWX via NFS share-manager)
- OpenEBS (Jiva, cStor, Mayastor / NVMe-over-TCP)
- Portworx (Pure Storage), NetApp Astra, Robin
- Cloud-managed storage: AWS EBS/EFS/FSx, Google Persistent Disk/Filestore, Azure Managed Disk/Azure Files
- Supporting concepts: PVC access modes (RWO/RWX), iSCSI, RBD kernel module, FIO benchmarking

## Sources Consulted
- Kubernetes CSI documentation — https://kubernetes-csi.github.io/docs/
- Rook (Ceph operator) documentation — https://rook.io / https://rook.github.io/docs/rook/latest/
- Ceph documentation (BlueStore, CRUSH, monitors) — https://docs.ceph.com/
- Longhorn documentation (architecture, RWX/NFS share-manager, single-replica support) — https://longhorn.io/docs/
- OpenEBS documentation (engine matrix, Replicated PV Mayastor, Local PV) — https://openebs.io/docs/
- Portworx by Pure Storage product docs — https://docs.portworx.com/
- AWS EBS/EFS/FSx, GCP Persistent Disk/Filestore, Azure Disk/Files CSI driver docs

## Issues Found
1. **Longhorn "edge-friendly" bullet conflated RWX with single-node clusters (line 47).** The original text read "handles single-node clusters via RWX support." ReadWriteMany (RWX) is a multi-node shared-access mode and is unrelated to running on single-node clusters (which is governed by replica count, e.g. a single replica). In Longhorn, RWX is implemented through an internal NFS share-manager. Reworded to "runs on single-node clusters, and supports RWX volumes (via an internal NFS share-manager)" so the two distinct, accurate facts are no longer presented as a false cause-and-effect.

## Review Notes
- **Ceph "SSD journals" terminology (table, line 17):** "journals" is FileStore-era terminology; modern Ceph uses BlueStore with a separate WAL/DB device. The design-tips section already uses the correct "RocksDB/WAL" wording, so the intent is clear and the colloquial "journals" was left intact.
- **OpenEBS engine status:** In OpenEBS 4.x the project has consolidated around Local PV (Hostpath/LVM/ZFS) and Replicated PV Mayastor, with cStor and Jiva now in legacy/maintenance status. The post presents the three engines as roughly co-equal, which is reasonable for a decision guide, but readers starting fresh today should be aware Mayastor (replicated) and Local PV are the actively recommended paths. The "Mayastor … now the default for new installs" phrasing is defensible given Mayastor is the default replicated engine.
- **"Portworx / Pure Fusion" table heading (line 20):** Portworx is Pure Storage's Kubernetes data platform; "Pure Fusion" is a distinct Pure product. The body text correctly says "Portworx (Pure Storage)." Left as-is since it is a branding label rather than a technical error.
- **Longhorn "Only block storage" limitation (line 51):** Consistent with the RWX note — Longhorn's shared-filesystem (RWX) support is itself NFS layered over a block volume, so the limitation as written remains accurate.
- All external links (rook.io, longhorn.io, openebs.io) and the Mermaid decision flowchart are valid.
