# Validation Summary: How to Fix DaemonSet Collector Not Collecting Logs from All Pods Due to

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes container logging
- Kubernetes DaemonSets
- `kubectl debug` and `kubectl logs`
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector file storage extension

## Sources Consulted
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Debugging Nodes With Kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- OpenTelemetry Kubernetes Collector components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Helm chart logs collection preset: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry container log parser blog: https://opentelemetry.io/blog/2024/otel-collector-container-log-parser/

## Issues Found
- The container log location explanation incorrectly framed `/var/log/pods` as runtime-specific. Updated it to state that kubelet directs runtimes to write pod logs under `/var/log/pods` by default, with `/var/log/containers` as convenience symlinks.
- The explanation for `/var/log/containers/*.log` overstated symlink-following as the receiver problem. Updated it to focus on the symlinks and their targets needing to be present inside the Collector container.
- The filelog receiver example used a hand-written CRI regex parser that did not cover Docker JSON logs, CRI-O offset timestamps, or CRI partial-log recombination. Replaced it with the current OpenTelemetry `container` operator used by official Kubernetes filelog examples.
- The Collector self-log exclude pattern was too broad in wording and too specific in matching. Updated it to the documented pattern that excludes containers named `otel-collector`.
- The DaemonSet manifest was missing the required `spec.selector` and matching pod template labels for `apps/v1`. Added both.
- The `kubectl debug node` commands read `/var/log/pods` directly, but Kubernetes mounts the node filesystem at `/host` in debug pods. Updated the commands to use `/host/var/log/pods`.
- The log rotation section described numeric rotated-file suffixes and a 10MB default. Updated it to use the kubelet `containerLogMaxSize` default of 10Mi and suffix examples that match Kubernetes/OpenTelemetry documentation.

## Review Notes
The post is technically valid after the fixes. The examples still use `otel/opentelemetry-collector-contrib:latest`; pinning an explicit Collector image version would be better for production guidance, but this is not a correctness issue for the tutorial.
