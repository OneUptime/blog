# Validation Summary: How to Implement Load Testing After Deployment with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD resource hooks, PostSync hooks, and sync waves
- Kubernetes Jobs, ConfigMaps, init containers, and resource requests/limits
- k6 load testing, thresholds, custom metrics, and Prometheus remote write output
- Prometheus remote write receiver and native histograms
- Kustomize overlays
- curl-based shell load testing

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Grafana k6 thresholds documentation: https://grafana.com/using-k6/thresholds
- Grafana k6 Prometheus remote write documentation: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
- Grafana k6 Response.json documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/response-json/
- Grafana k6 options and output documentation: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Linked OneUptime guide: https://oneuptime.com/blog/post/2026-02-26-argocd-k6-load-tests-hooks/view

## Issues Found
- The curl-based load test updated `total_time`, `total_requests`, and `errors` inside background subshells. In POSIX shell, those changes do not propagate back to the parent shell, so the snippet would report zero requests and fail during average calculation. I changed the script to write each worker's results to temporary files and aggregate them after `wait`.
- The curl-based load test declared `MAX_ERROR_RATE` but never enforced it. I added an error-rate threshold check using `awk`.
- The curl-based load test used `date +%s%N` for timing. That is not portable in Alpine's default BusyBox environment. I changed timing to use curl's `%{time_total}` output.
- The introduction implied post-deployment load tests always catch regressions before users see them. A PostSync hook runs after resources are applied and healthy, so this is only true for staging or gated production promotion. I clarified the sentence accordingly.
- The Prometheus section implied k6 can always send directly to Prometheus without prerequisites. Grafana k6 documentation notes Prometheus remote write receiver must be enabled for Prometheus 2.x, and native histograms require Prometheus native histogram support. I added that caveat.
- The sync-wave section implied sync waves can decide whether load tests run for specific change types. Argo CD sync waves control ordering, not change-based conditional execution. I revised the wording to say sync waves control hook order and a wrapper script handles skipping.

## Review Notes
The remaining examples are intentionally illustrative and use placeholder service names and API paths. The k6 image tag `grafana/k6:0.49.0` is older but the APIs used in the examples are still documented and valid.
