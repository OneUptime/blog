# Control Argo Events Storms with Filters, Rate Limits, and Backpressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Event Storm, Backpressure, Sensor, Filter, Rate Limiting, Argo Workflows

Description: Contain Argo Events bursts with early filters, correctly scoped trigger limits, durable buffering, and downstream Workflow admission controls.

---

An event storm is not simply high traffic. It is traffic whose arrival rate, fan-out, payload cost, or retry behavior exceeds one of the pipeline's finite capacities. The bottleneck may be the EventSource, EventBus storage, Sensor CPU, trigger target, Kubernetes API, Workflow controller, or the systems each Workflow calls.

Argo Events gives you filters and trigger rate limits, but neither is a complete backpressure system. The safe design rejects irrelevant work early, buffers accepted work durably, meters side effects at the right scope, and exposes backlog age before retention turns overload into data loss.

## Define the Overload Contract First

For each event class, write down:

- maximum sustained and burst arrival rates;
- whether events may be dropped, sampled, coalesced, or delayed;
- maximum acceptable queue age;
- required ordering scope;
- maximum Workflow creation and execution rates;
- idempotency key and duplicate policy;
- retention and replay owner.

Without this contract, a rate limiter only changes where the incident appears. Ten actions per second against one thousand incoming events per second means a growing queue unless events expire, are rejected, or arrival rate falls.

## Filter at the Earliest Safe Point

Some EventSource schemas support source-side filtering. A Kafka EventSource, for example, can parse JSON and evaluate an expression before publishing to the EventBus:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: audit-kafka
  namespace: argo-events
spec:
  kafka:
    audit:
      url: kafka.kafka.svc:9092
      topic: audit-events
      jsonBody: true
      consumerGroup:
        groupName: argo-events-audit
        rebalanceStrategy: sticky
      filter:
        expression: body.severity == "critical" && body.environment == "production"
```

Source filtering avoids EventBus publication and downstream Sensor work. A skipped event is not queued for later reconsideration, so use it only for criteria that are stable and intentionally lossy from Argo's perspective. Preserve the original stream elsewhere when audit or replay requirements demand it.

Do not assume every EventSource type exposes the same filter grammar. Confirm the field in the installed CRD and that source's official API documentation.

## Use Sensor Filters for Routing Policy

Sensor dependency filters run before trigger conditions are satisfied. The current API supports expression, data, context, time, and script filters. Across filter categories, `filtersLogicalOperator` is lowercase `and` or `or`, with empty meaning `and`. A missing path or other filter error is treated as false under the documented behavior.

```yaml
spec:
  dependencies:
    - name: critical-production
      eventSourceName: audit-kafka
      eventName: audit
      filtersLogicalOperator: and
      filters:
        context:
          subject: audit
        data:
          - path: body.severity
            type: string
            value:
              - "^critical$"
          - path: body.environment
            type: string
            value:
              - "^production$"
```

String data-filter values are evaluated as regular expressions, so the anchors above make these exact matches. The current implementation evaluates filter categories in the order expression, data, context, time, then script. Avoid depending on short-circuit side effects; filters should be pure predicates. If transformation is configured, Argo transforms event data before applying Sensor filters. Expensive Lua or JQ transformations therefore run even for events the later filters reject. Put cheap, high-selectivity rules at the source or in simple Sensor filters whenever possible.

Measure each predicate against real payloads. A path typo does not merely reduce efficiency; because errors count as false, it can quietly suppress every action. During rollout, compare ingress counts, filter-pass counts inferred from controlled tests, and action counts.

## Do Not Use Trigger Conditions as a Queue

Conditions combine dependency state, not complete event streams. With `A && B`, if events `a1` through `a10` arrive before `b1`, official Argo Events documentation says the trigger uses `a10` and `b1`; `a1` through `a9` are dropped from that combination.

That latest-event behavior is useful for synchronization signals such as "new image and approval arrived." It is not a lossless join for order lines, payments, or alerts. Perform lossless correlation in a stream processor or durable application store, then emit one ready-to-process event to Argo.

Use `conditionsReset` when stale state must not combine across time windows. A reset clears pending dependency state; it does not replay discarded events.

## Scope Trigger Rate Limits Correctly

A trigger has no rate limit unless one is configured:

```yaml
spec:
  triggers:
    - template:
        name: create-critical-workflow
        conditions: critical-production
        # The complete Workflow trigger belongs here.
      rateLimit:
        unit: Second
        requestsPerUnit: 10
