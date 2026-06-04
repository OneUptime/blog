# Validation Summary: How to Diagnose Kubernetes Node Disk Pressure from Container Log Accumulation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubelet configuration
- containerd CRI configuration
- Fluent Bit
- Prometheus node-exporter
- kube-state-metrics
- Node.js / Winston
- Linux shell utilities

## Sources Consulted
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- containerd CRI configuration guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit Kubernetes documentation: https://docs.fluentbit.io/manual/installation/downloads/kubernetes
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Fluent Bit S3 output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/s3
- Prometheus node-exporter documentation: https://github.com/prometheus/node_exporter
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- GNU findutils help output for `find` options used in cleanup commands

## Issues Found
- The post incorrectly said the container runtime manages container log rotation. Updated it to state that kubelet manages container log rotation and directory structure while the runtime writes to kubelet-provided log paths.
- The post described the default DiskPressure threshold as 85% usage. Updated this to the documented kubelet hard eviction thresholds for node/image filesystem space and inode availability.
- The containerd configuration snippet implied `max_container_log_line_size` controlled log rotation and placed it under the wrong nested table. Updated the explanation and snippet to show it as a CRI log-line-size setting, not a rotation-size setting.
- The kubelet configuration comments described `containerLogMaxWorkers` as a total log size limit. Corrected it to describe concurrent log rotation workers and added a comment for `containerLogMonitorInterval`.
- Cleanup commands looked for pod directories matching `*_terminated_*`, which is not the Kubernetes pod log directory naming pattern. Replaced those commands with cleanup for empty log directories after old log file removal.
- The Node.js Winston example logged `res.statusCode` before the response completed. Updated it to log from the `finish` event so the final status code is recorded.
- The Fluent Bit input used `/var/log/pods/*/*/*.log` with the Docker parser. Updated it to tail `/var/log/containers/*.log` and use the Docker/CRI multiline parsers documented for Kubernetes logs.
- The monitoring section used an invalid `kubectl run` command with unsupported host namespace flags for node-exporter. Replaced it with the documented containerized node-exporter pattern using host networking, host PID, host root mount, and `--path.rootfs`.
- The `LargeLogFiles` alert used `node_filesystem_files{mountpoint="/var/log"}` as if it counted log files. Replaced it with an inode usage alert using `node_filesystem_files_free` and `node_filesystem_files` on the root filesystem.

## Review Notes
The post is now technically valid as a Kubernetes troubleshooting guide. The automated cleanup DaemonSet is operationally risky because it deletes and truncates host logs directly; future revisions could add stronger warnings or recommend relying on kubelet rotation and centralized log shipping first.
