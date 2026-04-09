# Validation Summary: How to Fix BLUESTORE_NO_PER_PG_OMAP Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Pacific 16.x and later)
- BlueStore (Ceph storage backend)
- OMAP (Object Map storage)
- Rook (Kubernetes Ceph operator)
- ceph-bluestore-tool

## Sources Consulted
- [Ceph Health Checks Documentation](https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- [Ceph Health Checks RST (GitHub source)](https://github.com/ceph/ceph/blob/main/doc/rados/operations/health-checks.rst)
- [BlueStore Configuration Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/)
- [Pacific: BlueStore: Omap upgrade to per-pg fix fix (PR #43922)](https://github.com/ceph/ceph/pull/43922)
- [pacific: os/bluestore: fix invalid omap name conversion when upgrading to per-pg (PR #43793)](https://github.com/ceph/ceph/pull/43793)
- [Rook CephCluster CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Rook Ceph Configuration Documentation](https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)

## Issues Found

### 1. Wrong fix method (MAJOR)
**What was wrong:** The post claimed that per-PG OMAP migration happens via deep scrubs, identical to per-pool OMAP migration. This is incorrect. The official Ceph documentation states the fix is to stop each OSD, run `ceph-bluestore-tool repair --path /var/lib/ceph/osd/ceph-<id>`, and restart the OSD.
**What was changed:** Replaced the entire "Triggering Migration via Deep Scrub" section with the correct `ceph-bluestore-tool repair` procedure, including a per-OSD example and a batch loop for all affected OSDs.

### 2. Non-existent config option `bluestore_use_per_pg_omap` (MAJOR)
**What was wrong:** The post instructed readers to run `ceph config set osd bluestore_use_per_pg_omap true`. This config option does not exist in Ceph. The related config is `bluestore_warn_on_no_per_pg_omap` (which controls whether the warning is shown), not a toggle to enable the feature.
**What was changed:** Removed the `bluestore_use_per_pg_omap` config command entirely and replaced it with the correct repair-based fix.

### 3. Incorrect use of `ceph osd set-require-min-compat-client pacific` (MAJOR)
**What was wrong:** The post presented this command as a required step to enable per-PG OMAP. While this command exists and is valid syntax, it is relevant to per-pool OMAP migration, not per-PG OMAP. Per-PG OMAP is fixed via `ceph-bluestore-tool repair`.
**What was changed:** Removed this command from the fix instructions.

### 4. Irrelevant scrub tuning section (MAJOR)
**What was wrong:** The "Speeding Up Migration" section provided scrub parallelism tuning (`osd_max_scrubs`, `osd_scrub_begin_hour`, `osd_scrub_end_hour`). Since per-PG OMAP migration does not use deep scrubs, these settings are irrelevant.
**What was changed:** Removed the scrub tuning section entirely. Replaced with guidance on batch repairing OSDs one at a time with proper production cluster precautions.

### 5. Wrong Rook deployment instructions (MAJOR)
**What was wrong:** The Rook section used the non-existent `bluestore_use_per_pg_omap` config option in a CephCluster CRD snippet and instructed triggering deep scrubs via toolbox. Neither is correct for per-PG OMAP.
**What was changed:** Replaced with instructions to check affected OSDs from the Rook toolbox and guidance to consult Rook documentation for OSD maintenance/repair operations in containerized environments.

### 6. Unverifiable `ceph osd metadata` field (MINOR)
**What was wrong:** The post suggested checking `ceph osd metadata | grep per_pg_omap` to verify migration status. This metadata field could not be verified in official documentation.
**What was changed:** Removed the `ceph osd metadata` check. Kept `ceph health detail` as the primary verification method, which is documented.

### 7. Unsubstantiated benefit claims (MINOR)
**What was wrong:** The benefits section claimed CephFS directory operations and RGW bucket index operations benefit from per-PG OMAP. These claims are not supported by the official Ceph documentation, which only states "Per-PG omap allows faster PG removal when PGs migrate."
**What was changed:** Replaced with benefits that are documented or directly follow from the per-PG tracking design: faster PG removal during migration, more efficient PG splitting/merging, and more granular OMAP utilization tracking.

### 8. Inaccurate description (MINOR)
**What was wrong:** The description and opening paragraph described the feature as "segregating OMAP data by individual Placement Group" and enabling "more efficient recovery and garbage collection." The official docs describe it as tracking OMAP space utilization by PG, enabling faster PG removal.
**What was changed:** Updated the description and opening paragraph to match the official Ceph documentation language.

## Review Notes
- The `BLUESTORE_NO_PER_PG_OMAP` health check is real and was introduced in Ceph Pacific (16.x). The health warning format shown in the example output is consistent with Ceph's health check output style.
- The post originally confused per-PG OMAP migration (which uses `ceph-bluestore-tool repair`) with per-pool OMAP migration (which uses deep scrubs). These are related but distinct BlueStore improvements with different fix procedures.
- The warning can alternatively be silenced (without fixing the underlying issue) via `ceph config set global bluestore_warn_on_no_per_pg_omap false`, but this was not added to the post since the repair approach is the correct fix.
- The Rook section was simplified because performing OSD-level BlueStore repairs in containerized environments varies significantly by Rook version and deployment configuration.
