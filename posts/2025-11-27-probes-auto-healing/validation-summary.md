# Validation Summary: Add Liveness, Readiness, and Startup Probes So Kubernetes Auto-Heals Your Apps

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes (Deployments, liveness/readiness/startup probes)
- kubectl
- Prometheus / PromQL (alerting)
- kube-state-metrics
- gRPC health probes

## Sources Consulted
- Kubernetes — Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes — Pod Lifecycle (probe behavior, startup probe gating): https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes
- Kubernetes — Metrics Reference (`prober_probe_total`): https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes — System Component Metrics (`/metrics/probes` endpoint): https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- kube-state-metrics — Pod metrics (`kube_pod_container_status_restarts_total`): https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- **Incorrect kubelet probe metric name.** Section 6 referenced `kubelet_probe_*` as a metric family to scrape. No such metric family exists. The kubelet exposes probe results as `prober_probe_total` (a counter, labeled by `probe_type`/`result`/`container`/`pod`/`namespace`) at the `/metrics/probes` endpoint. Changed the text to reference `prober_probe_total` and noted the exposing endpoint. The `kube_pod_container_status_restarts_total` reference and the PromQL `increase(...)[5m] > 3` example were already correct (from kube-state-metrics).

## Review Notes
- The Deployment manifest is syntactically valid (`apps/v1`, correct probe fields, `httpGet`, `initialDelaySeconds`, `periodSeconds`, `failureThreshold`, `timeoutSeconds`). The startup-probe math (`30 × 5s = 150s`) is correct, and the claim that the startup probe gates the other probes until it succeeds matches the official Pod Lifecycle docs.
- gRPC probe inline syntax `grpc: { port: 8000 }` is valid (gRPC probes are GA since Kubernetes 1.27); the field is `grpc` with `port` (and optional `service`).
- `kubectl port-forward svc/web 8080:80` correctly maps local 8080 → service port 80; `kubectl get endpoints` still works though EndpointSlices are the modern equivalent.
- Best-practice caveat (not a correctness error, left as written): the post wires the liveness probe to `/healthz` which "hits dependencies (DB, cache, upstream APIs)." Coupling liveness to external dependencies is a recognized anti-pattern because a transient downstream outage can trigger restart storms across all replicas. Readiness is the more appropriate probe for dependency checks. Worth considering in a future revision.
