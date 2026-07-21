# Groundcover Zero-Instrumentation: What eBPF Captures and Misses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, eBPF, Observability, Kubernetes, Application Performance Monitoring

Description: Understand Groundcover's zero-instrumentation eBPF coverage, including protocol, runtime, sampling, payload, and platform boundaries.

---

"Zero instrumentation" is useful shorthand, but it does not mean zero deployment, zero configuration, zero overhead, or complete visibility into every line of application code. Groundcover uses an eBPF sensor to observe supported activity without requiring teams to add an SDK to each service. That provides broad initial coverage, while application instrumentation remains valuable for business semantics and distributed context.

Groundcover-specific feature details in this article were checked against public documentation on 2026-07-21. The product evolves quickly, and vendor coverage claims should be verified against your kernels, runtimes, protocols, encryption libraries, and traffic.

## Where the Sensor Runs

Groundcover's current architecture documentation describes its Kubernetes sensor as a DaemonSet with one sensor pod on each monitored node. Kubernetes itself defines a DaemonSet as a controller that ensures all or selected eligible nodes run a copy of a pod. As nodes join or leave, the corresponding daemon pods are added or removed.

This matters because coverage begins with successful scheduling. Groundcover documents that sensors must run on each node that should be monitored and that Fargate nodes are excluded from default coverage. Its installation guide also describes a coverage policy that excludes managed control-plane and Fargate capacity. Check taints, tolerations, architecture, operating system, and sensor readiness rather than assuming a successful Helm release covers every workload.

The eBPF sensor requires supported Linux kernel features, permissions, and CO-RE compatibility. Groundcover separately documents AMD64 and ARM64 support. Windows nodes and serverless capacity without a schedulable Linux host are not automatically made observable by a Linux eBPF DaemonSet.

## What Kernel Observation Can Provide

Groundcover documents a pipeline that observes traffic, classifies supported protocols, reconstructs transactions, enriches them with Kubernetes context, and generates application metrics and traces. For supported workloads, that can provide:

- request rate, latency, and error signals derived from observed transactions;
- client and server workload relationships;
- resource access such as supported database operations;
- Kubernetes workload, pod, container, node, namespace, and environment context;
- network and host resource signals;
- Kubernetes events and infrastructure state; and
- Kubernetes container logs written to standard output.

Groundcover lists supported protocols in its documentation and exposes protocol-specific configuration. The list changes over time, so test the exact protocol and version in use. Seeing a TCP connection is not the same as decoding a semantic HTTP request, SQL statement, message, or error status.

The platform also supports custom Prometheus metrics and third-party traces. Those are ingestion paths, not evidence that eBPF generated the original application semantics.

## eBPF Does Not See Arbitrary Business Logic

Kernel observation is strongest at system and network boundaries. A calculation, cache decision, feature-flag branch, queue wait inside a process, or domain operation such as `authorizePayment` may never cross a boundary that exposes its meaning.

Without application spans or custom metrics, eBPF cannot reliably know:

- which business workflow an internal function represents;
- why a code path chose one branch;
- customer, order, or tenant context that was not safely present on the wire;
- time spent between meaningful in-process steps;
- logical parent-child relationships through every asynchronous handoff; or
- application-specific success when the transport status appears successful.

OpenTelemetry manual instrumentation is designed for these cases. It lets developers create spans and measurements around code-level operations and attach controlled attributes using shared semantic conventions.

## Protocol Parsing Is a Real Boundary

Groundcover's eBPF traces are documented for supported services and protocols. Custom binary protocols, uncommon database versions, proprietary framing, or traffic transformed by a proxy may not produce the same transaction detail. Validate both directions of traffic and important error modes.

Encryption adds runtime-specific constraints. Groundcover documents attaching probes to popular encryption libraries for visibility into encrypted traffic, but it calls out Java SSL as an exception because Java's encryption implementation is written in Java rather than a native library. Groundcover provides an optional Java agent for that case, and the documentation says it is disabled by default. Once an in-process agent is involved, the deployment is no longer purely kernel-only, and it should be tested like other application-adjacent instrumentation.

