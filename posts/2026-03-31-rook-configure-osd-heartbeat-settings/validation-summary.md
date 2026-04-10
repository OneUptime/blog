# Validation Summary: How to Configure OSD Heartbeat Settings in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (OSD heartbeat subsystem)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl CLI)

## Sources Consulted
- [Ceph Monitor/OSD Interaction Documentation](https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/)
- [Ceph Reef Monitor/OSD Interaction Documentation](https://docs.ceph.com/en/reef/rados/configuration/mon-osd-interaction/)
- [Rook CephCluster CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Rook Ceph Configuration Documentation](https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/)
- [Ceph Network Configuration Reference](https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/)
- [Ceph source code - global.yaml.in](https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in)

## Issues Found

### 1. Inaccurate description for `osd_mon_report_interval`
- **What was wrong:** The table described `osd_mon_report_interval` as "How often OSDs report statistics to monitors." This is misleading — the parameter controls the minimum interval between event-triggered reports (failures, PG stat changes, boot events), not periodic statistics reporting.
- **What was changed:** Updated description to "Minimum interval between OSD reports to monitors on reportable events."
- **Why:** The original description could lead users to confuse this with periodic stats reporting. The accurate description reflects that this is a minimum interval for event-driven reports.

### 2. Incorrect Rook CephCluster CR section key
- **What was wrong:** The YAML example used `osd:` as the section key under `spec.cephConfig`.
- **What was changed:** Changed `osd:` to `"osd.*":` to match the Rook CephCluster CRD specification.
- **Why:** Per the official Rook documentation, daemon-type config sections use wildcard syntax (e.g., `"osd.*"`, `"mon.*"`). Using bare `osd` would not be recognized correctly by the Rook operator.

### 3. Misleading `mon_osd_report_timeout` example
- **What was wrong:** The example set `mon_osd_report_timeout` to 300 (5 minutes) and described it as useful for planned maintenance. However, the default value is 900 seconds (15 minutes), so setting it to 300 would actually make failure detection more aggressive — the opposite of the stated intent.
- **What was changed:** Changed the example value to 1800 (30 minutes) and added a note that the default is 900 seconds. Updated the description to say "30 minutes" instead of "5 minutes."
- **Why:** For planned maintenance scenarios, users need a value larger than the default to give OSDs more time to report in. Using 300 would have made things worse.

## Review Notes
- The core heartbeat parameters (`osd_heartbeat_interval`, `osd_heartbeat_grace`, `osd_mon_heartbeat_interval`) and their defaults are all correct per official Ceph documentation.
- The claim that heartbeats use both public and cluster networks is correct — Ceph uses separate front-end and back-end heartbeat channels.
- The `ceph config set osd` and `ceph config show osd.0` commands are syntactically correct.
- The `ceph log last 50` command is valid, though the exact log message text for OSD down events may vary between Ceph versions.
- The post could benefit from mentioning `osd_mon_report_interval_max` (default 120s) alongside `osd_mon_report_interval` for completeness, but this is not an error.
