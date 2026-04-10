# Validation Summary: How to Configure Shallow Scrubbing Intervals in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (OSD scrubbing subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec for toolbox access)

## Sources Consulted
- Ceph OSD configuration source code (`src/common/options/osd.yaml.in` on `main` branch): https://github.com/ceph/ceph/blob/main/src/common/options/osd.yaml.in
- Ceph OSD Config Reference documentation (`doc/rados/configuration/osd-config-ref.rst`): https://github.com/ceph/ceph/blob/main/doc/rados/configuration/osd-config-ref.rst
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Advanced Ceph Configuration guide: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found

### 1. Incorrect claim that shallow scrubbing verifies checksums
- **What was wrong:** The post stated shallow scrubbing verifies "object sizes, checksums, and attributes." Checksum verification is performed by deep scrubbing, not shallow scrubbing. Shallow scrubbing only compares object sizes and attributes (xattrs/omap) across replicas.
- **What was changed:** Removed "checksums" from the shallow scrubbing description and clarified that deep scrubbing is what verifies data checksums.
- **Why:** Per the Ceph OSD config reference: "Light scrubbing checks the object size and attributes." Checksums are explicitly a deep scrub operation.

### 2. Incorrect Rook CephCluster spec for scrub settings
- **What was wrong:** The post showed scrub interval settings under `spec.storage.config` in the Rook CephCluster CRD. This field only accepts OSD provisioning-time settings (metadataDevice, osdsPerDevice, deviceClass, etc.) and does not support arbitrary Ceph runtime configuration like scrub intervals. The YAML as written would have no effect on scrub behavior.
- **What was changed:** Replaced the incorrect `spec.storage.config` YAML with the correct `rook-config-override` ConfigMap approach, which injects settings into `ceph.conf`.
- **Why:** Per the Rook CephCluster CRD documentation, `spec.storage.config` only supports a fixed set of OSD provisioning keys. The `rook-config-override` ConfigMap is the documented method for injecting custom Ceph configuration.

## Review Notes
- The `osd_max_scrubs` default has changed from 1 to 3 in modern Ceph (current `main` branch). The post sets it to 1 as a throttling example, which is valid, but users should be aware the default is now 3.
- The `ceph pg dump | awk '{print $1, $14}'` command's column positions are version-dependent. The `ceph pg dump` output format varies across Ceph releases, so the `$14` column may not correspond to the last scrub timestamp in all versions.
- The `ceph health detail | grep "not scrubbed"` pattern is correct — Ceph emits health warnings like "not scrubbed since" for PGs that exceed `osd_scrub_max_interval`.
