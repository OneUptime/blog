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

  confd:
    istio.yaml: |-
      ad_identifiers:
        - proxyv2
      init_config:
      instances:
        - istio_mesh_endpoint: http://%%host%%:15090/stats/prometheus
          send_histograms_buckets: true
          send_monotonic_counter: true
          send_distribution_buckets: true

agents:
  containers:
    agent:
      env:
      - name: DD_ISTIO_PROXYV2_ENABLED
        value: "true"

clusterAgent:
  enabled: true
  confd:
    istiod.yaml: |-
      cluster_check: true
      init_config:
      instances:
        - istiod_endpoint: http://istiod.istio-system.svc:15014/metrics
          send_histograms_buckets: true
```

## Enabling Istio Sidecar Metrics Collection

The Datadog Agent needs to scrape metrics from each Envoy sidecar. Annotate your pods or use Datadog's autodiscovery:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        ad.datadoghq.com/istio-proxy.checks: |
          {
            "istio": {
              "instances": [
                {
                  "istio_mesh_endpoint": "http://%%host%%:15090/stats/prometheus",
                  "send_histograms_buckets": true,
                  "send_monotonic_counter": true
                }
              ]
            }
          }
```

For a cluster-wide approach, configure the Datadog Agent to auto-detect Istio proxies:

```yaml
datadog:
  prometheusScrape:
    enabled: true
    serviceEndpoints: true
    additionalConfigs:
    - configurations:
      - timeout: 5
        send_distribution_buckets: true
      autodiscovery:
        kubernetes_container_names:
        - istio-proxy
        kubernetes_annotations:
          include:
            sidecar.istio.io/status: "*"
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

The Datadog Agent, running as a DaemonSet, automatically collects container logs. To add log processing rules specific to Istio:

```yaml
datadog:
  logs:
    enabled: true
    containerCollectAll: true

  logsConfig:
    processingRules:
    - type: include_at_match
      name: include_istio_proxy
      pattern: "istio-proxy"
```

## Datadog Service Mesh Dashboard

After the integration is set up, Datadog provides an out-of-the-box Istio dashboard. Go to Dashboards in Datadog and search for "Istio". The default dashboard shows:

- Mesh request volume and error rate
- Request latency percentiles (p50, p95, p99)
- Active connections
- Control plane health
- Pilot push metrics

You can also create custom dashboards. Some useful queries:

```text
# Request rate by service
sum:istio.mesh.request.count{*} by {destination_service_name}.as_rate()

# P99 latency by service
p99:istio.mesh.request.duration.milliseconds{*} by {destination_service_name}

# Error rate
sum:istio.mesh.request.count{response_code:5*} by {destination_service_name}.as_rate() / sum:istio.mesh.request.count{*} by {destination_service_name}.as_rate() * 100

# Active connections
avg:istio.mesh.connections_active{*} by {destination_service_name}
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

Datadog automatically builds a service map from Istio telemetry data. This shows the topology of your mesh with real-time metrics on each edge. You can see which services communicate, the request rate between them, and the error rate on each connection.

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
  template:
    metadata:
      labels:
        tags.datadoghq.com/env: production
        tags.datadoghq.com/service: my-app
        tags.datadoghq.com/version: "2.0"
```

The Datadog and Istio integration gives you a comprehensive observability setup with minimal effort. The Datadog Agent handles the collection, and Datadog's platform provides the dashboards, alerting, and analysis tools. The biggest advantage over self-hosted solutions is that you do not need to manage Prometheus, Grafana, Jaeger, and a logging stack separately. Everything goes to one place.
