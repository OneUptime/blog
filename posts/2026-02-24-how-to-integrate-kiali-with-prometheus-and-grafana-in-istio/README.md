# How to Integrate Kiali with Prometheus and Grafana in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Prometheus, Grafana, Observability, Monitoring

Description: How to connect Kiali with Prometheus and Grafana to get unified observability across your Istio service mesh.

---

Kiali, Prometheus, and Grafana form the observability trio for Istio. Prometheus collects the metrics, Grafana visualizes them in detailed dashboards, and Kiali ties it all together with a topology-aware view. Each tool is useful on its own, but they become much more powerful when integrated properly.

This guide covers how to configure all three tools to work together, including cross-linking between Kiali and Grafana dashboards.

## Architecture Overview

Here's how data flows between the three tools:

```mermaid
graph LR
    A[Envoy Sidecars] -->|scrape| B[Prometheus]
    B -->|query| C[Kiali]
    B -->|query| D[Grafana]
    C -->|links to| D
    D -->|links from| C
```

Envoy proxies in every pod expose metrics on port 15090. Prometheus scrapes these metrics. Both Kiali and Grafana query Prometheus for data. Kiali can also link directly to relevant Grafana dashboards for deeper analysis.

## Prerequisites

Make sure you have these components running:

```bash
# Check Prometheus
kubectl get pods -n istio-system -l app=prometheus

# Check Grafana
kubectl get pods -n istio-system -l app=grafana

# Check Kiali
kubectl get pods -n istio-system -l app.kubernetes.io/name=kiali
```

If any of these aren't installed, you can install them using Istio's sample addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/kiali.yaml
```

## Configuring Kiali to Use Prometheus

Kiali needs to know where Prometheus is running to query metrics for its graphs and health calculations.

In the Kiali CR, configure the Prometheus connection:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  external_services:
    prometheus:
      url: "http://prometheus.istio-system:9090"
```

If Prometheus is in a different namespace or uses a different service name:

```yaml
spec:
  external_services:
    prometheus:
      url: "http://prometheus.monitoring:9090"
```

### Custom Prometheus with Authentication

If your Prometheus requires authentication:

```yaml
spec:
  external_services:
    prometheus:
      url: "https://prometheus.monitoring:9090"
      auth:
        type: "bearer"
        token: "your-prometheus-token"
      custom_headers:
        X-Custom-Header: "value"
```

For Prometheus behind a TLS endpoint with custom CA:

```yaml
spec:
  external_services:
    prometheus:
      url: "https://prometheus.monitoring:9090"
      auth:
        ca_file: "/etc/kiali/prometheus-ca.crt"
```

Mount the CA certificate into the Kiali pod via the Kiali CR's deployment configuration.

## Configuring Kiali to Use Grafana

The Grafana integration lets Kiali link directly to relevant Grafana dashboards from the service detail pages.

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  external_services:
    grafana:
      enabled: true
      in_cluster_url: "http://grafana.istio-system:3000"
      url: "https://grafana.example.com"
```

Two URLs are needed:

- **in_cluster_url**: The internal cluster URL that Kiali uses to verify Grafana is reachable and to discover available dashboards
- **url**: The external URL that your browser uses to access Grafana (this gets embedded in links)

If both internal and external access use the same URL, set them to the same value.

### Grafana with Authentication

If Grafana requires authentication, Kiali needs credentials to talk to it:

```yaml
spec:
  external_services:
    grafana:
      enabled: true
      in_cluster_url: "http://grafana.istio-system:3000"
      url: "https://grafana.example.com"
      auth:
        type: "basic"
        username: "admin"
        password: "secret"
```

For token-based auth:

```yaml
spec:
  external_services:
    grafana:
      auth:
        type: "bearer"
        token: "your-grafana-api-key"
```

## Setting Up Istio Dashboards in Grafana

Istio comes with pre-built Grafana dashboards that Kiali can link to. If you installed Grafana with Istio's sample addons, these dashboards are already configured. If not, import them manually.

The key dashboards are:

1. **Istio Mesh Dashboard** - Overall mesh metrics
2. **Istio Service Dashboard** - Per-service metrics
3. **Istio Workload Dashboard** - Per-workload metrics
4. **Istio Performance Dashboard** - Envoy proxy performance

Import them from the Istio repository:

```bash
# Download the dashboard JSON files
ISTIO_VERSION="1.22.0"
for dashboard in mesh service workload; do
  curl -sL "https://raw.githubusercontent.com/istio/istio/refs/tags/${ISTIO_VERSION}/manifests/addons/dashboards/istio-${dashboard}-dashboard.json" \
    -o "istio-${dashboard}-dashboard.json"
