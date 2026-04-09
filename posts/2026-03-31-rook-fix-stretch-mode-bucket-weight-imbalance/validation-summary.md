# Validation Summary: How to Fix UNEVEN_WEIGHTS_STRETCH_MODE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (stretch mode, CRUSH maps, OSD management)
- Rook (CephCluster CRD, storage node configuration)
- Kubernetes (Rook operator context)

## Sources Consulted
- [Ceph Stretch Clusters Documentation (Reef)](https://docs.ceph.com/en/reef/rados/operations/stretch-mode/)
- [Ceph Health Checks Documentation (Reef)](https://docs.ceph.com/en/reef/rados/operations/health-checks/)
- [Ceph Control Commands Documentation](https://docs.ceph.com/en/latest/rados/operations/control/)
- [PR #52457 - reef: osd/OSDMap: Check for uneven weights & != 2 buckets post stretch mode](https://github.com/ceph/ceph/pull/52457)
- [PR #52458 - quincy: osd/OSDMap: Check for uneven weights & != 2 buckets post stretch mode](https://github.com/ceph/ceph/pull/52458)
- [Difference Between ceph osd reweight and ceph osd crush reweight (Ceph Blog)](https://ceph.io/en/news/blog/2014/difference-between-ceph-osd-reweight-and-ceph-osd-crush-reweight/)
- [Rook CephCluster CRD Documentation](https://rook.io/docs/rook/v1.9/CRDs/ceph-cluster-crd/?h=devicefilter)
- [Ceph OSDMap source code (OSDMap.cc)](https://github.com/ceph/ceph/blob/main/src/osd/OSDMap.cc)

## Issues Found

1. **Incorrect health check name (throughout post)**: The post used `STRETCH_MODE_BUCKET_WEIGHT_IMBALANCE` which is not a real Ceph health check code. The correct health check name is `UNEVEN_WEIGHTS_STRETCH_MODE`, introduced in PRs #52457 (Reef) and #52458 (Quincy) which added weight imbalance checks to `OSDMap::check_health()`. Fixed all six occurrences throughout the post (title, description, section heading, example output, and summary).

2. **Incorrect example health detail output**: The example `ceph health detail` output used the fabricated code `STRETCH_MODE_BUCKET_WEIGHT_IMBALANCE` with message text "Stretch mode buckets have weight imbalance". Updated to use the correct code `UNEVEN_WEIGHTS_STRETCH_MODE` with more accurate message text "Stretch mode buckets have uneven weights".

3. **Inconsistent heading label**: "Step 4 - Verify Balance" was inconsistent with the "Option 1/2/3" naming used for the preceding sections. Since Options 1-3 are alternatives (not sequential steps), labeling the verification section as "Step 4" incorrectly implies a sequential workflow. Changed to "Verify Balance" to clarify it applies after any of the options.

## Review Notes
- The `ceph pg dump | awk '{print $1, $14}'` command references column 14 for PG distribution analysis. The exact column numbers in `ceph pg dump` output can vary between Ceph versions, so readers may need to adjust the column index. The general approach is sound.
- The distinction between `ceph osd reweight` (override weight, 0.0-1.0 range) and `ceph osd crush reweight` (CRUSH weight, reflects device size in TiB) is correctly represented in the post, with the two commands appearing in separate sections for appropriate use cases.
- The Rook CephCluster YAML using `spec.storage.nodes` with `deviceFilter` is valid syntax. More recent Rook versions also support `storageClassDeviceSets` for more dynamic storage provisioning, but the `nodes`-based approach remains supported.
- There is a companion health check `INCORRECT_NUM_BUCKETS_STRETCH_MODE` that fires when there are not exactly 2 dividing buckets in stretch mode. The post could mention this related check, but it is not a required addition.
