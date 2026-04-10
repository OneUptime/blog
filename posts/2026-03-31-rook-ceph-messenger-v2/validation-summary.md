# Validation Summary: How to Set Up Messenger v2 Protocol in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (Messenger v2 / msgr2 protocol)
- Rook (CephCluster CRD)
- Kubernetes (kubectl exec for Rook toolbox)

## Sources Consulted
- Ceph Messenger v2 protocol documentation: https://docs.ceph.com/en/quincy/dev/msgr2/
- Ceph Messenger v2 configuration reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- Ceph source code `src/msg/async/crypto_onwire.cc` — confirms AES-128-GCM cipher
- Ceph source code `src/common/options/global.yaml.in` — confirms `ms_compress_secure` and `ms_osd_compress_mode` config options
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph msgr2 early design document (v12.2.x): https://docs.huihoo.com/ceph/v12.2.x/dev/msgr2/index.html

## Issues Found

1. **"connection multiplexing" claim (line 17)**: The post listed "connection multiplexing" as a msgr2 feature. While the msgr2 protocol design includes a `stream_id` field as scaffolding for multiplexing, this is not an actively used or advertised feature in current Ceph releases. Changed to "improved framing and connection handling" which accurately describes the production behavior.

2. **`ms_osd_compress_mode` set to `snappy` (compression section)**: The post used `ceph config set osd ms_osd_compress_mode snappy`, treating the option as an algorithm selector. However, `ms_osd_compress_mode` accepts `none` or `force` (whether to compress), not algorithm names. Changed the value to `force` and updated the comment to clarify the valid values.

3. **`ceph daemon osd.0 perf dump` from tools pod (verification section)**: The `ceph daemon` command communicates via the local admin socket, which is only accessible inside the OSD pod itself — not from the Rook toolbox pod. Changed to `ceph tell osd.0 perf dump`, which sends the command remotely via the monitor and works from the toolbox pod.

## Review Notes

- The mode options section lists only `crc` and `secure`. Ceph also supports `prefer-crc` and `prefer-secure` which allow fallback negotiation. These are omitted for simplicity, which is reasonable for a tutorial focused on enforcing secure mode, but readers exploring flexible configurations should consult the Ceph docs.
- The `ceph tell mon.* sessions | grep v1` command for checking legacy v1 clients is primarily documented as an admin socket command (`ceph daemon mon.<id> sessions`). Its behavior via `ceph tell` may vary across Ceph versions.
- The `ceph -w | grep msgr` command is syntactically valid but may not produce useful output, since `ceph -w` shows cluster status events that don't typically reference the messenger protocol version.
- AES-128-GCM encryption claim is confirmed correct per Ceph source code.
- Rook CephCluster CRD structure (`spec.network.connections.requireMsgr2`, `encryption.enabled`, `compression.enabled`) is confirmed correct.
- Port assignments (3300 for msgr2, 6789 for msgr1) are confirmed correct.
