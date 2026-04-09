# Validation Summary: How to Track Protocol Encryption and Compression Status in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph Messenger v2 (msgr2) protocol
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- On-wire encryption (AES-128-GCM)
- On-wire compression (snappy, zlib, zstd)

## Sources Consulted
- Ceph msgr2 configuration documentation: https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- Ceph msgr2 protocol specification: https://docs.ceph.com/en/latest/dev/msgr2/
- Ceph config option definitions in source: https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Ceph AsyncMessenger source (admin socket commands): https://github.com/ceph/ceph/blob/main/src/msg/async/AsyncMessenger.cc
- Ceph AsyncConnection source (dump output format): https://github.com/ceph/ceph/blob/main/src/msg/async/AsyncConnection.cc
- Linux kernel Ceph connection mode constants: https://github.com/torvalds/linux/blob/master/include/linux/ceph/ceph_fs.h
- Ceph Quincy release notes (on-wire compression): https://ceph.io/en/news/blog/2022/v17-2-0-quincy-released/
- Ceph PR #36517 (on-wire compression feature): https://github.com/ceph/ceph/pull/36517

## Issues Found

1. **Fabricated `none` security mode**: The post listed three msgr2 security modes (`none`, `crc`, `secure`). Ceph msgr2 only supports two modes: `crc` and `secure`. There is no `none` mode. Removed the `none` row from the table and changed "three" to "two".

2. **Fabricated `ms_compress_on_wire` config option**: The post used `ceph config set global ms_compress_on_wire true`, which is not a real Ceph config option. Removed this line entirely.

3. **Incorrect compression config scope and missing options**: The compression settings were applied to `global` scope but should target `osd` since on-wire compression only applies to OSD-to-OSD communication. Also added the missing `ms_osd_compression_algorithm` option (defaults to `snappy`) and the important `ms_compress_secure` option (needed when both encryption and compression are enabled). Updated `ms_osd_compress_min_size` from 512 to the correct default of 1024.

4. **Non-existent `dump_connections` admin socket command**: The post used `ceph daemon osd.0 dump_connections`, which does not exist in Ceph. The correct command is `messenger dump`. Replaced with `ceph tell osd.0 messenger dump`.

5. **`ceph daemon` cannot be run from the tools pod**: The post ran `ceph daemon osd.0 ...` from the rook-ceph-tools pod. The `ceph daemon` command requires access to the local Unix admin socket, which is only available inside the OSD pod itself. Replaced with `ceph tell`, which routes through the MON cluster and can be run from the tools pod.

6. **Fabricated JSON output format in Python script**: The Python script parsed a JSON structure with a `connections` array containing `peer` and `policy.features` fields. The real `messenger dump` output has a completely different structure (nested under `messenger` key, connections as a dict keyed by peer address, protocol info under `protocol.v2.con_mode`). Removed the incorrect Python parsing script and replaced with a simpler description of the output.

## Review Notes
- The `ms_compress_secure` option defaults to `false`, meaning compression is silently disabled when encryption (`secure` mode) is active unless explicitly enabled. This is a security design decision to prevent CRIME/BREACH-style attacks. The post should ideally mention this caveat more prominently.
- The default values for `ms_cluster_mode` and `ms_service_mode` are `crc secure` (preferring CRC), while monitor-related options (`ms_mon_cluster_mode`, `ms_mon_service_mode`, `ms_mon_client_mode`) default to `secure crc` (preferring encryption). The post doesn't mention these defaults, which could be useful context.
- On-wire compression was introduced in Ceph Quincy (v17.2.0) and is off by default. The post doesn't mention version requirements.
- The `grep -o 'aes' /proc/cpuinfo` command in the "Impact on Performance" section would need to be run on the host nodes, not from a Kubernetes pod, unless the pod has access to the host's `/proc/cpuinfo`.
