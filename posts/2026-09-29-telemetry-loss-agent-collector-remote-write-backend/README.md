# How to Trace Telemetry Loss Across Agent, Collector, Remote Write, and Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, OpenTelemetry, Prometheus, Remote Write

Description: Locate telemetry loss with per-boundary flow evidence, queue age and a known canary while accounting for retries, filtering and temporality.

A missing chart can result from an SDK export failure, a full Collector queue, a remote-write outage, backend rejection or a query that no longer matches the stored labels. Debugging becomes faster when each boundary has a defined input, output and freshness contract.

Start with one signal and one affected service. Metrics, logs and traces have different units, sampling policies and retry behavior. A single ratio of “telemetry received” to “telemetry sent” across all signals is not a meaningful loss measurement.

## Build a boundary ledger

For the affected route, record:

| Boundary | Evidence to collect | What success does not establish |
| --- | --- | --- |
| Application to agent | SDK export errors, queue state, sequence or timestamp | Backend storage |
| Agent to Collector | Receiver accepted/refused counts, connection errors | Later processing success |
| Collector processing | Filter/sampling policy, process restarts, queue age | Export durability |
| Export to remote backend | Sent/failed observations, retry state, response details | Query visibility |
| Backend ingestion to query | Rejections, stored canary, raw selector | Correct dashboard aggregation |

Treat the ledger as an investigation plan. Populate it with measurements and configuration from the same time interval instead of assuming every successful HTTP response has identical meaning.

## Inspect Collector internal telemetry locally

The Collector's [internal telemetry documentation](https://opentelemetry.io/docs/collector/internal-telemetry/) describes receiver acceptance and refusal, exporter failures and queue indicators. Inspect the installed version's actual exposition first: metric suffixes and attributes can differ with translation settings and component releases.

For each affected receiver and exporter, compare accepted, refused, successfully sent and failed observations over a window spanning the gap. Preserve component identity and signal type. A queue rising while receiver acceptance continues points toward an export bottleneck; refusal at the receiver means data could not be pushed into the pipeline, which can also result from downstream backpressure or errors.

Collect this evidence through an independent scraper where possible. Exporting all Collector health through the same broken pipeline can erase the evidence needed to diagnose it.

## Do not mistake a queue count for a time budget

Queue size and capacity reveal pressure, but units may be requests, items or bytes depending on configuration and component. A thousand queued batches could represent a very different time interval after a batch-size change.

Measure the age of the oldest queued work when available, or compare generated and query-visible canary timestamps. Observe retry exhaustion, nonretryable errors and process restarts. Persistent queues reduce some restart losses but do not make every rejected or expired item recoverable. The [Collector resiliency guide](https://opentelemetry.io/docs/collector/resiliency/) describes queue and storage tradeoffs.

A restart that makes the queue empty is not proof that delivery recovered. Check whether the backend received the buffered interval or whether data was discarded.

## Follow Prometheus remote write separately

For Prometheus senders, inspect pending samples, failed/retried samples and the age of the highest successfully sent timestamp as exposed by the installed version. Preserve remote destination identity when several endpoints exist.

The [remote-write tuning guide](https://prometheus.io/docs/practices/remote_write/) explains how queues, shards and WAL buffering interact. Increasing shards can improve throughput when the receiver has spare capacity, but can worsen an overloaded backend. A larger in-memory queue can absorb short bursts, but outage tolerance also depends on WAL retention; increasing queue capacity does not extend WAL retention or repair authentication errors or an ingestion rejection.

Compare a raw metric on the local scraper and remote backend at the same timestamp. If it is present locally, inspect write relabeling and transport next. If it is present remotely under different labels, the problem may be query identity rather than loss.

## Inject a known, bounded canary

Send a custom timestamp through the exact production metrics route:

```text
telemetry_canary_generated_timestamp_seconds{pipeline="prod-eu"} 1790647200
```

Update it on a defined cadence. Query the stored value at the final backend and calculate its age using a trusted observer clock. Do not rely only on the stored sample timestamp: a component can repeatedly scrape and forward an old payload with fresh scrape times.

A canary proves its own route. If routing depends on tenant, signal type or destination, use a small bounded set of canaries that covers those branches. Do not assume a metric canary proves log or trace transport.

## Reconcile counts before claiming loss

Receivers and exporters may count different units. Sampling, aggregation, temporality conversion and fan-out can change item counts. Batching changes request counts without inherently changing the number of telemetry items. Retries can resend data, and backend deduplication can reduce visible records. Compare like units after accounting for these transformations.

For an exact test, send a finite set of uniquely identifiable synthetic log records or spans through an isolated test route and verify their IDs at the destination. Do not add an unbounded sequence label to ordinary metrics. For continuous production detection, freshness and bounded sequence evidence usually provide a cheaper signal.

## Conclusion

Locate telemetry loss by following one route through explicit checkpoints. Combine component counters with queue age, rejection evidence and a query-visible canary. Only call a discrepancy loss after accounting for intentional transformations and retries; that distinction prevents tuning the wrong component while data continues to disappear.
