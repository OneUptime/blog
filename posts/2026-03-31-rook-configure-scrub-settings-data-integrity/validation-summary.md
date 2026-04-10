# Validation Summary: How to Configure Scrub Settings for Maximum Data Integrity

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (OSD scrubbing subsystem)
- Rook (Ceph operator for Kubernetes)
- Prometheus (alerting rules)
- Bash / awk (for PG status scripting)

## Sources Consulted
- Ceph official documentation: OSD configuration reference for scrub parameters (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph official documentation: Pool settings and per-pool overrides
- Ceph official documentation: `ceph config set` CLI reference
- Ceph source code: OSD scrub scheduler week day mapping (0=Sunday through 6=Saturday)
- Prometheus alerting rules specification (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

## Issues Found
1. **Incorrect `osd_scrub_begin_week_day` value (line 52)**: The config set `osd_scrub_begin_week_day` to `0`, which corresponds to **Sunday** in Ceph's day-of-week mapping (0=Sunday, 1=Monday, ..., 6=Saturday). The accompanying description stated "weekdays only," which is incorrect when Sunday is included. Changed the value from `0` to `1` (Monday) so the window correctly covers Monday through Friday, matching the stated intent.

## Review Notes
- The `ceph pg dump` awk scripts (lines 86-91) use hardcoded column positions ($18, $19) which are version-dependent. The output format of `ceph pg dump` varies across Ceph releases, so these column numbers may not be accurate for all versions. Users should verify column positions for their specific Ceph version, or use `ceph pg dump --format json | jq` for more reliable parsing.
- The `scrub_priority` pool-level property (used in the "Prioritizing Scrubs for High-Value Data" section) may not be available in all Ceph versions. Users should verify this property exists in their deployment.
- The Prometheus metric `ceph_pg_last_deep_scrub_stamp` used in the alert rule is conceptually correct but the exact metric name exported by the Ceph MGR Prometheus module may vary by version and configuration.
- All `ceph config set osd` commands use correct syntax and valid parameter names.
- The default values in the parameter table are accurate for current Ceph releases.
