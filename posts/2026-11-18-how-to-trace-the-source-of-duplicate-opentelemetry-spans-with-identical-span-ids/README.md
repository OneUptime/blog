# How to Trace the Source of Duplicate OpenTelemetry Spans with Identical Span IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, Tracing, Debugging

Description: Locate repeated exports of the same span by comparing identifiers at SDK, Collector, transport, and backend boundaries without discarding legitimate operations.

Two rows in a trace waterfall do not prove that an application executed twice. When both rows have the same trace ID and span ID, investigate how one span reached the destination more than once. Possible sources include duplicate exporter registrations, converging Collector pipelines, retries after an uncertain acknowledgement, and the backend query itself.

The useful result is a specific boundary: one observed copy entered, two copies left. Start with one controlled trace and work outward until you can identify that boundary.

## Establish which identifiers are actually duplicated

Compare the complete `(trace_id, span_id)` pair. A span ID alone is insufficient, and grouping by span name counts legitimate repeated operations. The [OpenTelemetry trace API](https://opentelemetry.io/docs/specs/otel/trace/api/#spancontext) defines hexadecimal trace IDs as 32 characters and span IDs as 16 characters.

| Observation | Investigation to start |
| --- | --- |
| Same name, different span IDs | Repeated work, retries of the application operation, or overlapping instrumentation |
| Same span ID, different trace IDs | Separate trace identities; inspect full context before calling them duplicates |
| Same trace ID and span ID, matching contents | Repeated delivery, repeated export, or repeated presentation |
| Same pair, different contents | Branch transformations, replay tools, custom ID generation, or conflicting stored representations |

Preserve start and end times, parent ID, resource attributes, instrumentation scope, and the collection time of each copy. Keep the backend tenant or project with the evidence. A matching identity is a strong lead, but a broken custom ID generator can also assign one identity to unrelated work.

## Reproduce one export with a local Collector

Use an isolated diagnostic Collector to establish how a single received span looks. This complete configuration exposes OTLP/HTTP only on loopback and writes spans locally:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:14318

exporters:
  debug:
    verbosity: detailed
    sampling_initial: 100
    sampling_thereafter: 1

service:
  pipelines:
    traces/probe:
      receivers: [otlp]
      exporters: [debug]
```

Save it as `probe.yaml` and run `otelcol --config=probe.yaml` with a Collector distribution containing the OTLP receiver and debug exporter. The configuration and the following fixture were exercised with Collector 0.143.0. Use your deployed release when reproducing a release-specific issue.

This Python script sends exactly one synthetic OTLP/HTTP JSON request. It creates fresh identifiers each time so separate test runs do not merge:

```python
import json
import secrets
import time
import urllib.request

trace_id = secrets.token_hex(16)
span_id = secrets.token_hex(8)
end = time.time_ns()
payload = {
    "resourceSpans": [{
        "resource": {"attributes": [{
            "key": "service.name",
            "value": {"stringValue": "duplicate-probe"},
        }]},
        "scopeSpans": [{
            "scope": {"name": "duplicate-probe.fixture"},
            "spans": [{
                "traceId": trace_id,
                "spanId": span_id,
                "name": "probe.single-export",
                "kind": 1,
                "startTimeUnixNano": str(end - 1_000_000),
                "endTimeUnixNano": str(end),
            }],
        }],
    }],
}
request = urllib.request.Request(
    "http://127.0.0.1:14318/v1/traces",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(request, timeout=5) as response:
    print("HTTP", response.status, response.read().decode())
print("trace_id", trace_id)
print("span_id", span_id)
```

Look for one detailed span record with that pair. Read the Collector's local output directly so a duplicated log-shipping path cannot masquerade as duplicated traces. The [debug exporter documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md) describes its verbosity and log sampling controls; its output format is not a stable parsing API. Detailed output also contains telemetry attributes, so keep this fixture small and synthetic.

## Find overlapping routes in the Collector

Now add this second pipeline alongside `traces/probe` in the local configuration:

```yaml
    traces/accidental-copy:
      receivers: [otlp]
      exporters: [debug]
```

Restart the local Collector and run the fixture again. One HTTP request now produces two detailed records with the same identifiers. Sharing the same exporter instance does not collapse the two deliveries.

This follows the [Collector pipeline architecture](https://opentelemetry.io/docs/collector/architecture/): a shared receiver fans data into every configured pipeline, and a pipeline sends its output to every listed exporter. Apply that model to the actual deployment and draw each route to the affected backend tenant. Check for an application exporting directly to the backend while also exporting through an agent, two gateways forwarding the same upstream copy, or differently named exporters that resolve to the same destination.

Compare the effective deployed configuration with the intended diagram. Include environment substitutions, Helm values, additional config files, and migration routes. Two exporter names do not necessarily mean two independent destinations.

Remove the redundant route only after identifying what each branch supplies. A branch may carry different signals or a necessary transformation. Retest the retained path before removing temporary diagnostics.

## Distinguish SDK span creation from SDK export

If duplicates already reach the first Collector, compare the application's span completion and exporter boundaries. One span ending once can feed multiple export paths: the [tracing SDK specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/#span-processor) allows multiple processors on a provider, each with its own exporter.

Inventory the processor registrations, destination endpoints, and framework or agent configuration. A single provider does not rule out duplicate exports. Conversely, different span IDs for similar operations require an instrumentation or application investigation rather than a transport fix.

For a staging reproduction, capture the identity at one span-completion hook and at each exporter invocation. Include process identity and exporter name. Count the same hook once; installing two diagnostic processors would itself produce two observations. Keep this instrumentation brief and avoid changing the real span's identity.

If one SDK export invocation corresponds to two requests at the receiver, continue into the transport. Exporter-level retries may occur inside that invocation, so invocation counts alone do not count network attempts.

## Account for uncertain acknowledgements and retries

An export request can reach its destination while the response never reaches the sender. The sender cannot reliably distinguish that from a request that was never accepted. The [OTLP specification's duplicate-data section](https://opentelemetry.io/docs/specs/otlp/#duplicate-data) explicitly describes retransmission in this situation. OTLP does not provide an end-to-end exactly-once guarantee.

Correlate repeated identities with connection interruptions, exporter timeouts, receiver responses, and queue recovery. A burst after an outage suggests a replay or retry path; a consistent factor of two during healthy traffic suggests overlapping routes. These are hypotheses to test, not proof from timing alone.

Do not disable retries globally to make duplicates disappear. That can turn uncertain delivery into missing telemetry. Also inspect custom forwarding code: OTLP clients must not retry a request whose response has a populated `partial_success` field. Blindly retrying a partially accepted batch repeats the accepted portion.

Use [Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/) as supporting evidence: compare receiver accepted spans, exporter sent spans, exporter failures, and queue behavior by component and instance. Counters measure activity, not unique span identities. Summing two intended exporters naturally counts two deliveries, and export failure counts alone do not establish data loss.

## Verify ingestion separately from the UI

If each observed delivery boundary contains one copy, inspect the backend's raw trace response and storage behavior. Check whether the query unions overlapping stores, expands rows through a join, or returns multiple representations during ingestion or compaction. Consult that backend's duplicate-handling contract; OTLP does not prescribe one universal storage or display policy.

Do not deduplicate by operation name, timestamp, or span ID alone. Those shortcuts can remove real repeated calls. Even when deduplication uses the complete identity within the correct tenant, decide what happens when copies have different attributes or events before discarding anything. Diagnose the redundant route first; use backend-supported handling for unavoidable delivery retries.

Finish by sending several fresh fixture traces through the repaired path, checking all intended destinations, and comparing the same identities at the boundary that previously multiplied them. Preserve a small before-and-after example in the incident record. That demonstrates which duplication mechanism was corrected without claiming the entire telemetry system can never retransmit a span.
