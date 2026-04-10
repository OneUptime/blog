# Validation Summary: How to Understand CRUSH Tunables (Legacy Through Jewel)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH algorithm (Controlled Replication Under Scalable Hashing)
- CRUSH tunables and named profiles (legacy, argonaut, bobtail, firefly, hammer, jewel, optimal)
- Rook (Kubernetes storage orchestrator for Ceph)

## Sources Consulted
- Ceph official documentation: CRUSH Map operations (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph source code: `doc/rados/operations/crush-map.rst` (https://github.com/ceph/ceph/blob/main/doc/rados/operations/crush-map.rst)
- Ceph source code: `src/crush/CrushWrapper.h` — tunable profile setter functions (https://github.com/ceph/ceph/blob/main/src/crush/CrushWrapper.h)
- Ceph source code: `crush/crush.h` — tunable struct definitions

## Issues Found

1. **Incorrect profile attribution for `chooseleaf_descend_once`**: The post attributed `chooseleaf_descend_once=1` to the Firefly profile. According to the official Ceph documentation and source code (`set_tunables_bobtail()`), this tunable was introduced in the **Bobtail** profile. Fixed the table row and the tunable description.

2. **Incorrect profile attribution for `chooseleaf_vary_r`**: The post attributed `chooseleaf_vary_r=1` to the Hammer profile. Per the official docs (firefly/CRUSH_TUNABLES3 section) and source code (`set_tunables_firefly()`), this was introduced in the **Firefly** profile. Fixed the table row, tunable description, and summary paragraph.

3. **Incorrect profile attribution for `straw_calc_version`**: The post attributed `straw_calc_version=1` to the Bobtail profile. The official docs explicitly state this tunable was introduced in **Firefly**. The `set_tunables_bobtail()` function in the source code does not set `straw_calc_version`. Fixed the table row and tunable description.

4. **Incorrect description of Hammer profile**: With the above corrections, Hammer's actual key contribution was the addition of the **straw2 bucket type** and expanded `allowed_bucket_algs` bitmask. Updated the table accordingly.

5. **Argonaut profile description overstated**: The original claimed argonaut "Fixed indep mode" but this is not supported by official documentation. Changed to "Minor internal fixes" which is more accurate.

6. **`choose_local_tries` description conflated with `choose_local_fallback_tries`**: The original described it as "Number of retries using local fallback before giving up" which conflates it with the separate `choose_local_fallback_tries` tunable. Changed to "Number of local retries before re-descent" per official docs.

7. **`chooseleaf_descend_once` described as reducing "unnecessary I/O"**: This tunable affects CRUSH algorithm retry behavior (computational), not I/O operations. Changed to "reducing unnecessary retries."

8. **Summary paragraph referenced Hammer instead of Firefly** for `chooseleaf_vary_r`. Fixed to correctly attribute it to Firefly.

## Review Notes
- The post omits the `default` profile which is documented in official Ceph docs as a separate profile distinct from `optimal`. This is a minor omission since `default` and `optimal` are functionally identical in modern Ceph and the post's scope is legacy-through-jewel.
- The `choose_total_tries` default of 50 is correct for modern profiles (bobtail+), but the legacy/argonaut default was 19. The post says "Default=50" which is accurate for current practice but could note the historical value.
- All CLI commands (`ceph osd crush show-tunables`, `ceph osd crush tunables optimal`, `ceph osd getcrushmap`, `crushtool -d`) are verified correct.
- The example tunable output values (including `allowed_bucket_algs=54`) are verified correct for the optimal profile.
- The `chooseleaf_stable` explanation and its importance are accurately described.
