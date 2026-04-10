# Validation Summary: How to Configure CephFS for High-Throughput Workloads

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph / CephFS
- Ceph OSD, MDS, and client configuration
- Kubernetes (kubectl, CRDs, PVC-based storage)
- fio (benchmarking tool)
- Linux networking (jumbo frames, MTU)

## Sources Consulted
- Rook CephCluster CRD network documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook source code (`pkg/apis/ceph.rook.io/v1/types.go`) for NetworkSpec and AddressRangesSpec
- Rook GitHub PR #12778 introducing `addressRanges` (Rook v1.12.4+)
- CephFS Client Configuration Reference: https://docs.ceph.com/en/latest/cephfs/client-config-ref/
- Ceph source: `src/common/options/mds-client.yaml.in` for client config option definitions and defaults
- CephFS file layout documentation: https://docs.ceph.com/en/latest/cephfs/file-layouts/
- fio documentation for benchmark parameters

## Issues Found

### 1. Network configuration: `selectors` used incorrectly with `provider: host`
- **What was wrong:** The network config used `selectors` with bare interface names (`"eth1"`, `"eth2"`) under `provider: host`. The `selectors` field is exclusively for the Multus CNI provider and accepts NetworkAttachmentDefinition names, not interface names. With `provider: host`, selectors are ignored.
- **What was changed:** Replaced `selectors` with `addressRanges` containing CIDR notation (`"192.168.1.0/24"` for public, `"10.0.0.0/24"` for cluster). The `addressRanges` field (introduced in Rook v1.12.4) is the correct way to specify public/cluster network separation with host networking. Ceph binds to whichever host interface has an IP matching the specified CIDR range.
- **Why:** Using `selectors` with host networking has no effect — the configuration would silently fail to separate public and cluster traffic.

### 2. `client_write_size` is not a real Ceph configuration option
- **What was wrong:** The command `ceph config set client client_write_size 67108864` uses a non-existent Ceph config option. Ceph's config store silently accepts unknown keys, so this would not error but would have zero effect.
- **What was changed:** Replaced `client_write_size` with `client_oc_max_dirty` set to 268435456 (256 MiB). This is the correct option controlling the maximum amount of dirty data in the client object cache before writeback is forced (default: 100 MiB / 104857600 bytes).
- **Why:** `client_oc_max_dirty` is the primary lever for improving write throughput — increasing it allows more data to accumulate before flushing, reducing write stalls.

### 3. `client_oc_size` value was smaller than the default
- **What was wrong:** The post set `client_oc_size` to 134217728 (128 MiB) while claiming to "increase" the write buffer. The actual default for `client_oc_size` is 209715200 (200 MiB), so this would have *decreased* the object cache size.
- **What was changed:** Increased the value to 536870912 (512 MiB), which is meaningfully above the 200 MiB default and appropriate for high-throughput workloads.
- **Why:** Setting the cache smaller than the default contradicts the stated goal and would hurt throughput.

## Review Notes
- The fio benchmark uses `--ioengine=libaio` without `--direct=1`. While the command will run, `libaio` is most effective with direct I/O. Without it, the `--iodepth=32` parameter may not achieve the intended I/O parallelism because buffered writes complete immediately at the page cache level. For accurate storage throughput measurement, adding `--direct=1` would be recommended.
- The fio command uses a single `--filename` with `--numjobs=16`, meaning all 16 jobs write to the same file. For CephFS throughput testing, using `--directory` with per-job files would avoid lock contention on the single file's inode.
- The `ceph osd perf` command shows OSD latency statistics, not throughput directly. `ceph osd pool stats` or monitoring via Prometheus/Grafana would give better aggregate throughput metrics.
- The MDS YAML snippet is shown as a fragment (no full CephFilesystem resource). This is fine for illustration but readers should know it belongs under `spec.metadataServer` of a CephFilesystem CRD.
- The `addressRanges` field requires Rook v1.12.4+. The post does not specify a Rook version, so readers on older versions would need to configure network CIDRs via the `rook-config-override` ConfigMap instead.
