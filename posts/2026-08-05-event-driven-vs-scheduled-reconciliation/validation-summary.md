# Validation Summary: Event-Driven or Scheduled Infrastructure Remediation?

## Status

validated

## Post Type

Architecture guide

## Technologies Covered

- Event-driven infrastructure remediation and level-based reconciliation
- Scheduled reconciliation and anti-entropy scans
- Kubernetes controllers and `batch/v1` CronJobs
- Kubernetes `client-go` workqueues
- Amazon EventBridge event delivery, retries, dead-letter queues, duplicates, and loop prevention
- Durable queues, deduplication, coalescing, backpressure, and retry control
- Terraform drift detection as a scheduled-reconciliation example

## Sources Consulted

- [Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubernetes CronJob concepts, limitations, deadlines, concurrency, and time zones](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes CronJob API reference](https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/)
- [Kubernetes command and argument environment-variable expansion](https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/)
- [Kubernetes `client-go` workqueue package](https://pkg.go.dev/k8s.io/client-go/util/workqueue)
- [RFC 2606 reserved example domain names](https://www.rfc-editor.org/rfc/rfc2606.html)
- [Amazon EventBridge delivery levels for AWS service events](https://docs.aws.amazon.com/eventbridge/latest/ref/event-delivery-level.html)
- [Amazon EventBridge rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html)
- [Amazon EventBridge retry policy](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html)
- [Amazon EventBridge event metadata](https://docs.aws.amazon.com/eventbridge/latest/ref/events-structure.html)
- [Amazon EventBridge archives and replay](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html)
- [Amazon EventBridge delivery monitoring best practices](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring-events-best-practices.html)
- [Amazon EventBridge troubleshooting, duplicate invocation, and infinite-loop guidance](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-troubleshooting.html)
- [Amazon EventBridge global-endpoint guidance on stable event identifiers](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-ge-best-practices.html)

## Issues Found

- The post stated that a queue provides per-resource serialization. Generic queues do not guarantee keyed serialization automatically. The text now says to configure the queue and consumer to serialize work per resource key while using a durable queue for backpressure and retry visibility.
- The post recommended using the event ID for delivery deduplication without stating its stability requirement. EventBridge documents that event IDs can change across API calls in some flows. The text now requires an event ID that remains stable across redelivery.
- The out-of-order example said the newer state was private and the stale handler would also set it to private, so it did not demonstrate the claimed rollback. The newer event now represents an authorized desired-state exception permitting public access; a stale command would incorrectly make the resource private, while a level-based reconcile observes the current exception and performs no write.
- The CronJob used an image under the reserved `example.com` domain without explicitly marking the manifest as a template. The introduction now states that readers must replace the illustrative image and arguments with those of their reconciler.
- The comparison omitted the time required for a scheduled scan to reach a resource, so its latency bound was understated. The scheduled latency now includes scan position as well as interval and queue delay.
- The objective example labeled 60 seconds as a maximum detection latency despite using a best-effort event source and a 30-minute scheduled backstop. Those settings cannot guarantee 60-second detection for a lost event. The fields and explanation now distinguish the event-path latency objective from the slower completeness backstop and explicitly state that a hybrid does not convert best-effort delivery into a hard guarantee.

## Review Notes

- The Kubernetes CronJob manifest is valid YAML and uses the current `batch/v1` API. Its `schedule`, `timeZone`, `concurrencyPolicy`, `startingDeadlineSeconds`, `restartPolicy`, and `$(SHARD)` argument expansion agree with current Kubernetes documentation. `timeZone` is stable starting with Kubernetes v1.27, so clusters older than v1.27 require a compatibility adjustment.
- Kubernetes confirms that CronJob scheduling is approximate, can create two Jobs or no Job for a scheduled time, and therefore requires idempotent Jobs. `Forbid` only coordinates Jobs belonging to the same CronJob.
- Current `client-go` documentation confirms the workqueue's multiple-producer/multiple-consumer and per-key non-concurrent processing properties. New code should prefer the typed workqueue APIs because several untyped interfaces and constructors are deprecated.
- The EventBridge source-to-bus and bus-to-target guarantee boundaries, best-effort versus durable delivery language, target retry/DLQ behavior, rare duplicate invocation, and infinite-loop warning all match AWS documentation.
- EventBridge scheduled rules are now a legacy feature, and AWS recommends EventBridge Scheduler for new AWS-native scheduled invocations. The post does not recommend scheduled rules as its scheduling implementation; its concrete scheduled example uses a Kubernetes CronJob.
