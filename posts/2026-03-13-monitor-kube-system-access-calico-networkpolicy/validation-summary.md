# Validation Summary: How to Monitor kube-system Access Problems with Calico NetworkPolicy

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes (kube-system, NetworkPolicy)
- CoreDNS (Prometheus plugin, metrics)
- Prometheus Operator (PrometheusRule CRD)
- Kubernetes CronJob (batch/v1)
- busybox / nslookup
- Alertmanager
- Mermaid diagrams

## Sources Consulted
- CoreDNS Prometheus plugin docs: https://coredns.io/plugins/metrics/
- CoreDNS metrics reference (metric renames in 1.7.0): https://github.com/coredns/coredns/blob/master/notes/coredns-1.7.0.md
- Prometheus Operator API: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md
- Kubernetes CronJob API (batch/v1 stable since 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CoreDNS deployment labels (k8s-app=kube-dns kept for backward compatibility): https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy

## Issues Found
No technical issues found.

Verified items:
- CoreDNS metrics endpoint port `9153` is correct (default for the prometheus plugin).
- Metric names `coredns_dns_requests_total` and `coredns_dns_responses_total{rcode="SERVFAIL"}` are the current names (renamed from `coredns_dns_request_count_total` / `coredns_dns_response_rcode_count_total` in CoreDNS 1.7.0).
- Corefile snippet is syntactically valid and matches the canonical kubeadm CoreDNS Corefile, with the `prometheus :9153` directive properly enabled.
- `monitoring.coreos.com/v1` is the correct API group/version for `PrometheusRule`.
- `batch/v1` is the correct stable apiVersion for `CronJob` (GA since Kubernetes 1.21).
- The label selector `k8s-app=kube-dns` correctly targets CoreDNS pods (the label is retained for backward compatibility with kube-dns).
- `nslookup` is available in standard busybox images and exits non-zero on failure, so the `|| exit 1` pattern correctly fails the Job.
- The mermaid `E & G --> H` combined-edge syntax is valid in mermaid v8.7+.

## Review Notes
- The post's `Description` mentions "policy audit logs" as one of the three monitoring sources, but the body only covers CoreDNS metrics and synthetic DNS probes; policy audit logs are not actually demonstrated. This is a minor content scope inconsistency rather than a technical error, so it was left as-is per the "fix only technical errors" guideline.
- The introduction calls out NXDOMAIN as a signal but the example alert fires on SERVFAIL. Both are valid signals for DNS-blocking NetworkPolicies (SERVFAIL is more typical when the upstream is unreachable due to a blocked egress), so this is consistent — readers may want to add a parallel NXDOMAIN alert as well.
- The CronJob uses the deprecated-feeling but still functional `busybox` `nslookup`; for richer diagnostics, future iterations could use `dnsutils` or a small probe image that reports latency.
- No version pin is provided for CoreDNS, Prometheus Operator, or Kubernetes; the configuration shown is compatible with currently supported versions (Kubernetes 1.21+, CoreDNS 1.7+, Prometheus Operator v0.40+).
