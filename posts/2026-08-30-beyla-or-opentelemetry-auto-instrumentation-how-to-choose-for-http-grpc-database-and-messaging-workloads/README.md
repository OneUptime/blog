# Beyla vs OpenTelemetry Auto-Instrumentation: How to Choose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OpenTelemetry, eBPF, Auto-Instrumentation, HTTP, gRPC, Database, Messaging

Description: Choose between Beyla's Linux eBPF baseline and language-level OpenTelemetry auto-instrumentation based on protocol coverage, trace depth, rollout constraints, and security.

---

Beyla and OpenTelemetry auto-instrumentation both promise telemetry without editing application source, but they operate at different layers. Beyla attaches eBPF programs from outside the process. Language auto-instrumentation loads an agent or instrumentation libraries into the process through bytecode manipulation, monkey patching, runtime hooks, compile-time injection, or another language-specific mechanism.

Both can export OpenTelemetry data. The choice is about how telemetry is captured, not whether the backend speaks OTLP.

## Start with the operating constraints

Beyla runs on Linux and requires a compatible kernel, BTF support, visibility into the target processes, and elevated eBPF-related capabilities. A DaemonSet can cover many services on a node without changing or restarting those applications.

Most language agents do not need a privileged node agent, but they change each application launch environment and usually need an agent package, injected files, environment variables, or a rebuilt image. The OpenTelemetry Operator can inject zero-code instrumentation for .NET, Java, Node.js, Python, and Go in Kubernetes. Go is an important exception to the security generalization: the Operator's Go auto-instrumentation uses an eBPF sidecar and currently requires `privileged: true` with `runAsUser: 0`. Support, maturity, and security requirements still vary by language and framework.

Choose the mechanism whose operational requirements your platform can support and audit.

## Compare by workload type

| Workload | Beyla is strongest when | OTel auto-instrumentation is strongest when |
| --- | --- | --- |
| HTTP/S | You need uniform RED metrics and transaction spans across a polyglot Linux fleet | You need framework route names, internal spans, log correlation, runtime data, and rich library attributes |
| gRPC | Go services fit Beyla's first-class Go HTTP/2 and gRPC support | You need reliable context propagation and client/server library detail across languages |
| Database | Postgres/MySQL wire visibility or supported SQL/Redis/Mongo instrumentation gives enough dependency context | You need ORM, pool, statement sanitization, vendor-specific client, or transaction detail |
| Messaging | Supported Kafka client/server telemetry covers the required flow | You use other brokers, need producer/consumer semantic detail, or need framework-specific message context |

Beyla's generic network-level trace propagation does not support gRPC or HTTP/2, and TLS packet-level context works only between Beyla-instrumented endpoints without an intervening L7 proxy. Go has separate library-level propagation with broader protocol support, subject to kernel lockdown limitations.

For non-Go asynchronous or reactive frameworks, Grafana recommends validating Beyla trace correlation carefully. Its current compatibility matrix favors SDK traces for Java reactive workloads and generally recommends SDKs for detailed distributed tracing.

## Decide how much depth is required

Beyla sees transaction boundaries and produces consistent rate, error, and duration measurements with no application dependency. That is ideal for a fast inventory, SLO baseline, and services that cannot be rebuilt.

An SDK agent instruments known libraries inside the runtime. It can create child spans for database calls, messaging clients, framework middleware, and supported libraries; correlate logs; expose runtime metrics; and integrate custom manual spans. It also inherits the limitations and release compatibility of those libraries.

Neither mechanism automatically understands business operations inside arbitrary code. Custom spans, events, and domain metrics still require the OpenTelemetry API or another explicit instrumentation layer.

## Account for latency semantics

Beyla observes a request at the network boundary and can include time spent waiting in an application framework's internal queue. A library span often starts when a handler begins, which measures service time rather than all client-visible waiting time. For an overloaded thread pool, those values can differ materially.

This is a reason to keep Beyla RED metrics even when SDK traces provide the debugging detail. It is not a reason to export two server spans for every request.

## Use both with explicit signal ownership

A common production model is:

- Beyla on Linux nodes for baseline RED and optionally network/service-graph metrics;
- OpenTelemetry agents on high-value services for detailed traces and log/runtime correlation;
- one metrics generator for each metric family;
- stable `service.name` and `service.namespace` values shared by both pipelines.

Beyla detects OpenTelemetry-instrumented services and defaults to avoiding conflicting instrumentation. Keep that protection enabled. Do not deliberately run Beyla tracing and SDK tracing for the same request boundary unless the exact combination has been tested.

If Beyla owns span metrics or service graphs while SDK traces also enter Grafana Cloud Tempo, Grafana documents setting `span.metrics.skip=true` through `OTEL_RESOURCE_ATTRIBUTES` on those SDK traces and configuring Tempo's deduplication option to honor it. In self-managed Tempo, OpenTelemetry Collector, or Alloy pipelines, explicitly filter those SDK spans out of the metrics-generation path or disable the competing generator; the attribute is not a universal OpenTelemetry switch.

## A practical decision sequence

Choose Beyla first when all of these are true:

1. workloads run on compatible Linux nodes;
2. the platform can grant and govern eBPF capabilities;
3. broad zero-code RED coverage is the immediate goal;
4. transaction-level spans are sufficient or SDK rollout is impractical.

Choose language auto-instrumentation first when any of these dominate:

1. detailed framework, database, messaging, runtime, or log correlation is required;
2. kernel capabilities or the required target-process visibility are prohibited;
3. the workload is not on Linux;
4. propagation crosses protocols or runtimes where Beyla has documented limitations.

Use both when the team can state, in writing, which producer owns traces, application RED metrics, network metrics, and derived service-graph/span metrics. If ownership is ambiguous, the rollout is not ready.

## Validate with representative traffic

Test each real language, framework, encryption path, proxy, database driver, and messaging client. Compare:

- route and operation names;
- trace continuity across hops;
- database and messaging child-span coverage;
- client-visible versus handler latency;
- CPU, memory, backend ingest, and cardinality;
- security exceptions and upgrade procedures.

A feature matrix from documentation narrows the choice, but a staging trace from the actual binary and kernel makes it defensible.

## Conclusion

Beyla is an excellent Linux-wide baseline for uniform RED visibility with minimal application disruption. OpenTelemetry language auto-instrumentation is the better default for deep, reliable application traces and supported library detail. Many fleets benefit from both, provided each signal has one owner and resource identity and propagation are tested end to end.

## Official Documentation

- [Grafana Beyla compatibility matrix and practical guidance](https://grafana.com/docs/beyla/latest/#determine-compatibility)
- [Grafana Beyla supported trace and metric instrumentations](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Distributed traces with Beyla](https://grafana.com/docs/beyla/latest/distributed-traces/)
- [OpenTelemetry zero-code instrumentation](https://opentelemetry.io/docs/zero-code/)
- [OpenTelemetry language APIs and SDK status](https://opentelemetry.io/docs/languages/)
- [OpenTelemetry Operator auto-instrumentation](https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/)
