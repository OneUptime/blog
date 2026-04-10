# Validation Summary: How to Configure chooseleaf_vary_r and chooseleaf_stable Tunables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH map tunables)
- Rook (Ceph orchestration on Kubernetes)
- crushtool (CRUSH map compilation/testing utility)

## Sources Consulted
- Ceph official documentation on CRUSH map tunables: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph source code (CrushWrapper.h) for tunable profile definitions: https://github.com/ceph/ceph/blob/main/src/crush/CrushWrapper.h
- Ceph PR #6572 (chooseleaf_stable tunable introduction): https://github.com/ceph/ceph/pull/6572
- Ceph PR #7964 (tunable profile documentation updates): https://github.com/ceph/ceph/pull/7964

## Issues Found
1. **Incorrect release attribution for chooseleaf_vary_r**: The post stated that `chooseleaf_vary_r` became a default in the "Hammer" release. According to the Ceph source code (`CrushWrapper.h`), `chooseleaf_vary_r=1` was first set in the **Firefly** tunable profile (`set_tunables_firefly()`). Hammer inherits this value but its distinguishing change was `straw_calc_version`. Fixed "Hammer" to "Firefly" in the introductory paragraph.

2. **Misleading tunable profile recommendation**: The code example for enabling `chooseleaf_vary_r` used `ceph osd crush tunables hammer`, implying Hammer is the minimum required profile. Changed to `ceph osd crush tunables firefly` with a clarifying comment, since Firefly is the minimum profile that sets `chooseleaf_vary_r=1`.

## Review Notes
- All CLI commands (`ceph osd crush show-tunables`, `ceph osd getcrushmap`, `crushtool -d/-c`, `ceph osd setcrushmap`, `ceph osd set/unset norebalance`) are syntactically correct and use valid flags.
- The `crushtool --test` invocation with `--rule`, `--num-rep`, `--min-x`, `--max-x`, and `--show-statistics` flags is correct.
- The explanation of what `chooseleaf_vary_r` and `chooseleaf_stable` do is a reasonable simplification of the actual CRUSH algorithm behavior.
- The `optimal` profile correctly includes both tunables set to 1 (it maps to Jewel + `straw_calc_version=1`).
- The maintenance window procedure using `norebalance` is a common practice. Some administrators additionally use `nobackfill` and `norecover` for more complete control over data movement, but the approach shown is not incorrect.
