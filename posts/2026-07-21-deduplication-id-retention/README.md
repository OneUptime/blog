# How Long Should You Retain Message IDs for Deduplication?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Message Queue, Deduplication, Idempotency, Data Retention

Description: Set message-ID retention from the longest redelivery and replay horizon, then add safety margin while controlling storage cost and privacy risk.

---

Retain a processed message ID for at least the longest period in which that same logical message can be delivered again, plus an explicit safety margin. That period must include ordinary redelivery, dead-letter redrive, operator replay, restore from archive, delayed producer retries, and outages. Broker defaults alone rarely define the complete horizon.

A useful policy is:

```text
deduplication retention
= maximum possible redelivery or replay age
+ clock, scheduling, and operational safety margin
```

If the organization permits an indefinite replay from archive, no finite deduplication window can guarantee suppression forever. Define a bounded replay contract, give intentional reprocessing a new operation identity, or make the underlying business transition intrinsically idempotent.

## Distinguish three kinds of deduplication

The word "deduplication" often hides different controls:

1. **Producer deduplication** stops two sends from creating two broker records.
2. **Delivery deduplication** stops a broker from presenting the same record more than once under a specific guarantee.
3. **Processing deduplication** stops a consumer from applying the same business effect twice.

The first two do not automatically provide the third.

For example, Amazon SQS FIFO queues track a message deduplication ID for a five-minute send window. Azure Service Bus Standard and Premium tiers can track message IDs for a configurable window from 20 seconds to 7 days, with a 10-minute default. Microsoft explicitly describes this as protection for doubtful or repeated sends and says it does not replace idempotent receive-side processing. These provider limits reflect documentation reviewed on July 21, 2026.

Those windows can suppress a producer retry, but a consumer may still see a redelivery after its lock or acknowledgment deadline expires. It may also see a record again through dead-letter redrive or an intentional replay. Keep the consumer's processed-ID ledger according to the business replay horizon, not the broker's send-side cache.

## Inventory every route back to the consumer

Build a table for each subscription or consumer:

| Route | Maximum age when delivered again | Owner |
| --- | ---: | --- |
| Lock or acknowledgment expiry | Message lifetime or retention, not merely the lock duration | Messaging team |
| Consumer retry or delayed queue | Maximum retry schedule | Service owner |
| Dead-letter queue redrive | DLQ retention plus response time | Operations |
| Broker seek or snapshot replay | Configured replay window | Platform team |
| Archive restore or backfill | Approved restore window | Data team |
| Producer retry | Maximum client retry and offline period | Producer owner |
| Manual incident recovery | Recovery runbook limit | Incident commander |

Use the largest value, then add margin for clock skew, delayed automation, maintenance windows, and a recovery started just before eligibility expires.

Do not count only the visibility timeout. A short visibility timeout controls when an unacknowledged delivery becomes eligible again; it does not necessarily limit how old the message can be. Amazon SQS, for example, can retain queued messages for up to 14 days. Its documentation also recommends a DLQ retention longer than the source queue's retention, and redriving creates a new enqueue time and message ID. Preserve a stable application operation ID inside the message because a broker-generated ID can change across that workflow.

Google Cloud Pub/Sub makes the replay distinction explicit. Topic or subscription retention can allow acknowledged messages to be replayed with seek, currently for up to 31 days. A consumer ledger shorter than the configured seek window will accept an older replay as new.

## Define what identity means

The deduplication key should identify one logical effect, not one transport attempt. Generate it before the first publish and preserve it through retries, queue hops, dead-letter handling, and redrive.

Scope the unique key to where uniqueness is guaranteed. A practical key is often:

```text
(consumer name, operation type, producer namespace, message ID)
```

The same event may legitimately drive billing, email, and analytics once each, so a global message-ID key could suppress valid work. Conversely, using only a message ID is unsafe when two producers can generate the same value.

Avoid a content hash as the primary identity. Two legitimate operations can have identical bodies, and semantically identical retries can differ in timestamps or formatting. A stable producer-generated UUID or business operation ID expresses intent more clearly.

