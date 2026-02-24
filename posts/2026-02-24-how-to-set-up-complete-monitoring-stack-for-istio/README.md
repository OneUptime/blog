# How to Set Up Complete Monitoring Stack for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Prometheus, Grafana, Kiali, Observability

Description: Build a complete monitoring stack for Istio with Prometheus, Grafana, Kiali, and distributed tracing for full mesh observability.

---

One of the best things about running Istio is the observability you get for free. Every sidecar proxy automatically collects metrics about traffic volume, latency, error rates, and more. But raw metrics are useless without a proper monitoring stack to collect, store, visualize, and alert on them. Here is how to set up a complete monitoring stack that gives you real visibility into your mesh.

## The Components

A complete Istio monitoring stack includes:

- **Prometheus**: Collects and stores metrics from Istio proxies and the control plane
- **Grafana**: Visualizes metrics with pre-built dashboards
- **Kiali**: Provides a service mesh topology view and configuration validation
- **Jaeger or Zipkin**: Distributed tracing for request flow visualization
- **Alertmanager**: Sends alerts based on metric thresholds

## Installing Prometheus

Istio ships with a basic Prometheus configuration, but for production you want a more robust setup. Use the Prometheus Operator via kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi
```

The `serviceMonitorSelectorNilUsesHelmValues=false` flag is important - it tells Prometheus to discover all ServiceMonitors in the cluster, not just ones with a specific label.

## Configuring Prometheus to Scrape Istio

Create ServiceMonitors for Istio components:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-component-monitor
  namespace: monitoring
spec:
  jobLabel: istio
  targetLabels: [app]
  selector:
    matchExpressions:
    - key: istio
      operator: In
      values:
      - pilot
  namespaceSelector:
    matchNames:
    - istio-system
  endpoints:
  - port: http-monitoring
    interval: 15s
```

For scraping Envoy sidecar metrics across all namespaces:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats-monitor
  namespace: monitoring
spec:
  selector:
    matchExpressions:
    - key: security.istio.io/tlsMode
      operator: Exists
  namespaceSelector:
    any: true
  jobLabel: envoy-stats
  podMetricsEndpoints:
  - path: /stats/prometheus
    interval: 15s
    relabelings:
    - action: keep
      sourceLabels: [__meta_kubernetes_pod_container_name]
      regex: "istio-proxy"
    - action: keep
      sourceLabels: [__meta_kubernetes_pod_annotationpresent_prometheus_io_scrape]
```

## Enabling Istio Metrics

Make sure Istio is configured to expose metrics:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
        - ".*"
```

The `enablePrometheusMerge` setting merges application Prometheus metrics with Envoy metrics, so a single scrape endpoint returns both.

## Installing Grafana with Istio Dashboards

If you used kube-prometheus-stack, Grafana is already installed. Import the Istio dashboards:

```bash
# Download Istio dashboards
DASHBOARDS=(
  "7639"   # Istio Mesh Dashboard
  "7636"   # Istio Service Dashboard
  "7630"   # Istio Workload Dashboard
  "11829"  # Istio Performance Dashboard
  "7645"   # Istio Control Plane Dashboard
)

for id in "${DASHBOARDS[@]}"; do
  curl -s "https://grafana.com/api/dashboards/$id/revisions/latest/download" | \
    kubectl create configmap "grafana-dashboard-$id" -n monitoring \
    --from-file="dashboard-$id.json=/dev/stdin" \
    --dry-run=client -o yaml | kubectl apply -f -
done
```

Or use Grafana provisioning to auto-load dashboards:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-istio-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "true"
data:
  istio-mesh-dashboard.json: |
    # Dashboard JSON content here
```

The key dashboards you want are:

- **Mesh Dashboard**: Overall mesh health, total request rate, success rate, latency
- **Service Dashboard**: Per-service metrics, inbound/outbound traffic
- **Workload Dashboard**: Per-workload metrics, replicas, CPU, memory
- **Control Plane Dashboard**: istiod health, configuration push time, xDS connections

## Installing Kiali

Kiali provides the service mesh topology visualization:

```bash
helm repo add kiali https://kiali.org/helm-charts
helm repo update

helm install kiali kiali/kiali-server \
  -n istio-system \
  --set auth.strategy="anonymous" \
  --set external_services.prometheus.url="http://prometheus-kube-prometheus-prometheus.monitoring:9090" \
  --set external_services.grafana.url="http://prometheus-grafana.monitoring:80" \
  --set external_services.tracing.url="http://jaeger-query.istio-system:16685/jaeger"
```

For production, use a proper authentication strategy instead of anonymous:

```yaml
auth:
  strategy: openid
  openid:
    client_id: kiali-client
    issuer_uri: https://auth.mycompany.com
```

## Setting Up Distributed Tracing

Install Jaeger for distributed tracing:

```bash
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/service_account.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role_binding.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/operator.yaml
```

Or use a simpler all-in-one deployment:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: istio-system
spec:
  strategy: production
  storage:
    type: elasticsearch
    elasticsearch:
      nodeCount: 3
      resources:
        requests:
          cpu: 500m
          memory: 2Gi
```

Configure Istio to send traces to Jaeger:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10
        zipkin:
          address: jaeger-collector.istio-system:9411
```

The `sampling: 10` means 10% of requests are traced. Adjust based on your traffic volume - 100% sampling in production can generate enormous amounts of data.

## Installing Alertmanager

Alertmanager comes with kube-prometheus-stack, but you need to configure it:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: istio-alerts
  namespace: monitoring
spec:
  route:
    receiver: 'slack-notifications'
    groupBy: ['alertname', 'namespace']
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 4h
  receivers:
  - name: 'slack-notifications'
    slackConfigs:
    - channel: '#istio-alerts'
      apiURL:
        name: slack-webhook
        key: url
      title: '{{ .GroupLabels.alertname }}'
      text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

## Verifying the Stack

Check that all components are running:

```bash
kubectl get pods -n monitoring
kubectl get pods -n istio-system -l app=kiali
kubectl get pods -n istio-system -l app=jaeger
```

Access the dashboards:

```bash
# Grafana
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Kiali
kubectl port-forward svc/kiali -n istio-system 20001:20001

# Jaeger
kubectl port-forward svc/jaeger-query -n istio-system 16686:16686

# Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
```

## Key Metrics to Watch

The most important Istio metrics to monitor:

```promql
# Request rate
sum(rate(istio_requests_total[5m])) by (destination_service)

# Error rate
sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_service) /
sum(rate(istio_requests_total[5m])) by (destination_service)

# P99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))

# Control plane push time
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

A complete monitoring stack turns Istio from a networking tool into an observability platform. You get metrics, traces, and topology visualization out of the box, but only if you set up the infrastructure to collect and display that data. Invest the time to set this up properly and your mesh will pay dividends in reduced debugging time and faster incident resolution.
