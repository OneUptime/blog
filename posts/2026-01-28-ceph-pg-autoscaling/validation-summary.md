# Validation Summary: How to Build Ceph PG Autoscaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage)
- Ceph PG Autoscaler (mgr module)
- CRUSH (Controlled Replication Under Scalable Hashing)
- RBD (RADOS Block Device)
- CephFS
- Kubernetes (mentioned as a context for RBD pools)

## Sources Consulted
- [Autoscaling placement groups – Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- [Pool, PG and CRUSH Config Reference – Ceph Documentation](https://docs.ceph.com/en/reef/rados/configuration/pool-pg-config-ref/)
- [Ceph.io – Everything you need to know about the PG Autoscaler before and after upgrading to Quincy](https://ceph.io/en/news/blog/2022/autoscaler_tuning/)
- [Ceph source: `src/pybind/mgr/pg_autoscaler/module.py`](https://github.com/ceph/ceph/blob/main/src/pybind/mgr/pg_autoscaler/module.py)
- [Ceph Bug #25112 – mon_max_pg_per_osd default raised to 250](https://tracker.ceph.com/issues/25112)

## Issues Found

1. **Default-enabled version was wrong.** Post claimed pg_autoscaler is "enabled by default" starting with Pacific (16.x). Per the Octopus (v15.2.0) release notes, the module has been enabled by default and `pg_autoscale_mode` set to `on` for new pools since Octopus (15.x). Changed wording to "In Ceph Octopus (15.x) and later, it's enabled by default for newly created pools."

2. **Wrong config option name for target PGs per OSD.** Post used `osd_target_pg_per_osd`. The correct option is `mon_target_pg_per_osd` (default 100). Updated the `ceph config set global ...` command accordingly.

3. **Misleading comment + wrong section for the `ceph config get` example.** Post showed `ceph config get mon osd_pool_default_pg_autoscale_mode` with the comment "View current target ratio". The option actually controls the default autoscale mode for new pools, and the section it's stored in is `global`, not `mon`. Changed the command to `ceph config get global osd_pool_default_pg_autoscale_mode` and rewrote the comment.

4. **Non-existent config option `osd_pg_autoscale_bias_factor`.** This setting does not exist in Ceph. The intent was "allow more aggressive scaling". Replaced with the real knob: `ceph config set mgr mgr/pg_autoscaler/threshold 2.0` (lowering the scaling threshold makes the autoscaler act sooner; default is 3.0).

5. **Non-existent config option `mon_pg_autoscale_bias_factor`.** Same problem in the "Too frequent scaling causing performance issues" troubleshooting block. Replaced with `ceph config set mgr mgr/pg_autoscaler/threshold 5.0` (raising the threshold makes the autoscaler act less often).

6. **Wrong default for `mgr/pg_autoscaler/sleep_interval`.** Post stated the default is 30 seconds. The default in the autoscaler module source is 60 seconds. Corrected the inline comment and bumped the example new value from 60 to 120 so it still represents "longer than default".

7. **Added the documented default for `mon_max_pg_per_osd` (250)** in the "Tuning for Large Clusters" code comment so the reader can see what they're moving away from.

## Review Notes
- The `autoscale-status` example output uses the legacy column layout (no `EFFECTIVE RATIO`, `BIAS`, or `BULK` columns). That layout still matches what older clusters print and isn't wrong, just dated; left as-is to avoid restructuring content.
- The `--bulk` flag (introduced in 16.2.8) is not covered. Worth mentioning in a future update for readers who manage pools they know will grow large, but adding new sections is out of scope for this review.
- Per-pool `threshold` is also supported via `ceph osd pool set <pool> threshold <value>` on recent releases; the post now uses the global manager-level knob for simplicity, which is broadly compatible.
- The Mermaid "decision flow" diagram's "Difference > 3x" matches the default `threshold` of 3.0, so the diagram is consistent with reality.