```

Valid documented units are `Second`, `Minute`, and `Hour`. The limiter delays execution; it does not reject the matching event or tell an upstream webhook to slow down.

The current Sensor implementation creates the limiter inside each Sensor process. Consequences include:

- an active-passive JetStream Sensor effectively has one active limiter;
- an active-active Kafka Sensor has one limiter per replica, so aggregate rate may approach the per-pod limit multiplied by active replicas;
- different triggers have independent limits;
- a restart recreates local limiter state.

Do not describe this field as a global quota. When a hard fleet-wide rate is required, enforce it at a shared admission service, durable worker queue, or downstream API.

## Choose Acknowledgment Behavior Deliberately

For JetStream and Kafka EventBus drivers, `atLeastOnce` changes whether the Sensor waits for the trigger action before acknowledging or committing the event path. With `atLeastOnce: true`, action execution is blocking, so `retryStrategy` can observe failures. If the Sensor exits before the action path and broker acknowledgment or transaction commit complete, the event can be redelivered. This creates useful pressure toward the durable EventBus but requires an idempotent target because an ambiguous action may repeat.

After bounded retries are exhausted, the Sensor records the failure, optionally invokes a configured dead-letter trigger, and then lets broker processing advance. A target error by itself does not leave the event indefinitely unacknowledged. With the default `atLeastOnce: false`, the current Sensor launches the action asynchronously, so the outer retry loop cannot observe an asynchronous failure. A trigger rate limiter can then make action goroutines wait locally while the EventBus path continues. During a large storm, that local waiting is not a durable queue and can consume pod memory.

Use the following decision rule:

- choose blocking, at-least-once behavior when you need observable retries or a dead-letter trigger, the EventBus retention can hold the backlog, and the target is idempotent; alert on exhausted retries because this mode does not guarantee eventual action success;
- choose fire-and-forget only when its failure and local buffering semantics match the business policy;
- put a durable admission queue between Sensor and target when neither mode gives the required global capacity control.

Retry is another traffic source. Exponential backoff with jitter reduces synchronized retries, but total attempted action rate still includes original and retry traffic. Bound `steps`, classify permanent errors early, and monitor retry exhaustion.

## Build a Backpressure Chain

A complete overload design has explicit behavior at every boundary:

```text
producer -> ingress -> EventSource -> EventBus -> Sensor -> admission -> Workflow
```

At ingress, authenticate before expensive parsing and enforce body-size and request-rate limits. If a webhook sender supports retry, return an intentional retryable status only when the event was not accepted. If the sender does not support reliable retry, acknowledge only after placing the event in a durable queue you operate.

At the EventBus, size retention for expected outage plus drain time. Alert well before JetStream `maxBytes`, `maxMsgs`, or `maxAge` applies its configured retention and discard behavior, or Kafka topic retention deletes data that consumers have not processed. With JetStream's default `DiscardOld` policy, limits evict old messages; `DiscardNew` instead rejects new publishes that would exceed a limit. Broker capacity is finite buffering, not infinite backpressure.

At the Sensor, use filters, bounded transformations, local rate limits, and idempotent at-least-once actions. Keep CPU and memory requests realistic so Kubernetes scheduling does not turn a traffic spike into eviction churn.

At Workflow admission, use Argo Workflows controller-level `parallelism` and `namespaceParallelism`, Workflow synchronization semaphores or mutexes for shared resources, and Kubernetes `ResourceQuota`. Workflow-level `spec.parallelism` limits pods inside one Workflow; it does not limit how many Workflow objects Argo Events can create.

At the business system, enforce a shared concurrency or rate limit close to the scarce resource. A database connection pool or vendor API quota should not depend on every upstream Sensor having an identical local setting.

## Prefer Coalescing When Only the Latest State Matters

Some storms are repeated notifications of the same desired state: ten pushes to one branch, fifty updates to one object, or repeated alerts for one incident. If business semantics permit it, publish a key and let a durable component coalesce to the latest state before triggering Argo.

Do not implement accidental coalescing through Sensor `A && B` cache behavior. Make the key, time window, retained state, and replay semantics explicit. Record how many events were coalesced so lower Workflow volume is not mistaken for source loss.

## Alert on Backlog Age, Not Only Error Counts

The official Argo Events metrics cover source traffic, source failures, action success, action failure, retry exhaustion, and processing durations. Use at least:

- `argo_events_events_sent_total`;
- `argo_events_events_sent_failed_total`;
- `argo_events_events_processing_failed_total`;
- `argo_events_action_triggered_total`;
- `argo_events_action_failed_total`;
- `argo_events_action_retries_failed_total`;
- event processing and action duration summaries.

These metrics do not by themselves express EventBus backlog age. Add JetStream consumer pending/redelivery metrics or Kafka consumer lag and oldest-record age. Add Workflow pending counts, Kubernetes API request latency, pod scheduling latency, and downstream saturation.

A useful storm dashboard presents rates at adjacent stages:

```text
accepted -> published -> dependency matched -> action succeeded -> Workflow running
```

After accounting for intentional filtering, sampling, and counter resets, a growing unexplained difference between two cumulative stages means that boundary is accumulating or losing work. Correlate with broker offsets or stream sequences before deciding to scale.

## Run Controlled Storm Tests

In a staging environment that matches production limits:

1. send a burst containing both relevant and irrelevant events;
2. verify source and Sensor filters discard exactly the intended set;
3. exceed the trigger rate and observe where waiting accumulates;
4. make the trigger target return `429` and `500` responses;
5. restart the active Sensor during backlog processing;
6. fill the EventBus toward its configured retention limit;
7. confirm idempotency after target acceptance followed by timeout;
8. measure drain time after the producer returns to normal.

Stop the test before shared infrastructure is harmed. Record the sustainable arrival rate, sustainable action rate, maximum safe burst, and time-to-data-loss at configured retention.

## Official Documentation

- [Argo Events EventSource filtering](https://argoproj.github.io/argo-events/eventsources/filtering/)
- [Argo Events Sensor filters](https://argoproj.github.io/argo-events/sensors/filters/intro/)
- [Argo Events transformations](https://argoproj.github.io/argo-events/sensors/transform/)
- [Argo Events trigger conditions](https://argoproj.github.io/argo-events/sensors/trigger-conditions/)
- [Argo Events rate limits and retries](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events Prometheus metrics](https://argoproj.github.io/argo-events/metrics/)
- [Argo Workflows controller parallelism](https://argo-workflows.readthedocs.io/en/latest/parallelism/)
- [Argo Workflows synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)

## Conclusion

Control an event storm by reducing work before publication, filtering precisely before conditions, and treating trigger rate limits as local pacing rather than global admission. Preserve accepted work in a capacity-planned EventBus, propagate pressure through idempotent blocking actions when appropriate, and enforce shared limits at Workflow and business-system boundaries. The decisive signal is backlog age: it reveals whether the system is absorbing a burst or merely postponing data loss.
