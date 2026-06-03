# Validation Summary: How to Use Startup Probes for Slow-Starting Applications on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes startup, liveness, and readiness probes
- Kubernetes Pod and Deployment YAML
- Spring Boot Actuator health probes
- Go HTTP handlers
- Python Flask HTTP handlers
- Node.js Express HTTP handlers
- Prometheus / PromQL
- kube-state-metrics
- kubectl and Docker CLI commands

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes documentation: Metrics for Kubernetes Object States: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics Pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Spring Boot Actuator endpoints documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html

## Issues Found
- Startup probe endpoint examples returned HTTP 200 while startup was still in progress. This would cause Kubernetes to mark the startup probe successful immediately and enable liveness/readiness probes too early. Updated the Go, Flask, Node.js, and timeout examples to return HTTP 503 until startup completes.
- Several timing comments described startup probe budgets as exact totals without accounting for `initialDelaySeconds`. Updated the comments to describe the `failureThreshold * periodSeconds` budget as occurring after the initial delay, or as an approximate total.
- The Spring Boot Actuator sentence said the health endpoints work "perfectly" with Kubernetes probes. Updated it to the more precise claim that Actuator provides built-in liveness and readiness endpoints that work well with Kubernetes probes.
- The PromQL startup duration example used `kube_pod_start_time - kube_pod_created`, which measures pod start timestamp rather than readiness. Updated it to use `kube_pod_status_ready_time - kube_pod_created`.
- The "pods still in startup phase" query counted Pending pods only, missing running-but-not-ready pods. Updated it to count pods whose ready condition is false.
- The startup alert used `time() - kube_pod_start_time`, which does not accurately detect pods that have not become ready. Updated it to alert on pods that remain not ready more than 600 seconds after creation.
- The startup probe failure alert used `kube_pod_status_container_ready_time == 0`, which is not a reliable startup probe failure signal. Updated it to use `increase(prober_probe_total{probe_type="Startup",result="failed"}[10m]) > 0`.

## Review Notes
- The Kubernetes probe configuration fields and probe mechanisms shown in the YAML examples are valid.
- The PromQL examples assume kube-state-metrics is installed and that kubelet `/metrics/probes` is being scraped.
- The language snippets include application-specific placeholder functions such as `loadConfiguration()`, `check_dependencies()`, and `connectToDatabase()`. Those need real implementations in an application, but the probe response logic is now technically correct.
