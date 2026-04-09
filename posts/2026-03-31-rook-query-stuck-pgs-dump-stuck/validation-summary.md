# Validation Summary: How to Query Stuck PGs with ceph pg dump_stuck

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Storage cluster, PG management)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl commands, pod management)

## Sources Consulted
- Ceph official documentation: Placement Groups page (docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph man page for `ceph` CLI (docs.ceph.com/en/latest/man/8/ceph/)
- Ceph source code: `src/mon/PGMap.cc` — `dump_stuck` implementation and default type handling
- Ceph source code: `src/common/options/mgr.yaml.in` — `mon_pg_stuck_threshold` config option definition
- Ceph OSD configuration reference (docs.ceph.com/en/latest/rados/configuration/osd-config-ref/) — `osd_op_complaint_time` documentation

## Issues Found

1. **Incorrect config parameter reference (line 15):** The post claimed PGs are considered stuck based on the `osd_op_complaint_time` threshold (default: 30 seconds). This is wrong — `osd_op_complaint_time` controls slow operation logging on OSDs and is unrelated to `dump_stuck`. The actual threshold is a command-line parameter defaulting to 300 seconds (per docs), controlled by the `mon_pg_stuck_threshold` configuration option. Fixed to reference the correct mechanism.

2. **Incorrect default behavior description (line 19):** The post said running `dump_stuck` without arguments shows "all stuck PGs." In reality, when no type is specified, the command defaults to showing only `unclean` stuck PGs (confirmed in source: `stuckop_vec.push_back("unclean")`). Fixed to clarify the default is `unclean`.

3. **Output columns wrong order and missing column (lines 63-72):** The post described 5 columns with the third being "acting set." The actual output has 6 columns in order: PG_STAT, STATE, UP (up set), UP_PRIMARY, ACTING (acting set), ACTING_PRIMARY. The post had the up and acting sets conflated and was missing a column. Fixed to show all 6 columns with correct labels.

4. **Missing `degraded` stuck type:** The `degraded` type is a valid filter for `dump_stuck` but was not included in the filtering examples or the summary. Added a `degraded` example and updated the summary list.

## Review Notes
- The Ceph official documentation page states the default stuck threshold is 300 seconds, but the source code (`mon_pg_stuck_threshold`) shows a default of 60 seconds (1 minute) since at least the Nautilus release. The blog post uses the 300-second value from the docs, which we preserved since it matches the official documentation, but users may observe a 60-second default in practice depending on their Ceph version.
- The `peering` type is also supported in the Ceph source code for `dump_stuck` but is not prominently documented on the official placement groups page. It was not added to the blog to keep the post aligned with the official docs.
- The monitoring script uses `-it` flags with `kubectl exec`, which would not work in a non-interactive cron or CI context. Users should use `-i` or no TTY flags in automated scripts. This was left as-is since it is presented as a simple example.
