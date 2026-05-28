# Validation Summary: How to Debug OOMKilled Errors in GKE Containers and Set Correct Memory Limits

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Pods, Deployments, resource requests, and resource limits
- Kubernetes OOMKilled behavior and node memory pressure
- Kubernetes liveness probes
- Vertical Pod Autoscaler (VPA)
- Google Cloud Monitoring and gcloud CLI
- JVM container memory settings
- Linux cgroups v1 and v2

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- GKE Troubleshoot OOM events: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/oom-events
- GKE Vertical Pod autoscaling: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes About cgroup v2: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Cloud Monitoring GKE system metrics: https://docs.cloud.google.com/monitoring/api/metrics_kubernetes
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Kubernetes Volumes emptyDir documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Sidecar Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/

## Issues Found
- The post said an `OOMKilled` termination reason means the container hit its memory limit. Updated this to explain that Kubernetes observed an OOM kill, usually from a container-level memory limit, but node-level OOM/system events should be checked when node memory pressure is present.
- The node-level OOM explanation said the kubelet evicts pods. Updated this to distinguish kubelet eviction under memory pressure from global Linux OOM killer behavior.
- The Deployment YAML examples omitted required `apps/v1` Deployment selectors and matching pod template labels. Added `spec.selector.matchLabels` and `spec.template.metadata.labels` to each Deployment snippet.
- The liveness probe read only the cgroup v1 memory usage path and described the value as RSS. Updated the command to support cgroup v2 `memory.current` with a cgroup v1 fallback, and changed the comment to cgroup memory usage.
- The VPA guidance implied using `upperBound` directly as a memory limit. Updated it to use `target` as a request starting point, set limits from observed peak/headroom, and describe VPA limit handling as proportional to the request-to-limit ratio when VPA manages limits. Added the GKE caveat for JVM workloads.
- The Cloud Monitoring alert command used an undocumented `--condition-threshold-comparison` flag and a raw `used_bytes` metric without a threshold value. Updated it to use `container/memory/limit_utilization`, `--if="> 0.85"`, and `--duration="60s"` per the current gcloud command reference.
- The init-container pitfall incorrectly said init containers share the same memory limit. Updated it to describe Kubernetes effective init-container request/limit calculation.
- The sidecar pitfall implied sidecars share one memory limit with the app container. Updated it to state that sidecars add to the pod's total footprint and should have their own requests and limits.

## Review Notes
The remaining recommendations, such as measuring actual usage before setting limits, accounting for JVM non-heap memory, using `emptyDir.medium: Memory` carefully, and monitoring memory limit utilization in Cloud Monitoring, are consistent with the consulted documentation. `kubectl` and `gcloud` were not installed in the local environment, so CLI checks were performed against official command references rather than local `--help` output.
