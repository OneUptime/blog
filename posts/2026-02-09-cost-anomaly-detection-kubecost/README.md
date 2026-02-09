# How to Set Up Kubernetes Cost Anomaly Detection Alerts Using Kubecost and Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Kubecost, Prometheus, Monitoring

Description: Learn how to configure automated cost anomaly detection alerts in Kubernetes using Kubecost and Prometheus to catch unexpected spending spikes before they impact your budget.

---

Cloud costs can spiral out of control quickly when anomalies go undetected. A misconfigured autoscaler, a runaway pod, or an accidental deployment to expensive instance types can drain thousands of dollars overnight. Setting up proactive cost anomaly detection helps you catch these issues early.

Kubecost provides detailed cost visibility for Kubernetes clusters, and when combined with Prometheus alerting capabilities, you can build a robust system that automatically notifies you when spending patterns deviate from normal baselines.

## Understanding Cost Anomalies in Kubernetes

Cost anomalies in Kubernetes typically fall into several categories. Sudden increases in pod count often indicate autoscaling issues or deployment misconfigurations. Resource over-provisioning happens when containers request far more CPU or memory than they actually use. Storage costs can explode when persistent volumes aren't properly cleaned up after workloads are deleted.

Detecting these anomalies requires establishing baseline spending patterns and then monitoring for significant deviations. Statistical approaches like standard deviation calculations or percentage-based thresholds help identify when costs exceed normal ranges.

## Installing Kubecost with Prometheus Integration

Start by installing Kubecost in your cluster with Prometheus integration enabled. Kubecost includes its own Prometheus instance, but you can also integrate with an existing Prometheus deployment.

```yaml
# kubecost-values.yaml
global:
  prometheus:
    enabled: true
    fqdn: http://prometheus-server.monitoring.svc.cluster.local

prometheus:
  server:
    persistentVolume:
      enabled: true
      size: 32Gi
    retention: 15d

kubecostMetrics:
  exporter:
    enabled: true
```

Install using Helm with these custom values:

```bash
# Add the Kubecost Helm repository
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

# Install Kubecost with Prometheus integration
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --values kubecost-values.yaml \
  --set kubecostToken="your-token-here"

# Verify the installation
kubectl get pods -n kubecost
kubectl get svc -n kubecost
```

Wait for all pods to reach a running state. Kubecost will begin collecting cost data immediately and typically needs 24-48 hours to establish accurate baselines.

## Configuring Prometheus Recording Rules for Cost Metrics

Recording rules precompute frequently needed cost queries, making alert evaluation faster and more efficient. Create recording rules that calculate hourly and daily cost aggregations.

```yaml
# kubecost-recording-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-recording-rules
  namespace: kubecost
data:
  recording_rules.yml: |
    groups:
    - name: kubecost_cost_metrics
      interval: 5m
      rules:
      # Hourly cost per namespace
      - record: namespace:kubecost_cluster_cost_hourly:sum
        expr: sum by (namespace) (kubecost_cluster_cost_hourly)

      # Daily cost per namespace
      - record: namespace:kubecost_cluster_cost_daily:sum
        expr: sum_over_time(namespace:kubecost_cluster_cost_hourly:sum[24h])

      # 7-day rolling average cost per namespace
      - record: namespace:kubecost_cluster_cost_7d_avg:sum
        expr: avg_over_time(namespace:kubecost_cluster_cost_hourly:sum[7d])

      # CPU cost per namespace
      - record: namespace:kubecost_cpu_cost_hourly:sum
        expr: sum by (namespace) (kubecost_node_cpu_hourly_cost)

      # Memory cost per namespace
      - record: namespace:kubecost_memory_cost_hourly:sum
        expr: sum by (namespace) (kubecost_node_ram_hourly_cost)

      # Storage cost per namespace
      - record: namespace:kubecost_storage_cost_hourly:sum
        expr: sum by (namespace) (kubecost_persistentvolume_cost)
```

Apply this configuration and reload Prometheus:

```bash
# Apply the recording rules
kubectl apply -f kubecost-recording-rules.yaml

# Reload Prometheus configuration
kubectl exec -n kubecost prometheus-server-0 -- \
  curl -X POST http://localhost:9090/-/reload
```

## Creating Cost Anomaly Detection Alert Rules

Now define alert rules that detect cost anomalies based on your recording rules. These examples use multiple detection strategies for comprehensive coverage.

