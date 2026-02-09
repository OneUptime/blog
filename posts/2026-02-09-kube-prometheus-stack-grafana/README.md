# How to Deploy kube-prometheus-stack with Grafana and Alertmanager on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, Grafana, Monitoring, Alertmanager

Description: Learn how to deploy the complete kube-prometheus-stack with Grafana and Alertmanager for comprehensive Kubernetes monitoring using Helm.

---

Monitoring Kubernetes clusters requires a robust observability stack that can collect metrics, visualize data, and send alerts. The kube-prometheus-stack provides a complete monitoring solution by bundling Prometheus, Grafana, Alertmanager, and various exporters into a single Helm chart. This guide walks you through deploying and configuring the entire stack.

## Understanding kube-prometheus-stack

The kube-prometheus-stack is a collection of Kubernetes manifests, Grafana dashboards, and Prometheus rules combined with documentation and scripts. It includes the Prometheus Operator, which uses Custom Resource Definitions (CRDs) to simplify Prometheus deployment and configuration.

Key components include:
- Prometheus Operator for managing Prometheus instances
- Prometheus server for metrics collection
- Grafana for visualization
- Alertmanager for alert routing and notification
- Node exporter for hardware and OS metrics
- Kube-state-metrics for cluster-level metrics
- Pre-configured dashboards and alerting rules

## Prerequisites

Before deploying the stack, ensure you have:
- A running Kubernetes cluster (version 1.19+)
- kubectl configured to communicate with your cluster
- Helm 3 installed on your local machine
- Sufficient cluster resources (at least 4GB RAM, 2 CPU cores available)

## Installing kube-prometheus-stack with Helm

First, add the Prometheus community Helm repository:

```bash
# Add the Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Update your local Helm chart repository cache
helm repo update
```

Create a namespace for the monitoring stack:

```bash
# Create a dedicated namespace for monitoring
kubectl create namespace monitoring
```

Now deploy the stack with default configuration:

```bash
# Install kube-prometheus-stack
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

This basic installation deploys all components with default settings. For production use, you should customize the configuration.

## Customizing the Deployment

Create a values file to customize the deployment. Here's a comprehensive example:

```yaml
# prometheus-values.yaml

# Prometheus configuration
prometheus:
  prometheusSpec:
    # Storage configuration
    retention: 15d
    retentionSize: "50GB"

    # Resource requests and limits
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi

    # Persistent storage
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

    # External labels for federation
    externalLabels:
      cluster: production
      region: us-east-1

# Grafana configuration
grafana:
  enabled: true

  # Admin credentials (use secrets in production)
  adminPassword: "changeme"

  # Ingress configuration
  ingress:
    enabled: true
    hosts:
      - grafana.example.com
    annotations:
      kubernetes.io/ingress.class: nginx
      cert-manager.io/cluster-issuer: letsencrypt-prod
    tls:
      - secretName: grafana-tls
        hosts:
          - grafana.example.com

  # Persistence for dashboards
  persistence:
    enabled: true
    size: 10Gi

  # Additional data sources
  additionalDataSources:
    - name: Loki
      type: loki
      url: http://loki:3100
      access: proxy

# Alertmanager configuration
alertmanager:
  enabled: true

  alertmanagerSpec:
    # Resource configuration
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Storage for silences and notification state
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi

  # Alertmanager configuration
  config:
    global:
      resolve_timeout: 5m
      slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'default'
      routes:
        - match:
            severity: critical
          receiver: 'critical-alerts'
        - match:
            severity: warning
          receiver: 'warning-alerts'

    receivers:
      - name: 'default'
        slack_configs:
          - channel: '#alerts'
            title: 'Alert: {{ .CommonLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

      - name: 'critical-alerts'
        slack_configs:
          - channel: '#critical-alerts'
            title: 'CRITICAL: {{ .CommonLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

      - name: 'warning-alerts'
        slack_configs:
          - channel: '#warning-alerts'
            title: 'Warning: {{ .CommonLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

# Node exporter configuration
nodeExporter:
  enabled: true

# Kube-state-metrics configuration
kubeStateMetrics:
  enabled: true
```

Deploy with the custom values:

```bash
# Install with custom configuration
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

## Accessing the Components

After deployment, verify all pods are running:

```bash
# Check pod status
kubectl get pods -n monitoring

# Expected output shows running pods for:
# - prometheus-operator
# - prometheus-server
# - grafana
# - alertmanager
# - node-exporter (DaemonSet on each node)
# - kube-state-metrics
```

Access Grafana using port forwarding:

```bash
# Port forward to Grafana
kubectl port-forward -n monitoring svc/prometheus-stack-grafana 3000:80
```

Open your browser to http://localhost:3000. Default credentials:
- Username: admin
- Password: prom-operator (or what you set in values)

Access Prometheus using port forwarding:

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-stack-kube-prom-prometheus 9090:9090
```

Access Alertmanager:

```bash
# Port forward to Alertmanager
kubectl port-forward -n monitoring svc/prometheus-stack-kube-prom-alertmanager 9093:9093
```

## Configuring Service Discovery

The kube-prometheus-stack automatically discovers and monitors Kubernetes resources using ServiceMonitor and PodMonitor CRDs. To enable monitoring for your applications, create a ServiceMonitor:

```yaml
# app-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app-monitor
  namespace: default
  labels:
    release: prometheus-stack  # Must match Prometheus selector
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

Apply the ServiceMonitor:

```bash
kubectl apply -f app-service-monitor.yaml
```

## Verifying the Installation

Check that Prometheus is scraping targets:

```bash
# Access Prometheus UI and navigate to Status > Targets
# Or query from command line
kubectl port-forward -n monitoring svc/prometheus-stack-kube-prom-prometheus 9090:9090 &
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
```

Verify Grafana dashboards are loaded:

```bash
# List all dashboards via API
GRAFANA_POD=$(kubectl get pod -n monitoring -l app.kubernetes.io/name=grafana -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n monitoring $GRAFANA_POD -- curl -s http://localhost:3000/api/search | jq '.[] | .title'
```

Check Alertmanager is receiving alerts:

```bash
# Check Alertmanager status
kubectl port-forward -n monitoring svc/prometheus-stack-kube-prom-alertmanager 9093:9093 &
curl http://localhost:9093/api/v2/status | jq
```

## Upgrading the Stack

To upgrade to a newer version:

```bash
# Update Helm repository
helm repo update

# Upgrade the release
helm upgrade prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

## Troubleshooting Common Issues

If pods fail to start, check resource constraints:

```bash
# Describe pod to see events
kubectl describe pod -n monitoring <pod-name>

# Check logs
kubectl logs -n monitoring <pod-name>
```

If metrics are not appearing, verify ServiceMonitor labels match Prometheus selectors:

```bash
# Get Prometheus ServiceMonitor selector
kubectl get prometheus -n monitoring prometheus-stack-kube-prom-prometheus -o jsonpath='{.spec.serviceMonitorSelector}'

# Ensure your ServiceMonitor has matching labels
```

## Conclusion

The kube-prometheus-stack provides a complete monitoring solution for Kubernetes clusters with minimal configuration. By deploying Prometheus, Grafana, and Alertmanager together, you get immediate visibility into cluster health and application performance. The Prometheus Operator simplifies ongoing management through CRDs, making it easy to add new monitoring targets and alerting rules as your infrastructure grows.

For advanced configurations, explore remote write for long-term storage, federation for multi-cluster setups, and custom recording rules for query optimization.
