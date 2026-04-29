# How to Implement Logging Best Practices in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Logging, Loki, Fluentd, ELK, Kubernetes, Observability

Description: Implement logging best practices in Rancher using structured logging, centralized log aggregation with Loki or Elasticsearch, log retention policies, and alerting on log patterns for production...

## Introduction

Effective logging in Rancher covers container logs, Kubernetes events, audit logs, and Rancher management plane logs. Log aggregation to a central store enables searching, correlation, and alerting. The key principles are: structured JSON logs, centralized aggregation, retention policies, and alerting on error patterns.

## Step 1: Enable Rancher Logging

Install via Rancher UI: **Cluster > Apps > Logging**

```bash
# Or install via Helm

helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install rancher-logging-crd rancher-charts/rancher-logging-crd \
  --namespace cattle-logging-system \
  --create-namespace

helm install rancher-logging rancher-charts/rancher-logging \
  --namespace cattle-logging-system \
  --set logging.enabled=true \
  --set logging.controlNamespace=cattle-logging-system
```

Rancher Logging uses the Logging operator. In this example, Fluent Bit collects logs from nodes and Fluentd forwards them to Loki.

## Step 2: Configure Log Flows to Loki

```yaml
# ClusterFlow: collect all container logs except the dedicated audit tailer
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  match:
    - exclude:
        labels:
          app.kubernetes.io/name: kube-audit
    - select: {}           # Match all other pods
  filters:
    - tag_normaliser: {}
    - parser:
        remove_key_name_field: true
        reserve_data: true
        parse:
          type: multi_format
          patterns:
            - format: json # Parse structured application logs
            - format: none # Keep non-JSON logs unchanged
  globalOutputRefs:
    - loki-output
---
# ClusterOutput: send to Loki
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: loki-output
  namespace: cattle-logging-system
spec:
  loki:
    url: http://loki.monitoring.svc.cluster.local:3100
    configure_kubernetes_labels: true
    labels:
      cluster: production
    buffer:
      timekey: 1m
      timekey_wait: 30s
      timekey_use_utc: true
```

## Step 3: Structured Logging in Applications

Applications must emit structured JSON for effective log querying:

```json
{
  "timestamp": "2026-03-20T10:00:00Z",
  "level": "ERROR",
  "service": "payment-api",
  "trace_id": "abc123",
  "user_id": "user456",
  "message": "Payment processing failed",
  "error": "connection timeout to payment-gateway",
  "duration_ms": 5003
}
```

In Node.js (using pino):
```javascript
const pino = require('pino');
const logger = pino({ level: 'info' });
logger.error({
  trace_id: req.headers['x-trace-id'],
  user_id: req.user.id,
  duration_ms: elapsed
}, 'Payment processing failed');
```

## Step 4: Log Retention Policies

```yaml
# Loki retention configuration (S3 backend, compactor-based)
limits_config:
  retention_period: 720h    # 30 days default
  retention_stream:
    - selector: '{log_type="audit"}'
      priority: 1
      period: 8760h         # 1 year for audit logs

compactor:
  working_directory: /data/retention
  delete_request_store: s3
  retention_enabled: true

# Table Manager retention exists only for legacy index types and is deprecated.
# If you add labels such as log_level=debug at ingestion time, you can also apply shorter retention to those streams.
```

## Step 5: Alert on Log Patterns

```yaml
# Loki alerting rule (requires Loki ruler)
groups:
  - name: application-errors
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({namespace="production"} | json | level="ERROR" | __error__="" [5m]))
          /
          sum(rate({namespace="production"} [5m])) > 0.05
        for: 2m
        annotations:
          summary: "Error rate above 5% in production namespace"

      # Example if Kubernetes events are also being shipped to Loki via EventTailer
      - alert: OOMKillDetected
        expr: |
          sum(count_over_time({namespace="cattle-logging-system"} | json | event_reason="OOMKilled" | __error__="" [5m])) > 0
        annotations:
          summary: "OOMKill event detected"
```

## Step 6: Kubernetes Audit Log Forwarding

```yaml
# Forward audit logs to a separate Loki stream
# Requires Kubernetes audit logging to already be enabled on the cluster.
apiVersion: logging-extensions.banzaicloud.io/v1alpha1
kind: HostTailer
metadata:
  name: kube-audit
  namespace: cattle-logging-system
spec:
  workloadMetaOverrides:
    labels:
      app.kubernetes.io/name: kube-audit
  fileTailers:
    - name: kube-audit
      path: /var/log/kube-audit/audit-log.json
      disabled: false
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: loki-audit-output
  namespace: cattle-logging-system
spec:
  loki:
    url: http://loki.monitoring.svc.cluster.local:3100
    configure_kubernetes_labels: true
    labels:
      cluster: production
      log_type: audit
    buffer:
      timekey: 1m
      timekey_wait: 30s
      timekey_use_utc: true
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: audit-logs
  namespace: cattle-logging-system
spec:
  match:
    - select:
        labels:
          app.kubernetes.io/name: kube-audit
  globalOutputRefs:
    - loki-audit-output
```

## Logging Checklist

- Rancher Logging operator installed on all clusters
- Applications emit structured JSON logs
- Centralized aggregation to Loki or Elasticsearch
- Retention policy: 30 days production, 1 year audit
- Grafana dashboards for log exploration
- Alerting rules for error spikes and OOMKills
- Audit logs separated and retained for compliance
- Log volumes monitored to prevent storage exhaustion

## Conclusion

Production-grade logging in Rancher requires structured application logs, centralized aggregation, defined retention policies, and alerting on error patterns. The Rancher Logging app with Loki provides a lightweight, cost-effective stack. For high-volume environments, use S3-backed Loki storage and tune buffer sizes. Correlate logs with traces (Tempo) and metrics (Prometheus) for complete observability using Grafana's unified query interface.
