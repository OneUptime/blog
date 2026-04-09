# Validation Summary: How to Set Up NFSv4 Protocol with Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage)
- NFS-Ganesha (userspace NFS server)
- NFSv4 protocol
- Kubernetes (CRDs, PersistentVolumes, kubectl)

## Sources Consulted
- Rook CephNFS CRD type definitions: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook CephNFS CRD documentation: https://github.com/rook/rook/blob/master/Documentation/CRDs/ceph-nfs-crd.md
- Rook NFS advanced configuration: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/NFS/nfs-advanced.md
- Rook NFS example manifest: https://github.com/rook/rook/blob/master/deploy/examples/nfs.yaml
- NFS-Ganesha configuration reference (ganesha-core-config, ganesha-config man pages): https://github.com/nfs-ganesha/nfs-ganesha/tree/next/src/doc/man

## Issues Found

### 1. Non-existent `spec.ganesha.config` field in CephNFS CR
**What was wrong:** The post used `spec.ganesha.config` to pass inline NFS-Ganesha configuration in the CephNFS custom resource. This field has never existed in the Rook CephNFS CRD.
**What was changed:** Replaced with the correct approach: deploy the CephNFS CR first, then write custom Ganesha config to the RADOS config object using `rados put` from the Rook toolbox pod.
**Why:** The CephNFS CRD only exposes `spec.server` and `spec.security` fields. Custom NFS-Ganesha configuration must be applied by writing to the `.nfs` RADOS pool, as documented in Rook's NFS advanced configuration guide.

### 2. Non-existent `spec.rados.object` field and deprecated `spec.rados` section
**What was wrong:** The post included `spec.rados` with `pool`, `namespace`, and `object` sub-fields. The `object` sub-field never existed in any Rook version. The `rados` section itself is deprecated (both `pool` and `namespace` are internally managed since Rook v1.8+).
**What was changed:** Removed the entire `spec.rados` section from the CephNFS CR.
**Why:** The `.nfs` pool and namespace are now managed automatically by Rook/Ceph. Including deprecated or non-existent fields would cause validation errors or confusion.

### 3. Duplicate `server` key in YAML
**What was wrong:** The `server` key appeared twice in the CephNFS YAML spec. In YAML, duplicate keys cause the second to silently overwrite the first.
**What was changed:** Merged into a single `server` block with `active: 1` and `logLevel: NIV_INFO`.
**Why:** Duplicate YAML keys are invalid per the YAML spec and would silently discard the first `server` block.

### 4. Invalid `IDMAPD` NFS-Ganesha configuration block
**What was wrong:** The post used an `IDMAPD { Domain = cluster.local; }` block in the NFS-Ganesha configuration. `IDMAPD` is not a valid NFS-Ganesha configuration block name.
**What was changed:** Replaced with `NFSv4 { DomainName = cluster.local; }`, which is the correct Ganesha config block and parameter for setting the ID mapping domain.
**Why:** The valid NFS-Ganesha config blocks are documented in the ganesha-config man page. ID mapping domain is configured via `DomainName` in the `NFSv4` block (or in the newer `DIRECTORY_SERVICES` block).

### 5. Text references to non-existent CephNFS spec fields
**What was wrong:** Introductory and summary text described setting NFS version constraints "in the CephNFS spec" and "in the Ganesha config block within the CephNFS spec."
**What was changed:** Updated to accurately describe the two-step process: deploying the CephNFS resource, then configuring NFS-Ganesha via the RADOS config object.
**Why:** Accuracy of the described workflow needed to match the corrected code examples.

## Review Notes
- The `DomainName` parameter in the `NFSv4` block is technically deprecated in favor of `DIRECTORY_SERVICES { DomainName }` in newer NFS-Ganesha versions. The `NFSv4` block approach was kept because it is more widely compatible and better documented in the Rook ecosystem.
- The PersistentVolume example uses the in-tree NFS volume plugin (`spec.nfs`). While functional, the CSI NFS driver is the modern recommended approach for new deployments. This was not changed since the in-tree plugin still works.
- The `rpcinfo -p` verification command works but mainly shows RPC program registrations, not active NFSv4 client sessions. For detailed NFSv4 state, `ganesha_stats` or Ganesha's DBUS interface would be more informative. This was not changed as it's a valid diagnostic step.
