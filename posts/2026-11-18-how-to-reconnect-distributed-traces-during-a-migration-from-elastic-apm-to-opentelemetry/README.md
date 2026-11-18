# How to Reconnect Distributed Traces During a Migration from Elastic APM to OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Elastic, Migration, Distributed Tracing, Debugging

Description: Reconnect mixed Elastic APM and OpenTelemetry traces by checking W3C headers, continuation strategy, legacy compatibility, sampling, and backend routing.

During a gradual migration, an OpenTelemetry service can send a request to an Elastic APM service and still belong to the same trace. Both support W3C Trace Context. When the trace splits, changing an OTLP endpoint alone will not reconnect it: the break can happen in request headers, receiver policy, or which backend stores each span.

Investigate one service boundary at a time using a controlled request. Keep its incoming headers, outgoing headers, exported span IDs, and destination backend together as evidence.

## Locate the first changed trace ID

Choose one upstream client span and the downstream server transaction or span. Compare their exported trace IDs and the context delivered across the wire.

| Evidence | Likely next investigation |
| --- | --- |
| No outgoing `traceparent` | Client library coverage and active context at send time. |
| Outgoing header is present but missing downstream | Proxy or gateway header handling. |
| Downstream receives valid context but starts another trace | Receiver continuation policy, parser, or competing instrumentation. |
| Trace IDs match but one side is absent in the UI | Export destination, access filters, retention, and sampling. |

A resource's `service.name` changes how data is identified and displayed; it does not repair parentage. Likewise, a Collector cannot infer an original parent from two unrelated trace IDs after a service has restarted the trace.

Elastic's [mixed-instrumentation troubleshooting guide](https://www.elastic.co/docs/troubleshoot/ingest/opentelemetry/edot-sdks/trace-context-propagation) identifies missing headers, older agents, restart policies, and competing SDKs as separate causes. It also limits this guidance to gradual migration troubleshooting: mixing OpenTelemetry and non-OpenTelemetry Elastic APM configurations is not officially supported.

## Check the Elastic receiver's continuation policy

For the Elastic Java agent, inspect `trace_continuation_strategy` and any central configuration overriding local settings:

- `continue` uses the incoming trace context.
- `restart` creates a new trace and links it to the incoming context.
- `restart_external` continues only when the incoming `tracestate` identifies the request as internal through the Elastic `es` entry; otherwise it restarts.

That last policy can explain a migration-specific split: switching an upstream service to another OTel distribution can change its vendor tracestate even though its W3C `traceparent` remains valid. Do not forge an Elastic `es` entry to fool this policy.

When the boundary is intentionally trusted and should continue upstream traces, the Java agent setting is:

```bash
export ELASTIC_APM_TRACE_CONTINUATION_STRATEGY=continue
```

Confirm the setting's spelling, availability, and semantics for other language agents rather than assuming all releases are identical. Preserve deliberate restart policies at public trust boundaries. The [Elastic Java core configuration reference](https://www.elastic.co/docs/reference/apm/agents/java/config-core#config-trace-continuation-strategy) documents restart links, the `es` test, and configuration precedence through agent configuration mechanisms.

## Preserve compatible headers during coexistence

For OTel SDK autoconfiguration, ensure W3C propagation is enabled:

```bash
export OTEL_PROPAGATORS=tracecontext,baggage
```

An SDK constructed entirely in application code may need its propagators configured programmatically. Supported HTTP client and server instrumentation should inject and extract the headers; merely setting the environment variable does not instrument an unsupported client.

Keep `traceparent` and `tracestate` together through internal gateways. Older Elastic deployments may also need the legacy `elastic-apm-traceparent` header while their agents are upgraded. Determine the exact sender and receiver versions before removing legacy propagation. OTel's W3C propagator does not automatically understand every vendor header.

Use one owner for instrumentation of a given request path. Running independently configured Elastic and OTel agents in the same process can produce competing contexts; use a documented distribution or supported bridge when that is the migration strategy. The [OpenTelemetry context propagation guide](https://opentelemetry.io/docs/concepts/context-propagation/) explains the distinction between carrying context and creating telemetry.

## Verify sampling and storage separately

A valid context can carry an unsampled decision. If the receiver follows that decision, the relationship may be correct while recording is absent. In a controlled staging test, use a consistent sampling configuration across the selected services and verify the actual sampled flag. Avoid globally forcing production sampling merely to make one migration test visible.

Also confirm that both sides send data to a destination where you can query the same trace. Correctly connected spans sent to separate backends may each appear incomplete. Do not diagnose that as header loss without comparing exported IDs.

For the acceptance test, send one request through the migrated route and verify:

1. The upstream client span and downstream server span share a trace ID.
2. The downstream parent ID matches the client span ID, accounting for any instrumented intermediary.
3. The downstream server has its own span ID.
4. Both spans are visible in the intended backend and service filters.
5. An unrelated subsequent request does not reuse a stale context.

Repeat in both directions: Elastic caller to OTel receiver and OTel caller to Elastic receiver. Include a request without context and one subject to an intentional restart policy. The [W3C processing model](https://www.w3.org/TR/trace-context/#processing-model-for-working-with-trace-context) supplies the wire-level contract; your migration test proves that the agents, proxies, and storage path implement the topology you intended.
