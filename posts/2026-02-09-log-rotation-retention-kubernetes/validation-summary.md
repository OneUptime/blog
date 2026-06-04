# Validation Summary: How to Set Up Automatic Log Rotation and Retention Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kubelet container log rotation
- kubeadm KubeletConfiguration
- containerd CRI configuration
- logrotate
- Fluent Bit tail input and Kubernetes filter
- Prometheus Operator PrometheusRule and PromQL
- Kubernetes ephemeral storage limits
- Bash cleanup scripting

## Sources Consulted
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes KubeletConfiguration v1beta1 reference: https://v1-34.docs.kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubeadm v1beta4 configuration reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- containerd CRI Plugin Config Guide: https://containerd.io/docs/2.1/cri/config/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Prometheus Operator PrometheusRule CRD reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Ubuntu logrotate man page: https://manpages.ubuntu.com/manpages/jammy/man8/logrotate.8.html

## Issues Found
- The introduction and log management explanation implied logs grow indefinitely and rotation automatically compresses old logs. Updated this to reflect that kubelet rotation caps file size and retained file count, and does not compress container logs.
- The kubelet section recommended applying `--container-log-max-size` and `--container-log-max-files` as service flags. These flags still exist but are deprecated in favor of the kubelet config file, so the post now recommends the config file and describes the flags as legacy.
- The kubeadm example used `kubeadm.k8s.io/v1beta3`. Updated it to the current `kubeadm.k8s.io/v1beta4` API version while keeping `KubeletConfiguration` at `kubelet.config.k8s.io/v1beta1`.
- The containerd section described `max_container_log_line_size` as log rotation. Corrected it to explain that Kubernetes uses kubelet for rotation and containerd's CRI setting only limits/splits individual log lines. The TOML example was updated to the containerd 2.x configuration layout.
- The logrotate example attempted to rotate Kubernetes container logs under `/var/log/pods` and `/var/log/containers`, including a Docker-specific `USR1` signal. Replaced this with a system component logrotate example and clarified that kubelet should manage container stdout/stderr log rotation.
- The DaemonSet retention example depended on `kubectl` inside BusyBox and attempted to identify deleted pods through an unreliable grep over pod JSON. Simplified it to remove old kubelet-rotated log files and broken container log symlinks.
- The Fluent Bit tail input comment said `Mem_Buf_Limit` limits memory per file. Corrected it to describe the limit as applying to the input plugin, and switched the parser configuration to the documented Kubernetes `docker, cri` multiline parser setup.
- The Prometheus alert used `container_fs_usage_bytes` while describing log volume. Replaced it with `kubelet_container_log_filesystem_used_bytes`, which is the kubelet metric for bytes used by container logs.
- The cleanup script looked for compressed `.gz` container logs and could delete active large logs. Updated it to target kubelet-rotated `*.log.*` files and avoid deleting current active log files.
- The best practices summary recommended compression for all logs. Scoped that recommendation to system component logs managed by logrotate.

## Review Notes
- `kubelet_container_log_filesystem_used_bytes` is currently documented as an alpha kubelet metric, so availability can vary by Kubernetes version and scrape configuration.
- The logrotate system component paths are examples; many systemd-based clusters write kubelet and container runtime logs to journald instead of files under `/var/log`.
