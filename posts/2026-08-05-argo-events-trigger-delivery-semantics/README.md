# Choose Argo Events Trigger Delivery Semantics by Failure Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Sensor, Delivery Semantics, At-Least-Once, At-Most-Once, Idempotency, EventBus

Description: Choose Argo Events Sensor at-most-once or at-least-once trigger execution by deciding whether loss or duplicate side effects are safer.

---

Argo Events exposes `atLeastOnce` on each Sensor trigger. The default is `false`, which gives trigger execution at-most-once behavior. Setting it to `true` makes the Sensor wait for trigger execution before its message handler acknowledges the consumed event. This preserves the broker's ability to redeliver if the Sensor dies or its acknowledgment is lost during that window; an exhausted trigger error by itself is logged and then acknowledged rather than deliberately redelivered. The deprecated NATS EventBus ignores `atLeastOnce`; use JetStream or Kafka when this setting matters.

This is trigger execution semantics, not a promise of exactly-once business processing. The EventSource, EventBus, Sensor, Kubernetes API, Workflow controller, and workload each have their own failure boundary.

## Start with the Two Failure Tradeoffs

At-most-once favors avoiding duplicate trigger attempts:

```yaml
spec:
  triggers:
    - template:
        name: best-effort-notification
        http:
          url: https://notifications.example.internal/events
          method: POST
      atLeastOnce: false
```

Current Sensor code launches this trigger asynchronously and lets event processing continue without waiting for the action result. A crash or action failure can therefore lose the effect. This mode also cannot transactionally guarantee that an external effect never repeats. It is appropriate only when loss is acceptable or another system repairs it.

At-least-once favors eventual attempt over avoiding duplicates:

```yaml
spec:
  triggers:
    - template:
        name: submit-workflow
        k8s:
          operation: create
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: process-event-
              spec:
                workflowTemplateRef:
                  name: process-event
      atLeastOnce: true
      retryStrategy:
        steps: 4
        duration: 2s
        factor: 2
        jitter: 0.5
```

With `atLeastOnce: true`, the Sensor keeps the broker message unacknowledged until the blocking trigger attempt, configured retries, and any DLQ processing finish. The message handler then acknowledges the event even if all trigger retries failed; a trigger error does not itself request broker redelivery. Duplicate attempts can still come from `retryStrategy`, or from broker redelivery if the Sensor dies or the acknowledgment is lost before completion. A retry may happen after the first call actually succeeded but its response was lost.

The rule is simple:

- choose at-most-once when a duplicate is worse than a missing effect and missed work is repaired elsewhere;
- choose at-least-once when missing work is worse and the target is idempotent.

Most production automation that creates durable work chooses at-least-once plus idempotency.

## Distinguish Event Delivery from Trigger Delivery

An EventSource publishes CloudEvents to the configured EventBus. Broker delivery controls whether a Sensor can receive an event again. The trigger setting controls when that Sensor path considers processing complete.

These are not equivalent statements:

- "JetStream stores the event" does not mean the HTTP or Kubernetes trigger ran once.
- "The Sensor triggered a Workflow" does not mean workflow pods completed.
- "The Kubernetes create call timed out" does not mean no Workflow was created.
- "The Workflow succeeded" does not mean an external API side effect was exactly once.

Document the acknowledgment point for every hop.

## Understand Why Exactly Once Is Not Available

Consider a Sensor creating a Workflow:

1. the Sensor sends a create request;
2. the Kubernetes API commits the Workflow;
3. the response is lost, so a configured trigger retry can issue another create request; or the Sensor pod dies before acknowledging the broker message;
4. in the crash case, the broker can redeliver the event;
5. either the trigger retry or the redelivery can run the create again.

With `generateName`, the second create can produce a second Workflow. The EventBus and Sensor cannot atomically commit a Kubernetes object and acknowledge a broker message in one transaction.

The same ambiguity exists for HTTP `POST`, cloud API calls, email, and messages sent to another broker. Exactly-once business behavior must come from an idempotency protocol at the target.

## Carry a Stable Idempotency Key

Use an identity chosen by the producer when it represents one logical operation. Provider delivery IDs identify a delivery; a business key may be better for repeated deliveries that request the same action.

