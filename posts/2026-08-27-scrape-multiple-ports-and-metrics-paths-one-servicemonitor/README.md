# How to Scrape Multiple Ports and Metrics Paths with One ServiceMonitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, Kubernetes, ServiceMonitor, Metric, Monitoring

Description: Configure one ServiceMonitor with independent endpoint entries for several named Service ports, paths, intervals, and timeouts.

---

A `ServiceMonitor` does not have to describe only one scrape. Its `spec.selector` chooses a set of Kubernetes Services, while `spec.endpoints` is a list of scrape definitions applied to the selected Services. Put one entry in that list for every port and path combination that Prometheus must scrape.

This is useful when an application exposes ordinary application metrics on one port, administrative metrics on another, or two metric families at different paths on the same listener.

## Start with Named Service Ports

The `port` field in a ServiceMonitor endpoint refers to `.spec.ports[].name` on the selected Service. It does not refer to the container port number. Give every metrics-bearing Service port a stable, unique name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payments-api
  namespace: payments
  labels:
    app.kubernetes.io/name: payments-api
spec:
  selector:
    app.kubernetes.io/name: payments-api
  ports:
    - name: app-metrics
      port: 9090
      targetPort: app-metrics
    - name: admin-metrics
      port: 9091
      targetPort: admin-metrics
```

The Pod template selected by this Service should expose matching named container ports:

```yaml
ports:
  - name: app-metrics
    containerPort: 9090
  - name: admin-metrics
    containerPort: 9091
```

`targetPort` can be a name or number in a Service, but the ServiceMonitor's `port` remains the Service port name. Using names keeps the monitoring contract stable if the underlying port number changes.

## Add One Endpoint per Scrape

The following ServiceMonitor performs three independent scrapes. Two use different ports, and two use different paths on the same port:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payments-api
  namespace: payments
  labels:
    monitoring: platform
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: payments-api
  endpoints:
    - port: app-metrics
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
    - port: admin-metrics
      path: /internal/metrics
      interval: 30s
      scrapeTimeout: 10s
      relabelings:
        - targetLabel: metrics_path
          replacement: /internal/metrics
    - port: admin-metrics
      path: /runtime/metrics
      interval: 60s
      scrapeTimeout: 15s
      relabelings:
        - targetLabel: metrics_path
          replacement: /runtime/metrics
```

Each list item can independently set fields such as `port`, `path`, `scheme`, query `params`, `interval`, `scrapeTimeout`, authentication, TLS settings, relabelings, and metric relabelings. If `path` is omitted, Prometheus uses `/metrics`. If `interval` is omitted, it uses the Prometheus global scrape interval. A `scrapeTimeout` cannot be greater than its scrape interval; the operator rejects that resource instead of generating an invalid scrape configuration.

There is no `paths` array inside one endpoint. Repeat the endpoint entry when the same named port serves more than one path.

## Understand What Gets Selected

The selection chain has three distinct steps:

1. A Prometheus or PrometheusAgent resource selects this ServiceMonitor using its `serviceMonitorSelector` and `serviceMonitorNamespaceSelector`.
2. The ServiceMonitor selects Services using `spec.selector` and its target namespace rules.
3. Every entry in `spec.endpoints` selects a named port from the discovered Service endpoints and defines how to scrape it.

A missing port name affects only the endpoint entry that refers to that name. For example, if a broad selector matches two Services and only one exposes `admin-metrics`, the administrative scrape has targets only for that Service. Prefer a selector whose matched Services share the same monitoring contract.

This mechanism is for scraping Prometheus-format metrics from Service-backed endpoints. It is not a list of arbitrary URLs. Use a `Probe` with a prober such as Blackbox Exporter for HTTP, TCP, DNS, or ICMP checks. Use `ScrapeConfig` when you need lower-level or external direct metrics target configuration that ServiceMonitor cannot represent.

## Validate Every Layer

First verify that the Service names both ports and that EndpointSlices contain the expected backend ports:

```bash
kubectl get service payments-api -n payments -o yaml
kubectl get endpointslice -n payments \
  -l kubernetes.io/service-name=payments-api -o yaml
```

Then verify that the intended Prometheus resource selects the ServiceMonitor:

```bash
kubectl get prometheus -A -o yaml
kubectl get servicemonitor payments-api -n payments --show-labels
```

The operator's generated configuration is stored in the Secret named `prometheus-<prometheus-name>` in the Prometheus namespace. For a Prometheus resource named `platform`, inspect it without modifying it:

```bash
kubectl get secret prometheus-platform -n monitoring -o json \
  | jq -r '.data["prometheus.yaml.gz"]' \
  | base64 -d \
  | gunzip \
  | grep -A12 'serviceMonitor/payments/payments-api'
```

Finally, inspect Prometheus's Service Discovery and Targets pages. Expect a separate generated scrape configuration for each endpoint list entry. Check `up` and scrape errors for each path independently.

Avoid exposing the same samples at multiple paths unless you intend to collect both. The Operator's default `endpoint` target label identifies the port, not the HTTP path. Two entries that use the same Service and named port can therefore produce the same final label set unless you add a distinguishing label. This also affects Prometheus-generated target series such as `up` and `scrape_duration_seconds`, even if the endpoints otherwise expose disjoint metric names. The two same-port entries above add distinct constant `metrics_path` target labels with `relabelings` so their samples and scrape health remain separate.

## Official Documentation

- [Prometheus Operator API reference for ServiceMonitorSpec and Endpoint](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator ServiceMonitor troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#troubleshooting-servicemonitor-changes)
- [Prometheus Operator getting started guide](https://prometheus-operator.dev/docs/developer/getting-started/#using-servicemonitors)
- [Prometheus Operator default ServiceMonitor target labels](https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/user-guides/running-exporters.md#default-labels)
- [Kubernetes Service ports](https://kubernetes.io/docs/concepts/services-networking/service/#field-spec-ports)

## Conclusion

Use one ServiceMonitor when the same selected Services expose several Prometheus metrics endpoints. Name the Service ports, add one `spec.endpoints` item for each port and path combination, keep each timeout within its interval, and verify each generated scrape independently.
