# How to Write Outcome-Based SLOs for Batch Jobs, Queues, and Async Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Batch Processing, Queue, Async Processing, Data Pipeline, SLI

Description: Measure whether promised async outcomes are correct, complete, and on time rather than whether workers stayed busy.

---

CPU, queue depth, worker uptime, and job duration help diagnose an asynchronous system. They are usually poor SLOs because users do not consume worker health; they consume a report, delivered message, transformed record, or fresh dataset.

An outcome-based SLO counts promises made and promises fulfilled by a deadline-even when a job never starts and therefore emits no worker metric.

## Choose the Promise Unit

Use one stable logical unit:

- a scheduled batch occurrence;
- an accepted message or business command;
- an input record that should produce output;
- a dataset or partition due at a checkpoint;
- a user read that expects fresh data.

Do not use retry attempts, worker executions, or pipeline stages as the denominator. One logical message processed three times is still one user promise.

## Cover Four Outcome Dimensions

### Timeliness or Freshness

Did the outcome arrive before it lost value?

> 99% of eligible daily settlement runs publish by 06:00 UTC over a rolling 28 days.

> 99.9% of accepted notification commands reach a successful terminal state within 10 minutes.

### Completeness or Coverage

Did all expected work appear?

> At least 99.95% of accepted records appear exactly once in the destination within 30 minutes.

For aggregate datasets, define expected partitions or records outside the pipeline so a configuration error cannot reduce both numerator and denominator.

### Correctness

Was the result usable and semantically right? Validate schemas, invariants, checksums, reconciled totals, or a representative sample against an independent computation. “Job exited zero” does not prove correct output.

### Durability

If the product promises retained results, measure successful later retrieval or verified retention. A successful enqueue is not durable completion unless enqueueing is the entire promise.

## Build an Independent Promise Ledger

A worker-only metric has survivor bias: a run that never starts emits neither success nor failure. Maintain expected work in a scheduler, acceptance log, or reconciler:

```text
promise_id
accepted_or_due_at
deadline
eligibility_class
terminal_outcome
completed_at
verification_result
```

At each deadline, an independent evaluator first marks promises matching a predeclared eligibility rule as `excluded`. It assigns each remaining promise exactly one immutable SLO result: `good` if the applicable promised outcome is correct, complete, on time, and durable where promised; otherwise `bad`.

Keep `late`, `failed`, and `missing` as diagnostic reasons. A promise that is `missing` at its deadline may later become `late`, but its SLO result remains `bad`.

Export monotonic counters with a bounded set of label values, for example `async_promises_total{journey="settlement",sli_result="good"}` and `async_promises_total{journey="settlement",sli_result="bad"}`. Increment exactly one result series per eligible promise. Keep detailed IDs in logs or a database, not metric labels.

## Handle Retries and Queues Correctly

A transient attempt failure followed by correct completion before the logical deadline is good. A dead-lettered, expired, or permanently missing message is bad. A late success remains bad for the timeliness SLO, though it may be good for an eventual-completion SLO.

Reject malformed input before accepting the promise. If the system acknowledges acceptance and later discovers that it cannot process the payload, count it as bad unless the contract explicitly made validation asynchronous.

Track these diagnostic signals separately:

- age of oldest eligible message;
- enqueue-to-start and start-to-finish histograms;
- retries and redeliveries;
- dead-letter count and age;
- expected versus observed scheduler runs;
- watermark age by partition;
- reconciliation mismatches.

They predict and explain SLO loss without replacing the outcome ratio.

## Measure Freshness from the Consumer Side

Pipeline-local “last processed timestamp” may advance while users receive stale cached data. Prefer consumer-observed freshness:

```text
reads served with data age <= 15 minutes / eligible reads
```

If there are no reads but freshness must be continuous, evaluate scheduled checkpoints against the published watermark. Keep record-weighted, partition-weighted, and read-weighted objectives distinct: each gives a different meaning to large and small partitions.

## Avoid Common Failure Modes

- A successful `202 Accepted` is not end-to-end success if completion is promised.
- Average job duration hides missed schedules and long-tail deadlines.
- Queue depth can be zero because ingestion is broken.
- A freshness gauge alone does not provide an error-budget denominator.
- Counting every stage multiplies one failed promise into several bad events.
- Retrying poison messages forever postpones the moment a failure is counted.
- Dropping old backlog from the queue does not make its promises disappear.

Define the deadline clock precisely: event time, acceptance time, scheduled time, or ingestion time. Specify pause behavior for customer-requested holds and backfills before they occur.

## References

- [Google SRE Workbook: Pipeline freshness, coverage, and correctness](https://sre.google/workbook/implementing-slos/)
- [Google Cloud Observability: Promises and good SLIs](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Prometheus instrumentation guidance for offline processing and batch jobs](https://prometheus.io/docs/practices/instrumentation/)
- [RFC 9110: 202 Accepted](https://www.rfc-editor.org/rfc/rfc9110.html#status.202)

## Conclusion

Count logical promises and evaluate whether each became correct, complete, timely, and durable where promised. Use worker and queue metrics to explain risk, but use an independent ledger so never-started and silently missing work still consumes the budget it owes users.
