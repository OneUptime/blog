# How to Configure Service Mesh Observability in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Service Mesh, Observability, Prometheus, Jaeger, Kiali

Description: Configure comprehensive observability for your service mesh in Rancher using Prometheus, Grafana, Jaeger, and Kiali to gain full visibility into service-to-service communication.

## Introduction

Service mesh observability provides deep insights into microservice communication, including request rates, error rates, latency distributions, and distributed traces. This guide covers setting up a complete observability stack for Istio-based service meshes in Rancher, including metrics with Prometheus/Grafana, distributed tracing with Jaeger, and topology visualization with Kiali.

## Prerequisites

- Rancher with Istio installed
- Rancher Monitoring (Prometheus/Grafana) stack deployed
- kubectl with cluster-admin access
- Helm 3.x

## Step 1: Install Rancher Monitoring

Install the Rancher Monitoring stack from the Apps catalog:

```bash
# Install Rancher Monitoring via Helm

helm repo add rancher-charts https://charts.rancher.io
helm install rancher-monitoring rancher-charts/rancher-monitoring \
  --namespace cattle-monitoring-system \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=standard \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

## Step 2: Enable Istio Metrics Collection

Configure Istio to expose metrics to Prometheus:

```yaml
# istio-telemetry.yaml - Enable Istio metrics
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
```

## Step 3: Configure Prometheus Operator Monitors for Istio

```yaml
# istio-monitoring.yaml - Prometheus Operator scrape config for Istio
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats-monitor
  namespace: istio-system
  labels:
    monitoring: istio-proxies
    release: rancher-monitoring
spec:
  selector:
    matchExpressions:
      - key: istio-prometheus-ignore
        operator: DoesNotExist
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
        - action: replace
          regex: (\\d+);(([A-Fa-f0-9]{1,4}::?){1,7}[A-Fa-f0-9]{1,4})
          replacement: '[$2]:$1'
          sourceLabels:
            - __meta_kubernetes_pod_annotation_prometheus_io_port
            - __meta_kubernetes_pod_ip
          targetLabel: __address__
        - action: replace
          regex: (\\d+);((([0-9]+?)(\\.|$)){4})
          replacement: $2:$1
          sourceLabels:
            - __meta_kubernetes_pod_annotation_prometheus_io_port
            - __meta_kubernetes_pod_ip
          targetLabel: __address__
        - action: labeldrop
          regex: "__meta_kubernetes_pod_label_(.+)"
        - sourceLabels: [__meta_kubernetes_namespace]
          action: replace
          targetLabel: namespace
        - sourceLabels: [__meta_kubernetes_pod_name]
          action: replace
          targetLabel: pod
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-component-monitor
  namespace: istio-system
  labels:
    monitoring: istio-components
    release: rancher-monitoring
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
    any: true
  endpoints:
    - port: http-monitoring
      interval: 15s
```

## Step 4: Install Kiali for Service Topology

```bash
# Install Kiali from the Rancher Apps catalog or via Helm
helm repo add kiali https://kiali.org/helm-charts
helm install kiali-operator kiali/kiali-operator \
  --namespace kiali-operator \
  --create-namespace
```

```yaml
# kiali-cr.yaml - Kiali instance configuration
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  external_services:
    prometheus:
      url: http://rancher-monitoring-prometheus.cattle-monitoring-system.svc.cluster.local:9090
    grafana:
      enabled: true
      internal_url: http://rancher-monitoring-grafana.cattle-monitoring-system.svc.cluster.local:80
    tracing:
      enabled: true
      provider: jaeger
      internal_url: http://tracing.istio-system.svc.cluster.local:16685/jaeger
      use_grpc: true
  auth:
    strategy: anonymous  # Use 'token' or another non-anonymous strategy in production
```

## Step 5: Install Jaeger for Distributed Tracing

```bash
# Install the current Istio Jaeger add-on
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/jaeger.yaml
```

This sample add-on deploys Jaeger v2 into `istio-system` and is intended for development or testing rather than a hardened production install.

## Step 6: Configure Istio to Use Jaeger

Update the mesh-wide `Telemetry` resource from Step 2 and configure an extension provider for Jaeger:

```yaml
# istio-tracing.yaml - Configure Istio tracing
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  meshConfig:
    # Send traces to the Jaeger collector
    enableTracing: true
    defaultConfig:
      tracing: {} # Disable legacy MeshConfig tracing options
    extensionProviders:
      - name: jaeger
        opentelemetry:
          service: jaeger-collector.istio-system.svc.cluster.local
          port: 4317
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
  tracing:
    - providers:
        - name: jaeger
      # Sample 1% of traces by default; increase temporarily when debugging
      randomSamplingPercentage: 1.0
```

## Step 7: Create Custom Grafana Dashboards

Import Istio dashboards:

```bash
# Download and persist the official Istio Grafana dashboards
DASHBOARDS=(
  "7630"   # Istio Workload Dashboard
  "7636"   # Istio Service Dashboard
  "7645"   # Istio Control Plane Dashboard
  "7639"   # Istio Mesh Dashboard
  "11829"  # Istio Performance Dashboard
)

for ID in "${DASHBOARDS[@]}"; do
  echo "Importing Grafana dashboard $ID"
  curl -s "https://grafana.com/api/dashboards/$ID/revisions/latest/download" | \
    kubectl create configmap "grafana-dashboard-$ID" \
      --from-file="dashboard-${ID}.json=/dev/stdin" \
      --namespace=cattle-dashboards \
      --dry-run=client -o yaml | \
    kubectl label --local -f - grafana_dashboard=1 -o yaml | \
    kubectl apply -f -
done
```

## Step 8: Create Prometheus Alerting Rules

```yaml
# mesh-alerts.yaml - Alert rules for service mesh health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-mesh-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: istio.rules
      rules:
        # Alert if service error rate exceeds 5%
        - alert: IstioHighErrorRate
          expr: |
            sum(rate(istio_requests_total{
              reporter="destination",
              response_code=~"5.*"
            }[5m])) by (destination_service) /
            sum(rate(istio_requests_total{
              reporter="destination"
            }[5m])) by (destination_service) > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High error rate for {{ $labels.destination_service }}"
            description: "5xx error rate is {{ $value | humanizePercentage }} for {{ $labels.destination_service }}"

        # Alert if P99 latency exceeds 1 second
        - alert: IstioHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{
                reporter="destination"
              }[5m])) by (destination_service, le)
            ) > 1000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High P99 latency for {{ $labels.destination_service }}"
            description: "P99 latency is {{ $value }}ms for {{ $labels.destination_service }}"
```

## Step 9: Access Observability Tools

```bash
# Port-forward Kiali
kubectl port-forward -n istio-system svc/kiali 20001:20001

# Port-forward Jaeger
kubectl port-forward -n istio-system svc/tracing 16686:80

# Port-forward Grafana
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-grafana 3000:80
```

## Conclusion

A complete service mesh observability stack transforms a black box microservices architecture into a fully transparent system. The combination of Prometheus metrics, Grafana dashboards, Jaeger distributed tracing, and Kiali topology visualization gives you everything needed to understand, debug, and optimize inter-service communication. In Rancher environments, the built-in monitoring stack provides an excellent foundation that integrates naturally with Istio's telemetry capabilities.
