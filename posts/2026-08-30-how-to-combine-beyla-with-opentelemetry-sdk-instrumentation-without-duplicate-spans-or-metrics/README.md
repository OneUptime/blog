# How to Combine Beyla with OpenTelemetry SDK Instrumentation Without Duplicate Spans or Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OpenTelemetry, eBPF, Distributed Tracing, Observability

Description: Combine Beyla's zero-code RED and network visibility with OpenTelemetry SDK traces by assigning one producer to each signal and preventing duplicate derived metrics.

---

Beyla and an OpenTelemetry SDK can complement each other, but they observe overlapping boundaries. Both can create an HTTP server span for the same request, both can report request-duration metrics, and a metrics generator can derive another metric set from the SDK trace. Sending all of it does not create a richer view; it creates double-counting and duplicate server spans. If both producers honor the same incoming context, those spans can appear in one trace; without shared context, they can appear in separate traces. Either way, they have independently generated span IDs.

The reliable design is to assign ownership per signal and per service before changing configuration.

## Use the recommended division of responsibility

Grafana's current compatibility guidance treats Beyla as a strong baseline for RED metrics and service graphs, while SDKs are the default for detailed distributed tracing. For an SDK-instrumented service, a useful split is:

| Signal | Owner | Reason |
| --- | --- | --- |
| Detailed application traces | OpenTelemetry SDK or language agent | Framework, database, messaging, runtime, and custom spans |
| Application RED metrics | Beyla | Uniform zero-code rate, error, and duration measurements |
| Network flow metrics | Beyla | Node-level source/destination traffic visibility |
| Custom business metrics and logs | Application SDK | Application semantics and log correlation |

If the SDK already emits application metrics that satisfy the same dashboards, let the SDK own those too and use Beyla only for network metrics.

## Keep Beyla's SDK detection enabled

Beyla discovery defaults `exclude_otel_instrumented_services` to `true`. It watches for processes publishing through OpenTelemetry and avoids conflicting instrumentation. A related option, `exclude_otel_instrumented_services_span_metrics`, controls whether Beyla's span/service-graph metric generation is also excluded and defaults to `false`.

Do not turn the first option off globally just because one span is missing. That can make Beyla and the SDK both create transaction spans. If a release-specific behavior is important to the design, test it with the exact pinned Beyla version; these two similarly named switches control different overlap cases.

Signal-level discovery is a useful additional guard:

```yaml
discovery:
  instrument:
    - k8s_namespace: "production"
      k8s_pod_labels:
        telemetry.example.com/beyla-red: "enabled"
      exports: ["metrics"]

prometheus_export:
  port: 8999
  features: ["application"]
```

With no later matching discovery rule overriding `exports`, this selector cannot emit Beyla traces. Keep the SDK's OTLP trace exporter enabled and avoid configuring a Beyla trace destination for that service group.

## Prevent a second metric derivation

Even with one request-metric producer, Tempo's metrics-generator or an Alloy span-metrics connector can derive RED metrics from SDK traces. If Beyla already owns the overlapping RED/span metrics or service graphs, Grafana recommends adding this resource attribute to the SDK-instrumented service:

```yaml
env:
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: >-
      service.namespace=retail,
      service.version=2.4.1,
      span.metrics.skip=true
```

Grafana Cloud Tempo can be configured under Application Observability's Duplication Options to exclude traces carrying `span.metrics.skip=true`. In self-managed Tempo or Alloy, the attribute is only a marker: configure Tempo `filter_policies` in each enabled `span_metrics` and `service_graphs` processor, or an Alloy `otelcol.processor.filter` only on the branch feeding the corresponding connector. Values set through `OTEL_RESOURCE_ATTRIBUTES` are strings, while Beyla emits a Boolean value, so self-managed filters shared by both sources must handle both types. Beyla 3.33.0 adds the flag to its own traces when span-metric export is enabled; it does not add it for a service-graph-only configuration.

If the metrics-generator, rather than Beyla, is intended to own derived metrics, omit that attribute and disable the overlapping Beyla metric features. The point is not that one source is universally better; it is that exactly one source must feed each SLI.

## Use Beyla for network metrics without application overlap

Network flow metrics are distinct from SDK telemetry and can run without application discovery:

```yaml
network:
  enable: true

attributes:
  kubernetes:
    enable: true

otel_metrics_export:
  endpoint: http://alloy.observability.svc.cluster.local:4318/v1/metrics
  protocol: http/protobuf
  features: ["network"]
```

This yields byte counters between network endpoints, not a duplicate HTTP duration histogram. Keep the default low-cardinality Kubernetes owner attributes unless a specific diagnostic requires Pod or IP labels.

## Align resource identity and propagation

Both pipelines must use the same stable `service.name` and `service.namespace`. Put those values in the application container's OpenTelemetry resource configuration; Beyla reads the target process's `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES`. In Kubernetes, Beyla also recognizes the Pod annotations `resource.opentelemetry.io/service.name` and `resource.opentelemetry.io/service.namespace`, but ensure the SDK, OpenTelemetry Operator, or another component maps them into the application's resource as well. If the SDK says `checkout-api` while Beyla derives `checkout-v2`, dashboards and service graphs show two services even when no sample is technically duplicated.

Let the SDK's HTTP or RPC instrumentation inject W3C `traceparent` where supported. Beyla honors an outbound header the application already generated. Keep Beyla's network-level propagation disabled unless a tested hop needs it. For HTTPS, its TCP/IP-level context reaches only another Beyla-instrumented endpoint, and L7 proxies or load balancers disrupt it.

For Go manual spans combined with eBPF zero-code instrumentation, OpenTelemetry documents the Auto SDK integration. Do not register a competing global Go `TracerProvider` in that pattern, because it prevents correlation with the eBPF-provided context.

## Prove there is one producer

Send one request with a known trace ID and inspect the pipeline:

1. Tempo should contain one server span for the request boundary, plus the SDK's legitimate child spans.
2. Inspect resource attributes such as `telemetry.sdk.name`: standard OpenTelemetry SDK spans normally report `opentelemetry`, while Beyla 3.33.0 reports `beyla` and records `otel.scope.name=github.com/grafana/beyla`.
3. Query request counts from each candidate metric family over the same interval. A single request should not increment two metrics used by the same dashboard or SLO.
4. Inspect the Collector/Alloy graph and ensure the SDK OTLP receiver does not fan out to two trace exporters that both reach the same Tempo tenant.
5. Allow old series and traces to age out before evaluating the final topology.

Do not attempt to deduplicate spans by name in the Collector. Independently created spans have different IDs, timings, and attributes; a name filter will eventually delete legitimate child spans.

## Conclusion

Beyla and SDK instrumentation work best with explicit signal ownership: SDKs for deep traces and application semantics, Beyla for uniform RED or network visibility. Keep Beyla's OTel detection enabled, restrict Beyla exports, configure the trace-to-metrics pipeline to honor `span.metrics.skip=true` or disable overlapping generation, and align service resources across both paths.

## Official Documentation

- [Grafana Beyla compatibility and practical guidance](https://grafana.com/docs/beyla/latest/#determine-compatibility)
- [Beyla discovery of OpenTelemetry-instrumented services](https://grafana.com/docs/beyla/latest/configure/service-discovery/#exclude-otel-instrumented-services)
- [Configure Beyla metric export features](https://grafana.com/docs/beyla/latest/configure/export-data/#metrics-export-features)
- [OpenTelemetry zero-code instrumentation](https://opentelemetry.io/docs/zero-code/)
- [OpenTelemetry Go Auto SDK](https://opentelemetry.io/docs/zero-code/go/autosdk/)
