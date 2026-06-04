# Validation Summary: How to Configure Liveness Probes to Restart Unhealthy Containers Automatically

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness, readiness, startup, HTTP, TCP, and exec probes
- Kubernetes Pod and Deployment YAML configuration
- kubectl troubleshooting commands
- Go HTTP health check handlers
- Node.js Express health check handlers
- Python Flask health check handlers
- PostgreSQL `pg_isready`
- Prometheus alerting and PromQL
- kube-state-metrics
- Spring Boot Actuator Kubernetes health probes

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kubectl reference: `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl reference: `kubectl get`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- PostgreSQL documentation: `pg_isready`: https://www.postgresql.org/docs/16/app-pg-isready.html
- Prometheus documentation: Understanding metric types and `rate()`: https://prometheus.io/docs/tutorials/understanding_metric_types/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Spring Boot Actuator endpoint documentation: https://docs.enterprise.spring.io/spring-boot/reference/actuator/endpoints.html

## Issues Found
- The opening explanation stated that Kubernetes automatically restarts a container whenever a liveness probe fails. Kubernetes kills the container after failed liveness checks, but the restart is still subject to the Pod's `restartPolicy`. Updated the introduction and liveness/readiness comparison to include that restart-policy qualification.
- The first Go example registered `http.HandleFunc("/ready", readinessHandler)` without defining `readinessHandler`, so the snippet would not compile as written. Removed that registration because the example is specifically demonstrating a liveness endpoint.
- The memory-limit guidance said resource limits "ensure" the probe fails before the OOM killer runs. That is too strong because probe timing, process memory accounting, and container memory enforcement can still allow an OOM kill first. Changed the sentence to say limits above the application threshold allow the probe to fail before the OOM killer runs.
- The timing section described `periodSeconds * failureThreshold` as "time until restart after first failure." After the first failed probe has already occurred, only the remaining consecutive failures are pending, and timeout/termination grace can also affect observed timing. Changed the wording to "approximate maximum time from a sustained failure to restart."
- The Prometheus alert used `rate(kube_pod_container_status_restarts_total[15m]) > 0` while the annotation described a number of restarts in 15 minutes. `rate()` returns a per-second rate for counters, not the count over the window. Changed the expression to `increase(kube_pod_container_status_restarts_total[15m]) > 3` and updated the annotation text accordingly.

## Review Notes
The Kubernetes probe fields and behavior described in the post match current Kubernetes documentation, including HTTP/TCP/exec probe mechanisms, liveness restart behavior, `successThreshold: 1` for liveness probes, and startup probes deferring liveness/readiness probes. The Spring Boot Actuator liveness path is correct for applications with Actuator probe support enabled in a Kubernetes environment. The example health checks are intentionally simplified; production applications should tune thresholds and avoid using liveness probes as a substitute for fixing recurring memory leaks or deadlocks.