```yaml
# kubecost-alert-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-alert-rules
  namespace: kubecost
data:
  alert_rules.yml: |
    groups:
    - name: kubecost_cost_anomalies
      interval: 5m
      rules:

      # Alert when namespace cost exceeds 50% of 7-day average
      - alert: NamespaceCostAnomaly
        expr: |
          (
            namespace:kubecost_cluster_cost_hourly:sum
            /
            namespace:kubecost_cluster_cost_7d_avg:sum
          ) > 1.5
        for: 15m
        labels:
          severity: warning
          component: cost-management
        annotations:
          summary: "Cost anomaly detected in namespace {{ $labels.namespace }}"
          description: "Namespace {{ $labels.namespace }} hourly cost is {{ $value | humanizePercentage }} of the 7-day average"

      # Alert on sudden cost spike (2x increase in 1 hour)
      - alert: CostSpikeDetected
        expr: |
          (
            namespace:kubecost_cluster_cost_hourly:sum
            /
            namespace:kubecost_cluster_cost_hourly:sum offset 1h
          ) > 2
        for: 10m
        labels:
          severity: critical
          component: cost-management
        annotations:
          summary: "Sudden cost spike in namespace {{ $labels.namespace }}"
          description: "Cost increased by {{ $value | humanizePercentage }} in the last hour"

      # Alert when daily cost exceeds budget threshold
      - alert: DailyCostBudgetExceeded
        expr: namespace:kubecost_cluster_cost_daily:sum > 500
        for: 5m
        labels:
          severity: warning
          component: cost-management
        annotations:
          summary: "Daily cost budget exceeded for {{ $labels.namespace }}"
          description: "Daily cost of ${{ $value | humanize }} exceeds $500 budget"

      # Alert on high CPU cost growth
      - alert: CPUCostAnomalyDetected
        expr: |
          (
            rate(namespace:kubecost_cpu_cost_hourly:sum[1h])
            /
            rate(namespace:kubecost_cpu_cost_hourly:sum[1h] offset 24h)
          ) > 2
        for: 20m
        labels:
          severity: warning
          component: cost-management
        annotations:
          summary: "CPU cost anomaly in namespace {{ $labels.namespace }}"
          description: "CPU costs growing {{ $value }}x faster than 24h ago"

      # Alert on storage cost anomalies
      - alert: StorageCostAnomalyDetected
        expr: |
          namespace:kubecost_storage_cost_hourly:sum
          /
          avg_over_time(namespace:kubecost_storage_cost_hourly:sum[7d])
          > 1.5
        for: 30m
        labels:
          severity: info
          component: cost-management
        annotations:
          summary: "Storage cost anomaly in namespace {{ $labels.namespace }}"
          description: "Storage costs {{ $value | humanizePercentage }} of normal baseline"
```

Apply the alert rules and reload Prometheus:

```bash
kubectl apply -f kubecost-alert-rules.yaml
kubectl exec -n kubecost prometheus-server-0 -- \
  curl -X POST http://localhost:9090/-/reload
```

## Integrating with Alertmanager for Notifications

Configure Alertmanager to route cost anomaly alerts to appropriate channels. Different severity levels can go to different destinations.

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: kubecost
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'namespace']
      group_wait: 10s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'cost-team'

      routes:
      # Critical cost alerts go to PagerDuty and Slack
      - match:
          severity: critical
          component: cost-management
        receiver: 'pagerduty-critical'
        continue: true

      - match:
          severity: critical
          component: cost-management
        receiver: 'slack-critical'

      # Warning alerts only go to Slack
      - match:
          severity: warning
          component: cost-management
        receiver: 'slack-warnings'

    receivers:
    - name: 'cost-team'
      email_configs:
      - to: 'cost-team@company.com'
        send_resolved: true

    - name: 'pagerduty-critical'
      pagerduty_configs:
      - service_key: 'your-pagerduty-key'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'

    - name: 'slack-critical'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#cost-alerts-critical'
        title: 'Cost Anomaly: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

    - name: 'slack-warnings'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#cost-alerts-warnings'
        title: 'Cost Warning: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

Apply the Alertmanager configuration:

```bash
kubectl apply -f alertmanager-config.yaml
kubectl rollout restart deployment/alertmanager -n kubecost
```

## Testing Your Anomaly Detection System

Verify that alerts trigger correctly by simulating cost anomalies. Deploy a resource-intensive workload to generate a cost spike.

```yaml
# cost-spike-test.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-spike-test
  namespace: default
spec:
  replicas: 10
  selector:
    matchLabels:
      app: cost-test
  template:
    metadata:
      labels:
        app: cost-test
    spec:
      containers:
      - name: expensive-pod
        image: nginx:latest
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
```

Deploy the test workload and monitor for alerts:

```bash
# Deploy the test workload
kubectl apply -f cost-spike-test.yaml

# Check if Prometheus detects the cost increase
kubectl port-forward -n kubecost svc/prometheus-server 9090:80

# Open http://localhost:9090 and query:
# namespace:kubecost_cluster_cost_hourly:sum{namespace="default"}

# Check for firing alerts
# Navigate to http://localhost:9090/alerts

# Clean up the test workload
kubectl delete -f cost-spike-test.yaml
```

You should see the NamespaceCostAnomaly or CostSpikeDetected alerts fire within 15-20 minutes.

## Advanced Anomaly Detection Strategies

For more sophisticated detection, consider implementing machine learning based anomaly detection using Prometheus query results as training data. You can export cost metrics to time series databases like InfluxDB or TimescaleDB and apply statistical models.

Another approach involves setting namespace-specific budgets and baselines rather than using cluster-wide averages. This prevents high-cost namespaces from skewing the baseline for smaller workloads.

```bash
# Export Kubecost data for analysis
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090

# Query the Kubecost API for historical data
curl "http://localhost:9090/model/allocation?window=7d&aggregate=namespace" \
  | jq '.' > cost-history.json
```

Cost anomaly detection transforms reactive cost management into proactive budget protection. By combining Kubecost's detailed cost visibility with Prometheus's powerful alerting capabilities, you can catch expensive mistakes before they appear on your monthly bill. Start with conservative thresholds and tune them based on your actual alert volume and false positive rates.
