# Validation Summary: How to Handle Ceph Component Failures Gracefully

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph OSDs (Object Storage Daemons)
- Ceph Monitors
- Ceph MDS (Metadata Server) / CephFS
- Kubernetes (kubectl)
- Prometheus (alerting)

## Sources Consulted
- Ceph official documentation on Monitor-OSD interaction: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/
- Ceph source code (`src/common/options/mon.yaml.in`) confirming `mon_osd_down_out_interval` is a monitor config option with a default of 600 seconds
- Rook documentation on CephFilesystem CRD: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph documentation on MDS configuration
- Prometheus Ceph exporter metric definitions (`ceph_osd_up`)

## Issues Found

### Issue 1: Wrong config section for `mon_osd_down_out_interval`
- **What was wrong:** The command used `ceph config set osd mon_osd_down_out_interval 600`, targeting the `osd` config section. However, `mon_osd_down_out_interval` is a monitor daemon option (as indicated by the `mon_` prefix and confirmed in the Ceph source code under `mon.yaml.in`). Setting it on the `osd` section would not take effect because only monitors read this option.
- **What was changed:** Changed `ceph config set osd` to `ceph config set mon`.
- **Why:** Monitors are the daemons that decide when to mark a down OSD as out. The config must be set on the `mon` section (or `global`) for it to be applied.

### Issue 2: Example value of 600 is the default — not an "increase"
- **What was wrong:** The post said to "increase `mon_osd_down_out_interval`" and then set it to 600 seconds. The default value is already 600 seconds, so this would be a no-op rather than an increase.
- **What was changed:** Changed the value from 600 to 1800 (30 minutes) and added a note that the default is 600 seconds.
- **Why:** To actually demonstrate increasing the interval beyond the default as the post intends, a value higher than 600 is needed. 1800 seconds (30 minutes) is a common choice for environments that want to tolerate longer outages without triggering rebalancing.

## Review Notes
- The `mon_cluster_log_to_syslog` option in the notifications section is technically valid, but in a Kubernetes/Rook environment syslog may not be configured in the pods. The Prometheus alerting rule that follows is the more practical approach for Kubernetes deployments. This is not a technical error but a practical consideration.
- All other commands (`ceph osd stat`, `ceph osd tree`, `ceph mon stat`, `ceph quorum_status`, `ceph fs status`) are correct.
- The CephFilesystem CRD snippet with `activeCount` and `activeStandby` fields is correct per the Rook CRD spec.
- The Prometheus alert rule syntax and metric name (`ceph_osd_up`) are correct.
