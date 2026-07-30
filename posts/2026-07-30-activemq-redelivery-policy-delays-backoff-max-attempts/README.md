# ActiveMQ Redelivery Policy Explained: Delays, Backoff, and Maximum Attempts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, JMS, Message Redelivery, Dead Letter Queue

Description: Configure ActiveMQ Classic redelivery delays, exponential backoff, and attempt limits without creating retry storms or silently losing poison messages.

---

An ActiveMQ Classic redelivery policy answers three different questions: when a failed message is offered again, how the delay changes after repeated failures, and when the message should stop returning to the consumer. Treating those as one “retry count” hides important behavior.

This article is about the ActiveMQ Classic OpenWire JMS client. Artemis uses different address settings such as `redelivery-delay` and `max-delivery-attempts`; do not copy Classic client properties into an Artemis broker configuration.

## What causes a JMS message to be redelivered?

ActiveMQ Classic documents these common triggers:

- a transacted session calls `rollback()`;
- a transacted session closes before `commit()`;
- a `CLIENT_ACKNOWLEDGE` session calls `recover()`;
- the connection fails or times out before the broker receives the acknowledgement.

A thrown listener exception is not equivalent to a rollback in every acknowledgement mode. In `AUTO_ACKNOWLEDGE` or `DUPS_OK_ACKNOWLEDGE`, a `RuntimeException` from an asynchronous listener automatically triggers redelivery. In `CLIENT_ACKNOWLEDGE`, the application must call `recover()` to redeliver the unacknowledged message; a transacted session must be rolled back. Frameworks may translate listener failures into those actions, so check the listener container's transaction and acknowledgement configuration before tuning the broker.

On a redelivery, consumers can inspect `JMSRedelivered`. ActiveMQ Classic also exposes `JMSXDeliveryCount`, which is mandatory in Jakarta Messaging 3.1. Keep application logs keyed by `JMSMessageID` or, preferably, a stable business operation ID so repeated deliveries can be correlated.

## Understand the delay controls

The principal Classic `RedeliveryPolicy` properties are:

| Property | Purpose |
|---|---|
| `initialRedeliveryDelay` | Wait before the first redelivery |
| `redeliveryDelay` | Fixed delay after the first redelivery, or the base returned when the previous delay is zero |
| `useExponentialBackOff` | Multiply the delay after failures instead of keeping it fixed |
| `backOffMultiplier` | Multiplier used by exponential backoff |
| `maximumRedeliveryDelay` | Cap applied to the exponential calculation before collision-avoidance jitter |
| `useCollisionAvoidance` | Randomize calculated delays after the first redelivery so many failing consumers do not retry together |
| `collisionAvoidancePercent` | Percentage size of the randomized range |
| `maximumRedeliveries` | Redeliveries allowed before the client sends a poison acknowledgement |

`maximumRedeliveries` counts redeliveries, not the original delivery. A value of `0` therefore permits the initial attempt but no redelivery. `-1` means unlimited redeliveries and should be used only when an external mechanism can guarantee that an unrecoverable message will not loop forever.

The documented Classic default is six maximum redeliveries. Do not rely on that implicit value: declare a policy that matches the workload and test it against the exact client version in production.

## Configure a bounded client policy

The native client can be configured directly:

```java
ActiveMQConnectionFactory factory =
    new ActiveMQConnectionFactory("tcp://broker.example.com:61616");

RedeliveryPolicy policy = factory.getRedeliveryPolicy();
policy.setInitialRedeliveryDelay(1_000);
policy.setUseExponentialBackOff(true);
policy.setBackOffMultiplier(2.0);
policy.setMaximumRedeliveryDelay(30_000);
policy.setUseCollisionAvoidance(true);
policy.setMaximumRedeliveries(5);
```

This produces a bounded sequence rather than an immediate retry loop. The first redelivery waits one second; subsequent delays use exponential backoff and collision-avoidance jitter. `maximumRedeliveryDelay` caps the exponential calculation before jitter, so if a policy has enough redeliveries to reach the cap, an observed randomized delay can be slightly higher. The exact randomized interval should be treated as an implementation detail.

ActiveMQ Classic 5.7 and later can apply different client redelivery policies by destination through `RedeliveryPolicyMap`. That is useful when, for example, an interactive command queue should fail quickly but a queue calling a temporarily unavailable downstream service can tolerate several delayed attempts.

## Client redelivery and broker redelivery are different

Normal Classic redelivery is consumer-side. The client holds the failed message's delivery context and preserves ordering for that consumer. While it remains in that path, the message may appear in flight rather than visibly available to another consumer.

Classic also provides a broker redelivery plugin. It resends through the broker scheduler, allowing another consumer to receive the message after a delay. It requires `schedulerSupport="true"` and deliberately trades strict ordering for redistribution. Do not enable it merely to make the queue graph move; choose it when another consumer can productively retry the work and message ordering is not required.

## What happens after the limit?

After the message exceeds `maximumRedeliveries`, the Classic client sends a poison acknowledgement. The broker then applies its dead-letter strategy. By default, undeliverable persistent messages go to the shared `ActiveMQ.DLQ`.

That outcome depends on broker policy:

- an individual dead-letter strategy can route each source queue to its own DLQ;
- expired messages can be discarded with `processExpired="false"`;
- non-persistent messages are not placed on a DLQ by default unless `processNonPersistent="true"`;
- a discarding strategy can intentionally drop matching messages.

Validate the client policy and broker dead-letter strategy together. A retry limit without an observable DLQ can turn a poison message into silent loss.

## Pick a retry budget from the failure mode

Start with the time the operation remains useful, not a fashionable retry count.

For a downstream outage, calculate the maximum elapsed retry window:

```text
initial attempt
+ first delay
+ later capped backoff delays
+ processing and network time for each attempt
```

If the business deadline is two minutes, a policy that can retry for an hour is wrong even if every individual setting looks reasonable. Conversely, retrying a rate-limited service every few milliseconds adds load precisely while it is failing.

Use delayed retries for transient failures such as brief network loss or lock contention. Send malformed payloads, invalid commands, and permanent authorization failures to quarantine immediately or after very few attempts. Never use broker retries as the only reliability mechanism for a non-idempotent external write.

## Make the consumer safe for redelivery

At-least-once delivery means the broker may deliver again after the application performed its side effect but before the acknowledgement was recorded. A sound consumer should:

1. carry a stable operation or idempotency key in the message;
2. record completion atomically with the business state where possible;
3. return success for an already completed operation;
4. log delivery count and the classified failure;
5. avoid sleeping inside the listener thread as a substitute for broker delay;
6. alert when DLQ ingress rises or a message approaches the attempt limit.

Test broker restart, client disconnect, rollback, and a failure during commit. A happy-path unit test does not exercise the ambiguity that makes redelivery necessary.

## Official Documentation

- [ActiveMQ Classic redelivery policy](https://activemq.apache.org/components/classic/documentation/redelivery-policy)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [ActiveMQ Classic `RedeliveryPolicy` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/RedeliveryPolicy.html)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1)
