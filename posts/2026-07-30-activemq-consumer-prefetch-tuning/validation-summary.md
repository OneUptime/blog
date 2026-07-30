# Validation Summary: ActiveMQ Consumer Prefetch: How to Tune Throughput Without Starving Slow Workers

## Status
validated

## Post Type
Technical performance-tuning guide

## Technologies Covered
- Apache ActiveMQ Classic 5.19.8 and 6.2.7
- ActiveMQ Classic OpenWire Java client
- Apache ActiveMQ Artemis 2.55.0 Core client
- JMS and Jakarta Messaging
- STOMP
- Consumer prefetch, byte-window flow control, acknowledgement, and transactions

## Sources Consulted
- [ActiveMQ Classic: What is the Prefetch Limit For?](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic: Connection Configuration URI](https://activemq.apache.org/components/classic/documentation/connection-configuration-uri)
- [ActiveMQ Classic: Per Destination Policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic: Slow Consumer Handling](https://activemq.apache.org/components/classic/documentation/slow-consumer-handling)
- [ActiveMQ Classic: STOMP](https://activemq.apache.org/components/classic/documentation/stomp)
- [ActiveMQ Classic 6.2.7 `ActiveMQPrefetchPolicy` source](https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-client/src/main/java/org/apache/activemq/ActiveMQPrefetchPolicy.java)
- [ActiveMQ Classic 6.2.7 `ActiveMQSession` source](https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-client/src/main/java/org/apache/activemq/ActiveMQSession.java)
- [ActiveMQ Classic 5.19.8 `ActiveMQPrefetchPolicy` source](https://github.com/apache/activemq/blob/activemq-5.19.8/activemq-client/src/main/java/org/apache/activemq/ActiveMQPrefetchPolicy.java)
- [ActiveMQ Classic: Current Supported Releases](https://activemq.apache.org/components/classic/download/)
- [Apache Artemis 2.55.0: Consumer Flow Control](https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html)
- [Apache Artemis 2.55.0: Address Settings](https://artemis.apache.org/components/artemis/documentation/latest/address-settings.html)
- [Apache Artemis 2.55.0: Protocols and Interoperability](https://artemis.apache.org/components/artemis/documentation/latest/protocols-interoperability.html)
- [Apache Artemis 2.55.0: OpenWire](https://artemis.apache.org/components/artemis/documentation/latest/openwire.html)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)

## Issues Found
- The Classic prefetch limit was described as an unconditional maximum. Clarified that it is the nominal dispatch window and documented the default broker-side `usePrefetchExtension`, which can let transacted batches exceed the configured prefetch.
- The Classic defaults table incorrectly divided queue consumers by message delivery mode, mislabeled topic consumers by message persistence, omitted queue browsers, and used the stale `Short.MAX_VALUE - 1` value for non-durable topic consumers. Replaced the rows with the current OpenWire Java client policy categories and values: queue/temporary queue 1000, queue browser 500, durable topic subscription 100, and non-durable topic subscription `Short.MAX_VALUE` (32767).
- The table did not account for the optimized durable-topic path. Added the current `optimizeDurableTopicPrefetch` default of 1000 for an auto-acknowledged durable subscriber while `optimizedMessageDispatch` is active.
- Prefetch one was described as reserving exactly one message. Changed this to a one-message nominal prefetch window so it remains correct when prefetch extension and acknowledgement behavior are considered.
- A positive Artemis `consumerWindowSize` was described as a payload limit. Corrected it to the aggregate buffered message size in bytes, consistent with Artemis byte-credit flow control.
- Artemis window zero was said to guarantee deterministic consumer distribution. Changed this to say it can provide deterministic distribution, matching the official documentation and avoiding an unconditional guarantee.
- The `CLIENT_ACKNOWLEDGE` explanation referred generally to messages consumed by the session. Tightened it to the Jakarta Messaging rule that `acknowledge()` acknowledges all messages delivered by that session.

## Review Notes
- All six external documentation links in the post returned HTTP 200 and point to the intended official ActiveMQ or Artemis documentation.
- The Classic connection URI options, per-destination `consumer.prefetchSize` Java example, zero-prefetch polling behavior, STOMP zero-prefetch limitation, slow-consumer definition, and pooled-consumer warning match the official Classic documentation.
- The Artemis URI, 1 MiB default, `-1`/`0`/positive byte-window meanings, `consumerMaxRate` distinction, and Core-versus-OpenWire distinction match the Artemis 2.55.0 documentation.
- The Classic prefetch documentation page still lists the non-durable topic default as `Short.MAX_VALUE - 1`; both currently supported Java client branches reviewed define `DEFAULT_TOPIC_PREFETCH` as `Short.MAX_VALUE`, so the post now follows the supported client implementation and explicitly notes the documentation discrepancy.
