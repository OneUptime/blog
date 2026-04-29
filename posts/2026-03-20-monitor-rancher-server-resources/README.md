# How to Monitor Rancher Server Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Monitoring, Prometheus, Grafana, Server Resources, Observability

Description: Monitor Rancher Server pod resources, etcd health, API server metrics, and set up alerts for proactive Rancher management platform health maintenance.

## Introduction

Monitoring Rancher Server itself-not just the downstream clusters it manages-is critical for ensuring the management platform remains healthy. An overloaded or degraded Rancher Server impacts your ability to manage all downstream clusters simultaneously.

## Key Metrics to Monitor

| Metric | Alert Threshold | Impact |
|---|---|---|
| Rancher Server CPU | > 80% sustained | Slow reconciliation |
| Rancher Server Memory | > 85% of limit | OOM risk |
| etcd DB size | > 75% of quota | Potential write failures |
| etcd WAL fsync p99 | > 10ms | API latency increase |
| Websocket connections | > 80% of max | Cluster agent disconnect |
| Reconcile queue depth | Growing trend | Management backlog |

## Step 1: Enable Prometheus Scraping for Rancher

```yaml
# Add ServiceMonitor for Rancher Server

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rancher-server
  namespace: cattle-system
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      app: rancher
  endpoints:
    - port: https-internal
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
      path: /metrics
      interval: 30s
```

## Step 2: Configure etcd Monitoring

```bash
# etcd exposes metrics on port 2381
kubectl apply -f - << 'EOF'
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd
  namespace: kube-system
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      component: etcd
  endpoints:
    - port: metrics
      scheme: https
      tlsConfig:
        caFile: /etc/prometheus/secrets/etcd-certs/ca.crt
        certFile: /etc/prometheus/secrets/etcd-certs/client.crt
        keyFile: /etc/prometheus/secrets/etcd-certs/client.key
EOF
```

## Step 3: Prometheus Alert Rules

```yaml
# rancher-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-server-alerts
  namespace: cattle-system
spec:
  groups:
    - name: rancher-server
      rules:
        - alert: RancherServerHighMemory
          expr: |
            container_memory_usage_bytes{namespace="cattle-system", container="rancher"}
            / container_spec_memory_limit_bytes{namespace="cattle-system", container="rancher"}
            > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Rancher Server memory usage is high"

        - alert: RancherServerDown
          expr: |
            kube_deployment_status_replicas_available{namespace="cattle-system", deployment="rancher"}
            < kube_deployment_spec_replicas{namespace="cattle-system", deployment="rancher"}
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Rancher Server replicas are down"

        - alert: EtcdDatabaseQuotaWarning
          expr: |
            etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes > 0.75
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "etcd database size is approaching quota limit"
```

## Step 4: Grafana Dashboard

Install the `rancher-monitoring` chart (Cluster Tools → Monitoring) to get the pre-built Grafana dashboards bundled with Rancher, including Cluster, Workload, and etcd overviews.

Key panels to add:
- Rancher Server pod resource usage
- etcd DB size and fragmentation ratio
- Websocket connection count over time
- Cluster agent reconnection events

## Step 5: OneUptime Synthetic Monitoring

Add a synthetic check in [OneUptime](https://oneuptime.com) for the Rancher API health endpoint:

```text
Monitor URL: https://rancher.example.com/healthz
Expected Response: 200 OK
Alert Condition: Response time > 5s or status != 200
```

This provides external validation that Rancher is accessible, independent of internal Prometheus metrics.

## Conclusion

Comprehensive Rancher Server monitoring requires tracking Kubernetes resource metrics, etcd health, API server performance, and agent connection health. Combining internal Prometheus metrics with external synthetic monitoring from OneUptime ensures you detect Rancher management platform issues before they affect your teams.
