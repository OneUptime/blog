# Validation Summary: How to Enable Encryption in Transit for Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph msgr2 protocol (messenger v2)
- Kubernetes
- cert-manager
- Prometheus alerting
- TLS / AES-GCM encryption

## Sources Consulted
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph source code (global.yaml.in config definitions): https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Ceph monitoring documentation (messenger dump command): https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook CephCluster CRD source (pkg/apis/ceph.rook.io/v1/types.go): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook cluster.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
- Rook operator source (cluster.go - configureMsgr2 function): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/cluster.go
- Clyso Ceph on-the-wire encryption guide: https://docs.clyso.com/docs/kb/general/network-encryption/
- Rook GitHub issue #3966 (admin socket access in Rook): https://github.com/rook/rook/issues/3966

## Issues Found

### 1. Incorrect msgr2 modes description
**What was wrong:** The post claimed three msgr2 encryption modes: `crc`, `secure`, and `prefer-secure`. In reality, there are only two connection modes for the `ms_cluster_mode`, `ms_service_mode`, and `ms_client_mode` config keys: `crc` and `secure`. The `prefer-secure` keyword exists only in the kernel CephFS mount context (`mount.ceph`), not in the daemon config keys. Additionally, these config keys accept space-separated lists (e.g., `"crc secure"`) where ordering expresses preference. The default is `"crc secure"` (a list), not just `"crc"`.
**What was changed:** Corrected to describe two modes with an explanation of how the space-separated list ordering controls preference.

### 2. Invalid `ceph tell osd.0 connections` command
**What was wrong:** The command `ceph tell osd.0 connections` does not exist in Ceph.
**What was changed:** Replaced with `ceph tell osd.0 messenger dump client`, which is the correct command to inspect active connections and their encryption status from the tools pod.

### 3. Invalid `ceph daemon osd.0 sessions` command
**What was wrong:** The command `ceph daemon osd.0 sessions` does not exist. Furthermore, `ceph daemon` commands require access to the daemon's Unix admin socket, which is only available inside the actual OSD pod, not from the rook-ceph-tools pod.
**What was changed:** Removed the invalid command and replaced the section with instructions on how to interpret the `messenger dump` output — specifically checking the `protocol.v2.crypto.rx` field for `"AES-128-GCM"` (encrypted) vs `"crc"` (unencrypted).

### 4. Misleading Prometheus alert description
**What was wrong:** The alert was described as detecting "any Ceph connection falls back to unencrypted mode", but the expression `ceph_health_status == 2` monitors overall cluster health (HEALTH_ERR), not encryption status specifically.
**What was changed:** Updated the description to accurately state that the alert monitors cluster health errors (which may include encryption-related issues). Added a note clarifying that `ceph_health_status` is not encryption-specific and pointing users to `messenger dump` for direct encryption verification.

## Review Notes
- The post describes two approaches to enabling encryption: manual `ceph config set` commands and the Rook CephCluster `spec.network.connections.encryption.enabled: true` field. Both achieve the same result (setting `ms_*_mode` to `secure`), so using both is redundant. The CephCluster spec approach is preferred as it is declarative and managed by the Rook operator.
- The performance impact estimates (5-15% without AES-NI, 2-5% with AES-NI) are commonly cited but vary significantly based on workload characteristics and hardware. These are reasonable ballpark figures.
- The cert-manager Certificate resource and dashboard TLS configuration are syntactically correct and match the Rook API.
- Monitor traffic defaults to `"secure crc"` (preferring secure) even without explicit configuration, which is worth noting but not an error in the post.
