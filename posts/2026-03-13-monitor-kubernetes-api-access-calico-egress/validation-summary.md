# Validation Summary: How to Monitor Kubernetes API Access Problems with Calico Egress Policy

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Calico (Felix, egress policy)
- Kubernetes (CronJob, API server, service accounts)
- Prometheus / kube-state-metrics
- Prometheus Operator (PrometheusRule CRD)
- curl, wget (probe tooling)
- Mermaid (diagram)

## Sources Consulted
- Tigera Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- kube-state-metrics job metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/job-metrics.md
- Kubernetes CronJob API (batch/v1, stable since 1.21)
- Kubernetes in-cluster service account token mount path conventions

## Issues Found
- **Non-existent Felix metric `felix_iptables_dropped`**: Step 3 grepped for `felix_iptables_dropped`, which is not a metric exposed by Felix. The documented `felix_iptables_*` metrics are limited to chains, rules, lines_executed, lock_acquire_secs, lock_retries, restore_calls/errors, and save_calls/errors — none of them count dropped packets. Open-source Calico does not expose a packet-drop counter via the Felix Prometheus endpoint; drops have to be observed via iptables counters or by enabling iptables drop logging. Changed the grep to `felix_iptables` (matching all real iptables-related metrics, whose movement still correlates with policy changes) and updated the surrounding comment so it no longer claims to show drops directly.

## Review Notes
- The Felix Prometheus metrics endpoint on port 9091 is correct, but it requires `prometheusMetricsEnabled: true` in the FelixConfiguration; the post does not call this out. Worth noting in a future revision since the metric grep returns nothing if the endpoint is disabled.
- The `calico/node` image historically did not ship with `watch`. The `kubectl exec ... watch -n5 ...` pattern may fail on minimal images; a `while true; do ...; sleep 5; done` loop or running `watch` on the workstation would be more portable. Not changed because behavior depends on the deployed image variant.
- The synthetic probe sends `Authorization: Bearer $TOKEN` but uses `-k` (skip TLS verification). For production hardening, mounting `ca.crt` from the same service-account directory and passing `--cacert` would be preferred. Left as-is since the post explicitly frames this as a synthetic reachability probe.
- The `kube_job_status_failed` metric is stable and exposes `job_name`, `namespace`, and `reason` labels, so the PromQL selector in Step 2 is valid.
- CronJob `batch/v1` is correct (stable since Kubernetes 1.21).
