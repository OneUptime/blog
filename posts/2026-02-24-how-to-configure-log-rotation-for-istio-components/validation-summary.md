# Validation Summary: How to Configure Log Rotation for Istio Components

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Kubelet container log rotation
- IstioOperator
- Fluent Bit
- Kubernetes ephemeral storage

## Sources Consulted
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes kubelet reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes local ephemeral storage: https://kubernetes.io/docs/concepts/storage/ephemeral-storage/
- Kubernetes volumes and emptyDir: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio component logging: https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Istio pilot-discovery command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio installation customization and overlays: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Envoy administration interface: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy file access log reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/file/v3/file.proto.html
- Fluent Bit Tail input plugin: https://docs.fluentbit.io/manual/pipeline/inputs/tail

## Issues Found
- The post stated that the container runtime itself handles Kubernetes container log rotation and showed a containerd runtime config snippet that did not configure log rotation. Updated this to state that kubelet manages container log rotation through `containerLogMaxSize` and `containerLogMaxFiles`.
- The Envoy file access log sidecar example renamed the log file and said Envoy would reopen it automatically. Envoy requires a reopen trigger for rotated access logs, so the example now posts to the Envoy admin `/reopen_logs` endpoint on the Istio sidecar admin port.
- The Istiod log rotation example used an invalid `IstioOperator` shape under `components.pilot.k8s.containers`. Replaced it with a direct `pilot-discovery discovery` command-line example for the documented log rotation flags.
- The post described `emptyDir` and sidecar ephemeral storage limits as hard prevention of further log growth. Updated those statements to match Kubernetes behavior: exceeding local ephemeral storage limits can make the pod eligible for eviction.
- The node log-size debugging command used `/var/log/containers` from inside a node debug pod. Kubernetes node debug pods mount the host filesystem under `/host`, so the command now checks `/host/var/log/containers`.
- The ephemeral storage command printed `.status.ephemeralContainerStatuses`, which is for Kubernetes ephemeral debug containers rather than storage usage. Updated it to show configured ephemeral storage requests and limits.
- The post used `kubectl top nodes` as a disk usage check, but `kubectl top` reports resource metrics such as CPU and memory, not node disk usage. Replaced it with a JSONPath command that reports each node's `DiskPressure` condition.

## Review Notes
The overall recommendation to keep Istio and Envoy logs on stdout/stderr and rely on kubelet container log rotation is consistent with Kubernetes and Istio guidance. Future improvements could include showing a distro-specific kubelet configuration location or managed Kubernetes provider setting, because kubelet configuration is often managed outside the workload manifests.
