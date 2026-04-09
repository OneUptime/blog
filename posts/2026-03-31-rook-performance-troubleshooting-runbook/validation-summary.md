# Validation Summary: How to Create a Ceph Performance Troubleshooting Runbook

## Status
validated

## Post Type
Runbook / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- BlueStore (Ceph OSD backend)
- CRUSH (Ceph placement algorithm)
- rados bench (Ceph benchmarking tool)

## Sources Consulted
- Ceph iostat mgr module documentation: https://docs.ceph.com/en/quincy/mgr/iostat/
- Ceph iostat module source code (src/pybind/mgr/iostat/module.py) on GitHub
- Ceph BlueStore perf counters source code (src/os/bluestore/BlueStore.cc, BlueStore.h) on GitHub
- Ceph man page for `ceph` CLI: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph perf counters documentation: https://docs.ceph.com/en/latest/dev/perf_counters/
- Rook toolbox documentation: https://rook.github.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook ceph Dockerfile (images/ceph/Dockerfile) on GitHub
- Ceph container Containerfile on GitHub
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found

1. **`ceph iostat 5` incorrect syntax**: The `ceph iostat` command does not accept a bare positional argument for the poll interval. The correct syntax is `ceph iostat -p 5` to set a 5-second refresh interval. Fixed to `ceph iostat -p 5`.

2. **`ceph tell osd.* perf dump` piped to `python3 -m json.tool`**: Using the wildcard `osd.*` produces multiple concatenated JSON objects (one per OSD), which is not valid JSON for `python3 -m json.tool`. Changed to target a single OSD (`osd.0`) to produce valid JSON output that can be properly formatted.

3. **BlueStore perf counter names do not exist**: The script referenced `bluestore_cache_hits` and `bluestore_cache_misses`, but these counters do not exist in Ceph. The actual BlueStore cache-related counters in the `bluestore` perf dump section are `onode_hits`, `onode_misses` (for onode cache) and `buffer_hit_bytes`, `buffer_miss_bytes` (for buffer cache). Updated the Python script to use the correct counter names.

4. **`iperf3` not available in rook-ceph-tools image**: The `iperf3` tool is not pre-installed in the standard rook-ceph-tools container image. Added a `dnf install -y iperf3` step before using it. Also fixed inconsistent pod reference from `rook-ceph-tools` to `deploy/rook-ceph-tools` to match the rest of the post.

## Review Notes
- The `ceph pg dump | awk '{print $1, $14}'` command uses column `$14`, which is version-specific. The column layout of `ceph pg dump` output varies across Ceph releases, so readers may need to adjust the column number for their version.
- The `ceph osd crush reweight osd.5 2.0` example uses a weight of 2.0, which is correct syntax. Note that CRUSH weight typically reflects disk capacity in TiB (e.g., 2.0 for a 2 TB disk), so readers should use a value appropriate for their hardware.
- The 50ms latency threshold mentioned in Step 1 is a reasonable rule of thumb but is workload-dependent. Some latency-sensitive workloads may require investigation at lower thresholds.
