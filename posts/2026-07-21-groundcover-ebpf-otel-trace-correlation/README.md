# How Groundcover Correlates eBPF and OpenTelemetry Traces Across One Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, eBPF, OpenTelemetry, Trace Correlation, Distributed Tracing

Description: Follow the documented path from OpenTelemetry context propagation and OTLP ingestion to Groundcover eBPF enrichment and trace-log correlation.

---

Groundcover can display OpenTelemetry distributed traces and enrich sampled HTTP and gRPC traces with context captured by its eBPF sensor. Understanding that statement requires separating three mechanisms: application trace propagation, Groundcover ingestion, and eBPF enrichment.

Groundcover-specific feature details in this article were checked against public documentation on 2026-07-21. Groundcover does not publicly document every internal matching step, so this article explains the supported observable contract without inventing a private join algorithm.

## The Application Establishes Causality

OpenTelemetry context propagation is what makes several service operations part of one distributed trace. When Service A calls Service B, instrumentation injects a trace ID, the current span ID, and trace flags into a carrier. For HTTP, the default OpenTelemetry propagator uses the W3C `traceparent` header. Service B extracts that context and creates a child span with the same trace ID.

The flow looks like this:

`incoming request -> Service A span -> propagated context -> Service B span -> database span`

Groundcover can ingest and display these spans, but it does not create missing OpenTelemetry parent relationships after the fact. If a client fails to inject context, a server fails to extract it, or a queue drops the carrier, the trace can split into separate roots.

Groundcover's documentation describes third-party traces as the path that provides distributed tracing. Its log-correlation guide also says Groundcover does not inject trace context into application logs. The application or logging framework must emit the trace ID.

## OpenTelemetry Spans Reach the BYOC Backend

Groundcover accepts OpenTelemetry data from Kubernetes pods, OpenTelemetry Collectors, and standalone applications. Its documented ingestion endpoints support OTLP over HTTP and gRPC with the deployment's endpoint and authentication requirements.

A typical request path is:

1. The application SDK or zero-code agent creates spans.
2. Instrumentation propagates context to downstream services.
3. An OTLP exporter sends spans directly or through an OpenTelemetry Collector.
4. The Groundcover sensor or BYOC endpoint receives the telemetry, depending on the integration path.
5. Groundcover stores and displays the ingested distributed trace.

The OpenTelemetry Collector can batch, enrich, filter, retry, sample, and route data according to its configured components. Every processor in that path can affect what arrives. Groundcover's standalone integration guide explicitly assumes the service is already instrumented; Groundcover does not add OTel instrumentation to it.

Use stable resource attributes, especially `service.name` for Collector and standalone ingestion, and verify the Groundcover environment and workload mapping. For OTLP sent directly from Kubernetes pods to the Groundcover sensor, Groundcover documents that the sensor replaces `service.name` with the name of the Kubernetes Deployment that owns the pod. A valid trace ID is not enough for useful fleet navigation if service identity is inconsistent.

## The eBPF Sensor Observes the Same Supported Request

On monitored Kubernetes nodes, Groundcover's eBPF sensor observes supported activity independently from the OTel SDK. Its public APM documentation describes inspecting traffic, classifying a supported protocol, reconstructing transactions, and enriching them with pod, node, container, and Kubernetes metadata.

Groundcover's November 2024 product update states a specific correlation outcome: sampled HTTP and gRPC OpenTelemetry traces are enriched with data extracted from eBPF spans when Groundcover's sensor samples them. The documented enrichment includes request and response payloads and headers, query parameters, and attributes such as cross-availability-zone indicators and PII status.

That is narrower than "all eBPF and OTel traces are always merged." The public statement has several conditions:

- the trace is OpenTelemetry data ingested by Groundcover;
- the relevant operation uses HTTP or gRPC;
- the sensor observes the workload and supports its runtime path;
- the OTel trace is sampled and exported;
- the Groundcover sensor samples the matching transaction; and
- privacy, obfuscation, payload-size, and protocol settings permit the field.

The exact internal key or heuristic Groundcover uses to associate the records is not specified in the public docs reviewed. Do not build an external dependency on an assumed tuple, timestamp window, header parser, or database schema. The supported product behavior is the enrichment visible in the trace.

## What Each Side Contributes

| OpenTelemetry contributes | Groundcover eBPF can contribute |
|---|---|
| Trace and span IDs | Observed transaction context |
| Parent-child relationships | Kubernetes pod, node, and container context |
| Manual application spans | Supported request and response details |
| Library and framework attributes | Cross-zone and protocol-derived attributes documented by Groundcover |
| Application-defined status and events | PII-status attributes documented by Groundcover |

