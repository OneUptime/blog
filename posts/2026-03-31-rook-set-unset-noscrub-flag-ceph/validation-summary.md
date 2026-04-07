# Validation Summary: How to Set and Unset the noscrub Flag in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (OSD scrubbing subsystem)
- Rook (Ceph operator for Kubernetes, referenced via tags)
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation on OSD flags and scrubbing: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on pool commands: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph PG dump JSON schema for scrub-related fields

## Issues Found
1. **Incorrect jq field name for last scrub time**: The post used `last_scrub` in the jq query to "check the last scrub time for a pool." The `last_scrub` field contains the scrub epoch/version marker, not the timestamp. Changed to `last_scrub_stamp` which contains the actual datetime of the last scrub.

2. **Inaccurate version attribution for per-pool scrub control**: The post claimed "Since Ceph Quincy, you can control scrub at the pool level." Pool-level `noscrub` and `nodeep-scrub` flags have been available since well before Quincy (at least since Luminous). Removed the incorrect version attribution and changed to a neutral statement.

## Review Notes
- All `ceph osd set/unset noscrub` commands are correct.
- The `ceph osd pool scrub` and `ceph pg scrub` commands are correct.
- The HEALTH_WARN message format for noscrub is accurate.
- The explanation of light scrub vs deep scrub behavior is accurate.
- The default daily scrub interval claim is correct (osd_scrub_min_interval defaults to 86400 seconds).
