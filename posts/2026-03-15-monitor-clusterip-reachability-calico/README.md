# How to Monitor for ClusterIP Reachability Issues with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, ClusterIP, Monitoring, Prometheus, Grafana, Alerting, Networking

Description: How to set up monitoring and alerting for ClusterIP service reachability in Kubernetes clusters running Calico.

---

## Introduction

Monitoring ClusterIP reachability in Calico-managed Kubernetes clusters enables teams to detect service connectivity issues before they escalate into user-facing outages. Reactive troubleshooting is slower and more disruptive than proactive detection through metrics and alerts.

Effective monitoring covers multiple layers: service endpoint health, kube-proxy iptables rule counts, Calico Felix policy metrics, conntrack table usage, and synthetic connectivity checks. Together, these signals provide early warning when ClusterIP services are at risk of becoming unreachable.

This guide shows how to set up comprehensive monitoring for ClusterIP reachability using Prometheus, Grafana, and built-in Kubernetes and Calico metrics.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+
- Prometheus and Grafana deployed (kube-prometheus-stack recommended)
- `kubectl` and `calicoctl` CLI tools
- Alertmanager configured for notifications
- Basic familiarity with PromQL

## Enabling Calico Metrics

Calico Felix exposes Prometheus metrics that are critical for monitoring policy enforcement.

```bash
# Enable Prometheus metrics on Felix
calicoctl patch felixconfiguration default --patch \
  '{"spec":{"prometheusMetricsEnabled": true}}'

# Verify metrics endpoint is accessible
kubectl exec -n calico-system -it $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) -- \
  wget -qO- http://localhost:9091/metrics | head -20
```

Create a ServiceMonitor to scrape Calico metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-felix
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  namespaceSelector:
    matchNames:
    - calico-system
  endpoints:
  - port: metrics
    interval: 15s
```

## Monitoring Service Endpoint Health

```yaml
# PrometheusRule for endpoint monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: clusterip-endpoint-alerts
  namespace: monitoring
spec:
  groups:
  - name: clusterip-health
    rules:
    - alert: ServiceHasNoEndpoints
      expr: kube_endpoint_address_available == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Service {{ $labels.namespace }}/{{ $labels.endpoint }} has no available endpoints"
        description: "ClusterIP service has zero ready endpoints for more than 2 minutes."

    - alert: EndpointCountDrop
      expr: delta(kube_endpoint_address_available[5m]) < -2
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Endpoint count dropped for {{ $labels.namespace }}/{{ $labels.endpoint }}"
```

## Monitoring kube-proxy Health

```yaml
# Alerts for kube-proxy issues
- alert: KubeProxyDown
  expr: absent(up{job="kube-proxy"} == 1)
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "kube-proxy is not running or not being scraped"

- alert: KubeProxySyncSlow
  expr: rate(kubeproxy_sync_proxy_rules_duration_seconds_sum[5m]) / rate(kubeproxy_sync_proxy_rules_duration_seconds_count[5m]) > 1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "kube-proxy rule sync taking over 1 second on average"
```

## Monitoring conntrack Usage

```yaml
# Conntrack table usage alerts
- alert: ConntrackTableNearFull
  expr: node_nf_conntrack_entries / node_nf_conntrack_entries_limit > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Conntrack table at {{ $value | humanizePercentage }} capacity on {{ $labels.instance }}"

- alert: ConntrackTableFull
  expr: node_nf_conntrack_entries / node_nf_conntrack_entries_limit > 0.95
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Conntrack table nearly full on {{ $labels.instance }}"
```

## Monitoring Calico Policy Denials

```yaml
# Alert on Calico policy denied packets
- alert: CalicoHighDenyRate
  expr: rate(calico_denied_packets[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High rate of denied packets on {{ $labels.instance }}"
    description: "Calico Felix is denying more than 10 packets/sec which may indicate ClusterIP traffic being blocked."
```

## Synthetic Connectivity Checks

Deploy a probe that continuously tests ClusterIP connectivity:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clusterip-prober
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: clusterip-prober
  template:
    metadata:
      labels:
        app: clusterip-prober
    spec:
      containers:
      - name: prober
        image: prom/blackbox-exporter:latest
        args:
        - --config.file=/config/blackbox.yml
        volumeMounts:
        - name: config
          mountPath: /config
      volumes:
      - name: config
        configMap:
          name: blackbox-config
```

## Grafana Dashboard Queries

Key PromQL queries for a ClusterIP health dashboard:

```promql
# Services with zero endpoints
kube_endpoint_address_available == 0

# kube-proxy sync latency
histogram_quantile(0.99, rate(kubeproxy_sync_proxy_rules_duration_seconds_bucket[5m]))

# Conntrack utilization per node
node_nf_conntrack_entries / node_nf_conntrack_entries_limit * 100

# Calico denied packets rate
rate(calico_denied_packets[5m])

# Service endpoint churn
changes(kube_endpoint_address_available[1h])
```

## Verification

```bash
# Verify Prometheus is scraping Calico metrics
kubectl exec -n monitoring $(kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus -o name | head -1) -- \
  wget -qO- 'http://localhost:9090/api/v1/targets' | grep calico

# Confirm alerts are configured
kubectl get prometheusrules -n monitoring

# Test alerting by scaling a deployment to zero
kubectl scale deployment <test-deployment> --replicas=0
# Watch for ServiceHasNoEndpoints alert, then restore
kubectl scale deployment <test-deployment> --replicas=3
```

## Troubleshooting

- **Calico metrics not appearing**: Ensure Felix metrics port 9091 is not blocked by a network policy and the ServiceMonitor labels match your Prometheus configuration.
- **Alerts not firing**: Check Alertmanager routing rules and verify the PrometheusRule is in the correct namespace with matching labels.
- **Blackbox exporter cannot reach services**: The prober pod needs appropriate network policies to allow egress to ClusterIP services.
- **High cardinality warnings**: Use recording rules to pre-aggregate endpoint metrics if you have many services.

## Conclusion

Monitoring ClusterIP reachability in Calico clusters requires a layered approach covering endpoint health, kube-proxy status, conntrack table usage, Calico policy denials, and synthetic connectivity checks. By combining Prometheus alerting with Grafana dashboards, teams gain visibility into service connectivity issues before they affect production traffic. The alerts defined in this guide provide early warning at each layer where ClusterIP failures can originate.
