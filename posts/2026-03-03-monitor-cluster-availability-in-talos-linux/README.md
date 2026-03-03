# How to Monitor Cluster Availability in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Monitoring, Availability, Kubernetes, Prometheus, Observability

Description: Set up comprehensive availability monitoring for your Talos Linux cluster to track uptime, detect issues early, and measure SLA compliance.

---

Monitoring cluster availability goes beyond checking if nodes are up. It means tracking whether your cluster can accept and process workloads, whether the control plane is responsive, whether storage is functioning, and whether network connectivity is intact. For Talos Linux clusters running production workloads, availability monitoring is what allows you to maintain SLAs and catch problems before they impact users.

This guide covers setting up a comprehensive availability monitoring stack on Talos Linux, including infrastructure health, control plane monitoring, workload availability tracking, and SLA measurement.

## Monitoring Architecture

A complete availability monitoring setup for Talos Linux includes:

1. **Prometheus** for metrics collection
2. **Alertmanager** for alert routing
3. **Grafana** for dashboards
4. **Blackbox Exporter** for synthetic monitoring
5. **Node Exporter** for host-level metrics
6. **kube-state-metrics** for Kubernetes object state

## Installing the Monitoring Stack

The kube-prometheus-stack Helm chart provides everything you need:

```bash
# Add the Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring
```

Create a values file tailored for availability monitoring:

```yaml
# monitoring-values.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          resources:
            requests:
              storage: 50Gi
    # Scrape Talos API metrics
    additionalScrapeConfigs:
      - job_name: talos-api
        static_configs:
          - targets:
              - 192.168.1.10:9100
              - 192.168.1.11:9100
              - 192.168.1.12:9100

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          resources:
            requests:
              storage: 5Gi
  config:
    route:
      receiver: "default"
      group_by: ["alertname", "namespace"]
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      routes:
        - match:
            severity: critical
          receiver: "pagerduty"
          repeat_interval: 1h
    receivers:
      - name: "default"
        webhook_configs:
          - url: "http://alertmanager-webhook:9095/webhook"
      - name: "pagerduty"
        pagerduty_configs:
          - service_key: "your-pagerduty-key"

grafana:
  persistence:
    enabled: true
    storageClassName: local-path
    size: 10Gi
  adminPassword: "your-grafana-password"

# Enable node exporter for host metrics
nodeExporter:
  enabled: true

# Enable kube-state-metrics
kubeStateMetrics:
  enabled: true
```

Install the stack:

```bash
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  -f monitoring-values.yaml
```

## Deploying Blackbox Exporter for Synthetic Monitoring

The Blackbox Exporter probes endpoints to check availability from within the cluster:

```yaml
# blackbox-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackbox-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: blackbox-exporter
  template:
    metadata:
      labels:
        app: blackbox-exporter
    spec:
      containers:
        - name: blackbox
          image: prom/blackbox-exporter:latest
          ports:
            - containerPort: 9115
          volumeMounts:
            - name: config
              mountPath: /config
          args:
            - --config.file=/config/blackbox.yml
      volumes:
        - name: config
          configMap:
            name: blackbox-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: blackbox-config
  namespace: monitoring
data:
  blackbox.yml: |
    modules:
      http_2xx:
        prober: http
        timeout: 5s
        http:
          valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
          valid_status_codes: [200]
          follow_redirects: true
      tcp_connect:
        prober: tcp
        timeout: 5s
      dns_check:
        prober: dns
        timeout: 5s
        dns:
          query_name: kubernetes.default.svc.cluster.local
          query_type: A
---
apiVersion: v1
kind: Service
metadata:
  name: blackbox-exporter
  namespace: monitoring
spec:
  ports:
    - port: 9115
  selector:
    app: blackbox-exporter
```

Configure Prometheus to use the Blackbox Exporter:

```yaml
# Add to Prometheus scrape configs
- job_name: "blackbox-http"
  metrics_path: /probe
  params:
    module: [http_2xx]
  static_configs:
    - targets:
        - https://kubernetes.default.svc:6443/healthz
        - http://app.default.svc:8080/health
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - source_labels: [__param_target]
      target_label: instance
    - target_label: __address__
      replacement: blackbox-exporter.monitoring.svc:9115

- job_name: "blackbox-dns"
  metrics_path: /probe
  params:
    module: [dns_check]
  static_configs:
    - targets:
        - kube-dns.kube-system.svc:53
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - source_labels: [__param_target]
      target_label: instance
    - target_label: __address__
      replacement: blackbox-exporter.monitoring.svc:9115
```

## Core Availability Alerts

Define alerts that cover the main availability concerns:

