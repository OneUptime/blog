# How to Monitor External API Access Failures from Calico Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Monitoring, API Access, Egress, Prometheus, Networking

Description: Monitor external API access failures from Calico pods using egress policy metrics, synthetic API call probes, and DNS resolution monitoring.

---

## Introduction

External API access failures from pods are often silent from the cluster operator's perspective — the application fails, but the failure mode looks like a network or API issue rather than a Calico policy issue. Proactive monitoring closes this gap by continuously testing external API reachability from within pods and alerting when policy or connectivity changes cause failures.

## Prerequisites

- Prometheus and Grafana in the cluster
- `kubectl` with permissions to create resources in monitoring namespaces

## Step 1: Create an API Connectivity Probe

Deploy a probe that continuously tests your critical external APIs.

```yaml
# api-connectivity-probe.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-api-probe
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: external-api-probe
  template:
    metadata:
      labels:
        app: external-api-probe
    spec:
      containers:
        - name: probe
          image: nicolaka/netshoot
          env:
            - name: PROBE_APIS
              value: "https://api.github.com/zen,https://httpbin.org/get"
          command:
            - /bin/bash
            - -c
            - |
              IFS=',' read -ra APIS <<< "${PROBE_APIS}"
              while true; do
                for API in "${APIS[@]}"; do
                  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                    --connect-timeout 10 --max-time 15 "${API}" 2>/dev/null || echo "000")
                  if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "201" ]; then
                    echo "OK|${API}|${HTTP_CODE}"
                  else
                    echo "FAIL|${API}|${HTTP_CODE}"
                  fi
                done
                sleep 60
              done
          resources:
            requests:
              cpu: "10m"
              memory: "32Mi"
```

```bash
# Deploy the probe
kubectl apply -f api-connectivity-probe.yaml

# Watch probe output in real time
kubectl logs -n monitoring -l app=external-api-probe -f | grep "FAIL"
```

## Step 2: Expose Probe Results as Prometheus Metrics

Use a pushgateway or a metrics exporter to convert probe results to Prometheus metrics.

```yaml
# Use blackbox-exporter for production-grade API probing
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: external-api-probe
  namespace: monitoring
spec:
  interval: 60s
  module: http_2xx
  prober:
    url: blackbox-exporter:9115
  targets:
    staticConfig:
      static:
        - https://api.github.com/zen
        - https://httpbin.org/get
```

## Step 3: Create Alerts for API Access Failures

```yaml
# api-access-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-external-api-access
  namespace: monitoring
spec:
  groups:
    - name: calico.external.api
      rules:
        # Alert when external API probe fails
        - alert: ExternalAPIUnreachableFromPods
          expr: |
            probe_success{job="external-api-probe"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "External API unreachable from pods: {{ $labels.instance }}"
            description: "Pods cannot reach {{ $labels.instance }}. Possible Calico egress policy block or NAT failure."

        # Alert when API probe latency is high (possible throttling or connectivity issues)
        - alert: ExternalAPIHighLatencyFromPods
          expr: |
            probe_duration_seconds{job="external-api-probe"} > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High external API latency from pods: {{ $labels.instance }}"
```

```bash
# Apply alerts
kubectl apply -f api-access-alerts.yaml
```

## Step 4: Monitor Egress Policy Effectiveness

Track Calico policy metrics to understand egress policy activity.

```bash
# Check Felix egress policy metrics
kubectl exec -n calico-system \
  $(kubectl get pods -n calico-system -l app=calico-node -o name | head -1) -- \
  wget -qO- http://localhost:9091/metrics 2>/dev/null | \
  grep -E "felix_active_local_policies|felix_ipsets"

# Track denied egress connections via conntrack
kubectl exec -n calico-system \
  $(kubectl get pods -n calico-system -l app=calico-node -o name | head -1) -- \
  conntrack -L 2>/dev/null | grep UNREPLIED | wc -l
```

## Step 5: Create a Runbook-Linked Alert

Configure alerts to include diagnostic steps in the alert body.

```yaml
# Enhanced alert with runbook link
- alert: ExternalAPIUnreachableFromPods
  expr: probe_success{job="external-api-probe"} == 0
  for: 5m
  labels:
    severity: critical
    component: calico-networking
  annotations:
    summary: "External API unreachable from pods: {{ $labels.instance }}"
    runbook_url: "https://wiki.internal/runbooks/calico-external-api-failures"
    description: |
      Pods cannot reach {{ $labels.instance }}.
      Diagnostic steps:
      1. kubectl exec <pod> -- curl -v {{ $labels.instance }}
      2. calicoctl get globalnetworkpolicies
      3. calicoctl get ippool default-ipv4-ippool -o yaml | grep natOutgoing
```

## Best Practices

- Deploy API connectivity probes in the same namespaces as production workloads, not just a monitoring namespace
- Use the Blackbox Exporter for production-grade probe metrics with proper HTTP response validation
- Include both DNS resolution checks and HTTPS connection checks in probe configurations
- Link alerts to runbooks with diagnostic commands so on-call engineers can act immediately

## Conclusion

Monitoring external API access from Calico pods requires synthetic probes that continuously test API reachability, Prometheus alerts on probe failures, and links to diagnostic runbooks. Early detection of access failures prevents application incidents from accumulating while the root cause (typically a network policy change or NAT misconfiguration) goes undetected.
