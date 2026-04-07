# Validation Summary: How to Set Up Log Rotation for Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- logrotate (Linux log rotation utility)
- Kubernetes (DaemonSets, kubelet configuration)
- containerd (container runtime)

## Sources Consulted
- Ceph documentation on logging configuration: https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Kubernetes documentation on logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes kubelet configuration for log rotation: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/ (`--container-log-max-size`, `--container-log-max-files`)
- containerd CRI plugin configuration: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- logrotate man page for directive syntax

## Issues Found
1. **containerd `max_container_log_line_size` incorrectly presented as a log rotation setting.** This setting controls the maximum size of a single log *line*, not log file rotation. It was misleadingly placed alongside the kubelet rotation flags. **Fix:** Removed the containerd config snippet entirely and clarified that kubelet flags control container log rotation.

2. **DaemonSet logrotate command missing state file flag.** Running `logrotate` without `-s` (state file) in an ephemeral Alpine container means it cannot track when files were last rotated, causing incorrect rotation behavior across container restarts. **Fix:** Added `-s /tmp/logrotate.status` to the logrotate command.

3. **DaemonSet referenced an undefined ConfigMap.** The YAML referenced a `ceph-logrotate-config` ConfigMap that was never defined, making the example incomplete and non-functional as presented. **Fix:** Added the ConfigMap definition inline with the DaemonSet YAML so readers can apply the complete configuration.

## Review Notes
- The post correctly notes that Rook defaults to stderr logging, making the file-based logrotate approach a secondary concern for most deployments.
- The `postrotate` section uses `pkill -HUP` to signal Ceph daemons, which works because the DaemonSet has `hostPID: true`. This is correct but worth noting that it signals all matching processes on the node.
- The debug level format `0/2` (log-level/memory-level) is correct Ceph syntax.
- The `alpine:3.18` image will eventually become outdated; readers should use a current Alpine version.