The enriched trace can therefore answer both "which logical workflow did this request follow?" and "what infrastructure and wire-level context surrounded it?" Coverage remains conditional rather than universal.

## Sampling Can Break the Join

Sampling happens at more than one layer. OpenTelemetry SDKs can make a head-sampling decision and propagate it in trace flags. A Collector can apply additional processing or tail sampling. Groundcover separately documents smart sampling for eBPF traces and says it processes observed requests while storing only a selected fraction of trace instances. For OTLP traces sent directly from Kubernetes pods to the Groundcover sensor, Groundcover also documents a separate ingestion sampling ratio with a 5% default. The BYOC endpoint used by an external Collector does not perform that additional sampling.

If the OTel trace is dropped before storage, whether by upstream sampling or direct-sensor ingestion sampling, Groundcover cannot display it as an ingested distributed trace. If the corresponding eBPF transaction is not retained for enrichment, the OTel trace may still exist without the additional payload and infrastructure fields.

Groundcover documents an `x-groundcover-force-sample: true` request header for HTTP and gRPC eBPF traces. It is useful for a controlled test, not a universal production sampling strategy. Confirm how upstream OTel sampling treats the same request, because the Groundcover header does not override an OTel SDK or Collector decision unless those components are separately configured to do so.

## Logs Require a Shared Trace ID

Trace enrichment and log correlation are related but distinct. Groundcover's log-correlation documentation says the application must include trace information, most commonly `trace_id`, in the log payload. Once both signals are ingested, Groundcover can correlate them using that shared value.

No stored trace means no trace page to link, even if the log contains a valid ID. No trace ID in the log means Groundcover cannot establish the exact relationship from timestamps alone. Configure structured logging and standardize field names across services.

OpenTelemetry SDKs and logging integrations can inject trace and span context into log records. Test the language-specific integration because support and configuration vary.

## Validate One Request End to End

Use a known request that crosses at least two services:

1. Instrument both services with supported OpenTelemetry libraries or agents.
2. Configure the same propagator and verify the downstream service receives `traceparent`.
3. Export both services to the documented Groundcover OTLP path.
4. Confirm a Groundcover sensor is ready on every node involved.
5. Verify HTTP or gRPC parsing through the actual TLS library, proxy, and service-mesh path.
6. Send a request with a unique, non-sensitive test attribute and use Groundcover force sampling for the eBPF side if appropriate.
7. Find the OTel trace by trace ID and inspect its parent-child waterfall.
8. Check for the documented eBPF payload, header, query, and infrastructure enrichment.
9. Confirm application logs include the same trace ID and link to the stored trace.

Repeat the test with an error, timeout, retry, asynchronous handoff, and a request whose payload exceeds configured limits. A happy-path HTTP request proves only one coverage branch.

## Troubleshoot Missing Correlation by Layer

If the distributed waterfall is broken, inspect context injection and extraction first. If no trace arrives, inspect exporter, Collector, authentication, endpoint, and sampling configuration. If the trace arrives without eBPF enrichment, inspect sensor coverage, protocol and TLS support, Groundcover sampling, obfuscation, and payload limits. If logs do not link, inspect structured trace-ID fields and trace retention.

This layered method avoids blaming an undocumented correlation algorithm for a missing input.

## Protect Captured Data

Payload and header enrichment can expose credentials, tokens, personal data, and proprietary content. Groundcover documents obfuscation controls and configurable payload limits. Apply them before broad production coverage, restrict access, and align retention with data policy.

Also follow OpenTelemetry guidance for untrusted incoming context and baggage. Trace headers can be forged, and baggage must not carry secrets.

Groundcover's hybrid view works when OTel supplies causal identity and eBPF supplies supported observed context. The reliable contract is conditional enrichment of sampled traces, not an assumption that any two nearby events will be merged automatically.

## Official Documentation

- [Groundcover: eBPF enrichment of OpenTelemetry traces](https://docs.groundcover.com/product-updates/earlier-updates/2024/nov-2024)
- [Groundcover: Traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover: OpenTelemetry integration](https://docs.groundcover.com/integrations/data-sources/opentelemetry)
- [Groundcover: Ingestion endpoints](https://docs.groundcover.com/architecture/incloud-managed/ingestion-endpoints)
- [Groundcover: Log and trace correlation](https://docs.groundcover.com/log-and-trace-correlation)
- [Groundcover: Control eBPF sampling](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [OpenTelemetry: Context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
