# Validation Summary: How to Set rgw_op_thread_timeout and rgw_op_thread_suicide_timeout

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Kubernetes ConfigMaps
- Ceph centralized configuration (`ceph config`)

## Sources Consulted
- Ceph documentation on RGW configuration options: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph documentation on centralized config store: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Rook documentation on advanced configuration (rook-config-override): https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph source code for default values of rgw_op_thread_timeout and rgw_op_thread_suicide_timeout

## Issues Found
No technical issues found.

## Review Notes
- The default value of `rgw_op_thread_timeout` (600 seconds) stated in the post is correct.
- The default of `rgw_op_thread_suicide_timeout` is 0 (disabled), which the post correctly documents.
- The log message examples in the "Diagnosing" section are illustrative approximations rather than exact Ceph log output, but this is acceptable as they convey the right pattern to search for.
- The recommendation to set the suicide timeout to 1.5-2x the soft timeout is reasonable operational guidance.
- The RADOS timeout relationship section correctly notes that `rados_osd_op_timeout` should be lower than the RGW thread timeouts to avoid false positives during OSD recovery scenarios.