Do not generalize support for one TLS library to every language, static build, sidecar, service mesh, or custom cryptographic path. Prove it with a known request and response in the target environment.

## Processing Every Request Does Not Mean Storing Every Trace

Groundcover says its eBPF pipeline processes observed requests before making smart-sampling decisions, while only a fraction of trace instances is retained. Its documentation prioritizes unusual latency, error responses, and baseline examples, and provides controls to force sampling or adjust rate limits.

That distinction matters during incident review. Aggregate golden signals may be derived from broad observation even when a particular request is not present as a stored trace. If an audit or debugging workflow needs exact request retrieval, test force-sampling policy and retention rather than relying on a statement about collection coverage.

Third-party OpenTelemetry traces have their own sampling controls. A parent sampling decision propagated by the application can affect which distributed trace reaches Groundcover.

## Payload Visibility Has Security and Size Limits

Groundcover documents payload, header, query-parameter, and body visibility for supported eBPF traces. That is powerful for debugging and potentially sensitive. Review obfuscation controls before production rollout and treat captured telemetry under the same privacy, access, and retention policies as the application data it may contain.

Trace payloads are subject to a configurable size limit and can be truncated. Compression also means the size shown on the wire may not equal the uncompressed size used for the limit. A missing tail in a large response is therefore not proof that the application never sent it.

Use least-privilege access, test redaction, and avoid putting secrets or unnecessary personal data into headers and bodies in the first place. Kernel-level capture does not remove data-governance obligations.

## Logs and Traces Have Different Correlation Requirements

Groundcover automatically collects Kubernetes stdout logs according to its docs, but correlation with distributed traces still needs shared context. Groundcover explicitly says it does not inject a trace ID into application logs. The application or logging framework must include the trace context, and the corresponding trace must be sampled and ingested.

File logs, journald, external services, and non-Kubernetes sources can require a documented collector or configuration. Confirm timestamps, multiline handling, parsing, metadata, and loss behavior for each path.

## What to Validate in a Proof of Concept

Build a coverage matrix from real workloads:

| Test | Evidence to collect |
|---|---|
| Sensor scheduling | Ready sensor on every intended Linux node |
| Protocol coverage | Expected method, resource, status, and latency fields |
| Encrypted traffic | Same detail through each runtime and service-mesh path |
| Error behavior | Application errors, transport failures, and timeouts classified correctly |
| Async workflow | Parent-child trace continuity across queues and background jobs |
| Payload policy | Required fields visible, sensitive fields redacted, large payload behavior understood |
| Sampling | Known normal and failing requests retrievable under the chosen policy |
| Resource use | Sensor CPU, memory, network, and backend growth under peak load |

Also test upgrades, node replacement, and temporary backend unavailability. A demo trace on one node does not prove fleet-wide durability.

## Use Zero Instrumentation as a Baseline

Groundcover's eBPF approach can establish useful coverage quickly for supported Linux workloads and protocols, especially where teams have inconsistent instrumentation. It should be treated as a strong baseline, not a reason to remove valuable application telemetry.

Keep or add OpenTelemetry where engineers need causal context across services, custom spans, domain attributes, or code-level timing. Ingest custom Prometheus metrics where they encode service behavior. The best design uses kernel observation to reduce blind spots and application instrumentation to explain intent.

## Official Documentation

- [Groundcover: Application Performance Monitoring](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm)
- [Groundcover: Traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover: Requirements](https://docs.groundcover.com/getting-started/requirements)
- [Groundcover: Configure sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover: Enable SSL tracing in Java applications](https://docs.groundcover.com/customization/customize-deployment/enabling-ssl-tracing-in-java-applications)
- [Groundcover: Customize tracing payload size](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [OpenTelemetry: Zero-code instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/zero-code/)
