# Validation Summary: ActiveMQ Queue vs Topic: What Happens When Consumers Are Offline?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Jakarta Messaging 3.1 / JMS
- Apache ActiveMQ Classic 5.x and 6.x
- Apache ActiveMQ Artemis
- JMS queues and topics
- Durable and non-durable topic subscriptions
- Persistent and non-persistent message delivery
- ActiveMQ Classic virtual topics
- Artemis anycast, multicast, subscription queues, and FQQNs

## Sources Consulted
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
- [Jakarta Messaging 3.1 `DeliveryMode` API documentation](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/deliverymode)
- [Jakarta Messaging 3.1 `Session` API documentation](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/session)
- [ActiveMQ Classic: queue compared with topic](https://activemq.apache.org/components/classic/documentation/how-does-a-queue-compare-to-a-topic)
- [ActiveMQ Classic: durable queues and topics](https://activemq.apache.org/components/classic/documentation/how-do-durable-queues-and-topics-work)
- [ActiveMQ Classic: virtual destinations](https://activemq.apache.org/components/classic/documentation/virtual-destinations)
- [ActiveMQ Classic: consumer prefetch](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic: Jakarta Messaging 3.1 and JMS 2.0 support](https://activemq.apache.org/components/classic/documentation/jms2)
- [Apache ActiveMQ Artemis address model](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- [Apache ActiveMQ Artemis mapping of JMS concepts to the core API](https://artemis.apache.org/components/artemis/documentation/latest/jms-core-mapping.html)

## Issues Found
- The opening description said every existing topic subscription receives a copy, but a subscription selector can exclude a message. Changed this to every matching subscription.
- The queue summary implied that a message always waits whenever a particular consumer is offline. Clarified that it waits only when no eligible consumer is available, because another competing consumer may receive it.
- The capacity-policy bullet treated send rejection as removal of an already queued message. Clarified that a policy can either discard a message or reject the send.
- The queue-consumer discussion implied that exclusive consumers, message groups, selectors, and consumer priority all make another consumer categorically ineligible. Reworded it because these features can constrain or influence dispatch in different ways; consumer priority can prefer one consumer without permanently excluding another.
- The non-durable topic section described only the lifetime of an unshared subscription. Added the specified shared non-durable behavior: it exists until its last consumer closes.
- The durable-subscription caveat incorrectly limited possible loss of non-persistent messages to broker shutdown/restart. Jakarta Messaging also does not guarantee delivery of a non-persistent message when a durable subscription becomes inactive. Corrected both the summary table and the detailed explanation.

## Review Notes
The Java durable-subscription example is syntactically valid and uses the still-supported `Session.createDurableSubscriber` API. `Session.createDurableConsumer` is the JMS 2.0 alternative, but the post correctly warns that ActiveMQ Classic's JMS 2.0/Jakarta Messaging support is version-dependent and that shared topic consumers are not universally supported. The Artemis XML snippets match the documented `broker.xml` address syntax, and all documentation links in the post resolved to the intended official resources.