```yaml
# availability-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-availability
  namespace: monitoring
spec:
  groups:
    - name: node-availability
      rules:
        - alert: NodeNotReady
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.node }} is not ready"

        - alert: NodeHighCPU
          expr: (1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))) > 0.9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on {{ $labels.instance }}"

        - alert: NodeHighMemory
          expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High memory usage on {{ $labels.instance }}"

        - alert: NodeDiskPressure
          expr: kube_node_status_condition{condition="DiskPressure",status="true"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Disk pressure on {{ $labels.node }}"

    - name: control-plane-availability
      rules:
        - alert: APIServerDown
          expr: up{job="apiserver"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "API server is unreachable"

        - alert: APIServerHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(apiserver_request_duration_seconds_bucket{verb!="WATCH"}[5m])) by (le)
            ) > 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "API server p99 latency exceeds 1 second"

        - alert: EtcdDown
          expr: up{job="etcd"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "etcd is unreachable on {{ $labels.instance }}"

        - alert: SchedulerDown
          expr: up{job="kube-scheduler"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Kubernetes scheduler is down"

        - alert: ControllerManagerDown
          expr: up{job="kube-controller-manager"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Controller manager is down"

    - name: workload-availability
      rules:
        - alert: DeploymentReplicasMismatch
          expr: |
            kube_deployment_spec_replicas != kube_deployment_status_available_replicas
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Deployment {{ $labels.deployment }} has replica mismatch"

        - alert: PodCrashLooping
          expr: rate(kube_pod_container_status_restarts_total[15m]) > 0.1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} is crash looping"

        - alert: PodNotReady
          expr: |
            kube_pod_status_phase{phase=~"Pending|Unknown"} == 1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} stuck in {{ $labels.phase }}"

    - name: network-availability
      rules:
        - alert: CoreDNSDown
          expr: up{job="coredns"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "CoreDNS is down"

        - alert: DNSLatencyHigh
          expr: |
            histogram_quantile(0.99,
              sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le)
            ) > 0.5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "DNS p99 latency exceeds 500ms"
```

## Building an Availability Dashboard

Create a Grafana dashboard that gives you a single view of cluster availability. Import these panels:

```json
{
  "panels": [
    {
      "title": "Cluster Availability Score",
      "type": "gauge",
      "targets": [
        {
          "expr": "avg(up{job=~'apiserver|etcd|kube-scheduler|kube-controller-manager'}) * 100"
        }
      ]
    },
    {
      "title": "Node Readiness",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(kube_node_status_condition{condition='Ready',status='true'}) / count(kube_node_info) * 100"
        }
      ]
    },
    {
      "title": "Pod Availability",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(kube_pod_status_phase{phase='Running'}) / sum(kube_pod_status_phase) * 100"
        }
      ]
    }
  ]
}
```

## Measuring SLA Compliance

Track uptime over time to measure SLA compliance:

```yaml
# SLA recording rules
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sla-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: sla
      interval: 1m
      rules:
        # Record API server availability every minute
        - record: cluster:apiserver:availability:1m
          expr: avg(up{job="apiserver"})

        # Calculate rolling 30-day availability
        - record: cluster:apiserver:availability:30d
          expr: avg_over_time(cluster:apiserver:availability:1m[30d])

        # Track node availability
        - record: cluster:node:availability:1m
          expr: |
            sum(kube_node_status_condition{condition="Ready",status="true"})
            / count(kube_node_info)
```

Query availability percentages:

```promql
# 30-day API server availability percentage
cluster:apiserver:availability:30d * 100

# Minutes of downtime in the last 30 days
(1 - cluster:apiserver:availability:30d) * 30 * 24 * 60
```

## External Monitoring

Do not rely solely on in-cluster monitoring. Set up external checks that can detect when the entire cluster is unreachable:

```bash
# Simple external health check script
# Run from a machine outside the cluster
while true; do
  STATUS=$(curl -sk -o /dev/null -w "%{http_code}" \
    --connect-timeout 5 \
    https://192.168.1.100:6443/healthz)
  if [ "$STATUS" != "200" ]; then
    echo "$(date) ALERT: Cluster API not responding (status: $STATUS)"
    # Send alert via external alerting system
  fi
  sleep 30
done
```

## Conclusion

Monitoring cluster availability in Talos Linux requires a multi-layered approach that covers nodes, control plane components, workloads, storage, and networking. With Prometheus for metrics, Alertmanager for notification, Grafana for visualization, and Blackbox Exporter for synthetic testing, you get a complete picture of your cluster's health. Combine in-cluster monitoring with external checks for comprehensive coverage, and track SLA metrics to ensure you are meeting your availability targets. Regular review of these metrics and alerts helps you identify trends and address issues before they impact availability.
