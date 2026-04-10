# Validation Summary: How to Set Up Active/Standby MDS for CephFS HA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- Ceph Metadata Server (MDS)
- Kubernetes (pod placement, ConfigMaps)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph MDS documentation: https://docs.ceph.com/en/latest/cephfs/standby/
- Ceph MDS admin socket / tell commands: https://docs.ceph.com/en/latest/man/8/ceph/#mds
- Ceph MDS perf counters documentation: https://docs.ceph.com/en/latest/dev/perf_counters/
- Rook configuration override documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found

### Issue 1: Incorrect Standby MDS description (line 18)
- **What was wrong:** The standby MDS was described as a "warm spare that mirrors the active's journal." A regular standby MDS is a cold spare — it sits idle and does not replay the journal. Only the standby-replay MDS mirrors the active journal. The post itself correctly describes standby-replay separately, making the standby description contradictory.
- **What was changed:** Changed "warm spare that mirrors the active's journal" to "cold spare that remains idle until needed for failover."
- **Why:** Accurately distinguishes between standby (cold) and standby-replay (hot) roles, which is central to the post's topic.

### Issue 2: `ceph daemon` commands run from wrong context (lines 133-139)
- **What was wrong:** The monitoring section used `ceph daemon mds.0` commands executed from the `rook-ceph-tools` deployment. The `ceph daemon` command connects via the local admin socket, which is only available inside the container where the MDS daemon actually runs. Running these from the tools pod would fail with a socket connection error.
- **What was changed:** Replaced `ceph daemon mds.0 perf dump` with `ceph tell mds.0 perf dump mds_mem`, and `ceph daemon mds.0 cache status` with `ceph tell mds.0 cache status`. The `ceph tell` command routes through the Ceph monitors and works from any pod with ceph client access.
- **Why:** The original commands would not work as written in a Rook deployment. `ceph tell` is the correct remote equivalent.

### Issue 3: Incorrect perf counter JSON path (line 135)
- **What was wrong:** The Python one-liner parsed the perf dump output using `d['mds']['mds_mem.heap']`, but MDS perf counters are organized into separate sections (e.g., `mds_mem`, `mds_log`, `mds`). The correct path would be `d['mds_mem']['heap']`. Additionally, `mds_mem.heap` may not exist as a counter in all Ceph versions.
- **What was changed:** Replaced the entire `perf dump | python3` pipeline with a direct `ceph tell mds.0 perf dump mds_mem` command that dumps the full `mds_mem` section, which is simpler and more robust.
- **Why:** The fragile Python one-liner with an incorrect JSON path would fail. Showing the full `mds_mem` section is more useful and less error-prone.

## Review Notes
- The `mds_cache_reservation = 0.05` and `mds_health_cache_threshold = 1.5` values in the MDS Memory Tuning section are the Ceph defaults. They are technically correct but may mislead readers into thinking these are tuned values. The author likely included them for explicitness.
- The CephFilesystem CRD YAML is correct for current Rook versions (v1.x). The `activeStandby: true` field correctly triggers both the deployment of standby MDS pods and the Ceph-level `allow_standby_replay` setting.
- The anti-affinity placement configuration correctly targets the `app=rook-ceph-mds` label, which is the label applied by the Rook operator to MDS pods.
- The failover test procedure using `ceph mds fail myfs:0` is correct and is the standard way to test MDS HA.