Examples:

```text
github:{repository_id}:{after_sha}:build
deploy:{service}:{environment}:{revision}
invoice:{invoice_id}:issue
```

Pass the key into the generated Workflow:

```yaml
spec:
  arguments:
    parameters:
      - name: idempotency-key
        value: unset
```

At the first irreversible workflow step, atomically insert or claim that key in a database, durable key-value store, or target API supporting idempotency keys. A read-then-write check is racy; use a unique constraint or compare-and-set operation.

For Kubernetes resources, a deterministic valid name can turn duplicate create requests into `AlreadyExists`. The built-in `k8s` create trigger returns that response as an error; it does not inspect the existing object or convert the conflict to success. Any custom trigger or recovery logic that does treat the conflict as an idempotent success must distinguish "the same desired object already exists" from a conflicting unrelated object by inspecting labels, owner, parameters, and status.

## Place `atLeastOnce` Correctly

`atLeastOnce` is a field on the trigger, alongside `template`, `retryStrategy`, `rateLimit`, and `dlqTrigger`:

```yaml
triggers:
  - template:
      name: process
      # trigger implementation here
    atLeastOnce: true
    retryStrategy:
      steps: 3
```

Do not indent it into `template`. Validate manifests against the installed CRD because older examples may not reflect the schema you run.

## Treat Retry as Additional Duplicate Exposure

The default is no trigger retry. This is intentional: the Sensor does not know whether another attempt is safe. A `retryStrategy` reduces transient loss only when the operation is idempotent.

Current Sensor implementation can observe trigger errors and perform the configured retry loop on the blocking at-least-once path. With the default fire-and-forget path, the action is asynchronous and the caller cannot use that result to drive the same retry loop. If retry behavior matters, use `atLeastOnce: true`, test the installed version, and make the target idempotent.

For an HTTP trigger, a received response is treated as successful unless `policy.status.allow` is configured and rejects its status code. Once an operation returns an error, the generic Sensor retry loop does not classify `403`, `429`, and `500` differently; it retries each returned error until `steps` is exhausted.

Bound retries. A permanent authorization error should move to an operational failure path, not retry forever. Use factor and jitter to avoid synchronized retry bursts.

## Choose Semantics Per Trigger

A Sensor can have different policies for independent effects:

```yaml
triggers:
  - template:
      name: durable-work
      # Workflow trigger
    atLeastOnce: true
  - template:
      name: optional-telemetry
      # HTTP trigger
    atLeastOnce: false
```

This creates partial-success states. The durable work can succeed while telemetry is lost, or vice versa. If two effects must be coordinated, they are not independent Sensor triggers. Submit one Workflow to coordinate them, or use a transactional outbox pattern when an effect must be committed atomically with a database change.

## Test the Ambiguous Window

Do not stop at a normal event. Inject failures:

1. terminate the Sensor after the target accepts a request but before acknowledgment;
2. make the target return a timeout after committing;
3. restart JetStream or the active Sensor during execution;
4. send the same event ID twice;
5. for HTTP triggers, configure a status policy, return `403`, `429`, and `500`, and verify that each rejected response follows the bounded retry path and the DLQ path when configured;
6. fill the target quota and verify bounded failure handling.

Count received events, trigger attempts, created Workflows, idempotency claims, and completed business operations separately. Those numbers reveal where duplicates or loss occur.

## Official Documentation

- [Argo Events Sensors and trigger delivery](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events trigger API](https://argoproj.github.io/argo-events/APIs/#argoproj.io/v1alpha1.Trigger)
- [Argo Events at-least-once trigger example](https://github.com/argoproj/argo-events/blob/master/examples/sensors/trigger-with-atleast-once-semantics.yaml)
- [NATS JetStream consumers](https://docs.nats.io/nats-concepts/jetstream/consumers)
- [Kubernetes object names](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)

## Conclusion

At-most-once can lose trigger effects; at-least-once can repeat them. Choose which failure is acceptable for each trigger, then make durable actions idempotent. No Sensor field can atomically combine broker acknowledgment with an external side effect, so exactly-once business behavior remains an application protocol.
