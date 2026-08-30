# Why Is Grafana's Service Graph Empty Even Though Beyla Traces Reach Tempo?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Grafana Tempo, Prometheus, Service Graph, Distributed Tracing

Description: Restore an empty Grafana service graph by generating service-graph metrics, linking the metrics data source, and verifying that Beyla produces correlatable span pairs.

---

Traces stored in Tempo and a service graph in Grafana are different products. Tempo can search and display spans without generating any graph metrics. Grafana's Service graph view queries a Prometheus-compatible data source for metrics such as `traces_service_graph_request_total`; it does not infer the graph directly in the browser from arbitrary stored traces.

An empty graph therefore has three common layers to check: metric generation, metric storage and linkage, and trace structure.

## Enable exactly one service-graph generator

For larger Tempo installations, Grafana recommends Tempo's metrics-generator. Configure its Prometheus remote-write storage and enable the processor through overrides:

```yaml
metrics_generator:
  storage:
    path: /var/tempo/generator/wal
    remote_write:
      - url: http://prometheus.monitoring.svc.cluster.local:9090/api/v1/write
        send_exemplars: true

overrides:
  defaults:
    metrics_generator:
      processors:
        - service-graphs
```

In Tempo 3.x microservices mode, the metrics-generator target must also be deployed and use the deployment's top-level Kafka `ingest` configuration; monolithic `target=all` runs it in-process.

The remote destination must accept Prometheus remote write. Self-hosted Prometheus requires its receiver to be enabled; Mimir and Grafana Cloud use their documented tenant and authentication settings.

Alternatively, send all spans through Alloy's `otelcol.connector.servicegraph` and export the resulting metrics. Beyla can also generate compatible service-graph metrics directly with its `application_service_graph` metrics feature; export them over OTLP or expose them for Prometheus to scrape. Run only one of the Beyla, Alloy, or Tempo generators for the same traffic unless duplicate series are intentionally isolated.

After restarting or rolling out Tempo, query the metrics backend directly:

```promql
sum(rate(traces_service_graph_request_total[5m])) by (client, server)
```

If the metric does not exist, Grafana cannot draw the graph regardless of how many traces Tempo stores.

## Link Grafana's Tempo data source to metrics

The Tempo data source needs the UID of the Prometheus-compatible data source that stores graph metrics:

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    url: http://prometheus.monitoring.svc.cluster.local:9090

  - name: Tempo
    type: tempo
    uid: tempo
    url: http://tempo-query-frontend.observability.svc.cluster.local:3200
    jsonData:
      serviceMap:
        datasourceUid: prometheus
```

The value is a data source **UID**, not its display name or URL. Check that the Grafana user can query both data sources and that the selected time range includes newly generated graph samples.

## Confirm Beyla spans can form edges

For a direct request edge between two instrumented services, the service-graph processor pairs an outgoing `CLIENT` span with its child incoming `SERVER` span. Spans merely arriving in the same Tempo tenant is insufficient. Inspect a request that crosses two services and verify:

- the caller client span and callee server span share one trace ID;
- the callee server span's parent span ID equals the caller client span's span ID;
- span kinds are `CLIENT` and `SERVER` rather than two unrelated internal spans;
- both resources have a stable, nonempty `service.name`;
- sampling and Collector routing retain both sides.

A collection of one-span traces often means W3C `traceparent` was not propagated or consumed. Beyla's generic network propagation has important TLS, proxy, HTTP/2, and gRPC constraints, while Go has a separate library-level mechanism. Fix propagation or use an OpenTelemetry SDK at the unsupported hop before tuning the graph processor.

## Check generator health and pairing pressure

Tempo exposes diagnostics for graph generation. Useful metrics include:

```promql
sum(rate(tempo_metrics_generator_processor_service_graphs_expired_edges[5m]))

sum(rate(tempo_metrics_generator_processor_service_graphs_dropped_spans[5m]))
```

A high expired-edge rate means one side did not arrive before the processor's `wait` period. A high dropped-span rate can indicate that the processor's `max_items` limit is too low. Increase limits only after checking lost spans, exporter retries, sampling, and load balancing; larger caches consume more memory and cannot repair a missing trace context.

In a horizontally scaled Alloy service-graph deployment, all spans of a trace must reach the same connector instance. Configure `otelcol.exporter.loadbalancing` with `routing_key = "traceID"` in front of the connector instances. This preserves trace affinity only: different connector instances can still emit identical metric series. Isolate them with a collector label such as `collector.id` and aggregate across it, or use Tempo's metrics-generator, which handles horizontal distribution within Tempo's architecture.

## Avoid cardinality and identity traps

Changing `service.name` on every rollout creates a fragmented graph. Use stable application resource values, Pod resource annotations, or standard Kubernetes labels. Keep Pod UID, raw URL path, and other unbounded values out of graph dimensions unless a specific short-lived investigation requires them.

Database, messaging, and virtual-node edges depend on recognized span attributes and kinds. If an SDK uses obsolete or custom attributes, the processor may not classify the dependency as expected even though the span is searchable.

## A practical diagnostic order

Work outward from storage:

1. Query `traces_service_graph_request_total` in the metrics backend.
2. Confirm the configured generator is enabled for the correct traffic or trace stream and, for Tempo, the correct tenant.
3. Verify generated metrics are successfully scraped or exported and that recent samples exist.
4. Confirm Grafana's Tempo data source links to that metrics data source UID.
5. For a trace-derived direct service edge, inspect one cross-service trace for client/server pairing and resource identities.
6. For Tempo or Alloy, only then tune `wait`, `max_items`, or connector load balancing.

This order avoids spending time on Grafana panels when no metric exists, or tuning generator memory when the trace contains only a server span.

## Conclusion

Trace ingestion alone does not populate Grafana's service graph. Generate graph metrics in Tempo or Alloy, or directly in Beyla with `application_service_graph`; send or expose them to a Prometheus-compatible backend, link that backend in the Tempo data source, and, for direct trace-derived service edges, ensure Beyla spans form correlated client/server pairs. Each layer is independently testable, which makes an empty graph a finite pipeline diagnosis.

## Official Documentation

- [Enable Grafana Tempo service graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/enable-service-graphs/)
- [Grafana Service Graph view requirements](https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/)
- [Troubleshoot the Tempo metrics-generator](https://grafana.com/docs/tempo/latest/troubleshooting/metrics-generator/)
- [Alloy `otelcol.connector.servicegraph`](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.connector.servicegraph/)
- [Alloy `otelcol.exporter.loadbalancing`](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.loadbalancing/)
- [Configure Beyla metric exports](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Distributed traces with Beyla](https://grafana.com/docs/beyla/latest/distributed-traces/)
