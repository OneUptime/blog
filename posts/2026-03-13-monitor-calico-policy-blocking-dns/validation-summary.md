# Validation Summary: How to Monitor Calico Policy Blocking DNS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico network policy
- Kubernetes NetworkPolicy
- Kubernetes CronJob and Job
- CoreDNS Prometheus metrics
- Prometheus Operator PrometheusRule
- kube-state-metrics
- kubectl

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes TTL-after-finished controller: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- CoreDNS prometheus plugin metrics: https://coredns.io/plugins/metrics/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics Job metrics: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/job-metrics.md
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy

## Issues Found
- The post implied that Calico DNS blocking generally causes CoreDNS `SERVFAIL` increases. For workload egress policy blocks to the DNS service, the query may not reach CoreDNS at all, so `SERVFAIL` is not a complete signal. Updated the introduction, symptoms, and conclusion to describe CoreDNS `SERVFAIL` as a signal for failures that reach CoreDNS, while keeping per-namespace probes as the direct namespace-level detector.
- The diagnosis command used `kubectl exec` into a CoreDNS pod and ran `wget`. This is not reliable because CoreDNS images are commonly minimal and may not include `wget` or a shell. Replaced it with `kubectl port-forward` to the CoreDNS deployment and a local `curl` of the metrics endpoint.
- The probe alert uses `kube_job_status_failed`, which reflects retained failed Job objects. Added `ttlSecondsAfterFinished: 600` to the CronJob job template so finished Jobs are automatically cleaned up and stale failed-job alerts can clear.

## Review Notes
- The PrometheusRule structure, CoreDNS metric name `coredns_dns_responses_total`, `rcode="SERVFAIL"` label, CronJob `batch/v1` schema, and kube-state-metrics `kube_job_status_failed` labels are valid.
- The `k8s-app=kube-dns` label and `deployment/coredns` shape are common for Kubernetes CoreDNS deployments, but managed distributions may customize labels or deployment names.
