# Validation Summary: How to View Ceph Cluster Summary Dashboard via CLI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph CLI
- Ceph Manager (MGR)
- Ceph Dashboard
- Ceph cluster monitoring
- Shell scripting

## Sources Consulted
- Ceph Monitoring guide: https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph MON command API: https://docs.ceph.com/en/reef/api/mon_command_api/
- Ceph `ceph` man page: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph `iostat` module docs: https://docs.ceph.com/en/reef/mgr/iostat/
- Ceph Dashboard docs: https://docs.ceph.com/en/reef/mgr/dashboard/
- Ceph health checks docs: https://docs.ceph.com/en/reef/rados/operations/health-checks/

## Issues Found
- The post used `ceph osd perf` to show in-progress operations. I changed this to `ceph ops` because the official command reference defines `ceph ops` as the command that shows operations currently in flight, while `ceph osd perf` reports OSD performance summary statistics.
- The post used `ceph osd blocked-by` to check for slow operations. I changed this to `ceph dump_historic_slow_ops` because `ceph osd blocked-by` prints a histogram of OSDs blocking peers, not a list of slow operations.
- The post presented `ceph iostat` without noting its module dependency. I added the caveat that the `iostat` MGR module must be enabled, which matches the official module documentation.
- The post’s scripting example parsed `ceph health --format json` using a top-level `status` field. I replaced it with a plain-text `ceph health` check that reads the first health token, because the command output format is officially documented but the exact JSON field shape is not clearly documented in the Ceph docs consulted.
- The phrase “real-time dashboard” for `ceph -w` was misleading. I changed it to “real-time event stream” to match the official monitoring docs, which describe `ceph -w` as following the cluster log and printing status plus live log messages.

## Review Notes
- The core `ceph status`, `ceph -s`, `ceph health detail`, `ceph -w`, and `ceph mgr services` guidance is correct.
- The sample `ceph status` output is representative, but exact sections and fields vary by cluster services enabled and Ceph version.
