# Validation Summary: How to Configure Specific Devices and Nodes for Rook-Ceph Storage

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Squid v19.2.0)
- Kubernetes (CephCluster CRD, kubectl)
- OSD (Object Storage Daemon) configuration
- CRUSH device classes
- dm-crypt encryption for OSDs

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CRD Specification: https://www.rook.io/docs/rook/latest-release/CRDs/specification/
- Rook OSD Management documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Ceph Squid v19.2.0 release notes: https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/
- Rook GitHub repository (deploy/examples/): https://github.com/rook/rook

## Issues Found
No technical issues found.

## Review Notes
- The API version `ceph.rook.io/v1` is correct for the CephCluster CRD.
- The `spec.storage.nodes` structure with `name`, `devices`, and `config` sub-fields is accurate per official Rook documentation.
- All referenced config options (`deviceClass`, `metadataDevice`, `osdsPerDevice`, `encryptedDevice`) are valid and correctly described.
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Squid) is a valid release from the official container registry.
- The environment variables `ROOK_OSD_ID` and `ROOK_BLOCK_PATH` are present in OSD pods and correctly used for device identification.
- The label `app=rook-ceph-osd` is correct for selecting OSD daemon pods. Note that OSD prepare pods use the label `app=rook-ceph-osd-prepare`, but the blog's usage (listing and inspecting running OSDs) correctly targets only the daemon pods.
- The mermaid diagram illustrates a mixed-hardware concept (node-3 with nvme1n1) that differs from the immediately following basic config example (node-3 with sdb/sdc). This is not incorrect but could be slightly confusing; however, it serves as a general architectural overview rather than a direct representation of the basic config.
- Using stable device paths (`/dev/disk/by-id/`, `/dev/disk/by-path/`) is correctly recommended as best practice over kernel device names for production environments.
