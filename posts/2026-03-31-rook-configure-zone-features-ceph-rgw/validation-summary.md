# Validation Summary: How to Configure Zone Features in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multisite zone and zonegroup configuration
- radosgw-admin CLI
- Rook Ceph Operator (CephObjectZone CRD)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph source code: `src/rgw/rgw_zone_features.h` — authoritative list of zone features
- Ceph source code: `src/rgw/radosgw-admin.cc` — `--enable-feature` / `--disable-feature` flag parsing and behavior
- Ceph source code: `src/rgw/rgw_zone.cc` — `RGWZoneParams::dump()` (zone get output) vs `RGWZoneGroup::dump()` (zonegroup get output)
- Ceph official documentation on multisite configuration: https://docs.ceph.com/en/reef/radosgw/multisite/
- Rook documentation on CephObjectZone CRD: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-zone-crd/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

### 1. Incorrect zone feature names (compress, encrypt, index.lazy)
**What was wrong:** The post listed four zone features: `resharding`, `compress`, `encrypt`, and `index.lazy`. Only `resharding` is a real zone feature. `compress` and `encrypt` do not exist as separate features — the actual feature is `compress-encrypted` (enables combining server-side encryption and compression on the same object). `index.lazy` does not exist at all in Ceph.
**What was changed:** Replaced the feature list with the correct features: `resharding`, `compress-encrypted`, and `notification_v2`.
**Why:** The feature names must match exactly what `radosgw-admin` accepts; using incorrect names would cause validation errors.

### 2. Comma-separated --enable-feature syntax does not work
**What was wrong:** The post showed `--enable-feature=resharding,compress` to enable multiple features at once. The radosgw-admin CLI parses the entire value as a single feature name, so `"resharding,compress"` would fail feature validation.
**What was changed:** Changed to use separate `--enable-feature` flags: `--enable-feature=resharding --enable-feature=compress-encrypted`.
**Why:** Each feature must be specified with its own `--enable-feature` flag.

### 3. zone get does not show feature fields
**What was wrong:** The post stated that `radosgw-admin zone get` output includes `supported_features` and `enabled_features` fields. This is incorrect. `zone get` outputs `RGWZoneParams` which contains pool and placement configuration but NOT feature fields. The `supported_features` field is on zone entries within `zonegroup get` output, and `enabled_features` is a top-level field on `zonegroup get` output.
**What was changed:** Changed all `zone get` commands for checking features to `zonegroup get` with appropriate jq queries.
**Why:** Using `zone get` to check features would show no feature information, confusing readers.

### 4. Updated post description
**What was wrong:** The description referenced "compression, encryption, and sync features" which reflected the incorrect feature names.
**What was changed:** Updated to "resharding, compressed encryption, and notification features".
**Why:** Consistency with the corrected feature names.

## Review Notes
- The `compress-encrypted` feature is disabled by default for security reasons — compression ratios can leak information about encrypted data (similar to CRIME/BREACH attacks). The post could note this caveat in the future.
- `period update --commit` is only needed in multisite setups with realms. Without a realm, RGW daemons must be restarted manually. The post could clarify this distinction.
- The `--disable-feature` on a zone will error if the feature is still enabled at the zonegroup level — readers may want to know to disable at the zonegroup first.
- The Rook CephObjectZone YAML shown does not directly configure zone features (it configures pools and endpoints). The post correctly notes that the toolbox must be used for feature commands, which is accurate.
