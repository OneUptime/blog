# Validation Summary: How to Verify Flux CD Controller Health and Readiness

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD / GitOps Toolkit
- Kubernetes
- kubectl
- Flux CLI
- Prometheus Operator PodMonitor
- Prometheus metrics
- Bash scripting
- Kubernetes CronJob

## Sources Consulted
- Flux CLI `flux check` reference: https://fluxcd.io/flux/cmd/flux_check/
- Flux CLI `flux get` reference: https://fluxcd.io/flux/cmd/flux_get/
- Flux troubleshooting cheatsheet: https://fluxcd.io/flux/cheatsheets/troubleshooting/
- Flux controller options reference: https://fluxcd.io/flux/components/source/options/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux 2.8 release announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux GitHub releases page: https://github.com/fluxcd/flux2/releases
- Flux latest install manifests: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Flux monitoring example PodMonitor: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml
- Kubebuilder controller-runtime metrics reference: https://book.kubebuilder.io/reference/metrics-reference
- controller-runtime health probe implementation: https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/healthz/healthz.go

## Issues Found
- The health endpoint example used port `8080`, which is the default metrics port. Flux controllers bind health probes to port `9440` by default, so the port-forward and curl URLs were changed to `9440`.
- The health endpoint expected output was shown as JSON (`{"status":"ok"}`), but controller-runtime health checks return plain text `ok` on success. The expected output comments were corrected.
- The Kubernetes API pod proxy example omitted the health port and would target the pod's default proxied port. It now explicitly proxies to port `9440`.
- The prerequisite and CronJob examples referenced older Flux 2.x versions. They were updated to the currently maintained Flux 2.8 line and the latest v2.8.6 CLI image available at review time.
- The sample `flux check` Kubernetes and controller versions were updated to align with current Flux 2.8 compatibility and controller versions from the latest release/install manifests.
- The Prometheus Operator example used a `ServiceMonitor`, but Flux's official monitoring example uses a `PodMonitor` selecting Flux controller pods and scraping the `http-prom` port. The snippet was updated accordingly.
- The reconciliation duration metric example used `controller_runtime_reconcile_time`, which is not the current controller-runtime metric name. It was corrected to `controller_runtime_reconcile_time_seconds`.
- The Bash health check script used `grep -v Running` under `set -euo pipefail`, which can terminate the script when all pods are running. It now uses Kubernetes field selection and `wc -l`.
- The Bash health check script printed non-ready source resources without failing the check and could hide failures from `flux get`. It now checks all Flux resources with `flux get all --status-selector ready=false --no-header`, fails if the query fails, and exits non-zero if any non-ready resources are returned.
- The CronJob shell condition could exit successfully when `flux check` failed because of the final `|| exit 0`. It now exits immediately on `flux check` or `flux get` failure and only succeeds when no non-ready Flux resources are returned.

## Review Notes
The post remains technically relevant. The CronJob snippet assumes a `flux-health-checker` ServiceAccount with RBAC permissions exists; that is acceptable for a short example but should be expanded in a future production-ready version.
