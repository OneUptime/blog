# Validation Summary: How to Configure crush-num-failure-domains in Erasure Coding

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (erasure coding, CRUSH algorithm, MSR rules)
- Rook (Ceph operator for Kubernetes)
- Ceph CLI (`ceph osd erasure-code-profile`, `ceph osd pool create`)

## Sources Consulted
- Ceph source code: `src/erasure-code/ErasureCode.cc` (default parameter values and parsing) — https://github.com/ceph/ceph/blob/main/src/erasure-code/ErasureCode.cc
- Ceph source code: `src/crush/CrushWrapper.cc` (MSR rule creation, no strict k+m equality validation) — https://github.com/ceph/ceph/blob/main/src/crush/CrushWrapper.cc
- Ceph source code: `src/crush/crush.h` (CRUSH_CHOOSE_N = 0 definition) — https://github.com/ceph/ceph/blob/main/src/crush/crush.h
- Ceph MSR documentation: `doc/dev/crush-msr.rst` (uneven distribution examples, 8+6 over 4 hosts) — https://github.com/ceph/ceph/blob/main/doc/dev/crush-msr.rst
- Ceph erasure code documentation: `doc/rados/operations/erasure-code.rst` (modern pool creation syntax) — https://github.com/ceph/ceph/blob/main/doc/rados/operations/erasure-code.rst
- Ceph CRUSH map documentation: `doc/rados/operations/crush-map.rst` (parameter names and descriptions) — https://github.com/ceph/ceph/blob/main/doc/rados/operations/crush-map.rst
- Ceph pool operations documentation: `doc/rados/operations/pools.rst` — https://github.com/ceph/ceph/blob/main/doc/rados/operations/pools.rst

## Issues Found

1. **Incorrect formula: strict equality vs inequality**
   - **What was wrong:** The post stated `k + m = crush-num-failure-domains * crush-osds-per-failure-domain` as a strict equality requirement and claimed that `4 + 2 = 4 * 2 = 8` would be "INCONSISTENT - would fail."
   - **What was changed:** Corrected the formula to `k + m <= crush-num-failure-domains * crush-osds-per-failure-domain`. The Ceph source code does not enforce strict equality; it creates enough mapping slots and uses only k+m of them. Added a corrected example showing that 4*2=8 is valid with 2 unused slots, and added a proper invalid example where slots < k+m.
   - **Why:** The MSR rule creation in `CrushWrapper.cc` does not validate k+m equality. The official `doc/dev/crush-msr.rst` demonstrates an 8+6 EC (k+m=14) spread over 4 hosts with 4 OSDs per host (4*4=16 slots, 2 unused).

2. **Incorrect claim that uneven distribution is "not directly supported"**
   - **What was wrong:** The post stated that spreading 6 chunks across 4 racks with uneven distribution is "not directly supported."
   - **What was changed:** Replaced the comment with an explanation that MSR rules handle uneven distribution automatically, and added a working command example for Option 2 using `crush-num-failure-domains=4` with `crush-osds-per-failure-domain=2`.
   - **Why:** MSR CRUSH rules (created when `crush-osds-per-failure-domain > 1`) explicitly support uneven distribution. The Ceph documentation example shows 14 chunks across 4 hosts: 3 hosts get 4 chunks and 1 host gets 2.

3. **Outdated pool creation syntax**
   - **What was wrong:** The pool creation command used `ceph osd pool create ec-rack-pool 64 64 erasure ec-rack-3`, explicitly specifying pg_num and pgp_num.
   - **What was changed:** Simplified to `ceph osd pool create ec-rack-pool erasure ec-rack-3`.
   - **Why:** Since Nautilus (2019), Ceph's PG autoscaler handles pg_num/pgp_num automatically. The modern recommended syntax from official documentation omits these values. While the old syntax still works, it is no longer the recommended approach.

## Review Notes
- The default value explanation (0 means "use k+m automatically") is a reasonable simplification. Technically, 0 maps to `CRUSH_CHOOSE_N` which means "use however many replicas/shards the pool needs" — for EC pools this equals k+m. The simplification is acceptable for a blog post.
- The post's command syntax and parameter names (`crush-failure-domain`, `crush-num-failure-domains`, `crush-osds-per-failure-domain`) are all correct per the Ceph source code.
- The `crush-num-failure-domains` and `crush-osds-per-failure-domain` parameters trigger MSR (Multi-Step Retry) CRUSH rule creation, which is a relatively newer Ceph feature. The post could benefit from noting which Ceph version introduced MSR support, but this is not a technical error.
