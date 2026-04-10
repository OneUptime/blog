# Validation Summary: How to Understand Ceph Data Scrubbing (Light and Deep)

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Ceph (storage cluster, OSD scrubbing subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl for toolbox access)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph CLI reference for `ceph pg` subcommands: https://docs.ceph.com/en/latest/rados/operations/pg-concepts/
- Ceph configuration reference for scrub-related options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#scrubbing
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The `ceph pg dump | awk '{print $1, $19, $20}'` commands use hardcoded column positions that are version-dependent. The column numbers for scrub timestamps may differ across Ceph releases (e.g., Quincy vs Reef vs Squid). Readers should verify column positions against their version's `ceph pg dump` output. This is a common pattern in Ceph tutorials and not incorrect, but fragile.
- All Ceph configuration parameter names, default values, and CLI commands are accurate for current Ceph releases (Reef/Squid).
- The 604800-second (7-day) default for `osd_deep_scrub_interval` and the 1209600-second (14-day) example are mathematically correct.
- The `ceph pg ls inconsistent` command is valid syntax for filtering PGs by state.
