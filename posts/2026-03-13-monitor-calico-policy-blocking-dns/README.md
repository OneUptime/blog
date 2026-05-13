# How to Monitor Calico Policy Blocking DNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: Monitor for Calico policy DNS blocking using CoreDNS error rate metrics, per-namespace DNS probe CronJobs, and SERVFAIL rate alerts.

---

## Introduction

Monitoring for DNS blocking by Calico policies requires detecting DNS failures quickly and identifying which namespace is affected. CoreDNS Prometheus metrics provide cluster-wide visibility for DNS failures that reach CoreDNS, while per-namespace DNS probe CronJobs pinpoint the specific namespace where policies are blocking DNS.

## Symptoms

- CoreDNS SERVFAIL rate may increase after a policy change that affects CoreDNS or its upstream lookups
- Specific namespace's DNS probe failing

## Root Causes

- Policy deployed without DNS monitoring
- No per-namespace DNS health checks

## Diagnosis Steps

```bash
kubectl port-forward -n kube-system \
  $(kubectl get deployment -n kube-system -l k8s-app=kube-dns -o name | head -1) \
  9153:9153

# In another terminal:
curl -fsS http://localhost:9153/metrics | grep coredns_dns
```

## Solution

**Alert on CoreDNS SERVFAIL rate**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dns-policy-blocking-alerts
  namespace: monitoring
spec:
  groups:
  - name: dns.policy
    rules:
    - alert: CoreDNSHighServfailRate
      expr: |
        rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]) > 0.5
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "CoreDNS SERVFAIL rate elevated - possible policy blocking DNS"
    - alert: DNSProbeFailure
      expr: |
        kube_job_status_failed{job_name=~"dns-probe.*"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "DNS probe failing in namespace {{ $labels.namespace }}"
```

**Per-namespace DNS probe**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dns-probe
  namespace: production
spec:
  schedule: "*/3 * * * *"
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 600
      template:
        spec:
          containers:
          - name: probe
            image: busybox
            command: ["/bin/sh", "-c"]
            args:
            - |
              nslookup kubernetes.default.svc.cluster.local || exit 1
              echo "DNS OK"
          restartPolicy: Never
```

```mermaid
flowchart LR
    A[CoreDNS scrape] --> B[SERVFAIL rate > threshold?]
    B -- Yes --> C[Alert: CoreDNSHighServfailRate]
    D[DNS probe CronJob every 3 min] --> E{nslookup succeeds?}
    E -- No --> F[Job fails -> Alert: DNSProbeFailure]
    C & F --> G[On-call checks recent policy changes]
```

## Prevention

- Deploy DNS probes in all namespaces with policies
- Monitor CoreDNS SERVFAIL rate at all times
- Alert within 5 minutes of DNS failure onset

## Conclusion

Monitoring for DNS blocking by Calico policies uses two signals: CoreDNS SERVFAIL rate for failures that reach CoreDNS, and per-namespace DNS probe CronJobs for precise localization of namespace-level DNS access problems. Together they provide detection within minutes of a policy change that breaks DNS.
