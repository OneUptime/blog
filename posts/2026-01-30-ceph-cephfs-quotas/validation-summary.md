# Validation Summary: How to Create CephFS Quotas: A Complete Guide

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- CephFS
- CephFS quotas and virtual extended attributes
- Linux `setfattr` and `getfattr`
- Bash scripting
- Python Prometheus exporter
- Prometheus alert rules
- Kubernetes Jobs
- Rook-Ceph `CephFilesystemSubVolumeGroup` CRDs

## Sources Consulted
- CephFS Quotas, Ceph documentation: https://docs.ceph.com/en/latest/cephfs/quota/
- CephFS client configuration reference, Ceph documentation: https://docs.ceph.com/en/mimic/cephfs/client-config-ref/
- CephFS FS volumes and subvolumes, Ceph documentation: https://docs.ceph.com/en/reef/cephfs/fs-volumes
- Rook CephFilesystemSubVolumeGroup CRD documentation: https://rook.io/docs/rook/v1.19/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd/
- Rook CRD specification for `CephFilesystemSubVolumeGroup`: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook direct mount tools documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/direct-tools/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/

## Issues Found
- The prerequisites recommended Luminous or later for CephFS quotas. Ceph documents kernel-client quota support as requiring Linux kernel 4.17 or later with Mimic or newer clusters, while `ceph-fuse` and `libcephfs` also support quotas. Updated the prerequisite to recommend Mimic or later for kernel clients.
- The prerequisites omitted the Linux `attr` utilities even though the guide depends on `setfattr` and `getfattr`. Added `attr` utilities to the prerequisites.
- The combined quota verification used `getfattr -d -m ceph.quota`, but CephFS virtual xattrs are hidden from `listxattr(2)` and should be read by explicit attribute name. Replaced it with explicit `getfattr -n ceph.quota.max_bytes` and `getfattr -n ceph.quota.max_files` commands.
- The enforcement diagram and explanation implied that the MDS performs a hard quota gate. Ceph documents CephFS quotas as cooperative and imprecise, with clients stopping writers shortly after limits are crossed. Updated the diagram and text to describe client-side cooperative enforcement.
- The Rook Job example mounted with a non-standard `/etc/ceph/admin.secret` file and did not include the Ceph config/keyring layout used by Rook direct mount examples. Updated the Job to project `rook-ceph-config` and `rook-ceph-admin-keyring`, derive monitor endpoints and admin secret from `/etc/ceph/ceph.conf` and `/etc/ceph/keyring`, and run the container as privileged for mounting.
- The Rook SubVolumeGroup section claimed quotas were not directly supported in the CRD and had to be applied afterward. Rook documents `spec.quota` for `CephFilesystemSubVolumeGroup`. Updated the CRD example to use `quota: 1Ti` and changed the follow-up command to verify the quota rather than manually set it.
- The best-practices hierarchy described parent quotas as hard ceilings. Updated this to note the overall ceiling is subject to CephFS quota enforcement lag.
- The troubleshooting section incorrectly suggested checking MDS filesystem output for quota enablement. Replaced this with checks for client support, the default `client quota` setting, and explicit reads of the quota xattrs.

## Review Notes
- The local environment did not have `setfattr` or `getfattr` installed, so those commands were verified against Ceph documentation rather than local `--help` output.
- The Python exporter snippet was syntax-checked with `py_compile`.
- The YAML snippets were parsed successfully with PyYAML.
