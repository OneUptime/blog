# How to Correlate Partial Traces After Head or Tail Sampling Drops Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sampling, Distributed Tracing, OpenTelemetry, Correlation

Description: Diagnose and correlate incomplete trace views by separating head decisions, tail-sampler visibility, transport loss, and backend retention while preserving cross-signal evidence.

---

Sampling is often blamed whenever a trace looks incomplete, but the mechanisms differ. Head sampling decides at span creation whether it is recorded and eligible for export, using information available at span start. A well-configured parent-based policy normally keeps a distributed trace's decision consistent. Tail sampling buffers received spans and decides later, ideally exporting or dropping the trace as a unit.

A stored trace missing spans can therefore indicate inconsistent head decisions, broken propagation, a tail sampler that never saw the whole trace, late arrivals, transport rejection, or backend limits. Diagnose which layer lost visibility before changing the sample rate.

## Map the Possible Loss Points

Build an evidence table:

| Layer | Typical failure | Observable evidence |
| --- | --- | --- |
| SDK head sampler | child ignores parent decision | mixed sampled flags, service-specific gaps |
| instrumentation | context not extracted | new trace ID at boundary |
| SDK exporter | queue overflow or shutdown loss | exporter/drop metrics and logs |
| OTLP receiver | partial rejection or bad data | partial-success rejected span count |
| Collector routing | one trace split across samplers | each sampler sees a subset |
| tail sampler | early decision, capacity eviction, late span | tail-sampling processor metrics |
| backend | ingestion or retention limit | accepted upstream, absent in direct lookup |

First query raw span IDs and parent IDs. A child in a new trace is a propagation break, not sampling of one span from the original trace. A child whose parent ID refers to an absent span indicates actual incompleteness or different retention.

## Keep Head Decisions Consistent

OpenTelemetry SDKs expose `IsRecording` and the sampled trace flag. The sampler decides whether a new span is dropped, recorded only, or recorded and sampled. The sampled flag propagates in `SpanContext` to descendants.

Use a parent-based sampler around the root sampling policy when the desired behavior is “children follow the parent.” For example, the standard environment configuration commonly uses:

~~~bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.10
~~~

Exact support depends on the language SDK. A bare ratio sampler at every service can make independent decisions if it does not honor the remote parent as intended. Also verify that proxies and messaging clients preserve `traceparent`; a downstream service with no valid parent makes a new root decision.

Head sampling cannot know that a later child span will fail. If error retention is required, use a tail policy or another deliberate mechanism rather than expecting the root head sampler to predict future status.

## Give Tail Sampling the Whole Trace

The OpenTelemetry Collector contrib tail-sampling processor is stateful. Its official documentation requires all spans for a trace to reach the same processor instance. A common scale-out design uses an initial Collector tier with a load-balancing exporter that routes by trace ID into a second tier running tail sampling.

Key controls include `decision_wait`, `num_traces`, expected trace rate, decision-cache settings, and policy configuration. This illustrative shape must be tuned from measured latency and volume:

~~~yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
~~~

Collector component configuration evolves; validate field names against the deployed release. A decision wait shorter than the upper tail of span arrival latency means late spans can miss the decision. Too few in-memory trace slots can evict traces under load. Increasing either capacity or wait consumes memory, so monitor rather than guessing.

The processor publishes metrics for traces dropped too early, sampling decisions, policy evaluation errors, decision latency, and late-span age in current versions. Alert on these alongside Collector refusal, send-failure, and queue metrics.

## Check Transport and Backend Responses

OTLP can return partial success with a count of rejected spans and a human-readable message while still using HTTP 200. The specification says clients must not retry a populated partial-success response. Monitor and surface these responses; an HTTP success counter alone can conceal rejected spans.

Also check batch processor queues, exporter retries, Collector restarts, memory limiting, backend ingestion limits, and trace retention. Compare a canary span at each hop. If the tail sampler exported a span count but the backend stores fewer, sampling is no longer the leading cause.

## Correlate Around the Missing Span

Partial traces can still anchor an investigation:

- use the common trace ID to find logs whose active context survived;
- filter logs by service, environment, cluster, and the missing time interval;
- inspect the known child's `parent_span_id` to identify the absent operation;
- use message ID, workflow ID, or broker coordinates at async boundaries;
- use deployment/version resource attributes to compare affected instances;
- follow span links, which may connect work in another trace.

Logs can carry a trace ID even when a span is non-recording and never exported. Label such results clearly: matching IDs establish execution context, but an absent span means duration, status, and attributes cannot be reconstructed reliably from the log alone.

Metrics remain population evidence. Exemplars can point to retained traces, but they are selected measurements and can also lead to an unavailable trace if retention policies are misaligned. Keep a fallback service/time search.

## Quantify Completeness

Instrument controlled canary traces with an expected topology, for example gateway → checkout → queue → worker → database. Record expected span roles and verify them after ingestion. Useful measures include:

~~~text
complete canary traces / sampled canary traces
late spans / spans entering tail sampler
early-evicted traces / traces considered
OTLP rejected spans / spans sent
unresolved parent IDs / stored spans
log links resolving to stored traces / attempted links
~~~

Do not infer global completeness only from production traces because their expected span count varies. Canaries provide a stable denominator, while production monitors catch traffic-specific boundaries.

During changes, compare head sampler configuration across every service and rollout cohort. Route sampling infrastructure changes gradually, and preserve a small always-sampled canary class to distinguish policy from pipeline loss.

## Conclusion

Sampling should make deliberate trace-level choices; unexplained missing spans demand a pipeline investigation. Keep head decisions parent-consistent, route every trace to one stateful tail sampler, size its wait and capacity from observed arrivals, and monitor OTLP partial rejection and backend loss. When gaps remain, use trace-aware logs, stable resource identity, message/workflow IDs, and links to reconstruct a bounded evidence trail without claiming the missing span's details.

## Official References

- [OpenTelemetry Sampling Concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry Tracing SDK: Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [OpenTelemetry Collector Contrib Tail Sampling Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [OpenTelemetry Collector Contrib Load-Balancing Exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/loadbalancingexporter)
- [OpenTelemetry Protocol: Partial Success](https://opentelemetry.io/docs/specs/otlp/#partial-success)
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
