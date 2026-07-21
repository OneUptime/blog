# Groundcover eBPF vs. OpenTelemetry: When App Instrumentation Matters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, eBPF, OpenTelemetry, Distributed Tracing, Observability

Description: Compare Groundcover eBPF observation with OpenTelemetry instrumentation and learn where a hybrid approach preserves essential application context.

---

Groundcover eBPF and OpenTelemetry are not mutually exclusive tracing products. eBPF is a Linux kernel capability Groundcover uses to observe supported workload activity without modifying application source. OpenTelemetry is a vendor-neutral set of APIs, SDKs, semantic conventions, protocols, and collector components for creating and moving telemetry.

The practical choice is usually about where each signal should originate. Use kernel observation for broad coverage of system boundaries. Use application instrumentation when the application is the only place that knows the operation's meaning or causal context.

Groundcover-specific feature details in this article were checked against public documentation on 2026-07-21. Validate current behavior in your own languages, libraries, protocols, and Groundcover plan.

## The Two Approaches Observe Different Layers

| Question | Groundcover eBPF | OpenTelemetry application instrumentation |
|---|---|---|
| Where observation happens | Linux kernel and documented runtime hooks | Application, framework, library, agent, or Collector |
| Source changes required | Not for supported kernel-level coverage | None for supported zero-code agents; code changes for manual spans and metrics |
| Initial fleet coverage | Broad when the sensor runs on each eligible node | Depends on language, library, deployment, and instrumentation rollout |
| Business semantics | Limited to visible protocol data and enriched infrastructure context | Can describe domain operations and controlled business attributes |
| Distributed context | Can observe interactions, but app-level causal propagation has limits | Instrumentation injects and extracts trace context across supported boundaries |
| In-process timing | Does not inherently explain arbitrary internal code | Manual spans can measure selected functions and workflow stages |
| Platform reach | Groundcover sensor requires supported Linux environments | OTel SDKs and Collectors can cover many platforms, including outside Kubernetes |

Neither column is automatically more accurate. A kernel observer can see traffic from a service that forgot its SDK. Application code can distinguish a failed business validation from a successful HTTP response. Both need sampling, naming, security, and operational controls.

## Where Groundcover eBPF Is Strong

Groundcover documents an eBPF sensor deployed as a DaemonSet on monitored Kubernetes nodes. For supported protocols, its pipeline observes traffic, reconstructs transactions, enriches them with Kubernetes context, and derives application metrics and eBPF traces. It also collects infrastructure signals and Kubernetes events.

This is particularly useful when:

- many services use different languages or no consistent instrumentation;
- teams need an immediate service map and golden signals;
- legacy workloads are hard to rebuild;
- an incident involves an uninstrumented dependency;
- platform engineers want a common baseline across clusters; or
- the main question concerns network, container, node, or Kubernetes context.

Coverage still depends on the sensor running, supported Linux kernel features, protocol parsing, encryption-library support, and sampling. Groundcover's current docs describe a special optional Java agent for Java SSL visibility, illustrating that not every runtime path can be solved by the same kernel mechanism.

## When OpenTelemetry Application Instrumentation Matters

OpenTelemetry's own zero-code documentation says automatic instrumentation typically covers supported libraries, not arbitrary application code. Manual instrumentation is needed when the business operation itself matters.

### Custom Workflow Spans

An API handler might call validation, inventory reservation, payment authorization, and fulfillment before returning one response. Network observation can show calls leaving the process, but it may not explain time spent or failure inside each local stage. Manual spans can name those operations and record safe, bounded attributes.

### Domain-Level Success and Failure

Transport success is not always business success. An HTTP response can be technically successful while an order is rejected or a model result is unusable. Application instrumentation can set span status and events according to domain rules.

### Context Across Asynchronous Work

Distributed tracing depends on propagation. OpenTelemetry describes context as carrying trace and parent identifiers across process boundaries, commonly through W3C Trace Context for HTTP. Messaging, background work, callbacks, and fan-out need instrumentation that injects and extracts context at the correct logical boundaries.

Timing proximity alone is not proof that two asynchronous operations belong to one request. Use propagated identifiers when causality matters.

### Controlled Business Attributes

Application code can attach low-cardinality attributes such as operation type, region class, or feature variant. It can also deliberately avoid secrets and personal data. A packet observer should not be expected to infer a safe business taxonomy from raw payloads.

### Client and Non-Linux Coverage

