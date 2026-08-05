# Argo Events Trigger Retries and Dead-Letter Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Sensor, Retry, Dead Letter, Backoff, Failure Handling, Idempotency

Description: Configure Argo Events trigger retries and dead-letter triggers accurately, then build replay, alerting, and idempotency around their limits.

---

Argo Events does not retry a failed trigger by default. That is a safety choice: the Sensor cannot know whether another attempt will duplicate a side effect. A trigger can opt into `retryStrategy`; after retries are exhausted, an optional `dlqTrigger` can invoke another supported trigger type.

This is a dead-letter **trigger**, not a broker-managed dead-letter queue. Argo Events does not automatically create a durable queue, retention policy, replay consumer, or operator UI. The DLQ target must provide those capabilities if you need them.

## Configure the Fields at the Trigger Level

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: order-events
  namespace: argo-events
spec:
  dependencies:
    - name: order
      eventSourceName: orders
      eventName: created
  triggers:
    - template:
        name: start-fulfilment
        conditions: order
        http:
          url: https://fulfilment.example.internal/events
          method: POST
          payload:
            - src:
                dependencyName: order
                dataKey: body
                useRawData: true
              dest: event
      atLeastOnce: true
      retryStrategy:
        steps: 4
        duration: 2s
        factor: 2
        jitter: 0.5
      dlqTrigger:
        template:
          name: store-failed-order
          conditions: order
          kafka:
            url: kafka-0.kafka:9092,kafka-1.kafka:9092
            topic: failed-order-events
            payload:
              - src:
                  dependencyName: order
                  dataKey: body
                dest: event
        atLeastOnce: true
        retryStrategy:
          steps: 6
          duration: 5s
          factor: 2
```

The current Kafka trigger API marks its fixed `partition` field as deprecated, so this example leaves partition selection to the producer. Validate the Kafka trigger against the installed API reference before use. An HTTP DLQ endpoint is often easier to make a durable ingestion contract.

The critical documented constraints are:

- top-level trigger and `dlqTrigger` both need `atLeastOnce: true` for DLQ handling;
- `retryStrategy` defaults to no retry;
- a DLQ trigger can have its own retry strategy;
- a `dlqTrigger` cannot recursively contain another DLQ trigger.

## Understand `steps`

Argo Events uses its `Backoff` type with `duration`, `factor`, `jitter`, and `steps`. The official documentation describes `steps` as the number after which it gives up and shows duration strings such as `2s` or `1m`.

Do not calculate an outage budget from field names alone. Verify attempt count and timing for your release with a target that deterministically fails, because library interpretation and zero/default values matter. Keep an upper bound that is shorter than the source's acceptable processing delay.

Jitter adds a random amount based on the current duration. It reduces synchronized retries when many Sensors fail against the same dependency.

## Retry Only Ambiguous or Transient Failures

Good retry candidates include connection resets, temporary DNS failure, `429`, and many `5xx` responses. Bad retry candidates include invalid payload, failed authorization, forbidden Kubernetes action, unsupported resource schema, and a business rejection.

Argo Events trigger implementations have different policies for deciding success. An HTTP trigger can use response status policy fields; Kubernetes and Workflow triggers can apply resource policies. Design the target to return errors consistently, and test which errors the installed trigger classifies as failure.

If the implementation cannot distinguish permanent errors, keep retries small and let the DLQ consumer classify them with richer context.

## Make Every Retried Trigger Idempotent

The target can commit and then lose its response. Retrying an HTTP `POST` or Workflow create can duplicate work. Send a stable idempotency key in the payload or a secure header where the target supports it.

```yaml
http:
  headers:
    Content-Type: application/json
  dynamicHeaders:
    - src:
        dependencyName: order
        dataKey: body.operationId
      dest: Idempotency-Key
```

`dynamicHeaders` is a current HTTP trigger field. If the key is sensitive, do not log it; if it is a bearer credential, use `secureHeaders` sourced from a Secret rather than event data.

## Design the DLQ Payload for Replay

Store more than the original body. A useful dead-letter record includes:

```json
{
  "schemaVersion": "argo-trigger-failure.v1",
  "operationId": "order:123:fulfil",
  "sourceEventId": "provider-delivery-id",
  "eventSource": "orders",
  "eventName": "created",
  "sensor": "order-events",
  "trigger": "start-fulfilment",
  "firstSeenAt": "2026-08-05T10:00:00Z",
  "payloadRef": "s3://secured-bucket/events/order-123.json"
}
```

The built-in DLQ trigger receives the same dependency event map and can parameterize a target from it. It does not automatically expose a normalized exception object containing every attempt error. Sensor logs and metrics hold execution failure evidence. If failure reason must travel with the record, point the primary trigger at an idempotent gateway that creates an explicit failure envelope, or enrich the record in a controlled DLQ service.

Store sensitive original payloads in access-controlled object storage and put a reference in the queue. Set retention, encryption, and access policy intentionally.

## Operate Replay as a New Controlled Action

A DLQ without a replay process is delayed data loss. Define:

- who can inspect failed records;
- how permanent failures are quarantined;
- how code/config fixes are linked;
- whether replay uses the original operation ID;
- maximum replay concurrency;
- how success removes or marks the record;
- when records expire.

Replay the same logical operation with the same idempotency key. Record a replay attempt ID separately for audit. Do not edit a failed payload in place without preserving the original and documenting the correction.

## Account for DLQ Failure

The DLQ trigger can fail too. It has bounded retries and no recursive DLQ. Alert on `argo_events_action_retries_failed_total` for both the primary and DLQ trigger, inspect Sensor logs, and monitor the durable target's ingestion metrics.

Set `spec.errorOnFailedRound: true` only after understanding the consequence: the Sensor enters error after a failed trigger round and processes no further triggers. This can stop silent loss but also turns one poison event into a halted stream requiring intervention. It does not undo successful triggers in the same round.

## Test the Whole Failure Path

Exercise:

1. transient failure followed by success;
2. permanent failure through all primary attempts;
3. successful DLQ delivery;
4. DLQ target outage through all DLQ attempts;
5. target commit followed by timeout, proving idempotency;
6. replay of a corrected event;
7. malformed event that should not be retried at all.

Measure primary attempts, DLQ attempts, durable records, replay attempts, and final business outcomes separately.

## Official Documentation

- [Argo Events trigger retries, rate limits, and DLQ](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events trigger API](https://argoproj.github.io/argo-events/APIs/#argoproj.io/v1alpha1.Trigger)
- [Argo Events HTTP trigger](https://argoproj.github.io/argo-events/sensors/triggers/http-trigger/)
- [Argo Events Kafka trigger](https://argoproj.github.io/argo-events/sensors/triggers/kafka-trigger/)
- [Apache Kafka design](https://kafka.apache.org/documentation/#design)

## Conclusion

Enable retry only for an idempotent trigger, bound it with backoff and jitter, and use `atLeastOnce` when the Sensor must observe failure. Treat `dlqTrigger` as a hook into a durable failure system, not as that system itself. Operate retention, alerting, classification, and replay explicitly, including the case where the DLQ trigger also fails.
