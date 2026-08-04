# Cross-Cloud Messaging with SQS, Pub/Sub, and Service Bus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Messaging, Amazon SQS, Google Cloud Pub/Sub, Azure Service Bus, Cloud Portability, Event-Driven Architecture, Idempotency

Description: Keep business logic stable across SQS, Pub/Sub, and Service Bus by defining a narrow adapter contract and preserving each broker's delivery and ordering semantics.

---

Amazon SQS, Google Cloud Pub/Sub, and Azure Service Bus all deliver messages asynchronously. They do not expose the same queue model, acknowledgment protocol, ordering scope, retry behavior, or exactly-once claims.

A portable messaging layer should stabilize the application's message envelope and processing lifecycle while keeping broker capabilities explicit. If the adapter hides an important semantic difference, it moves the outage from migration time to production.

## Write Down the Required Semantics

Before choosing an interface, describe the workload:

```yaml
workload: payment-capture
delivery: at_least_once
ordering_scope: merchant_id
max_processing_time: 45s
max_payload_bytes: 131072
retention: 4d
retry:
  max_attempts: 8
  dead_letter: required
deduplication:
  consumer_window: 7d
```

These are application requirements, not copied provider defaults. Compare them with current service limits and configuration in every target.

## Understand the Default Differences

At a high level:

| Concern | Amazon SQS | Google Cloud Pub/Sub | Azure Service Bus |
| --- | --- | --- | --- |
| Basic receive model | poll and visibility timeout | pull ack deadline or push response | Peek-Lock settlement or Receive-and-Delete |
| Common durable mode | at-least-once | at-least-once by default | at-least-once with Peek-Lock |
| Ordered grouping | FIFO message group | ordering key when enabled | sessions |
| Send deduplication | FIFO deduplication | application design | duplicate detection window on supported tiers |
| Receive completion | delete after processing | acknowledge | complete settlement |
| Lease extension | change visibility | modify ack deadline/client lease management | renew message lock |

This table is only orientation. For example, Pub/Sub exactly-once delivery is limited to supported pull subscriptions and has a regional scope; it is not a general promise that an external database side effect happens exactly once. Azure duplicate detection addresses repeated sends by `MessageId`, not duplicate effects after a consumer lock expires. SQS FIFO deduplication and ordering do not remove the need for idempotent downstream work.

## Define a Narrow Port Interface

Keep provider clients behind operations tied to the processing lifecycle:

```text
Publisher.publish(message) -> provider_message_id

Receiver.receive(max_messages, wait) -> Delivery[]
Delivery.message
Delivery.ack()
Delivery.retry()
Delivery.dead_letter(reason)
Delivery.extend(lease)
```

Do not promise an operation that cannot be implemented honestly. An arbitrary per-message retry delay, atomic publish across several destinations, or transaction spanning the broker and a database may not exist on every target.

Expose capabilities during adapter initialization:

```json
{
  "orderedGroups": true,
  "explicitLeaseRenewal": true,
  "nativeSendDeduplication": false,
  "deadLetterPolicy": true,
  "maxPayloadBytes": 262144
}
```

Fail deployment when a required capability is absent. Do not silently downgrade ordering or delivery mode.

## Use a Provider-Neutral Envelope

CloudEvents can standardize common event metadata, but it does not define queue settlement or delivery guarantees. A simple domain envelope can use CloudEvents-compatible fields:

```json
{
  "specversion": "1.0",
  "id": "01J4FY2J6M3N8R7...",
  "source": "urn:acme:orders",
  "type": "com.acme.order.accepted.v2",
  "subject": "orders/8b4f",
  "time": "2026-08-04T10:15:00Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "8b4f",
    "merchantId": "m-19"
  }
}
```

Keep the application event ID stable across publish retries. Map it to SQS message attributes, Pub/Sub attributes, or Service Bus application properties, and use the grouping key only where ordered processing is required.

Version schemas independently from the broker. Consumers should tolerate additive fields and route unsupported major versions to a visible failure path.

## Make Processing Idempotent

At-least-once delivery means the same logical message can be observed again. Acknowledgment may fail after a database commit, a lease may expire, or a consumer may restart.

Use an atomic inbox pattern where the business database supports it:

