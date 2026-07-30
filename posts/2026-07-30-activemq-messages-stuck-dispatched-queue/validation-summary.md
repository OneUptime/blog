# Validation Summary: Why ActiveMQ Messages Stay in the Dispatched Queue—and How to Release Them

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Apache ActiveMQ Classic
- Jakarta Messaging (JMS) acknowledgement and transaction modes
- ActiveMQ Classic consumer prefetch and redelivery
- JMX queue, subscription, and connection management
- XA/distributed transactions
- Apache ActiveMQ Artemis management and consumer flow control

## Sources Consulted

- ActiveMQ Classic queue metric definitions — https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue
- ActiveMQ Classic JMX documentation — https://activemq.apache.org/components/classic/documentation/jmx
- ActiveMQ Classic `DestinationViewMBean` API — https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/DestinationViewMBean.html
- ActiveMQ Classic `SubscriptionViewMBean` API — https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/SubscriptionViewMBean.html
- ActiveMQ Classic prefetch and pooled-consumer behavior — https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for
- ActiveMQ Classic InactivityMonitor — https://activemq.apache.org/components/classic/documentation/activemq-classic-inactivitymonitor
- ActiveMQ Classic redelivery and dead-letter queue handling — https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling
- ActiveMQ Classic redelivery policy — https://activemq.apache.org/components/classic/documentation/redelivery-policy
- ActiveMQ Classic acknowledgement-based slow-consumer strategy API — https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/region/policy/AbortSlowAckConsumerStrategy.html
- ActiveMQ Classic slow-consumer abort strategy API — https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/region/policy/AbortSlowConsumerStrategy.html
- Jakarta Messaging 3.1 specification — https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html
- Apache ActiveMQ Artemis management documentation — https://artemis.apache.org/components/artemis/documentation/latest/management.html
- Apache ActiveMQ Artemis `QueueControl` API — https://artemis.apache.org/components/artemis/documentation/javadocs/javadoc-latest/org/apache/activemq/artemis/api/core/management/QueueControl.html
- Apache ActiveMQ Artemis consumer flow control — https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html
- Apache ActiveMQ Artemis message redelivery — https://artemis.apache.org/components/artemis/documentation/latest/undelivered-messages.html

## Issues Found

1. **Redelivery-delay state was overgeneralized:** The post implied that a delayed redelivery normally disappears from `InFlightCount`. ActiveMQ Classic's usual client-side redelivery keeps the message appearing in flight, while the optional broker redelivery plugin can schedule it broker-side. Updated the explanation to distinguish these mechanisms and avoid misreading the metric.

2. **Local rollback advice did not exclude XA/distributed transactions:** The `session.rollback()` example was introduced for any transacted session. Jakarta Messaging defines `Session.commit()` and `Session.rollback()` for local session transactions; invoking them while an external transaction manager controls the session throws `TransactionInProgressException`. Scoped the example to application-managed local transactions and directed XA work to the transaction manager.

3. **`Session.recover()` redelivery wording was incomplete:** The post described only the oldest unacknowledged message as marked for redelivery. Clarified that recovery restarts from the first unacknowledged message and that messages redelivered by recovery have `JMSRedelivered` set and `JMSXDeliveryCount` incremented.

4. **Consumer closure was incorrectly equated with session-level recovery:** Closing a `MessageConsumer` releases prefetched messages not yet delivered to application code, but Jakarta Messaging specifies that it does not affect acknowledgement of messages already delivered or an in-progress transaction. Updated the lifecycle guidance to distinguish consumer closure from `recover()`, local rollback, transaction-manager resolution, and session/connection closure.

5. **Two different `stop()` operations were ambiguous:** JMS `Connection.stop()` only pauses incoming delivery, whereas the Classic connection MBean's administrative `stop` operation terminates the broker-side connection. Made that distinction explicit.

6. **Artemis management and closure terminology was imprecise:** Replaced ambiguous lowercase management field names with the documented `QueueControl` methods `getMessageCount()` and `getDeliveringCount()`, and aligned JMS consumer-close behavior with the Jakarta Messaging specification.

## Review Notes

- The `session.rollback()` and `session.recover()` snippets are syntactically valid and use current Jakarta Messaging APIs when applied in the corrected session modes.
- The ActiveMQ Classic URI option `jms.prefetchPolicy.queuePrefetch=1` is current and matches the official prefetch documentation; prefetch `0` changes the consumer to polling.
- `QueueSize` includes messages not yet acknowledged, while `InFlightCount` identifies the dispatched, unacknowledged subset. The post correctly warns against adding the two values.
- ActiveMQ Artemis `consumerWindowSize` is measured in bytes for Core/JMS clients, and `0` disables client-side buffering as stated.
