# Validation Summary: How to Configure DmClock Weight for Ceph Client Priority

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (mClock / DmClock OSD scheduler)
- Rook (Ceph operator for Kubernetes)
- RBD (RADOS Block Device) QoS
- rados bench (benchmarking tool)

## Sources Consulted
- Ceph official documentation on mClock OSD scheduler: https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Ceph documentation on OSD config options (osd_mclock_scheduler_client_wgt, background_recovery_wgt, background_best_effort_wgt)
- Ceph documentation on mClock profiles (balanced, high_client_ops, high_recovery_ops, custom)
- Ceph RBD QoS documentation: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph admin socket / `ceph daemon` perf dump reference
- rados bench CLI reference

## Issues Found
- **Incorrect percentage calculations**: The post stated that with weights 400/100/50, client I/O receives "67%" of spare capacity, recovery "17%", and best-effort "8%". The total is 400+100+50=550, so the correct percentages are: client 73% (400/550), recovery 18% (100/550), best-effort 9% (50/550). It appears the author mistakenly used 600 as the denominator. Fixed all three percentages.

## Review Notes
- The section "Using mClock Profiles as Starting Points" suggests overriding individual mClock parameters after selecting a non-custom profile. In Ceph, manually overriding mClock parameters when a built-in profile (like `high_client_ops`) is active may not persist as expected, since the profile controls those values. The recommended approach is to switch to the `custom` profile before making manual adjustments. This behavior may vary by Ceph version, so flagging as a caveat rather than an error.
- The "Weighting by Client Type with RBD QoS" section discusses RBD QoS burst settings, which operate at the client-side rate-limiting layer, not at the OSD-level DmClock scheduler. The section is not incorrect, but the connection to DmClock weight is indirect. The framing as "effective priority" is acceptable but readers should understand these are different mechanisms.
- All `ceph config` parameter names (osd_mclock_scheduler_client_wgt, etc.) are correct for Ceph Quincy and later.
- The `ceph daemon osd.0 perf dump` command and the Python filtering script are syntactically correct.
- The `rados bench` command syntax is correct.
