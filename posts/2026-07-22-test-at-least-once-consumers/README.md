# How to Test At-Least-Once Consumers with Crashes, Timeouts, and Rebalances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: At-Least-Once Delivery, Integration Testing, Fault Injection, Consumer Rebalance, Idempotency

Description: Prove consumer correctness with deterministic crash points, real broker tests, network faults, concurrent duplicates, and invariant-based assertions.

---

The defining test for an at-least-once consumer is not that its handler runs once. It is that every accepted message eventually has the required durable effect, while any number of delivery attempts still produce one valid business outcome.

Build deterministic failpoints around the business commit and broker settlement, then add real broker integration tests for visibility expiry, connection loss, and consumer reassignment. Assert durable invariants and recovery progress—not invocation counts or quiet logs.

## Write the invariant before the test

For a payment-capture event, useful invariants might be:

- one source operation creates at most one captured-payment row;
- a successfully accepted event is not silently skipped;
- the consumer acknowledges or checkpoints only after durable completion;
- a retryable failure remains eligible for another attempt;
- a terminal failure reaches a durable quarantine path;
- stale workers cannot overwrite a newer state version.

Track attempts separately from effects. A passing at-least-once test might show three handler starts, two database transactions, one uniqueness conflict, and one final effect.

```text
delivery attempts >= 1
durable business effects == 1
eventually settled == true
unresolved checkpoint holes == 0
```

If the expected assertion is `handlerInvocations == 1`, the test rejects the very replay behavior the design must tolerate.

## Add deterministic crash points

Random process killing finds useful surprises but is slow and hard to reproduce. First instrument named failpoints:

```text
AFTER_RECEIVE
BEFORE_BUSINESS_COMMIT
AFTER_BUSINESS_COMMIT
BEFORE_ACK_OR_CHECKPOINT
AFTER_ACK_OR_CHECKPOINT
```

In test builds, pause or terminate the consumer exactly at a selected point. Coordinate with a test controller through a barrier, not arbitrary sleeps.

The most valuable case is `AFTER_BUSINESS_COMMIT`: terminate the process before its acknowledgement, SQS delete, or Kafka offset commit. Restart a consumer and require the source to deliver the record again. The handler's inbox or conditional update must turn the replay into a no-op before settlement completes.

At `BEFORE_BUSINESS_COMMIT`, termination should leave no partial business effect and no inbox evidence that falsely marks the event complete. If the design persists an in-progress claim separately, that claim must be retryable or reclaimable after recovery. At `AFTER_ACK_OR_CHECKPOINT`, restart should not be needed for normal completion, though an independently duplicated message must still be safe.

## Test the effect and checkpoint as separate state

Expose read-only test queries for:

- inbox row by event ID;
- business result by operation ID;
- outbox row created by the consumer, if any;
- broker acknowledgement state or consumer-group committed offset;
- receive or delivery attempts.

For Kafka, distinguish the fetched position from the group committed offset. For SQS, remember that receive leaves the message in the queue until delete and every receive supplies a new receipt handle. For RabbitMQ manual acknowledgements, closing a channel requeues its unacknowledged deliveries.

Poll eventually for the invariant with a bounded deadline. Do not sleep for a guessed duration and then inspect once; broker failure detection, rebalances, and visibility use real time and have legitimate variation.

## Use real brokers for protocol behavior

Unit-test the idempotency state machine with a fake delivery adapter, then run integration tests against the same broker family and client protocol used in production. A mock rarely reproduces group coordination, receipt handles, channel-scoped delivery tags, or retry timing accurately.

Testcontainers can start Apache Kafka containers for Java integration tests. Its Toxiproxy module can add latency, timeouts, bandwidth limits, or connection cuts between clients and dependencies. Equivalent container orchestration works in other languages; pin tested versions and keep each test's topic, queue, group, and event IDs isolated.

A mock is still useful for deterministic application branches. Kafka's `MockConsumer` is documented as a mock implementation of the consumer interface and can simulate assignment changes. Use it to test offset-frontier code quickly, then verify actual rebalance callbacks against a broker.

## Force a Kafka rebalance around in-flight work

A practical Kafka scenario is:

1. Create a unique topic and consumer group.
2. Configure the consumers with `enable.auto.commit=false`.
3. Publish an event with a stable event ID.
4. Start consumer A and pause it after the database transaction commits.
5. Stop A without allowing its offset commit, or exceed the applicable group liveness boundary.
6. Start consumer B and wait for partition assignment.
7. Release or terminate A according to the stale-worker case.
8. Verify B receives the same topic, partition, and offset.
9. Verify one business effect and a committed next offset after recovery.

Also add consumer B while A is healthy in a test whose partitions and subscriptions require ownership to move, so planned revocation is actually exercised. Verify `onPartitionsRevoked` commits only completed contiguous offsets. Separately simulate an abrupt loss, where an orderly callback cannot be assumed.

Test slow handling against `max.poll.interval.ms`, a failed `commitSync`, and an asynchronous commit callback error. With worker pools, complete offsets out of order and prove that the commit frontier never crosses a hole.

Do not make the test depend on one exact consumer receiving one exact partition unless assignment is the subject. Rebalances are group protocols, and tests should observe ownership and eventual outcomes rather than race to a fixed member name.

