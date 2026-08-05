# Event-Driven or Scheduled Infrastructure Remediation?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Automation, Event Driven, Reconciliation, Scheduling, Reliability, Remediation

Description: Choose event-driven, scheduled, or hybrid remediation from latency and delivery requirements, then make every trigger converge idempotently from current state.

---

An event can start remediation seconds after a change. A schedule can find drift even when no useful event arrived. Neither trigger model guarantees correctness by itself.

The safest design separates triggering from reconciliation:

```text
event or schedule -> enqueue resource key -> read current state
                  -> compare with desired state -> perform bounded action
                  -> verify convergence
```

The trigger says "this resource may need attention." It should not be treated as a complete, durable instruction to replay an old mutation.

## Compare the Models by Failure Mode

| Property | Event-driven | Scheduled reconciliation |
|---|---|---|
| Detection latency | Usually seconds | Up to the scan interval plus queue delay |
| Coverage | Only changes that emit and deliver usable events | Everything the scan can enumerate and read |
| Duplicate input | Common with at-least-once delivery | Common after retries, controller restarts, or overlapping schedules |
| Missed input | Possible with best-effort sources, routing errors, or retention expiry | Possible during scheduler outages, missed windows, or incomplete inventory |
| Ordering | Often not guaranteed across partitions or sources | Scanner controls enumeration, but resources can change during the scan |
| Cost pattern | Scales with event volume | Pays recurring scan cost even when nothing changes |
| Burst behavior | Event storms can overwhelm remediators | Load can be shaped and spread across the scan window |
| Context | Event may contain changed fields and actor | Scanner sees current state, usually not the cause |

Choose based on the consequence of delayed or missed detection, not because one architecture is considered more modern.

## When Event-Driven Remediation Fits

Use events when:

- response time materially changes impact, such as revoking a newly public rule;
- the source publishes the required change reliably enough for the risk;
- resource identity is stable and can be re-read;
- event volume and burst size are bounded or absorbable through a queue;
- remediation is idempotent and safe under duplicate or out-of-order delivery;
- a dead-letter and replay process exists.

Examples include opening an incident on a critical IAM policy change, quarantining a newly non-compliant workload, or enqueueing a targeted drift check after a control-plane audit event.

Do not let the event handler execute a destructive API call inline. A queue provides backpressure, retry visibility, and per-resource serialization. The consumer should collapse repeated hints for the same key.

```json
{
  "event_id": "7c1d...",
  "resource_key": "aws:123456789012:eu-west-1:security-group:sg-0123",
  "observed_event_time": "2026-08-05T10:04:11Z",
  "event_type": "configuration-change",
  "source_revision": "audit-log:991827"
}
```

Use the event ID for delivery deduplication, but use the resource key for reconciliation coalescing. Two different events for one resource may both be valid hints that need only one current-state read.

## Understand Event Delivery, Not Just Routing

Amazon EventBridge documents that AWS service event sources use either best-effort or durable delivery attempts. Durable means the service successfully attempts delivery to EventBridge at least once; best effort means rare loss is possible. After EventBridge accepts a valid event, target delivery follows the configured retry policy and dead-letter behavior.

Those statements have distinct boundaries. Source-to-bus delivery and bus-to-target delivery are not one guarantee. Consult the exact event reference for each source.

EventBridge also documents that a rule or scheduled time can rarely invoke a target more than once. Consumers must therefore be idempotent even when the publisher usually emits one event.

For any event platform, record:

- source delivery guarantee;
- bus retention and replay capabilities;
- target retry duration and count;
- dead-letter behavior;
- ordering scope;
- event schema compatibility policy;
- maximum expected burst and quota;
- how to detect source silence.

Do not equate an empty dead-letter queue with complete delivery. Events lost before the bus or excluded by a bad rule never reach that queue.

## When Scheduled Reconciliation Fits

Use scheduled scans when:

- the source has no reliable event for the condition;
- eventual convergence within minutes or hours is acceptable;
- a complete resource inventory can be enumerated;
- changes from consoles, imports, old systems, and missed events all matter;
- scan load can be spread within API quotas;
- the desired state itself changes independently of resources.

Examples include nightly Terraform drift detection, periodic validation of backup retention, finding expired preview environments, and confirming that emergency exceptions were removed.

A scheduler does not provide exactly-once execution. Kubernetes documents that a CronJob creates a Job approximately once per scheduled time and that in some circumstances two Jobs or no Job may be created. Jobs should be idempotent.

A guarded Kubernetes sweep can use:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: infrastructure-reconcile-sweep
spec:
  schedule: "*/30 * * * *"
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 900
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: sweep
              image: registry.example.com/reconciler:1.4.2
              args: ["sweep", "--shard=$(SHARD)"]
              env:
                - name: SHARD
                  value: "global"
```

`Forbid` prevents overlapping Jobs created by that one CronJob. Kubernetes notes that concurrency policy does not coordinate separate CronJobs. Use a shared lock or deterministic sharding if multiple schedulers can scan the same boundary.

`startingDeadlineSeconds` limits how late a missed execution may start. Decide whether an old scan is still useful instead of letting a large backlog run simultaneously after recovery.

## Prefer a Hybrid for Important Controls

For many infrastructure controls, events provide fast detection and a scheduled sweep provides completeness:

```text
control-plane events ----+
                         +-> keyed work queue -> reconciler
