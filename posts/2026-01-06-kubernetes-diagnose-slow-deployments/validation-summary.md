# Validation Summary: How to Diagnose Slow Kubernetes Deployments

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Kubernetes (Deployments, Pods, scheduling, probes, rolling updates)
- kubectl CLI
- kubelet / crictl
- containerd (registry mirror configuration)
- Docker (multi-stage builds, image optimization)
- Prometheus / PromQL (Kubernetes system metrics)
- PodDisruptionBudgets, init containers, lifecycle hooks
- etcd / API server diagnostics

## Sources Consulted
- Kubernetes Metrics Reference — https://kubernetes.io/docs/reference/instrumentation/metrics/
- Metrics For Kubernetes System Components — https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- kubelet metrics source (`pkg/kubelet/metrics/metrics.go`) — https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/metrics/metrics.go
- kube-prometheus runbook: Kubelet Pod Start Up Latency — https://runbooks.prometheus-operator.dev/runbooks/kubernetes/kubeletpodstartuplatencyhigh/
- Kubernetes docs: probes / configure liveness, readiness and startup probes (standard probe fields and semantics)
- Kubernetes docs: taints/tolerations, storage class `volumeBindingMode`, rolling update strategy fields

## Issues Found
- **Fabricated/outdated Prometheus metric (fixed).** The "Container startup latency" PromQL example used `kubelet_container_manager_latency_microseconds_bucket{operation_type="start"}`. This metric does not exist — verified against the kubelet metrics source, which contains no `*_microseconds` metrics at all (the microseconds-suffixed naming convention was deprecated and removed from the kubelet years ago; modern kubelet metrics use seconds). Replaced it with the real, currently-shipping metric `kubelet_runtime_operations_duration_seconds_bucket{operation_type="start_container"}`, which is the correct way to measure container runtime (start) latency, and updated the comment accordingly. The other two metrics in that block (`kubelet_pod_start_duration_seconds`, `workqueue_work_duration_seconds`) were verified as real.

## Review Notes
- `kubelet_pod_start_duration_seconds_bucket` was confirmed to exist (`PodStartDurationKey = "pod_start_duration_seconds"` under the kubelet subsystem). Related companions `pod_start_sli_duration_seconds` and `pod_start_total_duration_seconds` also exist if the author wants alternatives.
- `npm ci --only=production` in the Dockerfile still works but `--only=production` is deprecated in npm 7+ in favor of `--omit=dev`. Left as-is since it remains functional and the post is about Kubernetes, not npm; worth updating in a future revision.
- The containerd registry mirror config (`[plugins."io.containerd.grpc.v1.cri".registry.mirrors]` in `config.toml`) is valid for containerd 1.x but emits a deprecation warning in recent 1.x releases and was removed in containerd 2.0 in favor of the `config_path` / `hosts.toml` approach. Correct for the versions most clusters run today; a note about the newer `hosts.toml` mechanism would future-proof it.
- Probe configuration examples, taint/toleration syntax, `volumeBindingMode: Immediate`, rolling-update `maxUnavailable`/`maxSurge` fields, init-container/lifecycle examples, and all `kubectl`/`crictl`/`journalctl` commands were reviewed and are syntactically correct and current.
- Timing math is consistent (e.g. `failureThreshold: 30` × `periodSeconds: 10` = 300s = 5 minutes for the startup probe), and the overall phase-by-phase diagnostic methodology is sound.
