# Validation Summary: How to Interpret Ceph Health Status Reports

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (cluster health monitoring, health checks, muting)
- Rook (Kubernetes operator for Ceph)
- kubectl (executing commands in Rook toolbox pod)
- Python 3 (JSON parsing of health output)

## Sources Consulted
- Ceph official documentation — Health Checks: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph official documentation — Monitoring a Cluster: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph official documentation — Troubleshooting PGs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- ceph-nagios-plugins source (for JSON output structure verification): https://github.com/ceph/ceph-nagios-plugins

## Issues Found
1. **PG_DEGRADED sample output had incorrect format.** The original sample showed `pg 1.5 is active+degraded, acting [0,1] want 3`. The `want 3` suffix is not part of standard `ceph health detail` output — it appears in `ceph pg query` output instead. Also, the summary line `Degraded data redundancy` was missing the typical degraded PG count. Fixed to: `Degraded data redundancy: 1 pg degraded` with detail line `pg 1.5 is active+degraded, acting [0,1]`.

## Review Notes
- The `POOL_NO_REDUNDANCY` health check is a real Ceph check code used in production, but it is not listed in the main `health-checks.rst` documentation page. This appears to be a documentation gap in Ceph rather than an error in the blog post.
- The `nearfull` threshold in the first sample output shows 82%, which is below the default `mon_osd_nearfull_ratio` of 0.85 (85%). This is technically valid since the threshold is configurable, but readers may find it slightly confusing. The later example in "Common Health Checks" correctly uses 85% and 95% which match the defaults.
- The `ceph health mute` command with `--sticky` flag combined with a duration is valid but semantically nuanced — `--sticky` preserves the mute across health check state changes while the duration still limits total mute time. The post doesn't explain this distinction but it's acceptable for the scope of the article.
