# Validation Summary: How to Alert on Queue Backlog Without Paging on Batch Spikes or Idle Consumers

## Status
validated

## Post Type
Technical monitoring guide with PromQL examples and a custom exporter metric contract.

## Technologies Covered
- Prometheus metrics, PromQL, and alerting rules
- Amazon SQS and Amazon CloudWatch
- Queue consumers, scheduled batches, and dead-letter queues
- RabbitMQ (mentioned only to distinguish custom metric names)

## Sources Consulted
- Prometheus operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus instrumentation guidance: https://prometheus.io/docs/practices/instrumentation/
- Prometheus text exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus rate implementation and sample requirements: https://github.com/prometheus/prometheus/blob/main/promql/functions.go
- Amazon SQS CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Amazon SQS dead-letter queues and retention: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Author link checked: https://www.github.com/nawazdhandala (redirects to the matching GitHub profile).

## Issues Found
1. Completion timestamps were presented as a remedy for broker metrics that omit repeatedly failing messages. Completed-item latency cannot expose work that never finishes. Clarified the need to pair enqueue and completion timestamps and independently track outstanding work and age.
2. The examples did not explicitly state their series cardinality requirement. Added the one-series-per-metric-per-queue assumption, queue-wide completion counter, per-worker rate aggregation, and gauge deduplication guidance. Without this, an idle worker can satisfy the stall condition despite other workers progressing, and the division can encounter non-unique matches.
3. Increasing the rate window alone does not provide a startup grace period after an idle queue receives work. Clarified that the window should cover normal completion spacing and that an alert hold duration must allow startup and first-completion latency while respecting the deadline.
4. The long-task checkpoint guidance could be read as retaining a ready-only backlog gate. Clarified that checkpoint alerts also need to consider in-flight work, which can remain stuck with no ready messages.

## Review Notes
- Reviewed all three PromQL expressions against official syntax and semantics. Comparisons filter vectors, `and on (queue)` gates on matching series, and the division uses queue matching. No deprecated functions or version-specific APIs are used.
- The four sample metric lines follow the Prometheus text sample format. These are illustrative custom metrics, not directly available SQS metrics. The completion metric must be a counter.
- Confirmed the seven-minute threshold is 420 seconds. Alert hold time, collection delay, evaluation cadence, and notification delivery must fit the actual deadline.
- Confirmed approximate SQS counts and the distinction between visible, in-flight, and delayed work. Oldest-message behavior and DLQ age semantics justify preserving original enqueue metadata.
- The drain calculation is a diagnostic approximation with seconds as its units. It excludes new arrivals and does not include in-flight inventory in its numerator, so it is not a guarantee of total batch completion time. Division by zero can yield infinity or NaN; missing series produce no matched result.
- Missing telemetry is correctly distinguished from a zero rate. The warning that a newly started counter may lack sufficient samples remains valid.
- Scheduled completion curves, meaningful checkpoints, retention monitoring, and the proposed empty/busy/failure scenarios are sound operational guidance; their thresholds depend on the workload contract.
- No terminal commands or complete configuration files occur in the post. Validation was documentation-based; no live SQS environment or Prometheus query execution was used, and promtool was not installed.
- Both external links in the original post resolve to the intended resources. Changes preserve the existing section structure and code examples.
