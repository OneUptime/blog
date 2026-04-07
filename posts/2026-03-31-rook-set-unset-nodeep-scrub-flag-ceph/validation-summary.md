# Validation Summary: How to Set and Unset the nodeep-scrub Flag in Ceph

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (OSD flags, scrubbing subsystem)
- Rook (context, though commands are native Ceph CLI)
- jq (JSON filtering)
- awk (text processing)

## Sources Consulted
- Ceph official documentation on OSD flags and scrubbing: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph configuration reference for scrub options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph `pg dump` and `pg deep-scrub` CLI reference: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
No technical issues found.

## Review Notes
- The `osd_scrub_begin_hour` and `osd_scrub_end_hour` settings control the time window for all scrubs (both light and deep), not only deep scrubs. The post's statement that this "limits deep scrubs to nighttime hours" is true but incomplete — light scrubs are also restricted to that window. This is a minor omission, not an error.
- The `awk` command using column `$22` for last deep scrub timestamp is fragile across Ceph versions, as column positions in `ceph pg dump` text output can shift. The JSON + jq approach shown earlier in the post is more reliable. This is worth noting but not incorrect as presented.
- All CLI commands (`ceph osd set/unset nodeep-scrub`, `ceph pg deep-scrub`, `ceph osd pool deep-scrub`, `ceph config set`) are valid and current.
- Default scrub intervals cited (daily for light, weekly for deep) match Ceph defaults (`osd_scrub_min_interval` = 86400s, `osd_deep_scrub_interval` = 604800s).
