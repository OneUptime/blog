# Validation Summary: ActiveMQ Consumer Is Connected but Not Receiving Messages: A Debugging Checklist

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Apache ActiveMQ Classic
- Apache ActiveMQ Artemis
- Java Message Service (JMS)
- Jakarta Messaging 3.1
- ActiveMQ OpenWire
- Artemis Core protocol
- JMS message selectors and Artemis queue/consumer filters
- ActiveMQ Classic virtual topics
- Artemis addresses, queues, routing types, and fully qualified queue names
- JMX and Artemis queue-management metrics
- Message acknowledgement, redelivery, expiry, scheduling, and dead-letter handling

## Sources Consulted

- ActiveMQ Classic: consumer receives no messages: https://activemq.apache.org/components/classic/documentation/i-am-not-receiving-any-messages-what-is-wrong
- ActiveMQ Classic: second consumer receives no messages: https://activemq.apache.org/components/classic/documentation/i-do-not-receive-messages-in-my-second-consumer
- ActiveMQ Classic: queue size and destination counters: https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue
- ActiveMQ Classic: JMX MBean attributes and operations: https://activemq.apache.org/components/classic/documentation/jmx
- ActiveMQ Classic: prefetch behavior and consumer pooling: https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for
- ActiveMQ Classic: virtual destinations and selector-aware virtual topics: https://activemq.apache.org/components/classic/documentation/virtual-destinations
- ActiveMQ Classic: Jakarta Messaging 3.1 and JMS 2.0 support status: https://activemq.apache.org/components/classic/documentation/jms2
- Jakarta Messaging 3.1 specification: https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html
- Jakarta Messaging 3.1 `Connection` API: https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/connection
- Jakarta Messaging 3.1 `Session` API: https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/session
- Apache Artemis 2.55.0 address model, routing types, FQQNs, and filters: https://artemis.apache.org/components/artemis/documentation/latest/address-model.html
- Apache Artemis 2.55.0 management API: https://artemis.apache.org/components/artemis/documentation/latest/management.html
- Apache Artemis 2.55.0 `QueueControl` API: https://artemis.apache.org/components/artemis/documentation/javadocs/javadoc-latest/org/apache/activemq/artemis/api/core/management/QueueControl.html
- Apache Artemis 2.55.0 queue metric descriptions: https://artemis.apache.org/components/artemis/documentation/javadocs/javadoc-latest/constant-values.html
- Apache Artemis 2.55.0 consumer flow control: https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html
- Apache Artemis 2.55.0 address settings and dispatch thresholds: https://artemis.apache.org/components/artemis/documentation/latest/address-settings.html
- Apache Artemis 2.55.0 exclusive queues: https://artemis.apache.org/components/artemis/documentation/latest/exclusive-queues.html
- Apache Artemis 2.55.0 consumer priority: https://artemis.apache.org/components/artemis/documentation/latest/consumer-priority.html
- Apache Artemis 2.55.0 redelivery and dead-letter handling: https://artemis.apache.org/components/artemis/documentation/latest/undelivered-messages.html
- Apache Artemis 2.55.0 OpenWire support: https://artemis.apache.org/components/artemis/documentation/latest/openwire.html

## Issues Found

- The post could be read as treating Classic `QueueSize` and Artemis `messageCount` as ready-only counters. Classic documents `QueueSize` as all unacknowledged messages, while Artemis explicitly includes scheduled, paged, and in-delivery messages in `messageCount`. Added guidance to derive ready work by comparing the total with in-flight/delivering and scheduled counts, and updated the decision table accordingly.
- The decision table said advancing queue-wide acknowledgement counters proved that another consumer was processing the work. Aggregate counters do not identify a consumer. Changed this to say that some consumer is acknowledging work and that per-consumer evidence is required for attribution.
- The ready-but-not-delivering decision-table row included routing, queue filters, and authorization even though those normally affect whether a message reaches the queue or whether a consumer can be created. Replaced them with dispatch-time eligibility causes: selectors, paused dispatch, exclusivity, grouping, consumer priority, and dispatch thresholds.
- The Classic virtual-topic section described selector-aware behavior as placing a selector on the consumer queue. Classic actually checks active consumer selectors during virtual-topic fanout; the optional `virtualSelectorCacheBrokerPlugin` retains selectors for disconnected consumers. Corrected the explanation and the disconnected-consumer caveat.
- The flow-control comparison was framed as Artemis versus Classic. `consumerWindowSize` is specific to the native Artemis Core client, while the ActiveMQ Classic OpenWire client uses count-based prefetch even when connected to an Artemis broker. Reworded the guidance around the client protocol in use.
- The `noLocal` bullet omitted that it applies to unshared topic subscriptions and, for an unshared durable subscription, also excludes publications from other connections using the same client ID. Added the missing scope and durable-subscription behavior.
- ActiveMQ Classic's JMS 2.0/Jakarta Messaging 3.1 feature support is version-dependent and remains partial for features such as `CompletionListener` asynchronous sends and JMS delivery delay. Qualified the producer checklist so those explanations apply only when the selected client and broker support the feature.

## Review Notes

The Java examples are syntactically correct and use non-deprecated JMS interfaces. `Connection.createSession(boolean, int)` remains supported, although the Jakarta Messaging 3.1 API describes it as superseded by `createSession(int)`; retaining the two-argument form preserves compatibility with older `javax.jms` clients covered by the guide. All external documentation links in the post resolved to the intended official Apache ActiveMQ, Apache Artemis, or Jakarta Messaging resources during review. The Artemis `latest` documentation resolved to version 2.55.0.
