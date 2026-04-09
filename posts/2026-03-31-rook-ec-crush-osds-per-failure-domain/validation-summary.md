# Validation Summary: How to Configure crush-osds-per-failure-domain in Erasure Coding

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (erasure code profiles, CRUSH rules, OSD pools)
- Rook (CephBlockPool CRD)
- Erasure Coding (k+m schemes, fault tolerance)

## Sources Consulted
- Ceph source code: `src/erasure-code/ErasureCode.cc` — default values and `create_rule` logic (https://github.com/ceph/ceph/blob/main/src/erasure-code/ErasureCode.cc)
- Ceph source code: `src/erasure-code/ErasureCode.h` — member variable defaults (https://github.com/ceph/ceph/blob/main/src/erasure-code/ErasureCode.h)
- Ceph official documentation: Erasure Code Profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph official documentation: Pool Operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Rook source code: `pkg/daemon/ceph/client/erasure-code-profile.go` — `CreateErasureCodeProfile` function (https://github.com/rook/rook/blob/master/pkg/daemon/ceph/client/erasure-code-profile.go)
- Rook source code: `pkg/daemon/ceph/client/pool.go` — `SetPoolProperty` and parameter handling (https://github.com/rook/rook/blob/master/pkg/daemon/ceph/client/pool.go)
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` — CRD type definitions for PoolSpec and ErasureCodedSpec (https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go)

## Issues Found

### 1. Incorrect default value for crush-osds-per-failure-domain
- **What was wrong:** The post stated "By default, this value is 1" and referenced `crush-osds-per-failure-domain=1` as the default. The actual default is 0 (not set), meaning the standard CRUSH rule path is used (which results in one chunk per failure domain, but the parameter value itself is 0, not 1).
- **What was changed:** Updated the description to say the parameter is "not set (value 0)" by default, and changed the "When to Use" section to say "without `crush-osds-per-failure-domain`" instead of `=1`. Updated Summary section accordingly.
- **Why:** The Ceph source code (`ErasureCode.cc`) initializes this to `"0"`. When the value is 0 (or <= 1), the `create_rule` function takes the standard `add_simple_rule` path. Stating the default as 1 is factually incorrect and could confuse users inspecting profile output.

### 2. Missing required crush-num-failure-domains parameter in profile creation command
- **What was wrong:** The profile creation command only specified `crush-osds-per-failure-domain=2` without `crush-num-failure-domains`. When `crush-osds-per-failure-domain > 1`, Ceph requires `crush-num-failure-domains >= 1` — it is not auto-calculated. Omitting it causes pool creation to fail with: `"crush-num-failure-domains 0 must be >= 1 if crush-osds-per-failure-domain specified"`.
- **What was changed:** Added `crush-num-failure-domains=3` to the profile creation command.
- **Why:** The Ceph source code (`ErasureCode.cc`, lines 86-91) explicitly checks that `crush-num-failure-domains >= 1` when `crush-osds-per-failure-domain > 1` and returns `-EINVAL` if not. The expected output already showed `crush-num-failure-domains=3`, but it must be explicitly set.

### 3. Incorrect Rook CRD configuration for crush-osds-per-failure-domain
- **What was wrong:** The post showed setting `crush-osds-per-failure-domain: "2"` under `spec.parameters` in a CephBlockPool CRD. The `spec.parameters` field is used for pool-level properties (applied via `ceph osd pool set`), not erasure code profile parameters. Rook's `CreateErasureCodeProfile` function only passes `k`, `m`, `plugin`, `technique`, `crush-failure-domain`, `crush-root`, and `crush-device-class` — it has no support for `crush-osds-per-failure-domain` or `crush-num-failure-domains`.
- **What was changed:** Rewrote the Rook section to explain that the CRD does not support this parameter natively, and that users must create the erasure code profile manually via the Rook toolbox CLI.
- **Why:** Using `spec.parameters` would attempt `ceph osd pool set <pool> crush-osds-per-failure-domain 2`, which is not a valid pool property and would fail silently or with an error.

## Review Notes
- The pool creation command `ceph osd pool create ec-dense 64 64 erasure ec-dense-profile` uses the legacy two-PG-number syntax. While still valid, modern Ceph (Nautilus+) has the PG autoscaler enabled by default, making manual PG specification generally unnecessary. This is not incorrect, just slightly outdated.
- The fault tolerance analysis (losing 1 host = losing 2 chunks, recoverable with m=2; losing 2 hosts = data loss) is correct and well-explained.
- The `ceph osd tree | grep "^-" | grep "host" | wc -l` command works but is fragile — it depends on the text formatting of `ceph osd tree` output. A more robust approach would be `ceph osd tree --format json`, but for a tutorial this is acceptable.
- The `allow_ec_overwrites` section is correct — this flag is required for RBD and CephFS on erasure coded pools.
