# Validation Summary: How to Use Ceph Log Correlation for Troubleshooting

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system) - monitors, OSDs, RGW, MDS daemons
- kubectl (Kubernetes CLI)
- Grafana Loki (log aggregation)
- LogQL (Loki query language)
- Grafana (observability dashboards)
- Prometheus (metrics)

## Sources Consulted
- `kubectl logs --help` output to verify supported flags (`--since-time`, `--since`, `--timestamps`) and confirm `--until-time` does not exist
- Ceph official documentation on daemon log formats and operation tracing: https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Rook documentation on toolbox deployment and pod labels: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/query/
- Kubernetes documentation on `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
1. **Invalid `--until-time` flag on `kubectl logs`**: The first command in the "Correlate by Timestamp" section used `--until-time="2024-01-15T10:30:00Z"` on the `kubectl logs` command. This flag does not exist. `kubectl logs` supports `--since-time` and `--since` for specifying a start time, but has no built-in end-time filter. Removed the invalid flag so the command is consistent with the other two log-gathering commands in the same block.

## Review Notes
- The Ceph log format examples in "Understanding Request IDs in Ceph Logs" are simplified/illustrative rather than showing exact real log output. Actual Ceph log lines include additional fields (log level, subsystem, etc.), but the simplified format is appropriate for conveying the concept.
- The Loki query code block uses a `bash` language tag, but the content is LogQL. This is a minor cosmetic issue that does not affect correctness.
- The `grep -E "osd|mon|mds"` pattern in the "Trace a Specific Operation" section does not include `rgw`, despite RGW being discussed elsewhere in the post. This is not incorrect (the example focuses on a write path through OSD/MON/MDS), but readers tracing RGW-related issues would need to add `rgw` to the pattern.
- The `ceph osd perf`, `ceph pg stat`, and `ceph -s` commands are all valid Ceph CLI commands.
- The Rook pod labels (`app=rook-ceph-osd`, `app=rook-ceph-mon`, `app=rook-ceph-rgw`) are correct for standard Rook deployments.
