# How to Set Up Log-Based Alerts on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Log Alerts, Kubernetes, Loki, Promtail, Logging, Alertmanager

Description: Configure log-based alerting on Talos Linux using Grafana Loki, Promtail, and Alertmanager to detect issues from log patterns.

---

Metrics tell you that something is wrong. Logs tell you why. While Prometheus alerts fire based on numerical thresholds, some problems only show up in log messages. An application might log authentication failures, database connection errors, or deprecation warnings that never register as metric anomalies. On Talos Linux, where you cannot tail log files directly on the host, you need a structured approach to collecting logs and generating alerts from them. This guide covers setting up log-based alerting using Grafana Loki on a Talos Linux Kubernetes cluster.

## Why Log-Based Alerts Matter

Metrics-based alerting has gaps. Consider these scenarios:

- A security breach where failed login attempts spike but never trigger a metric
- An application logging "disk quota exceeded" errors before any disk metric crosses a threshold
- A third-party API returning error messages that your code handles gracefully (no metric impact) but indicate a degrading service
- Stack traces appearing in logs before the application starts visibly failing

Log-based alerts catch these issues by watching for specific patterns, error messages, or anomalous log volumes.

## Architecture

The log-based alerting stack on Talos Linux consists of:

- **Promtail**: Collects logs from all pods on each node (DaemonSet)
- **Grafana Loki**: Stores and indexes logs
- **Loki Ruler**: Evaluates alerting rules against log streams
- **Alertmanager**: Routes alerts to notification channels

## Step 1: Deploy Grafana Loki

Install Loki using Helm:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

```yaml
# loki-values.yaml
loki:
  auth_enabled: false
  storage:
    type: filesystem
  commonConfig:
    replication_factor: 1

# Single binary mode for simplicity (use distributed mode for production)
singleBinary:
  replicas: 1
  persistence:
    enabled: true
    size: 50Gi
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Enable the ruler for log-based alerting
ruler:
  enabled: true
  alertmanager_url: http://prometheus-stack-kube-prometheus-alertmanager.monitoring.svc.cluster.local:9093
  storage:
    type: local
    local:
      directory: /var/loki/rules
  rule_path: /var/loki/rules-temp
  ring:
    kvstore:
      store: inmemory
  enable_api: true

# Retention configuration
limits_config:
  retention_period: 168h  # 7 days
  max_query_length: 0h
  max_query_parallelism: 2
```

```bash
kubectl create namespace logging

helm install loki grafana/loki \
  --namespace logging \
  --values loki-values.yaml
```

## Step 2: Deploy Promtail

Promtail runs as a DaemonSet and collects logs from all pods:

```yaml
# promtail-values.yaml
config:
  clients:
    - url: http://loki.logging.svc.cluster.local:3100/loki/api/v1/push

  snippets:
    # Add Talos-specific pipeline stages
    pipelineStages:
      - cri: {}
      - multiline:
          firstline: '^\d{4}-\d{2}-\d{2}'
          max_wait_time: 3s
      - labeldrop:
          - filename

  # Scrape pod logs
  scrapeConfigs: |
    - job_name: kubernetes-pods
      pipeline_stages:
        {{- toYaml .Values.config.snippets.pipelineStages | nindent 8 }}
      kubernetes_sd_configs:
        - role: pod
      relabel_configs:
        - source_labels:
            - __meta_kubernetes_pod_controller_name
          regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
          action: replace
          target_label: __tmp_controller_name
        - source_labels:
            - __meta_kubernetes_pod_label_app_kubernetes_io_name
            - __meta_kubernetes_pod_label_app
            - __tmp_controller_name
            - __meta_kubernetes_pod_name
          regex: ^;*([^;]+)(;.*)?$
          action: replace
          target_label: app
        - source_labels:
            - __meta_kubernetes_pod_node_name
          action: replace
          target_label: node_name
        - source_labels:
            - __meta_kubernetes_namespace
          action: replace
          target_label: namespace
        - source_labels:
            - __meta_kubernetes_pod_name
          action: replace
          target_label: pod
        - source_labels:
            - __meta_kubernetes_pod_container_name
          action: replace
          target_label: container

# Tolerations for Talos control plane nodes
tolerations:
  - operator: Exists

# Resource limits
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

```bash
helm install promtail grafana/promtail \
  --namespace logging \
  --values promtail-values.yaml
```

## Step 3: Configure Loki as a Grafana Data Source

```yaml
# grafana-loki-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-loki-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  loki-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        access: proxy
        url: http://loki.logging.svc.cluster.local:3100
        jsonData:
          maxLines: 1000
```

```bash
kubectl apply -f grafana-loki-datasource.yaml
```

## Step 4: Create Log-Based Alerting Rules

Now the important part. Create alerting rules that fire based on log content. Loki uses LogQL for querying logs.

```yaml
# loki-alert-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-alert-rules
  namespace: logging
