# Validation Summary: How to Debug Kubernetes OOMKilled Errors and Memory Issues

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Kubernetes Pods, resource requests, and resource limits
- Kubernetes `kubectl` commands and JSONPath output
- Linux cgroups v1 and v2 memory accounting
- Prometheus, PromQL, and PrometheusRule alerts
- kube-state-metrics container termination metrics
- Vertical Pod Autoscaler
- JVM, Node.js, and Python memory configuration

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Assign Memory Resources to Containers and Pods - https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes kubectl reference: `kubectl top pod` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl reference: `kubectl events` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Linux kernel documentation: cgroup v2 memory interface - https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux kernel documentation: cgroup v1 memory controller - https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v1/memory.html
- Prometheus documentation: Operators and vector matching - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes Autoscaler documentation: Vertical Pod Autoscaler quickstart - https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Node.js documentation: CLI options and `--max-old-space-size` - https://nodejs.org/api/cli.html
- Oracle Java documentation: `java` command `-XX:MaxRAMPercentage` - https://docs.oracle.com/en/java/javase/15/docs/specs/man/java.html
- Python documentation: `PYTHONTRACEMALLOC` / tracemalloc - https://docs.python.org/3/library/tracemalloc.html

## Issues Found
- Clarified OOMKilled behavior. The original text implied every memory-limit exceedance immediately kills the container process and Kubernetes always restarts it. Kubernetes documentation describes memory limit enforcement as reactive, and restart behavior depends on restart policy. Updated the introduction and explanation to reflect this.
- Added cgroup v1 memory paths. The original commands only used cgroup v2 files (`memory.current`, `memory.max`), which fail on nodes using cgroup v1. Added `memory.usage_in_bytes` and `memory.limit_in_bytes` alternatives.
- Corrected PromQL examples to match vectors by Kubernetes identity labels. The original percentage calculation could fail or drop series when metric label sets differ. Added `on (namespace, pod, container)` matching.
- Hardened the high-memory alert for containers without memory limits. Added a `container_spec_memory_limit_bytes > 0` filter to avoid alerting on or dividing by unlimited/zero limits.
- Corrected VPA wording. The original text said VPA automatically adjusts requests and limits as a general behavior. VPA primarily recommends and updates resource requests; limits require explicit configuration. Updated the wording.
- Updated the event-check command to use the current `kubectl events` command and filter recent warning events for OOMKilled messages.

## Review Notes
The post is technically valid after the fixes. Runtime-specific heap settings are correct as examples, but real production values should still be validated with application profiling because non-heap/native memory and sidecars can materially change total container memory use.
