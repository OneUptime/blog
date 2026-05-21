# How to Integrate Istio with Datadog for Observability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Datadog, Observability, Monitoring, Kubernetes

Description: How to set up Datadog to collect metrics, traces, and logs from Istio service mesh for full observability.

---

Datadog is one of the most popular commercial observability platforms, and it has solid built-in support for Istio. The integration collects metrics from the Istio control plane and Envoy sidecars, traces from the mesh, and access logs from the proxies. If your organization already uses Datadog, adding Istio monitoring is straightforward.

## What Datadog Collects from Istio

The Datadog Agent collects three types of data from Istio:

- **Metrics** - Istio control plane metrics from istiod, Envoy proxy metrics from each sidecar, and mesh-level metrics like request volume, latency, and error rates
- **Traces** - Distributed traces that show request flow across services in the mesh
- **Logs** - Envoy access logs and Istio control plane logs

## Installing the Datadog Agent

Deploy the Datadog Agent using the Datadog Operator or the Helm chart. The Helm chart approach is more common:

```bash
helm repo add datadog https://helm.datadoghq.com
helm repo update

helm install datadog datadog/datadog \
  --namespace datadog \
  --create-namespace \
  --set datadog.apiKey=YOUR_API_KEY \
  --set datadog.appKey=YOUR_APP_KEY \
  --set datadog.site=datadoghq.com \
  --values datadog-values.yaml
```

The values file with Istio-specific configuration:

```yaml
datadog:
  apiKey: YOUR_API_KEY
  appKey: YOUR_APP_KEY
  site: datadoghq.com

  logs:
    enabled: true
    containerCollectAll: true

  apm:
    portEnabled: true

  processAgent:
    enabled: true
    processCollection: true

  prometheusScrape:
    enabled: true
    serviceEndpoints: true

  clusterChecks:
    enabled: true

  confd:
    istio.yaml: |-
      ad_identifiers:
        - proxyv2
        - proxyv2-rhel8
      init_config:
      instances:
        - use_openmetrics: true
          istio_mesh_endpoint: http://%%host%%:15020/stats/prometheus
          send_histograms_buckets: false
          tag_by_endpoint: false

clusterAgent:
  enabled: true
  confd:
    istiod.yaml: |-
      cluster_check: true
      init_config:
      instances:
        - istiod_endpoint: http://istiod.istio-system.svc:15014/metrics
          use_openmetrics: true
```

## Enabling Istio Sidecar Metrics Collection

The Datadog Agent needs to scrape metrics from each Envoy sidecar. Annotate your pods or use Datadog's autodiscovery:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        ad.datadoghq.com/istio-proxy.checks: |
          {
            "istio": {
              "instances": [
                {
                  "use_openmetrics": true,
                  "istio_mesh_endpoint": "http://%%host%%:15020/stats/prometheus",
                  "send_histograms_buckets": false,
                  "tag_by_endpoint": false
                }
              ]
            }
          }
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

For a cluster-wide approach, use the Istio integration configuration so the Agent auto-detects Istio proxies without scheduling a separate generic OpenMetrics check against the same endpoint:

```yaml
datadog:
  confd:
    istio.yaml: |-
      ad_identifiers:
        - proxyv2
        - proxyv2-rhel8
      init_config:
      instances:
        - use_openmetrics: true
          istio_mesh_endpoint: http://%%host%%:15020/stats/prometheus
          send_histograms_buckets: false
          tag_by_endpoint: false
```

## Setting Up Distributed Tracing

Istio can send traces to the Datadog Agent. Configure Istio to use the Datadog tracing provider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: datadog
      datadog:
        service: datadog-agent.datadog.svc.cluster.local
        port: 8126
    defaultConfig:
      tracing:
        sampling: 10
```

Then activate it with the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: datadog-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: datadog
    randomSamplingPercentage: 10
```

For your applications to propagate trace context properly, they need to forward the Datadog trace headers. The key headers are:

- `x-datadog-trace-id`
- `x-datadog-parent-id`
- `x-datadog-sampling-priority`

If your applications already use the Datadog APM libraries, this happens automatically.

## Collecting Envoy Access Logs

Enable access logging in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

The Datadog Agent, running as a DaemonSet, collects container logs when log collection is enabled. To tag Envoy access logs from the injected sidecar, add an Autodiscovery log annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        ad.datadoghq.com/istio-proxy.logs: |
          [
            {
              "source": "envoy",
              "service": "my-app"
            }
          ]
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

## Datadog Service Mesh Dashboard

After the integration is set up, Datadog provides an out-of-the-box Istio dashboard. Go to Dashboards in Datadog and search for "Istio". The default dashboard shows:

- Mesh request volume and error rate
- Request latency metrics
- TCP connection open and close counters
- Control plane health
- Pilot push metrics

You can also create custom dashboards. Some useful queries:

```text
# Request rate by service

sum:istio.mesh.request.count{*} by {destination_service_name}.as_rate()

# Average latency by service
sum:istio.mesh.request.duration.milliseconds.sum{*} by {destination_service_name}.as_rate() / sum:istio.mesh.request.duration.milliseconds.count{*} by {destination_service_name}.as_rate()

# Error rate
sum:istio.mesh.request.count{response_code:5*} by {destination_service_name}.as_rate() / sum:istio.mesh.request.count{*} by {destination_service_name}.as_rate() * 100

# TCP connection open rate
sum:istio.mesh.tcp.connections_opened.total{*} by {destination_service_name}.as_rate()
```

## Setting Up Monitors

Create Datadog monitors for Istio health:

```yaml
# High error rate monitor
{
  "name": "Istio Service Error Rate High",
  "type": "metric alert",
  "query": "sum(last_5m):sum:istio.mesh.request.count{response_code:5*} by {destination_service_name}.as_rate() / sum:istio.mesh.request.count{*} by {destination_service_name}.as_rate() * 100 > 5",
  "message": "Error rate for {{destination_service_name.name}} is above 5%",
  "tags": ["service:istio", "team:platform"],
  "options": {
    "thresholds": {
      "critical": 5,
      "warning": 2
    }
  }
}
```

## Service Map

Datadog builds a service map from APM trace data. With Istio tracing enabled, this shows the topology of your mesh with real-time request data on each edge. You can see which services communicate, the request rate between them, and the error rate on each connection.

Access it through the APM > Service Map page in Datadog. Services running in the mesh show up with Istio-specific metadata.

## Unified Tagging

Make sure your resources use Datadog's unified service tagging for consistent correlation across metrics, traces, and logs:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    tags.datadoghq.com/env: production
    tags.datadoghq.com/service: my-app
    tags.datadoghq.com/version: "2.0"
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        tags.datadoghq.com/env: production
        tags.datadoghq.com/service: my-app
        tags.datadoghq.com/version: "2.0"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        env:
        - name: DD_ENV
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['tags.datadoghq.com/env']
        - name: DD_SERVICE
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['tags.datadoghq.com/service']
        - name: DD_VERSION
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['tags.datadoghq.com/version']
```

The Datadog and Istio integration gives you a comprehensive observability setup with minimal effort. The Datadog Agent handles the collection, and Datadog's platform provides the dashboards, alerting, and analysis tools. The biggest advantage over self-hosted solutions is that you do not need to manage Prometheus, Grafana, Jaeger, and a logging stack separately. Everything goes to one place.