data:
  rules.yaml: |
    groups:
      - name: application-errors
        rules:
          # Alert when error log rate is high
          - alert: HighErrorLogRate
            expr: |
              sum(rate({namespace="default"} |= "ERROR" [5m])) by (app) > 1
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High error log rate for {{ $labels.app }}"
              description: "Application {{ $labels.app }} is logging {{ $value }} errors per second."

          # Alert on specific critical error patterns
          - alert: DatabaseConnectionError
            expr: |
              sum(rate({namespace="default"} |= "database connection" |= "failed" [5m])) by (app) > 0
            for: 2m
            labels:
              severity: critical
            annotations:
              summary: "Database connection failures in {{ $labels.app }}"
              description: "Application {{ $labels.app }} is logging database connection failures."

          # Alert on out of memory errors in logs
          - alert: OutOfMemoryInLogs
            expr: |
              sum(rate({namespace=~".+"} |~ "(?i)(out of memory|oom|cannot allocate memory)" [5m])) by (namespace, app) > 0
            for: 1m
            labels:
              severity: critical
            annotations:
              summary: "OOM errors detected in logs for {{ $labels.app }}"
              description: "Application {{ $labels.app }} in {{ $labels.namespace }} is logging out of memory errors."

      - name: security-alerts
        rules:
          # Alert on authentication failures
          - alert: HighAuthenticationFailures
            expr: |
              sum(rate({namespace=~".+"} |~ "(?i)(authentication failed|unauthorized|invalid credentials|login failed)" [5m])) by (app) > 5
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High authentication failure rate for {{ $labels.app }}"
              description: "{{ $labels.app }} is logging {{ $value }} auth failures per second. Possible brute force attack."

          # Alert on permission denied errors
          - alert: PermissionDeniedSpike
            expr: |
              sum(rate({namespace=~".+"} |~ "(?i)(permission denied|access denied|forbidden)" [5m])) by (app) > 2
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Permission denied errors in {{ $labels.app }}"
              description: "{{ $labels.app }} is logging frequent permission denied errors."

      - name: infrastructure-alerts
        rules:
          # Alert on Kubernetes system component errors
          - alert: KubeSystemErrors
            expr: |
              sum(rate({namespace="kube-system"} |= "error" [5m])) by (pod) > 0.5
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "Error logs from kube-system pod {{ $labels.pod }}"
              description: "Pod {{ $labels.pod }} in kube-system is logging errors at {{ $value }}/s."

          # Alert when log volume drops suddenly (might indicate pod issues)
          - alert: LogVolumeDrop
            expr: |
              sum(rate({namespace="default"}[5m])) by (app)
              < 0.1 * sum(rate({namespace="default"}[5m] offset 1h)) by (app)
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "Log volume dropped significantly for {{ $labels.app }}"
              description: "Log volume for {{ $labels.app }} dropped to less than 10% of the rate seen 1 hour ago. The application may have stopped logging or crashed."
```

Mount the rules into the Loki pod. If using the Loki Helm chart, add them through the ruler configuration:

```bash
kubectl apply -f loki-alert-rules.yaml
```

## Step 5: Test Log-Based Alerts

Generate some test logs to verify your alerting rules work:

```bash
# Create a pod that generates error logs
kubectl run log-test --image=busybox --restart=Never -- \
  /bin/sh -c 'while true; do echo "ERROR: database connection failed - timeout after 30s"; sleep 1; done'

# Watch Loki for the logs (via Grafana Explore)
# Or check Alertmanager for firing alerts

# Clean up
kubectl delete pod log-test
```

## Step 6: Advanced LogQL Patterns

Here are useful LogQL patterns for common alerting scenarios:

```logql
# Count stack traces (multi-line patterns)
sum(rate({app="api-server"} |~ "Exception|Traceback|panic:" [5m]))

# Extract and alert on HTTP status codes from structured logs
sum(rate({app="nginx"} | json | status >= 500 [5m])) by (status)

# Alert on slow queries logged by the application
sum(rate({app="api-server"} | json | duration > 5000 [5m]))

# Detect configuration errors after deployments
sum(count_over_time({namespace="default"} |~ "(?i)(config error|invalid configuration|missing required)" [10m])) by (app)

# Monitor for disk space warnings in logs
sum(rate({namespace=~".+"} |~ "(?i)(disk space|no space left|disk full)" [5m]))
```

## Connecting to Alertmanager

The Loki ruler sends alerts to the same Alertmanager used by Prometheus. This means your existing notification routing (Slack, PagerDuty, email) works for log-based alerts too. Just add appropriate labels to your log alert rules so Alertmanager can route them correctly:

```yaml
labels:
  severity: critical
  source: loki
  team: backend
```

Then in your Alertmanager configuration, route based on these labels:

```yaml
routes:
  - match:
      source: loki
      severity: critical
    receiver: 'slack-critical'
```

## Conclusion

Log-based alerts on Talos Linux fill the gaps that metrics-based alerting cannot cover. By deploying Loki with Promtail for log collection and the Loki ruler for alert evaluation, you can detect problems that only manifest in log messages. The integration with Alertmanager means your notification pipeline stays unified. Start with broad error rate alerts, then add specific pattern-matching rules as you learn what log messages signal real problems in your environment. The combination of metrics alerts from Prometheus and log alerts from Loki gives you comprehensive coverage for your Talos Linux cluster.
