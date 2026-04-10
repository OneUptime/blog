# Validation Summary: How to Check Client Compatibility with CRUSH Tunables

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH algorithm and tunable profiles
- Rook (Kubernetes Ceph operator)
- crushtool (CRUSH map testing utility)

## Sources Consulted
- Ceph official documentation on CRUSH tunables: https://docs.ceph.com/en/latest/rados/operations/crush-map/#crush-tunables
- Ceph feature flags reference in source code (ceph_features.h)
- Ceph CLI reference for `ceph osd dump`, `ceph mon dump`, `ceph mon stat`, `ceph features`

## Issues Found

1. **CRUSH_TUNABLES2 and CRUSH_TUNABLES3 parenthetical descriptions were swapped**: The post listed `straw_calc_version=1` under CRUSH_TUNABLES2 (bobtail) and `chooseleaf_descend_once` under CRUSH_TUNABLES3 (firefly). Per the official Ceph docs, `chooseleaf_descend_once` is a bobtail tunable (CRUSH_TUNABLES2) and `straw_calc_version` is a firefly tunable (CRUSH_TUNABLES3). Fixed by swapping the parentheticals.

2. **CRUSH_TUNABLES5 incorrectly labeled as "hammer/jewel tunables (vary_r, chooseleaf_stable)"**: CRUSH_TUNABLES5 is the jewel-era feature flag for `chooseleaf_stable` only. The `chooseleaf_vary_r` tunable belongs to the hammer profile and is covered by a different feature flag (CRUSH_V4). Fixed to "jewel tunables (chooseleaf_stable)".

3. **`ceph mon dump | grep min_compat` command was misleading**: The `require_min_compat_client` field is stored in the OSD map (accessed via `ceph osd dump`), not the monitor map. The `ceph mon dump` output does not contain a `min_compat` field. Fixed to `ceph mon dump | grep min_mon_release` with an updated comment, since `min_mon_release` is the relevant field in the monitor map.

4. **`ceph mon stat` comment was incorrect**: The comment said "Show active monitor connections and their features" but `ceph mon stat` shows monitor quorum status (election epoch, quorum members, addresses), not client connection features. Fixed the comment to "Show monitor quorum status".

5. **Optimal profile minimum client version was wrong**: The table listed "Hammer (0.94) or later" for the optimal profile. In modern Ceph, `optimal` maps to jewel tunables (including `chooseleaf_stable`), which requires Jewel (10.2.x) or later clients. Hammer clients do not support `chooseleaf_stable`. Fixed to "Jewel (10.2.x) or later".

## Review Notes
- The feature flags list omits CRUSH_V4 (hammer's `chooseleaf_vary_r` feature flag), which is consistent with how the official Ceph documentation often presents the list (skipping from TUNABLES3 to TUNABLES5). This is acceptable but readers should be aware that hammer introduced its own feature flag (CRUSH_V4) separate from the TUNABLES series.
- The `ceph daemon mon.$(hostname) sessions` command assumes the monitor is named after the hostname. In Rook-deployed Ceph clusters, monitors are typically named `a`, `b`, `c`, so users may need to adjust the command accordingly.
- The Jewel version is listed as "10.x" in the profile table. The stable release series was 10.2.x; "10.x" is acceptable shorthand.
- The `ceph tell mon.* sessions` command may not work on all Ceph versions, as `sessions` is primarily an admin socket command. The `ceph daemon mon.<name> sessions` approach shown earlier is more reliable.