scheduled inventory -----+
manual replay -----------+
```

Both paths enqueue the same canonical resource key and invoke the same reconciler. They do not implement separate repair logic.

The schedule acts as anti-entropy. It detects:

- events lost before the bus;
- routing filters that excluded a new schema;
- a disabled event rule;
- resources created before event integration existed;
- desired-state changes that produced no resource event;
- failed messages whose retention expired.

The event path reduces exposure between sweeps. This hybrid generally fits security and production reliability controls where low latency and eventual completeness both matter.

## Make Reconciliation Level-Based

A brittle event handler says: "the old value was public, so set private." A level-based reconciler says: "read the resource now; if current state violates current policy, move it toward current desired state."

This matters when events arrive out of order:

```text
E1 at 10:00: resource becomes public
E2 at 10:01: authorized deployment makes it private
delivery order: E2, then E1
```

Replaying E1 as a command could undo the newer valid state. Treating both as hints results in a read that sees the current private state and does nothing.

Kubernetes controllers illustrate the control-loop model: watch current state and make changes that move it toward desired state. The client-go workqueue is designed for multiple producers and consumers, avoids processing the same key concurrently within one queue, and supports rate-limited requeueing.

The desired-state source must be authoritative and versioned. An event payload can help choose what to inspect, but should not silently become desired state unless that is the explicit event contract.

## Control Bursts and Backpressure

An organization policy update can make thousands of resources non-compliant at once. Sending thousands of direct fixes may exhaust provider APIs and make the incident worse.

Use:

- a durable queue between triggers and workers;
- one in-flight reconcile per resource key;
- deduplication and coalescing of pending keys;
- global and provider-specific concurrency limits;
- exponential backoff with jitter for transient failures;
- a retry budget to prevent storms;
- priority classes for active exposure versus routine drift;
- dead-letter records that preserve resource key and desired revision;
- sharded scheduled scans with stable ownership.

Backpressure should delay work visibly, not drop it silently. Alert on oldest queue age relative to the remediation objective.

## Avoid Remediation Loops

Automation often emits the same event that triggers it. An EventBridge rule that notices an ACL change and performs another matching ACL change can create an infinite loop. AWS explicitly warns about this pattern.

Prevent loops by:

- reconciling only when live state differs from desired state;
- making the desired state distinguishable from the violating state;
- narrowing event filters to relevant transitions;
- tagging or annotating automation changes for observability, without relying on tags as the sole safety control;
- limiting attempts per resource and desired revision;
- alerting on repeated successful writes without convergence;
- routing persistent conflicts to a human rather than oscillating.

Do not ignore every event from the automation principal. That can hide a failed remediation that produced a new violation. Re-read and evaluate current state.

## Choose with Explicit Objectives

Define:

```yaml
control: public-storage-remediation
maximum_detection_latency: 60s
maximum_convergence_latency: 5m
event_source_delivery: best-effort
scheduled_anti_entropy_interval: 30m
maximum_event_burst: 10000
provider_concurrency: 20
manual_decision_after_attempts: 5
```

If the maximum tolerated exposure is shorter than the scan interval, scheduled-only cannot meet the objective. If the event source is best effort and missing one event is unacceptable, event-only cannot meet completeness. A hybrid makes the assumptions explicit.

## Test Both Trigger Paths

Exercise:

- duplicate, delayed, and out-of-order events;
- event loss before the bus;
- a disabled or misconfigured routing rule;
- a scheduler outage and missed runs;
- two schedulers starting together;
- an event storm above provider quota;
- a poison resource that always fails;
- desired state changing while work is queued;
- remediation producing another matching event;
- queue and dead-letter replay after a new reconciler version.

Measure event ingestion latency, queue age, deduplication rate, scheduled scan coverage, missed schedules, resources evaluated, actual corrections, retries, dead letters, persistent non-convergence, and API throttling.

The success metric is time to verified desired state. Trigger invocation count is only an intermediate signal.

## Official Documentation

- [Kubernetes controller pattern](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubernetes CronJob limitations and concurrency](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes client-go workqueue](https://pkg.go.dev/k8s.io/client-go/util/workqueue)
- [Amazon EventBridge source delivery levels](https://docs.aws.amazon.com/eventbridge/latest/ref/event-delivery-level.html)
- [Amazon EventBridge event and scheduled rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html)
- [Amazon EventBridge delivery monitoring](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring-events-best-practices.html)
- [Amazon EventBridge troubleshooting, duplicates, and loops](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-troubleshooting.html)

## Conclusion

Choose events for latency, schedules for anti-entropy, and a hybrid when both exposure time and completeness matter. In every model, triggers should enqueue stable keys into one level-based, idempotent reconciler. That design survives duplicate events, missed schedules, changing desired state, and provider throttling while keeping the real objective clear: verified convergence, not merely a workflow run.
