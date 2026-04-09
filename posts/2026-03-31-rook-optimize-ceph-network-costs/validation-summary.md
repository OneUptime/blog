# Validation Summary: How to Optimize Ceph Network Costs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph Messenger v2 protocol
- CRUSH map rules
- Network configuration (jumbo frames, MTU, TCP tuning)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Network Providers documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/network-providers/
- Ceph Perf Counters documentation: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph source code for msgr2 compression options: https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- IBM Storage Ceph: Compression modes for Messenger v2: https://www.ibm.com/docs/en/storage-ceph/7.0.0?topic=management-compression-modes-messenger-v2-protocol

## Issues Found

1. **Rook CephCluster YAML used `selectors` with `provider: host` (incorrect)**
   - `spec.network.selectors` is for the Multus CNI provider, not for `provider: host`. With host networking, selectors are ignored. Additionally, the selectors contained raw interface names (`enp1s0`, `enp2s0`) instead of NetworkAttachmentDefinition references.
   - Fixed by replacing `selectors` with `addressRanges` containing CIDR subnets, which is the correct way to separate public and cluster networks with `provider: host`.

2. **Perf dump counter names were fabricated**
   - `d['osd']['osd_network_sent_bytes']` and `d['osd']['osd_network_received_bytes']` do not exist as Ceph perf counters. The `osd` section of `perf dump` contains operational metrics but not network byte counters.
   - Fixed to use the actual counters: `msgr_send_bytes` and `msgr_recv_bytes` under `AsyncMessenger::Worker-N` sections, summing across all workers.

3. **`ms_compress_on_wire` does not exist as a Ceph config option**
   - The blog used `ceph config set global ms_compress_on_wire true`. This option does not exist in Ceph. The actual messenger v2 compression options are `ms_osd_compress_mode` (values: `none`, `force`), `ms_osd_compression_algorithm` (default: `snappy`), and `ms_compress_secure` (bool).
   - Fixed to use the correct options: `ceph config set osd ms_osd_compress_mode force` and related settings. Also updated the section title from "Enable Messenger v2 with Compression" to "Enable Messenger v2 Compression".

4. **CRUSH rule command had invalid device class `host`**
   - `ceph osd crush rule create-replicated rack-rule default rack host` passes `host` as the device class (4th argument), but `host` is a bucket type, not a device class. Valid device classes are `hdd`, `ssd`, `nvme`, etc. This command would fail with `Error EINVAL: device class 'host' does not exist`.
   - Fixed by removing the invalid `host` argument: `ceph osd crush rule create-replicated rack-rule default rack`.

5. **CRUSH rule description was misleading**
   - The blog claimed the rule would "prefer same-rack placement to minimize top-of-rack switch hops," but using `rack` as the failure domain does the opposite: it distributes replicas across different racks for fault tolerance.
   - Fixed the description to accurately state that the rule distributes replicas across racks for fault tolerance with predictable traffic patterns.

6. **Misleading comment about `ms_tcp_rcvbuf` and jumbo frames**
   - The comment said "Configure Ceph to use jumbo frames" but `ms_tcp_rcvbuf` sets the TCP receive buffer size, not the MTU. Jumbo frames are configured at the OS/network level (which was correctly shown earlier in the same section).
   - Fixed the comment to "Increase TCP buffer size to better utilize high-bandwidth links".

## Review Notes
- The `osd_recovery_max_active` option has been split into `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` in Ceph Reef and later. The unified option still works as a fallback, but users on newer Ceph versions may want to use the device-specific variants.
- The cost calculations in the "Calculate Network Hardware Savings" section use approximate pricing that will vary by vendor and region. These are illustrative examples, not authoritative pricing.
- The messenger v2 compression feature (`ms_osd_compress_mode`) applies specifically to OSD-to-OSD traffic, not to all Ceph traffic. Client-to-OSD compression is not supported via this mechanism.
