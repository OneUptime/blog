# Validation Summary: How to Debug CrashLoopBackOff and OOMKilled Pods in Kubernetes

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Kubernetes (pods, container states, resource requests/limits, QoS classes)
- kubectl (logs, describe, top, debug, run, get events)
- Liveness / readiness / startup probes
- JVM container memory configuration (UseContainerSupport, MaxRAMPercentage)
- Vertical Pod Autoscaler (VPA)
- Prometheus / kube-state-metrics / cAdvisor (PrometheusRule alerts)
- Docker (image pull testing)

## Sources Consulted
- Kubernetes pod lifecycle & container restart backoff docs: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- kubectl debug / ephemeral containers docs: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- kubectl reference (top, logs, run, describe): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Managing resources for containers (requests/limits, OOM, QoS): https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Configure liveness/readiness/startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Vertical Pod Autoscaler (autoscaling.k8s.io/v1): https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Prometheus Operator PrometheusRule CRD (monitoring.coreos.com/v1): https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics metric reference (kube_pod_container_status_restarts_total, kube_pod_container_status_last_terminated_reason): https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- OpenJDK container-awareness (UseContainerSupport, MaxRAMPercentage), available since 8u191/10

## Issues Found
- **Incorrect awk field for memory metric (Step 4: Calculate Right Memory Limit).** The metrics file is produced by `kubectl top pods --containers`, whose columns are `POD  NAME  CPU(cores)  MEMORY(bytes)`. The original `awk '{print $3}'` extracts the CPU column, not memory. Changed to `awk '{print $4}'` and added a clarifying comment noting the column order so the P99 calculation actually reflects memory usage.

## Review Notes
- The pod-state mermaid diagram is a conceptual simplification — `OOMKilled` is a container termination reason rather than a distinct pod phase, but the diagram is reasonable for illustrating the failure flow and is not a technical error.
- Backoff timing (10s → 20s → 40s → 80s → 160s → 300s max) matches Kubernetes' exponential CrashLoopBackOff behavior (cap at 5 minutes).
- Exit code 137 (= 128 + SIGKILL/9) correctly indicates a SIGKILL, commonly from OOM.
- `kubectl debug ... --copy-to` syntax is valid; the "requires Kubernetes 1.18+" note is accurate (ephemeral containers / debug introduced in 1.18, GA in 1.25).
- All apiVersions (VPA `autoscaling.k8s.io/v1`, `PrometheusRule` `monitoring.coreos.com/v1`) and metric names are current and correct.
- The `kubectl get nodes -o custom-columns=...MemoryPressure...` JSONPath filter is valid.