Browser, mobile, managed serverless, Windows, and external SaaS interactions may sit outside a Kubernetes Linux sensor's reach. OpenTelemetry or another supported client telemetry path can extend the trace, subject to platform support and security policy.

## Groundcover Supports a Hybrid Path

Groundcover documents ingestion of OpenTelemetry logs, metrics, and traces through OTLP from Kubernetes pods, an OpenTelemetry Collector, and standalone applications. Its standalone guide explicitly says Groundcover does not instrument those services with OpenTelemetry for you; they must already be instrumented.

Groundcover also documents two trace categories: automatically generated eBPF traces for supported services and third-party traces such as OpenTelemetry. Ingested traces preserve distributed tracing, while the sensor adds infrastructure and application context. A published product update says sampled HTTP and gRPC OpenTelemetry traces can be enriched with data from eBPF spans when the sensor also samples them.

That hybrid is useful when eBPF supplies broad coverage and OTel supplies causal structure and domain detail. It does not mean every eBPF transaction becomes an OpenTelemetry span or that every OTel span receives eBPF payload enrichment. The documented protocol and sampling conditions still apply.

## Avoid Duplicate and Conflicting Telemetry

Hybrid deployments need a signal contract:

1. **Choose service identity:** standardize `service.name`, environment, namespace, and version attributes. Map them to Groundcover workload identity deliberately.
2. **Choose the distributed trace source:** let OTel instrumentation own trace and parent IDs where end-to-end causality matters.
3. **Define eBPF's role:** use it for coverage, golden signals, payload enrichment where approved, and gaps in manual instrumentation.
4. **Coordinate sampling:** understand head sampling in OTel and stored-trace sampling in Groundcover. A trace absent from either side cannot be fully enriched.
5. **Control attributes:** apply OpenTelemetry semantic conventions and cardinality limits. Do not copy unbounded IDs into metrics.
6. **Test duplicates:** verify that the same client or server operation is not displayed twice as independent spans in a way that inflates counts.

Keep raw counts and derived metrics traceable to their source. If an eBPF metric and an OTel metric use the same name but different error definitions, one must be renamed or removed.

## Make Sampling and Retention Explicit

Groundcover says its eBPF pipeline processes observed requests and stores a smart-sampled subset of trace instances. OTel traces may be head-sampled by an SDK or processed by Collector sampling components before ingestion. These are separate decisions.

For debugging, determine which layer made the drop decision. For compliance, do not treat tracing as a guaranteed transaction ledger. Observability sampling and retention are optimized for diagnosis, not exact business accounting unless explicitly engineered and validated for that purpose.

Groundcover provides force-sampling controls for eBPF HTTP and gRPC traces, but use them narrowly. Retaining all payload-rich traces for a high-volume service can increase backend storage and expose more sensitive data even when the subscription price is not volume-based.

## Decide Per Use Case

Use eBPF alone for a first-pass map of supported services, basic latency and error analysis, infrastructure correlation, and coverage of workloads that cannot be modified.

Add OTel zero-code instrumentation when a supported language agent provides reliable context propagation and library spans with acceptable overhead.

Add manual OTel instrumentation when teams need domain operations, async causality, internal stage timing, or carefully selected business attributes. Keep the span design small and tied to debugging questions.

Retain existing custom Prometheus metrics when they express service state that neither eBPF nor traces can reconstruct efficiently.

## Validate the Hybrid in Production-Like Traffic

Select a request that crosses synchronous and asynchronous boundaries. Confirm the OTel trace ID remains stable, parent relationships are correct, Groundcover displays the full ingested waterfall, eBPF enrichment appears only where documented, and logs correlate only when the application includes trace context.

Then test unsupported protocols, encrypted runtimes, errors, retries, timeouts, node replacement, and missing Collector connectivity. Measure sensor, SDK, Collector, and backend resource use separately.

Application instrumentation matters whenever intent matters. Groundcover eBPF can reduce the amount of code-level work required for broad visibility, but OpenTelemetry remains the stronger tool for expressing causality and semantics that exist only inside the application.

## Official Documentation

- [Groundcover: Traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover: OpenTelemetry integration](https://docs.groundcover.com/integrations/data-sources/opentelemetry)
- [Groundcover: Send OpenTelemetry from standalone applications](https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-standalone-hosts)
- [Groundcover: eBPF enrichment of OpenTelemetry traces](https://docs.groundcover.com/product-updates/earlier-updates/2024/nov-2024)
- [OpenTelemetry: Instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/)
- [OpenTelemetry: Context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry: Semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