## Expire SQS visibility on purpose

Use a dedicated queue with a short test visibility timeout:

1. Worker A receives message M and pauses before deletion.
2. Wait until the configured visibility has definitely expired.
3. Worker B receives M with a different receipt handle.
4. Let A and B race the business transaction.
5. Require the unique operation boundary to select one effect.
6. Delete using the active receive path and verify the queue eventually drains.

Then test a heartbeat extension with `ChangeMessageVisibility`. Make one renewal succeed and the next time out. Treat the timeout as an unknown renewal outcome and stop starting new side effects because another receive may become possible; a visibility timeout is not a lock that replaces idempotency.

Use the latest receipt handle in delete tests. AWS documents that an old handle can return success without necessarily deleting the message. Test an ambiguous delete response by dropping the network response and allowing a later receive; the repeated message must remain safe.

For Lambda SQS integrations, invoke a mixed batch with one deterministic failure. Without partial batch reporting, assert that successful records can repeat. With `ReportBatchItemFailures`, catch record-level errors and return a valid `batchItemFailures` response, then assert that the event source mapping makes only the declared failures visible again. If the function throws, the entire batch is failed. For FIFO, ensure the handler stops after the first failed record and returns the failed and unprocessed suffix.

## Close RabbitMQ channels with messages in flight

Consume with manual acknowledgement and a small prefetch. Pause after one database commit, leave several deliveries unacknowledged, and close the channel or connection. RabbitMQ documents that unacknowledged deliveries are automatically requeued on channel or connection closure.

Restart the consumer and verify:

- completed-but-unacknowledged work is redelivered and deduplicated;
- unfinished work is processed;
- acknowledgements use the receiving channel's delivery tags;
- a cumulative acknowledgement never crosses an unfinished tag;
- a poison message reaches the application's retry limit or, for a quorum queue, its configured delivery limit, and follows the configured dead-letter path.

Do not assert that a redelivery must go to a different consumer. RabbitMQ may send it to the same or another consumer.

## Inject network ambiguity at every external boundary

Place a controllable proxy between the consumer and broker, database, or downstream API. Exercise:

- request reaches the server but the response is cut;
- connection closes before any request bytes pass;
- latency exceeds client timeout while the server completes;
- acknowledgement or offset-commit response is lost;
- the connection recovers while an old handler is still running.

These cases distinguish definite failure from unknown outcome. For a downstream API, the consumer must reuse one idempotency key or reconcile before retrying. For a database commit whose response is lost, reconnect and query by operation ID rather than blindly applying a new increment.

Toxiproxy can create latency, timeout, bandwidth, and connection-cut faults. Keep fault setup in the test output so a failure is reproducible.

## Race duplicate deliveries directly

Do not wait for the broker to create every race. Call the same handler concurrently with the same stable event ID through its delivery adapter. Synchronize both workers immediately before the inbox insert, then release them together.

The database unique constraint—not an in-memory mutex—must choose one winner. Run this test against the real database and transaction isolation used in production. Verify the losing delivery is recognized as a duplicate and is safe to settle.

Add a negative case: the same event ID with a different payload fingerprint must be quarantined or rejected as an identity collision, not silently accepted as a duplicate.

## Test retries over time and history

Short tests miss retention boundaries. Include scenarios for:

- redrive after the inbox's intended retention window;
- Kafka offset reset to an old record;
- producer resend after a broker deduplication window;
- expired worker lease followed by a stale late result;
- delayed webhook arriving after polling reconciliation;
- deployment shutdown with in-flight batches.

A deliberately destructive replay test should use isolated data and an explicit scope. Preserve the event identities and expected outcomes so the test can prove both replay safety and cleanup behavior.

## Make failures diagnosable

Every test attempt should log or capture:

- event ID and business operation ID;
- broker coordinates: topic, partition, offset; SQS message and receipt attempt; or RabbitMQ delivery context;
- consumer instance and ownership generation;
- failpoint reached;
- inbox claim result and business transaction result;
- acknowledgement, delete, or offset-commit result;
- retry number and final disposition.

On failure, print a compact timeline from those events. “Expected one row, found two” is not enough; the timeline should show which attempt crossed which boundary.

Run deterministic boundary tests on every change to consumer logic. Run the slower broker, network, and process-kill suite in CI or a scheduled reliability job. Randomize delay and concurrency within recorded seeds after the deterministic cases pass.

At-least-once correctness is demonstrated when the same message is intentionally made inconvenient: delivered concurrently, interrupted after success, hidden and exposed again, or moved between owners. If every path converges on one durable outcome and a completed checkpoint, the consumer is ready for the failures its broker was designed to survive.

## Official Documentation

- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 `ConsumerRebalanceListener` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html)
- [Apache Kafka 4.3 `MockConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/MockConsumer.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS `DeleteMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessage.html)
- [AWS Lambda SQS partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [RabbitMQ consumer acknowledgements and automatic requeueing](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ quorum queue poison-message handling](https://www.rabbitmq.com/docs/quorum-queues)
- [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)
- [Testcontainers Kafka module](https://java.testcontainers.org/modules/kafka/)
- [Testcontainers Toxiproxy module](https://java.testcontainers.org/modules/toxiproxy/)