done
```

Then import them through Grafana's UI (Dashboards -> Import) or via the API:

```bash
for file in istio-*-dashboard.json; do
  curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"dashboard\": $(cat $file), \"overwrite\": true}" \
    http://admin:admin@grafana.istio-system:3000/api/dashboards/db
done
```

## Configuring Dashboard References in Kiali

Kiali needs to know which Grafana dashboards correspond to which Istio metrics. Configure the dashboard mapping:

```yaml
spec:
  external_services:
    grafana:
      enabled: true
      in_cluster_url: "http://grafana.istio-system:3000"
      url: "https://grafana.example.com"
      dashboards:
        - name: "Istio Service Dashboard"
          variables:
            namespace: "var-namespace"
            service: "var-service"
        - name: "Istio Workload Dashboard"
          variables:
            namespace: "var-namespace"
            workload: "var-workload"
```

The `variables` section maps Kiali's context (which service/workload the user is looking at) to Grafana's dashboard variables. When a user clicks a Grafana link in Kiali, it opens the dashboard with the correct service pre-selected.

## Verifying the Integration

### Check Prometheus Connection

Open Kiali and navigate to the Graph view. If the graph shows traffic data (request rates, error rates), Prometheus is working. If the graph is empty even though you have traffic flowing, check the Prometheus URL.

You can also check Kiali's logs:

```bash
kubectl logs -n istio-system -l app.kubernetes.io/name=kiali | grep -i prometheus
```

Look for connection errors or authentication failures.

### Check Grafana Connection

In Kiali, go to any service detail page and look for Grafana links. If the integration is working, you'll see buttons or links to open the service in Grafana.

If the links are missing, check:

1. `grafana.enabled` is `true` in the Kiali CR
2. The `in_cluster_url` is reachable from the Kiali pod
3. The Grafana dashboards are actually imported

### Test Cross-Linking

Click a Grafana link from Kiali. It should open Grafana with the correct dashboard and the service/workload pre-selected. If the dashboard opens but the service isn't selected, check the `variables` mapping in the Kiali CR.

## Custom Prometheus Metrics in Kiali

Kiali uses specific Prometheus metrics for its graphs. If you've customized Istio's metric names, tell Kiali about it:

```yaml
spec:
  external_services:
    prometheus:
      url: "http://prometheus.istio-system:9090"
```

Kiali expects these metrics by default:

- `istio_requests_total`
- `istio_request_duration_milliseconds`
- `istio_tcp_sent_bytes_total`
- `istio_tcp_received_bytes_total`

If you're using Prometheus federation or remote write and the metric names are prefixed, you might need to adjust your Prometheus queries or set up recording rules.

## Performance Considerations

With all three tools querying data simultaneously, keep these performance tips in mind:

1. **Prometheus retention**: Keep at least 6 hours of high-resolution data for Kiali's graph calculations. Longer retention is fine but uses more storage.

2. **Prometheus scrape interval**: The default 15-second scrape interval works well. Shorter intervals increase storage and load without much benefit for Kiali.

3. **Grafana data source caching**: Enable caching on the Prometheus data source in Grafana to reduce load when multiple users view the same dashboards.

4. **Kiali refresh rate**: Don't set Kiali's auto-refresh below 15 seconds in production. Each refresh triggers Prometheus queries.

## Full Configuration Example

Here's a complete Kiali CR with Prometheus and Grafana integration:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "token"
  deployment:
    accessible_namespaces:
      - "**"
  external_services:
    prometheus:
      url: "http://prometheus.istio-system:9090"
    grafana:
      enabled: true
      in_cluster_url: "http://grafana.istio-system:3000"
      url: "https://grafana.example.com"
      dashboards:
        - name: "Istio Service Dashboard"
          variables:
            namespace: "var-namespace"
            service: "var-service"
        - name: "Istio Workload Dashboard"
          variables:
            namespace: "var-namespace"
            workload: "var-workload"
    tracing:
      enabled: true
      in_cluster_url: "http://tracing.istio-system:16685/jaeger"
      use_grpc: true
```

This gives you a fully integrated observability stack: Kiali for topology and health, Grafana for detailed metric dashboards, and Prometheus underneath powering both. The cross-linking between Kiali and Grafana means you can start with the high-level view and seamlessly drill into specific metrics when needed.
