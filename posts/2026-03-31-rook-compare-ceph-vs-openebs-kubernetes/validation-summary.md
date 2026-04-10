# Validation Summary: How to Compare Ceph vs OpenEBS for Kubernetes Storage

## Status
validated

## Post Type
Comparison guide / Reference

## Technologies Covered
- Rook (CNCF Graduated Kubernetes storage orchestrator)
- Ceph (distributed storage system — RBD, CephFS, RGW)
- OpenEBS (CNCF Sandbox Kubernetes-native storage)
- OpenEBS Replicated PV Mayastor (SPDK-based storage engine)
- OpenEBS LocalPV (HostPath, LVM, ZFS variants)
- Kubernetes StorageClass / CSI

## Sources Consulted
- CNCF project pages for Rook (https://www.cncf.io/projects/rook/) and OpenEBS (https://www.cncf.io/projects/openebs/)
- Rook Block Storage documentation (https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/)
- OpenEBS Mayastor documentation and StorageClass examples
- Ceph NVMe-oF Gateway documentation (https://docs.ceph.com/en/reef/rbd/nvmeof-overview/)
- Ceph Tentacle v20.2.1 release notes (NVMe/TCP gateway groups, multi-cluster support)
- Ceph Reef RBD performance benchmarks (https://ceph.io/en/news/blog/2023/reef-freeze-rbd-performance/)
- OpenEBS 4.0 release notes (deprecation of Jiva and cStor)
- SPDK NVMe-oF performance data (GitHub spdk/spdk issue #321)

## Issues Found

1. **Outdated OpenEBS storage engines list**: The post listed "Jiva, cStor, LocalPV, Mayastor" as OpenEBS engines. Jiva and cStor were deprecated in OpenEBS 4.0 (April 2024) and moved to the openebs-archive GitHub organization. Updated both the overview paragraph and architecture table to list the current engines: Replicated PV Mayastor, LocalPV-HostPath, LocalPV-LVM, LocalPV-ZFS.

2. **Misleading OpenEBS metadata description**: The architecture table described OpenEBS metadata as "Mayastor (NVMe-oF), etcd". NVMe-oF is a data transport protocol, not a metadata mechanism. Changed to "etcd (Mayastor control plane), Kubernetes CRDs" to accurately reflect that Mayastor uses etcd for control plane state and Kubernetes CRDs for resource definitions.

3. **Undocumented `ioTimeout` StorageClass parameter**: The Mayastor StorageClass example included `ioTimeout: "30"`, which is not present in current official OpenEBS documentation and has been reported to cause errors (mayastor-docs GitHub issue #23). Removed this parameter, leaving only the documented `repl` and `protocol` parameters.

4. **Outdated Ceph NVMe-oF support status**: The post described Ceph NVMe-oF support as "Limited". Ceph Reef (18.2.x) introduced NVMe/TCP gateway support for RBD, Squid (19.2.x) expanded it, and Tentacle (20.2.x) added gateway groups, multiple namespaces, and multi-cluster management. Changed "Limited" to "Yes (NVMe/TCP gateway)" to reflect current state.

5. **Overstated Mayastor IOPS claim**: The post claimed "1M+ (NVMe)" for Mayastor 4K random read IOPS. This figure originates from MayaData marketing for unreplicated single-node scenarios. Real-world replicated configurations show significantly lower numbers (~28K-500K IOPS depending on configuration). Changed to "100K-500K+ (NVMe)" which is more representative of actual replicated deployments.

## Review Notes
- The Rook/Ceph RBD StorageClass example omits CSI secret parameters (`csi.storage.k8s.io/provisioner-secret-name`, etc.) that are required in production. This is acceptable for a comparison overview but readers should consult the full Rook documentation for production configurations.
- Mayastor volume cloning support was not available until approximately OpenEBS v4.1+. The feature table states "Yes" unconditionally; a version qualifier would improve accuracy.
- The Ceph "100K+" IOPS figure is conservative — large all-NVMe clusters routinely achieve millions of IOPS. The number is technically correct (100K+) but understated relative to Ceph's actual capabilities.
- OpenEBS was briefly archived by CNCF in early 2024 before being re-accepted as Sandbox in October 2024. The "Sandbox" status in the post is currently correct.
