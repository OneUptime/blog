# Validation Summary: How to Plan RAM Requirements for Ceph Monitors and OSDs

## Status
validated

## Post Type
Reference guide / capacity planning guide

## Technologies Covered
- Ceph (BlueStore, OSD, Monitor, MDS, RGW)
- Rook (Kubernetes Ceph operator, CephCluster CRD)
- kubectl

## Sources Consulted
- Ceph official hardware recommendations: https://docs.ceph.com/en/latest/start/hardware-recommendations/
- Ceph BlueStore configuration reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph source: `src/common/options/global.yaml.in` (osd_memory_target, bluestore_cache_autotune defaults)
- Ceph source: `src/common/options/mds.yaml.in` (mds_cache_memory_limit)
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook source: `pkg/operator/ceph/cluster/osd/config/config.go` (spec.storage.config field parsing)

## Issues Found

**1. Incorrect BlueStore terminology (fixed)**
- **Wrong:** "BlueStore uses a write-ahead cache and metadata cache"
- **Fixed to:** "BlueStore uses a write-ahead log (WAL) and metadata cache"
- **Why:** BlueStore's WAL is a durability journal, not a cache. Conflating WAL with cache misrepresents the architecture. The correct Ceph terminology throughout the documentation is "write-ahead log."

**2. Fabricated `ceph osd memory` command (fixed)**
- **Wrong:** `ceph osd memory --format=json | jq '.osds[] | {id:.id, allocated_bytes:.heap_allocated_bytes}'`
- **Fixed to:** `ceph tell osd.* heap stats`
- **Why:** The `ceph osd memory` subcommand does not exist in Ceph's CLI. The field `.heap_allocated_bytes` also does not exist in the codebase. The correct approach for inspecting per-OSD heap memory is `ceph tell osd.* heap stats`, which uses TCMalloc's stats interface.

**3. Incorrect Rook CephCluster YAML field path (fixed)**
- **Wrong:**
  ```yaml
  spec:
    storage:
      config:
        osd_memory_target: "5368709120"
  ```
- **Fixed to:**
  ```yaml
  spec:
    cephConfig:
      osd:
        osd_memory_target: "5368709120"
  ```
- **Why:** Rook's `spec.storage.config` field only parses a specific set of storage device config keys (`walSizeMB`, `databaseSizeMB`, `osdsPerDevice`, etc.). Any unrecognized key like `osd_memory_target` is silently ignored by `ToStoreConfig()`. The correct mechanism for setting arbitrary Ceph config keys through Rook is `spec.cephConfig`.

## Review Notes

- **Monitor RAM table:** The post's values (1-2 GB up to 50 OSDs, 4-8 GB for 50-500 OSDs, etc.) represent process-level memory guidance. Official Ceph hardware recommendations reference total monitor node RAM (32 GB for small clusters, 64 GB for up to 300 OSDs, 128 GB for larger). The post's table is a reasonable practical decomposition but may understate requirements for production deployments. The official documentation also cites a minimum of ~5 GB per monitor daemon for production, which slightly exceeds the "1-2 GB" lower bound for small clusters.

- **MDS RAM table:** The post lists "4-8 GB" for fewer than 1 million inodes. The official Ceph hardware recommendations state a minimum of 8 GiB per MDS daemon. The lower end of 4 GB is below the official minimum and may lead to poor MDS performance.

- **ceph-osd process overhead listed as 512 MB:** The Ceph config key `osd_memory_base` (the base overhead subtracted when auto-tuning caches) defaults to 768 MiB, not 512 MB. The breakdown in the post is editorial and the 512 MB figure does not match the actual default.

- **RGW memory (256-512 MB per worker thread):** No official Ceph documentation quantifies per-worker-thread RGW memory consumption. This is an editorial estimate that may be reasonable but cannot be verified against official sources.

- **`bluestore_cache_autotune` and `osd_memory_target` defaults:** Both confirmed correct against Ceph source (`global.yaml.in`). `bluestore_cache_autotune` defaults to `true`; `osd_memory_target` defaults to 4 GiB (4,294,967,296 bytes).

- **`mds_cache_memory_limit` config key:** Confirmed correct. The value 8589934592 is correctly equal to 8 GiB.

- **Arithmetic in Step 4 comment:** `(64 - 8) / 12 ≈ 4.7 GB` is correct.

- **5368709120 = 5 GiB:** Correct (5 × 1024³).
