# Validation Summary: Taming a Fast Producer and Slow Consumer with ActiveMQ Flow Control and Pending Limits

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- ActiveMQ Classic
- Apache ActiveMQ Artemis
- Jakarta Messaging (JMS)
- OpenWire connection and prefetch policies
- Producer flow control and broker `SystemUsage`
- Message cursors, paging, pending-message limits, and eviction strategies
- Slow-consumer advisories and termination policies
- Artemis last-value and ring queues

## Sources Consulted

- [ActiveMQ Classic producer flow control](https://activemq.apache.org/components/classic/documentation/producer-flow-control)
- [ActiveMQ Classic slow-consumer handling and pending-message limits](https://activemq.apache.org/components/classic/documentation/slow-consumer-handling)
- [ActiveMQ Classic consumer prefetch](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic advisory messages](https://activemq.apache.org/components/classic/documentation/advisory-message)
- [ActiveMQ Classic message groups](https://activemq.apache.org/components/classic/documentation/message-groups)
- [ActiveMQ Classic exclusive consumers](https://activemq.apache.org/components/classic/documentation/exclusive-consumer)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [ActiveMQ Classic current core configuration schema](https://activemq.apache.org/schema/core/activemq-core.xsd)
- [Apache Artemis flow control](https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html)
- [Apache Artemis paging and page limits](https://artemis.apache.org/components/artemis/documentation/latest/paging.html)
- [Apache Artemis address settings](https://artemis.apache.org/components/artemis/documentation/latest/address-settings.html)
- [Apache Artemis slow-consumer detection](https://artemis.apache.org/components/artemis/documentation/latest/slow-consumers.html)
- [Apache Artemis address model](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- [Apache Artemis last-value queues](https://artemis.apache.org/components/artemis/documentation/latest/last-value-queues.html)
- [Apache Artemis ring queues](https://artemis.apache.org/components/artemis/documentation/latest/ring-queues.html)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)

## Issues Found

- The backlog-growth equation was presented without a destination scope. For a fan-out topic, one accepted publication can create backlog independently in multiple subscriptions, so broker-wide message counts do not follow the unqualified equation. The text now scopes the equation to a queue or an individual topic subscription and uses “accepted arrivals.”
- `sendFailIfNoSpaceAfterTimeout` was described as if every send could observe the timed failure. ActiveMQ Classic asynchronous sends do not automatically wait for or surface broker acknowledgements. The text now limits the claim to synchronous, flow-controlled sends and notes that asynchronous sends require a producer window or `alwaysSyncSend` to observe broker resource limits.

## Review Notes

- All three XML examples are well-formed. The current ActiveMQ Classic core schema confirms the destination-policy elements and the `producerFlowControl`, `memoryLimit`, `limit`, and `multiplier` attributes used by the post.
- The Classic connection URI option `jms.prefetchPolicy.queuePrefetch=1` matches the official prefetch documentation.
- The distinction between broker-side pending-limit value `0` and client `maximumPendingMessageLimit=0` is correct.
- The Artemis material matches the current 2.55.0 “latest” manual. In particular, `consumerWindowSize` is byte-based, address-full policies are `PAGE`, `BLOCK`, `FAIL`, and `DROP`, page-full policies are `DROP` or `FAIL`, and slow-consumer actions are `NOTIFY` or `KILL`.
- All nine links in the post’s Official Documentation section resolved successfully during validation.
