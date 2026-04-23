# How to Monitor Rancher Server Resource Usage - Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Monitoring, Prometheus, Grafana, Resource Usage

Description: Set up comprehensive monitoring for Rancher server resource usage with Prometheus metrics, Grafana dashboards, and alerting for proactive capacity management.

## Introduction

Monitoring Rancher server resource usage is essential for maintaining reliable cluster management at any scale. This guide covers setting up Prometheus metrics collection for Rancher, creating Grafana dashboards, and configuring alerts to detect capacity issues before they impact operations.

## Prerequisites

- Rancher-monitoring installed (Prometheus Operator)
- Grafana accessible
- Cluster admin access to Rancher's local cluster

## Step 1: Enable Rancher Server Metrics

```bash
# Enable Rancher's advanced Prometheus metrics
kubectl -n cattle-system set env deployment/rancher CATTLE_PROMETHEUS_METRICS=true

# Wait for the rollout to complete
kubectl rollout status deployment/rancher -n cattle-system

# Verify the env var is present
kubectl -n cattle-system get deployment rancher \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="CATTLE_PROMETHEUS_METRICS")].value}{"\n"}'
```

## Step 2: Verify Rancher's ServiceMonitor

```bash
# rancher-monitoring creates the Rancher ServiceMonitor automatically
# when rancherMonitoring.enabled=true.
kubectl get servicemonitor rancher -n cattle-system -o yaml
```

## Step 3: Key Metrics to Monitor

```promql
# Total managed clusters
sum(cluster_manager_cluster_owner)

# Active remotedialer websocket sessions
sum(
  session_server_total_add_websocket_session -
  (session_server_total_remove_websocket_session or (0 * session_server_total_add_websocket_session))
)

# Rancher API request rate by response code
sum by (code) (rate(steve_api_total_requests[5m]))

# API error rate
sum(rate(steve_api_total_requests{code=~"5.."}[5m])) /
sum(rate(steve_api_total_requests[5m]))

# API average request time (subscribe omitted)
sum(rate(steve_api_request_time_sum{resource!="subscribe"}[5m])) /
sum(rate(steve_api_request_time_count{resource!="subscribe"}[5m]))

# Rancher pod memory usage
sum(container_memory_working_set_bytes{
  namespace="cattle-system",
  container="rancher"
})

# Rancher pod CPU usage
sum(rate(container_cpu_usage_seconds_total{
  namespace="cattle-system",
  container="rancher"
}[5m]))
```

## Step 4: Create Grafana Dashboard

```json
{
  "title": "Rancher Server Overview",
  "panels": [
    {
      "title": "Total Managed Clusters",
      "type": "stat",
      "targets": [{"expr": "sum(cluster_manager_cluster_owner)"}]
    },
    {
      "title": "Active Agent Sessions",
      "type": "stat",
      "targets": [{"expr": "sum(session_server_total_add_websocket_session - (session_server_total_remove_websocket_session or (0 * session_server_total_add_websocket_session)))"}]
    },
    {
      "title": "API Request Rate",
      "type": "graph",
      "targets": [{"expr": "sum by (code) (rate(steve_api_total_requests[5m]))"}]
    },
    {
      "title": "API Average Request Time",
      "type": "graph",
      "targets": [{"expr": "sum(rate(steve_api_request_time_sum{resource!=\"subscribe\"}[5m])) / sum(rate(steve_api_request_time_count{resource!=\"subscribe\"}[5m]))"}]
    },
    {
      "title": "Rancher Memory Usage",
      "type": "graph",
      "targets": [{"expr": "sum(container_memory_working_set_bytes{namespace=\"cattle-system\",container=\"rancher\"})"}]
    }
  ]
}
```

## Step 5: Configure Critical Alerts

```yaml
# rancher-server-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-server-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: rancher-server
      rules:
        # No active remotedialer sessions
        - alert: RancherNoActiveDialerSessions
          expr: |
            sum(
              session_server_total_add_websocket_session -
              (session_server_total_remove_websocket_session or (0 * session_server_total_add_websocket_session))
            ) < 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Rancher has no active remotedialer sessions"
            description: "Cluster and node agents are not maintaining websocket sessions with Rancher"

        # High memory usage
        - alert: RancherHighMemory
          expr: |
            sum(container_memory_working_set_bytes{
              namespace="cattle-system",container="rancher"
            }) / 1024 / 1024 / 1024 > 12
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Rancher server memory > 12GB"

        # API error rate high
        - alert: RancherAPIErrors
          expr: |
            sum(rate(steve_api_total_requests{code=~"5.."}[5m])) /
            sum(rate(steve_api_total_requests[5m])) > 0.1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Rancher API error rate > 10%"

        # etcd database approaching quota
        - alert: RancherEtcdQuota
          expr: |
            etcd_mvcc_db_total_size_in_bytes /
            etcd_server_quota_backend_bytes > 0.8
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Rancher etcd database >80% of quota"
```

## Step 6: Monitor Fleet GitOps Performance

```promql
# Fleet bundle deployment success rate
sum(fleet_bundle_ready) /
sum(fleet_bundle_desired_ready) * 100

# Fleet bundle errors
sum(fleet_bundle_err_applied)

# Fleet clusters not ready
sum(fleet_cluster_state{state="NotReady"})
```

## Step 7: Set Up Capacity Planning Metrics

```bash
# Create a recording rule for capacity trends
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-capacity
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: rancher-capacity
      interval: 5m
      rules:
        - record: rancher:cluster_count:total
          expr: sum(cluster_manager_cluster_owner)

        - record: rancher:api_request_rate:5m
          expr: sum(rate(steve_api_total_requests[5m]))

        - record: rancher:memory_usage_bytes
          expr: |
            sum(container_memory_working_set_bytes{
              namespace="cattle-system",
              container="rancher"
            })
EOF
```

## Conclusion

Comprehensive Rancher server monitoring enables proactive capacity management and rapid incident response. The key metrics to track are active remotedialer sessions, API performance (request rate, average request time, and error rates), resource consumption (CPU and memory), and etcd database health. Setting up alerts for loss of active agent sessions, high memory usage, and etcd quota utilization ensures that capacity issues are addressed before they impact the management plane's reliability.
