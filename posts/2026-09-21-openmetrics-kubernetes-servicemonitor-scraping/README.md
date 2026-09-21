# How to Expose and Scrape OpenMetrics in Kubernetes with a ServiceMonitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Monitoring, Observability

Description: Expose OpenMetrics through a named Kubernetes Service port and configure ServiceMonitor discovery and protocol negotiation correctly.

A ServiceMonitor discovers a metrics endpoint; it does not convert the response into OpenMetrics. The application must serve the correct body and content type, the Service must route to its metrics port, and Prometheus must select the ServiceMonitor.

This walkthrough assumes an installed Prometheus Operator, an existing Prometheus instance, and application pods in namespace `apps`. The pods have label `app: payments`, listen on port 8080, and expose `/metrics`. The protocol configuration requires Prometheus 2.49 or later and an installed ServiceMonitor CRD that contains `scrapeProtocols`; the validation flow also applies to Prometheus 3.

## Confirm the application format

When OpenMetrics 1.0 is selected through HTTP negotiation, the application should return a header such as:

```text
Content-Type: application/openmetrics-text; version=1.0.0; charset=utf-8
```

A minimal body for a counter is:

```text
# HELP payments_requests Completed payment requests.
# TYPE payments_requests counter
payments_requests_total{result="success"} 42
# EOF
```

The counter family name and sample suffix are intentionally different. Generate the response through a supported client library and include the required EOF marker. If the same endpoint supports Prometheus text, choose the encoder according to the request and report the corresponding content type. [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/)

## Create the Service and monitor

Save the following as `metrics-monitor.yaml`. Both namespaces must already exist:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payments-metrics
  namespace: apps
  labels:
    app: payments
spec:
  selector:
    app: payments
  ports:
    - name: metrics
      port: 8080
      targetPort: 8080
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payments
  namespace: monitoring
  labels:
    monitoring: platform
spec:
  namespaceSelector:
    matchNames: [apps]
  selector:
    matchLabels:
      app: payments
  scrapeProtocols:
    - OpenMetricsText1.0.0
    - PrometheusText0.0.4
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
```

The endpoint's `port` is the Service port name, `metrics`, not the numeric container port. The ServiceMonitor selects Service labels; the Service separately selects pod labels. The Operator's getting-started example follows this chain. [Prometheus Operator discovery setup](https://prometheus-operator.dev/docs/developer/getting-started/)

`scrapeProtocols` belongs under the ServiceMonitor's `spec`, alongside `endpoints`. It expresses protocol preference, with OpenMetrics first and legacy text as an accepted alternative. It does not force a broken endpoint to emit valid OpenMetrics. [ServiceMonitor API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)

Check the installed API before applying:

```bash
kubectl explain servicemonitor.spec.scrapeProtocols
kubectl apply --server-side --dry-run=server -f metrics-monitor.yaml
kubectl apply -f metrics-monitor.yaml
```

If the field is unknown, align the installed Operator CRDs with a release supporting it through your normal upgrade process. Do not assume the online API reference describes an older cluster's schema.

## Make Prometheus select this monitor

The existing Prometheus resource needs selectors that include the monitor and its namespace. The relevant fragment of its `spec` could be:

```yaml
serviceMonitorSelector:
  matchLabels:
    monitoring: platform
serviceMonitorNamespaceSelector:
  matchLabels:
    kubernetes.io/metadata.name: monitoring
```

Merge the intended selectors into the existing resource or Helm values without replacing unrelated configuration. Inspect the rendered resource, because Helm chart defaults can add their own label selection.

There are two namespace decisions here: Prometheus discovers ServiceMonitors in `monitoring`, then this ServiceMonitor discovers Services in `apps`. Configuring only one does not establish the other. Ensure the Prometheus service account also has discovery permissions for the selected application namespace.

## Verify routing before debugging parsing

Inspect the selected Service and its backends:

```bash
kubectl -n apps get service payments-metrics -o yaml
kubectl -n apps get pods -l app=payments
kubectl -n apps get endpointslices \
  -l kubernetes.io/service-name=payments-metrics
```

If no backend addresses appear, repair the pod labels, readiness, or Service selector. OpenMetrics configuration cannot solve missing network endpoints.

For a local diagnostic, forward the named port:

```bash
kubectl -n apps port-forward service/payments-metrics 18080:metrics
```

In another terminal:

```bash
curl --fail --silent --show-error \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  -D response.headers http://127.0.0.1:18080/metrics
```

Check the response headers and end marker. Then inspect the real Prometheus target page: port-forward success does not establish that network policy, TLS, or authentication permits the Prometheus pod's connection.

## Confirm ingestion and retain a rollback

Look for the `payments-metrics` target and query its `up` series. Verify `payments_requests_total` is present with the expected `result` label and sensible values over several scrapes. Discovery failure, HTTP failure, and parse failure should be investigated as separate stages.

Prometheus 3 rejects missing or unsupported content types by default. Fix the application response rather than setting a fallback protocol that masks a format mismatch. A fallback setting, when deliberately required, is separate from protocol preference and has its own version requirement. [Prometheus 3 scrape changes](https://prometheus.io/docs/prometheus/latest/migration/)

If a rollout breaks scraping, restore the previous application encoder or monitor configuration through your deployment system, then confirm target health. Keep the Service port name and existing metric identities stable so a format migration does not also become an unintended discovery or dashboard migration.
