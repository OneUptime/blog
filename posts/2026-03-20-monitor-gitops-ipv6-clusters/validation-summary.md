# Validation Summary: How to Monitor GitOps Deployments in IPv6 Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- GitOps
- ArgoCD (Prometheus metrics, ServiceMonitor)
- Flux CD (gotk metrics, PodMonitor)
- Prometheus / PromQL / Alertmanager rules
- Prometheus Operator (ServiceMonitor, PodMonitor, Probe CRDs)
- Blackbox Exporter
- Grafana
- Kubernetes / kubectl
- curl (`-6` flag), `ip -6 addr`, `nslookup`

## Sources Consulted
- ArgoCD Operator Manual - Metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Flux CD Monitoring documentation: https://fluxcd.io/flux/monitoring/metrics/
- Prometheus Operator API Reference (ServiceMonitor, PodMonitor, Probe): https://prometheus-operator.dev/docs/operator/api/
- Blackbox Exporter configuration: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- RFC 3986 (URI generic syntax, including bracketed IPv6 literal hosts) and RFC 5952 (IPv6 textual representation - hex digits 0-9, a-f only)
- RFC 3849 (`2001:db8::/32` documentation prefix)
- ArgoCD source / metrics catalog showing label set for `argocd_git_request_total` (only `repo` and `request_type`) and `argocd_app_sync_total` (with `phase` label)

## Issues Found

1. **Invalid IPv6 literals in URLs and shell commands.** The post used IPv6 addresses such as `2001:db8::app`, `2001:db8::api`, `2001:db8::frontend`, and `2001:db8::git`. Per RFC 5952, IPv6 address fields are hexadecimal and may only contain `0-9` and `a-f`. Characters like `p`, `i`, `r`, `o`, `n`, `t`, and `g` are not valid hex, so these strings are not parseable as IPv6 addresses. Replaced them with valid `2001:db8::1`, `2001:db8::2`, `2001:db8::3`, and `2001:db8::4` respectively (still in the RFC 3849 documentation range).

2. **Non-existent label `response_code` on `argocd_git_request_total`.** The ArgoCD metrics documentation specifies that `argocd_git_request_total` only has the labels `repo` and `request_type` (values `ls-remote` or `fetch`). The PromQL query `argocd_git_request_total{request_type="fetch"} - argocd_git_request_total{request_type="fetch",response_code="200"}` and the alert `rate(argocd_git_request_total{response_code!="200"}[5m]) > 0` would never match a real series. Replaced both with valid expressions: `rate(argocd_git_request_total{request_type="fetch"}[5m])` for the dashboard query, and `rate(argocd_app_sync_total{phase="Failed"}[5m]) > 0` for the alert (using the documented `argocd_app_sync_total` metric which exposes `phase` labels including `Failed`/`Succeeded`/`Error`).

3. **Non-existent metric `argocd_app_condition_last_transition_time`.** This metric is not part of the ArgoCD-exposed Prometheus metrics, and `argocd_app_info` is a gauge whose value is always `1` (not a timestamp), so the original "sync lag" expression was not computable. Replaced with the well-defined `rate(argocd_app_sync_total{phase="Failed"}[5m])` to give a meaningful failure-rate signal.

## Review Notes

- The Prometheus Operator CRDs used (`ServiceMonitor`, `PodMonitor`, `Probe`) and their schema (`endpoints`, `podMetricsEndpoints`, `targets.staticConfig`) are correct for `monitoring.coreos.com/v1`.
- `gotk_reconcile_condition` and `gotk_reconcile_duration_seconds` are valid Flux v2 controller metrics. The Flux deployment pod label `app: source-controller` matches what the upstream Flux manifests apply to controller pods.
- Blackbox Exporter `http` module options used (`valid_http_versions`, `valid_status_codes`, `method`, `preferred_ip_protocol: ip6`, `ip_protocol_fallback: false`) are all correct per the Blackbox Exporter configuration reference.
- `curl -6` correctly forces IPv6, and `ip -6 addr` is a valid way to inspect IPv6 addresses inside a pod (assuming `iproute2` is installed in the controller image).
- `nslookup` will only return `AAAA` if the resolver is asked for `AAAA` records or the host has only `AAAA` records; for a stricter IPv6-only check, `dig AAAA git.example.com` or `getent ahostsv6 git.example.com` would be more explicit. Left as-is since the original wording is still substantively correct.
- The `argocd_app_info` gauge's `health_status` and `sync_status` labels are accurate, including the values `Synced` / `Healthy` (case-sensitive).
