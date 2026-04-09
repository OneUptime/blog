# Validation Summary: How to Enable Network Compression in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system, Squid v19.2.0)
- Kubernetes
- Msgr2 protocol (Ceph messenger v2)

## Sources Consulted
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest-release/CRDs/specification/
- Rook CephCluster CRD docs: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Ceph Msgr2 protocol documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph Squid v19.2.0 release notes: https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/
- Rook GitHub issue #12622 (compression/encryption restart behavior)
- Rook GitHub PR #12791 (daemon restart on network setting changes)

## Issues Found

### 1. Fabricated Ceph config option names (lines 74-89, 99-109)
**What was wrong:** The post used `ms_compress_msgs`, `ms_cluster_compress_msgs`, and `ms_compress_msgs_algorithm` as Ceph configuration option names. These do not exist in Ceph.
**What was changed:** Replaced with the correct option names: `ms_osd_compress_mode`, `ms_osd_compression_algorithm`. Updated all verification commands and expected output accordingly.

### 2. Incorrect claim about compression + encryption behavior (line 67)
**What was wrong:** The post stated "Ceph applies compression before encryption, so compressed messages are then encrypted for security." This is factually incorrect. When encryption is enabled, Ceph disables compression by default for security reasons. Compression on encrypted connections requires explicitly setting `ms_compress_secure` to `true`.
**What was changed:** Rewrote the "Combining Encryption and Compression" section to accurately explain that compression is silently disabled when encryption is active, and that `ms_compress_secure` must be explicitly set to override this behavior.

### 3. Misleading `perf dump` compression stats claim (lines 115-118)
**What was wrong:** The post suggested using `ceph tell osd.0 perf dump | grep compress` to check msgr2 wire compression stats. The compression counters in `perf dump` are for BlueStore at-rest compression, not msgr2 messenger compression. Msgr2 does not expose dedicated per-connection compression ratio counters.
**What was changed:** Replaced with accurate guidance: compare network throughput before/after enabling compression using `sar`, and use the `AsyncMessenger` perf counters (`msgr_send_bytes`, `msgr_recv_bytes`) to observe changes in wire traffic volume.

### 4. Incorrect claim about no daemon restarts (line 145)
**What was wrong:** The post stated "Apply and Ceph updates the configuration rolling without daemon restarts." Compression is negotiated during the Msgr2 connection handshake, so changing compression settings requires daemon restarts. Rook explicitly triggers rolling restarts when these network settings change (per Rook PR #12791).
**What was changed:** Corrected to state that Rook will trigger a rolling restart of Ceph daemons to apply the change.

### 5. Updated summary section
**What was changed:** Added a note about compression being disabled when encryption is enabled, and corrected the grep pattern from `grep compress` to `grep ms_osd_compress`.

## Review Notes
- The Rook CRD fields (`network.connections.compression.enabled`, `network.connections.requireMsgr2`) are accurate and verified against the official Rook CRD specification.
- The Ceph container image `quay.io/ceph/ceph:v19.2.0` is a valid released image (Ceph Squid first stable release, September 2024).
- The `snappy` default compression algorithm claim is consistent with Ceph documentation, though the option name was corrected.
- The "When NOT to Enable Compression" section is technically sound with accurate guidance.
