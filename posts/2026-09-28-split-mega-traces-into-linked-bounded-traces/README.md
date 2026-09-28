# How to Break a 30,000-Span “Mega Trace” into Linked Traces Your Backend Can Render

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, Span Links, Observability

Description: Replace oversized workflow traces with bounded stage traces, durable correlation records, and explicit span links while preserving useful diagnostic detail.

A workflow creates 30,000 spans and the trace page becomes unusable. Raising a backend limit may postpone the failure, but it does not explain which unit of work an engineer should investigate. Start by choosing smaller operational boundaries and preserving the relationships between them.

Thirty thousand is an example, not a universal OpenTelemetry limit. Backends can enforce limits on bytes, ingestion, queries, or rendering. Tempo, for example, documents trace-size enforcement through `max_bytes_per_trace`. Inspect your deployed configuration and rejection metrics before attributing a missing trace to the UI. [Tempo ingestion limits](https://grafana.com/docs/tempo/latest/operations/manage-trace-ingestion/)

## Find why the trace grew

Measure spans per trace, serialized size, longest operation, and repeated span names. Look for a workflow parent kept open across thousands of messages, a loop instrumented per record, or a session-wide context inherited by every request.

Preserve detailed spans for operations with useful latency or failure semantics. Use metrics for counts and distributions, and structured events or logs for selected state transitions. Replacing every removed span with a large event array merely moves the volume problem.

Choose boundaries that an operator can name: importing one partition, executing one scheduled job, or processing a bounded chunk. Bound both count and duration where possible. A chunk of 100 records is still too large if each record generates hundreds of child operations.

## Establish a workflow index

Keep a durable workflow record containing the business workflow ID, stage or chunk ID, attempt number, status, and relevant trace IDs. The record is application state; it must not depend on trace retention. Every stage trace includes a stable custom `app.workflow.id` attribute for search.

Use span links for known causal predecessors. Do not create one summary span with 30,000 links. Link limits and attribute limits apply independently, and a huge list is difficult to navigate. SDK limits can drop excess data, so verify the configured limits and exported dropped counts. [OpenTelemetry SDK span limits](https://opentelemetry.io/docs/specs/otel/trace/sdk/#span-limits)

## Create a fresh trace at each stage boundary

The following Python integration helper assumes an initialized SDK. `run` performs one bounded stage; `previous` is an optional valid predecessor `SpanContext` restored by your workflow system. The returned context can be serialized using a propagator for the next stage:

```python
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.trace import Link

tracer = trace.get_tracer("example.workflow-stages")

def run_stage(workflow_id, stage_name, attempt, run, previous=None):
    links = [Link(previous)] if previous is not None and previous.is_valid else []
    with tracer.start_as_current_span(
        "workflow.stage", context=Context(), links=links,
        attributes={
            "app.workflow.id": workflow_id,
            "app.stage.name": stage_name,
            "app.stage.attempt": attempt,
        },
    ) as span:
        run()
        return span.get_span_context()
```

The empty parent context is deliberate. A link alone does not prevent inheritance from an active scheduler span. Keep `stage_name` from a bounded vocabulary and put identifiers in attributes, not dynamic span names. [Python trace API](https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html)

The helper returns a context on success. A production workflow runner must also persist the attempt's context and failure status when `run` raises; use a `try`/`except`/`finally` around the durable state update appropriate to your storage transaction. Do not let a telemetry failure determine whether business work is retried.

For fan-out, each child stage can link to the dispatch span. For fan-in, link to the relevant bounded inputs or an aggregation stage. Record omitted relationships in the workflow index when complete linkage would exceed the chosen budget.

## Update sampling and investigation together

A new root creates a new sampling boundary. Ordinary parent-based sampling does not automatically preserve every trace linked to a sampled trace. Decide which stage types and failures need higher retention, and make the important decision attributes available at span creation where feasible. [OpenTelemetry sampling concepts](https://opentelemetry.io/docs/concepts/sampling/)

Tail sampling sees the stages as separate trace IDs. Keep each stage's expected arrival interval compatible with the processor's decision behavior, and route all spans of one trace consistently when that processor requires it. The workflow ID does not merge separate sampling buffers. [Collector tail sampling](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/tailsamplingprocessor/README.md)

## Prove the result with a representative workflow

Run the same workload before and after the change. Compare maximum trace bytes, span counts, rejection counters, query duration, and the time required to find one failed record. Confirm that a stage failure can be reached from the workflow record even if its predecessor's trace is unavailable.

Splitting one trace into many does not inherently reduce total exported spans or cost. Measure total volume separately. The change succeeds when each trace is usable, cross-stage causes remain discoverable, and any removed detail has a deliberate replacement.

## Conclusion

Give each trace a bounded operational unit, use links for causality, and keep the complete workflow inventory in durable application state. This makes large workflows navigable without depending on one enormous waterfall.
