# Validation Summary: How to Troubleshoot Rook-Ceph Monitor Quorum Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph Monitors (mons) and quorum mechanism
- Kubernetes (kubectl CLI)

## Sources Consulted
- Ceph official documentation on monitor operations: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Ceph monitor troubleshooting guide: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Rook Ceph documentation on monitor health: https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/#monitors
- Ceph monitor config reference (mon_clock_drift_allowed default = 0.05s): https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph msgr2 protocol documentation (v1 port 6789, v2 port 3300): https://docs.ceph.com/en/latest/rados/configuration/msgr2/

## Issues Found
No technical issues found.

## Review Notes
- The example `ceph status` output mixes health warnings with a `quorum_age` field. In actual output, `quorum_age` appears in the mon service line of `ceph status`, not as a health check entry. However, this is presented as approximate example output and does not constitute a technical error.
- The READY column showing `2/2` for mon pods is configuration-dependent. Some Rook deployments include a sidecar container (e.g., crash collector), while others show `1/1`. This is acceptable as example output.
- All CLI commands (`ceph mon stat`, `ceph mon dump`, `ceph time-sync-status`, `ceph quorum_status`) are valid and current.
- The clock skew threshold of 0.05 seconds matches the default value of `mon_clock_drift_allowed` in Ceph configuration.
- Monitor ports 6789 (msgr v1) and 3300 (msgr v2) are correct.
- The mention of `restore-quorum` in the summary refers to a documented Rook emergency recovery procedure for cases where quorum cannot be restored normally.