## Store the minimum useful record

A relational inbox can remain compact:

```sql
CREATE TABLE processed_message (
    consumer_name text NOT NULL,
    operation_type text NOT NULL,
    producer_namespace text NOT NULL,
    message_id text NOT NULL,
    processed_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    outcome_reference text,
    PRIMARY KEY (
        consumer_name,
        operation_type,
        producer_namespace,
        message_id
    )
);
```

The primary key makes the database arbitrate concurrent deliveries. Do not perform an unlocked "select, then insert" check, since two consumers can both observe absence and apply the effect.

Store an outcome reference when it helps a duplicate return or locate the first result. Do not copy the full payload into the deduplication row unless there is a separate requirement. Payload retention increases cost, access scope, breach impact, and deletion complexity.

If an upstream identifier contains personal or confidential data, replace it at the producer with an opaque identifier when possible. A keyed hash can provide a stable lookup without storing the raw value, but the key becomes security-sensitive and rotation needs a migration plan.

## Size from traffic and the chosen window

A first row-count estimate is:

```text
retained rows
= peak sustained successful operations per second
* retention seconds
```

Estimate bytes from a production-like table, including indexes, row metadata, replicas, backups, and safety headroom. Successful logical operations matter more than raw delivery attempts because retries should collide with an existing row.

Longer retention lowers the risk of an old duplicate being accepted but increases:

- primary and index storage
- cache pressure and write amplification
- backup and restore size
- privacy and deletion exposure
- cleanup work

Azure Service Bus documents a similar tradeoff for its native duplicate-detection window: retaining and matching more message IDs can reduce throughput. A consumer database has different mechanics, but it still needs measurement rather than an assumed free lookup.

## Expire safely

Calculate expiry from the successful processing time, using the policy version in force for that operation. An old message can first succeed near the end of broker retention and still be replayed later, so expiring from its original event timestamp can make the ledger vanish too soon.

Delete in bounded batches or use a datastore TTL feature whose timing is understood. Monitor cleanup lag, because a nominal 30-day policy with a stalled cleanup job is not a 30-day privacy control. Before shortening retention:

1. Confirm every retry, DLQ, replay, and archive setting.
2. Check the oldest duplicate age observed in production.
3. Review incident and backfill runbooks.
4. Test a delivery just before and just after the proposed boundary.
5. Decide how older intentional replays receive a new identity.

During a migration to a longer window, extend expiry for existing live rows where possible. Merely applying the new TTL to new records creates a temporary gap.

## Make replay intent explicit

There are two valid replay modes, and they should not be confused:

- **Recovery replay:** Re-deliver the same operation IDs so already successful effects remain suppressed and missed effects run.
- **Intentional reprocessing:** Create a new run or operation identity so every selected record is processed again under controlled rules.

Operators should choose the mode before starting a backfill. Rewriting IDs casually defeats recovery deduplication, while keeping old IDs during an intentional recalculation can make the job appear successful even though every effect was skipped.

Log the replay ID, initiator, source range, deduplication behavior, and result counts. Alert when a duplicate arrives older than the supported window, since it signals that the real replay contract exceeds the documented one.

## Choose the duration from evidence

There is no universal "seven days" or "thirty days" answer. The correct duration is the longest authorized path back to the consumer plus margin, bounded by an explicit replay policy. Provider windows are useful inputs and sometimes hard limits, but they do not replace a consumer-side processed-operation record.

Review the duration whenever queue retention, DLQ handling, snapshots, archives, producer retry policy, or incident recovery changes. A deduplication guarantee is only as long as the oldest route that can reintroduce the same identity.

## Official documentation

- [Amazon SQS FIFO message deduplication IDs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html)
- [Amazon SQS queue parameters and message retention](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-queue-parameters.html)
- [Amazon SQS dead-letter queue retention](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Amazon SQS dead-letter queue redrive](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html)
- [Azure Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [Azure Service Bus message loss and duplicate processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates)
- [Google Cloud Pub/Sub replay and retention](https://docs.cloud.google.com/pubsub/docs/replay-overview)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
