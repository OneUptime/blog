# Validation Summary: How to Use kubectl logs to Debug Container Issues

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes container logging
- Kubelet log rotation
- Stern
- grep, awk, jq, strings, hexdump
- Python structured logging
- Fluentd sidecar pattern

## Sources Consulted
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes debug init containers guide: https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kubelet configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Stern README and CLI flag reference: https://github.com/stern/stern
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The init-container section described `kubectl logs my-pod --all-containers=true` as getting logs from all init containers. Kubernetes treats this as all containers in the pod, so the comment was changed to clarify that it includes init containers.
- The Stern section labeled `stern web-app --output=raw` as color output. Stern's `raw` output only prints the log message itself, so the comment was changed to "Raw log message output."
- The log rotation section pointed readers to kubelet command-line flags. Those flags still exist but are deprecated in favor of kubelet configuration fields, so the comments were updated to use `containerLogMaxSize` and `containerLogMaxFiles`.
- The Python structured logging example used `datetime.utcnow()` without importing `datetime`, which would raise `NameError`. The snippet now imports `datetime` and `timezone` and emits an explicit UTC RFC3339-style timestamp ending in `Z`.

## Review Notes
Most `kubectl logs` flags and examples matched the current Kubernetes command reference, including `--previous`, `--tail`, `--since`, `--since-time`, `--timestamps`, label selectors, `--all-containers`, and `--max-log-requests`. Kubernetes notes that only the latest rotated log file is available through `kubectl logs`; the article correctly recommends centralized logging for production retention and search.
