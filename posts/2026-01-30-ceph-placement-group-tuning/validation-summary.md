# Validation Summary: How to Implement Ceph Placement Group Tuning

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ceph RADOS
- Ceph placement groups
- Ceph PG autoscaler
- Ceph balancer module
- CRUSH weights and OSD reweighting
- Bash monitoring scripts

## Sources Consulted
- Ceph Placement Groups documentation: https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph Placement Group States documentation: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph Balancer Module documentation: https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph Pool, PG and CRUSH Config Reference: https://docs.ceph.com/en/latest/rados/configuration/pool-pg-config-ref/
- Ceph mClock Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Ceph monitor command API reference: https://docs.ceph.com/en/latest/api/mon_command_api/

## Issues Found
- The recommended PG-per-OSD table used fixed values that did not match current Ceph guidance. Updated the ranges to align with Ceph's documented default/recommended targets and warning about excessive values above 500.
- The examples used `ceph pg ls-by-state`, which is not listed in the current Ceph command reference. Replaced those examples with `ceph pg ls --states ...`.
- The post referred to `active+recovery`, but the documented PG state is `recovering`. Updated the state name to `active+recovering`.
- The monitoring script parsed `ceph pg dump` using a fragile column number. Updated it to use `ceph pg dump pgs_brief` and parse the state column more directly.
- The monitoring script used `ceph pg ls-by-state` for counts. Updated it to use `ceph pg ls --states ... --format json` with `jq`.
- The troubleshooting section used `ceph pg force_recovery`, but the documented command is `ceph pg force-recovery`. Corrected the command and clarified that it prioritizes recovery rather than forcing immediate repair.
- The balancer mode comment omitted `upmap-read` and included `none` as a mode option. Updated the comment to list the documented balancer modes.
- The best-practices section said the upmap balancer works without data movement. Updated that wording because upmap avoids changing CRUSH weights but can still remap PGs.
- The recovery tuning section did not mention that mClock overrides several recovery and sleep settings in current Ceph releases. Added a concise caveat before the example settings.

## Review Notes
The remaining examples are illustrative and assume an administrator has a working Ceph cluster and appropriate permissions. Some operational tuning values, such as target ratios and recovery settings, remain workload-dependent and should be validated in a staging environment before production use.
