# How to Alert on Queue Backlog Without Paging on Batch Spikes or Idle Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Queue, Prometheus, SQS

Description: Alert on queue age, deadlines and stalled progress while distinguishing normal batch accumulation from idle or failed consumers.

A queue of 100,000 items can be healthy immediately after a scheduled import. A queue of 20 items can be an incident when each item has a two-minute delivery deadline. Queue depth is useful context, but the alert should explain whether waiting work can still complete on time.

Start by identifying the service promise: maximum waiting age, completion deadline, throughput target or retention limit. Then pair backlog with progress and consumer capacity. A depth threshold without that contract tends to page every batch and miss slow small queues.

## Observe four different states

Track ready backlog, in-flight work, oldest eligible waiting age and successful completions. Separate delayed messages that cannot yet be consumed from ready work. Add a worker heartbeat only if it represents meaningful processing ability rather than a process that is merely running.

For Amazon SQS, [CloudWatch metric documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html) distinguishes visible, not-visible and delayed messages. Many values are approximate. The oldest-message metric also has poison-message and dead-letter behavior, so it should not be treated as a perfect audit of every item's original age.

Application completion timestamps paired with original enqueue timestamps can measure end-to-end latency for completed items. They cannot reveal items that never complete; track outstanding work and its age separately when broker metrics exclude repeatedly failing items. Preserve the original enqueue time in durable message metadata if total end-to-end age matters.

## Page on deadline risk

Assume a custom exporter presents:

```text
queue_ready_messages{queue="invoices"} 20000
queue_oldest_ready_age_seconds{queue="invoices"} 180
queue_completed_total{queue="invoices"} 950000
queue_consumers_ready{queue="invoices"} 12
```

These names are an illustrative normalized contract, not native SQS or RabbitMQ names. The examples assume one series per metric per queue, with a queue-wide completion counter. If completions are exported per worker, sum their rates by queue before comparing or dividing; deduplicate replicated queue gauges rather than summing them. For a ten-minute waiting-age budget, a warning at seven minutes gives responders some room:

```promql
queue_oldest_ready_age_seconds{queue="invoices"} > 420
and on (queue)
queue_ready_messages{queue="invoices"} > 0
```

Add region or tenant class to matching labels if queues with the same name exist in multiple places. A short `for` can absorb collection jitter, but include its duration in the deadline budget.

## Detect a stalled consumer only when work exists

```promql
queue_ready_messages > 0
and on (queue)
rate(queue_completed_total[5m]) == 0
```

This describes backlog with no observed completions. A just-started counter with too few samples may return no rate; a missing counter also does not become zero automatically. Add telemetry-presence and worker-health alerts so those states remain covered.

Set the rate window longer than the normal interval between completions. A worker running ten-minute tasks serially cannot emit a completion every five minutes. A longer window alone does not prevent an immediate match when backlog appears after an idle period with zero completions; use a `for` duration that allows normal startup and first-completion latency, within the deadline budget. For long tasks, export last-progress time or a stage heartbeat tied to a committed checkpoint. Keep the ready-backlog condition for this alert so idle workers do not page simply because there is nothing to complete. For checkpoint alerts, also count in-flight work so a stuck task remains covered when ready backlog is zero.

Zero ready consumers while ready backlog exists is another direct condition. It can be expected briefly during scale-up, so give the scaler a measured startup budget and independently alert if demand never causes capacity to appear.

## Estimate drain time cautiously

A diagnostic estimate is backlog divided by recent successful completion rate:

```promql
queue_ready_messages
/
on (queue)
rate(queue_completed_total[5m])
```

The result is seconds only when numerator and denominator refer to the same item population. It assumes the recent completion rate continues and ignores new arrivals. With ongoing arrivals, net drain requires completion rate to exceed arrival rate; otherwise the queue is not draining.

Do not clamp a zero completion rate to an arbitrary positive number and present the result as a trustworthy ETA. Show “no observed progress” explicitly. Retries, duplicate deliveries and heterogeneous job sizes also make simple item counts misleading.

## Handle scheduled batches with explicit expectations

For a nightly batch, define expected release time and completion deadline in a scheduler-owned metric or configuration. A larger backlog during that interval can be normal, but deadline risk remains actionable. Avoid a broad silence covering the whole batch window: it hides the exact failure the monitoring exists to detect.

Compare current progress with a conservative planned completion curve, or alert when the oldest work approaches its SLA. Keep a separate dead-letter queue signal and retention-headroom alert; a batch can appear to drain because messages expired or were dead-lettered.

## Verify quiet and busy periods

Test an empty queue, normal burst, slow but progressing workers, no consumers, a poison message, missing exporter data and a job longer than the rate window. Compare the predicted detection time with the actual customer deadline.

## Conclusion

Use depth to understand load, age to understand waiting impact, and completion or checkpoint signals to understand progress. Gate stall alerts on eligible work and model scheduled deadlines explicitly. That keeps normal batch accumulation quiet while surfacing queues that cannot fulfill their promise.
