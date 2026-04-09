# Validation Summary: How to Enable Msgr2 Protocol Encryption in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes
- Msgr2 (Ceph messenger v2 protocol)
- AES-128-GCM encryption
- CephFS (kernel and FUSE clients)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph msgr2 protocol specification: https://docs.ceph.com/en/latest/dev/msgr2/
- Ceph source code (crypto_onwire.cc): https://github.com/ceph/ceph/blob/main/src/msg/async/crypto_onwire.cc
- Ceph configuration options source (global.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Rook CSI drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Ceph kernel features documentation: https://docs.ceph.com/en/reef/cephfs/kernel-features/

## Issues Found

1. **Incorrect `ceph tell` subcommand**: The post used `ceph tell mon.* connection dump` to verify encryption status. The subcommand `connection dump` does not exist. Changed to `ceph tell mon.a messenger dump`, which is the correct admin socket command for dumping messenger connection details including encryption status (shows `protocol.v2.con_mode` and `protocol.v2.crypto.rx` fields).

2. **Incorrect claim about daemon restarts**: The post stated "Ceph performs a rolling config update without requiring daemon restarts" when disabling encryption. This is incorrect. The messenger mode settings (`ms_cluster_mode`, `ms_service_mode`, `ms_client_mode`) have the `startup` flag in Ceph's configuration system, meaning they are only read at daemon startup and cannot be changed at runtime. Changed to accurately state that Rook performs rolling restarts of Ceph daemons to apply the configuration change.

## Review Notes
- The `ceph config get` verification commands use specific daemon names (`mon.a`, `osd.0`) as examples. Users will need to substitute their actual daemon names, which may differ depending on their deployment.
- The encryption modes table is a helpful simplification. In practice, `ms_cluster_mode` and related options accept ordered lists of modes (e.g., `crc secure`), not just single values. Rook abstracts this complexity via the CRD boolean flags, so the simplification is appropriate for this audience.
- The Ceph image version `quay.io/ceph/ceph:v19.2.0` (Squid release) is current and appropriate for the publication date.
