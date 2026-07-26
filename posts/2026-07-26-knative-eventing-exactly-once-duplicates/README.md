# Does Knative Eventing Guarantee Exactly-Once Delivery? Design for Duplicates Instead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, CloudEvents, Idempotency, At-Least-Once Delivery, Kafka, Reliability

Description: Build duplicate-safe Knative subscribers with CloudEvent identity, transactional deduplication, idempotent side effects, and realistic replay windows.

---

Knative Eventing does not provide an end-to-end exactly-once processing guarantee. Knative Triggers and Subscriptions deliver CloudEvents with at-least-once semantics, so duplicate delivery is expected in some failure and replay scenarios.

That remains true when Kafka backs the Broker. Kafka can durably store a record, but a Knative dispatcher still crosses an HTTP boundary to the subscriber. If the subscriber commits work and its acknowledgement is lost, the sender cannot know whether processing finished. Retrying protects against loss and creates a possible duplicate.

The practical contract is: deliver at least once, acknowledge only after durable acceptance, and make every consumer safe to invoke again.

## Where Duplicates Come From

A duplicate is not necessarily a platform defect. Common paths include:

- the subscriber commits, but its `2xx` response is lost;
- the request exceeds a timeout after the application completed;
- a dispatcher restarts or a Kafka consumer group rebalances before progress is committed;
- the original producer retries an ambiguous Broker ingress request;
- an operator replays a dead letter record;
- a source is restarted from an earlier offset or with a new consumer group;
- application code publishes an event and retries because it cannot confirm the publish result.

Fan-out is different: two Triggers intentionally delivering one event to two subscribers are two routed copies, not accidental duplicate deliveries to one logical consumer. Each subscriber still needs its own idempotency boundary.

## Use the CloudEvent Identity Correctly

CloudEvents requires both `source` and `id`. The producer must ensure that `id` is unique within that `source`, and consumers may treat events with the same `(source, id)` pair as duplicates.

Do not deduplicate on `id` alone:

```text
source=https://billing.example.com   id=1042
source=https://shipping.example.com  id=1042
```

Those are different CloudEvents.

Keep the same `(source, id)` when retrying the same occurrence. Generate a new pair for a genuinely new occurrence, even when its business entity is the same. An `order.updated` event emitted twice at different times needs two event identities.

CloudEvent identity is not authentication. If untrusted clients can spoof `source`, enforce ingress identity and authorization separately.

## Deduplicate in the Business Transaction

An in-memory cache cannot provide correctness across Pod restarts, scale-out, or concurrent deliveries. Put the deduplication marker in the same durable system and transaction as the business change.

A PostgreSQL-style pattern is:

```sql
BEGIN;

INSERT INTO processed_events (
  consumer_name,
  event_source,
  event_id,
  processed_at
)
VALUES (
  'invoice-projector-v3',
  'https://billing.example.com',
  'payment-891-authorized-1',
  CURRENT_TIMESTAMP
)
ON CONFLICT (consumer_name, event_source, event_id) DO NOTHING;

-- Continue only if the INSERT created a row.
-- Apply the invoice mutation and write any outbound event to an outbox here.

COMMIT;
```

Create a unique constraint on `(consumer_name, event_source, event_id)`. Including a stable consumer name allows independent consumers to process the same event while preventing repeats within one logical consumer.

The application flow should be:

1. parse and validate the CloudEvent;
2. begin a transaction;
3. attempt to claim its identity;
4. if already processed, commit or roll back without repeating side effects and return `2xx`;
5. if new, perform the business update and write any outbox record;
6. commit;
7. return `2xx`.

Never mark the event processed in one transaction and perform its business mutation in another. A crash between them loses work while future deliveries look like duplicates.

## Handle External Side Effects

Not every effect can join your database transaction. For a payment API, email provider, or another HTTP service:

- pass a stable idempotency key derived from the consumer and `(source, id)`;
- store the remote operation state before and after the call;
- reconcile operations whose outcome is unknown;
- use an outbox to publish downstream messages after the local commit;
- design compensating actions when the remote system has no idempotency support.

Do not simply call the remote API and then insert the deduplication row. A crash between those operations repeats the side effect.

For downstream CloudEvents, decide whether a retry republishes the same occurrence or creates a new event. An outbox should persist the chosen event ID before publishing so publisher retries reuse it.

## Set the Right Acknowledgement Boundary

Return `2xx` only after the event is durably accepted. There are two sound models:

- synchronous processing: commit the business result, then acknowledge;
- asynchronous processing: commit the event to your own durable queue or inbox, then acknowledge and process it later.

Returning `202 Accepted` is still a `2xx` acknowledgement to Knative. It is safe only when responsibility has already moved to durable application-owned storage.

When processing fails before commit, return a retryable status such as `503`. When an event is permanently invalid, record that outcome durably and either acknowledge it or return a non-retryable failure for a configured dead letter path. Make the choice explicit; repeated validation will not repair bad data.

## Keep Deduplication Records Long Enough

There is no universally safe seven-day or thirty-day TTL. Retain identity records for at least the longest period in which the event can return:

```text
retry window
+ Broker or topic retention
+ dead letter retention
+ maximum operator replay delay
+ safety margin
```

If business correctness must survive a replay years later, keep a permanent ledger or derive idempotency from an immutable business constraint instead of expiring the marker.

Partition and index the table so retention is operable, but never delete records merely to reduce size without changing the replay policy.

## Test the Failure Window

Test more than a clean repeated request:

1. send the same `(source, id)` concurrently to several replicas;
2. terminate the Pod after commit but before its HTTP response;
3. make the dispatcher time out while the transaction completes;
4. restart or rebalance the Kafka consumers;
5. replay the event from the dead letter store;
6. verify exactly one business mutation and one intended downstream event.

Track delivered attempts, deduplication hits, business outcomes, and dead letter replays separately. A rising duplicate-hit rate can expose timeouts or unhealthy acknowledgements even when correctness is preserved.

Exactly-once **effects** can sometimes be engineered inside a transaction or an idempotent remote API. Exactly-once **delivery** across Knative, HTTP, databases, and outside systems is not the contract. Design around the contract Knative actually provides.

## Official Documentation

- [Knative threat model: at-least-once Trigger and Subscription delivery](https://knative.dev/docs/reference/security/threat-model/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [CloudEvents 1.0 `id` and `source` requirements](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