```sql
BEGIN;

INSERT INTO consumed_message (consumer, message_id, consumed_at)
VALUES ('capture-worker', :message_id, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Continue only when the insert affected one row.
UPDATE payment
SET status = 'captured'
WHERE payment_id = :payment_id
  AND status = 'authorized';

COMMIT;
```

Only acknowledge after the durable transaction commits. If acknowledgment then fails, redelivery finds the inbox row and safely acknowledges without repeating the effect.

Choose retention for deduplication records from maximum broker retention, dead-letter replay policy, and business replay horizon—not from a short native send-deduplication window.

## Publish Reliably with an Outbox

A database commit followed by `publish()` has a failure gap. Use a transactional outbox:

1. write the business change and event row in one local database transaction;
2. a relay reads unpublished rows and sends them through the broker adapter;
3. the relay records publication progress;
4. duplicate sends reuse the same event ID;
5. consumers remain idempotent.

This provides at-least-once publication without a distributed transaction. It does not guarantee only one physical message, which is why stable IDs matter.

## Map Lease and Timeout Behavior

SQS hides a received message for its visibility timeout. Pub/Sub keeps a message outstanding until its acknowledgment deadline. Service Bus Peek-Lock grants a volatile lock that a client can renew. In all three, processing that outlives the lease can lead to another delivery.

The adapter should:

- start renewal only after handing a message to a worker;
- cap total renewal time so poisoned work eventually fails;
- stop renewal when the process loses ownership;
- surface renewal errors to processing code;
- avoid prefetching more messages than can finish within their locks;
- emit lease-expiry and redelivery metrics.

Long-running work may be better represented as a durable job record with short queue messages that claim or advance the job.

## Preserve Ordering Only Where Needed

Global ordering constrains throughput and is not the common model. Partition by a business key such as `merchant_id` and require order only within that key.

Map the key to:

- SQS FIFO `MessageGroupId`;
- Pub/Sub ordering key, with ordering enabled;
- Service Bus `SessionId`, with a session-aware receiver.

Test failure behavior. Pub/Sub documents that redelivery of an ordered message can cause subsequent messages for that key to be redelivered. Service Bus sessions require session lock management. A hot SQS message group is processed serially. The adapter cannot erase these throughput consequences.

## Standardize Dead-Letter Operations

Native dead-letter policies differ. Define operational outcomes:

```text
message exceeded attempts -> quarantined with original envelope
reason and last error retained
operator can inspect without production credentials
replay preserves event ID
replay is rate limited and audited
```

Provision provider dead-letter queues or topics explicitly and monitor them. Do not assume setting a policy creates every target resource or grants all forwarding permissions.

## Run the Same Contract Suite

Against every adapter, test:

1. publish and receive preserve envelope fields and binary payloads;
2. a crash after durable commit causes no duplicate business effect;
3. lease extension prevents premature redelivery during supported work;
4. an expired lease causes safe redelivery;
5. ordered keys preserve the required sequence under failure;
6. poison messages reach the dead-letter destination;
7. replay retains the logical message ID;
8. payload and attribute limits fail predictably;
9. permission denial and quota throttling are observable;
10. adapter shutdown drains or abandons in-flight deliveries safely.

Run load tests with production-shaped key distribution. Uniform random keys hide hot-merchant or hot-tenant bottlenecks.

## Official Documentation

- [Amazon SQS delivery behavior](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS FIFO concepts](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html)
- [Google Cloud Pub/Sub subscription overview](https://cloud.google.com/pubsub/docs/subscription-overview)
- [Google Cloud Pub/Sub exactly-once delivery](https://cloud.google.com/pubsub/docs/exactly-once-delivery)
- [Google Cloud Pub/Sub ordering](https://cloud.google.com/pubsub/docs/ordering)
- [Azure Service Bus message settlement](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-transfers-locks-settlement)
- [Azure Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)

## Conclusion

Port messaging at the domain envelope and processing lifecycle, not at the SDK method-name level. Preserve provider semantics as capabilities, use stable message IDs, implement transactional outbox and idempotent inbox patterns, and test leases, ordering, and dead letters under failure. The business logic can stay stable even though the brokers remain different.
