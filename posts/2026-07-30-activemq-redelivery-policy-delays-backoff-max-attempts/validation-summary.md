# Validation Summary: ActiveMQ Redelivery Policy Explained: Delays, Backoff, and Maximum Attempts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache ActiveMQ Classic
- ActiveMQ Classic OpenWire Java client
- Java Message Service (JMS) and Jakarta Messaging 3.1
- `ActiveMQConnectionFactory`, `RedeliveryPolicy`, and `RedeliveryPolicyMap`
- ActiveMQ Classic broker redelivery plugin and scheduler
- Dead-letter queues and dead-letter strategies
- Apache ActiveMQ Artemis address settings

## Sources Consulted
- ActiveMQ Classic Redelivery Policy — https://activemq.apache.org/components/classic/documentation/redelivery-policy
- ActiveMQ Classic Message Redelivery and DLQ Handling — https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling
- ActiveMQ Classic `RedeliveryPolicy` API — https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/RedeliveryPolicy.html
- ActiveMQ Classic 6.2.7 `RedeliveryPolicy` source — https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-client/src/main/java/org/apache/activemq/RedeliveryPolicy.java
- ActiveMQ Classic 6.2.7 `ActiveMQMessageConsumer` source — https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-client/src/main/java/org/apache/activemq/ActiveMQMessageConsumer.java
- ActiveMQ Classic 6.2.7 `ActiveMQSession` source — https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-client/src/main/java/org/apache/activemq/ActiveMQSession.java
- ActiveMQ Classic 5.19.8 `RedeliveryPolicy` source — https://github.com/apache/activemq/blob/activemq-5.19.8/activemq-client/src/main/java/org/apache/activemq/RedeliveryPolicy.java
- Jakarta Messaging 3.1 specification — https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1
- ActiveMQ Artemis Message Redelivery and Undelivered Messages — https://activemq.apache.org/components/artemis/documentation/latest/undelivered-messages
- ActiveMQ Classic supported-release matrix — https://activemq.apache.org/components/classic/download/

## Issues Found
1. **Listener exception behavior was too broad**: The post stated that a thrown exception alone is not an acknowledgement decision and must be translated by a framework. Jakarta Messaging defines acknowledgment-mode-specific behavior: an asynchronous listener `RuntimeException` triggers redelivery in `AUTO_ACKNOWLEDGE` and `DUPS_OK_ACKNOWLEDGE`, while `CLIENT_ACKNOWLEDGE` requires `recover()` and a transacted session requires rollback. Updated the explanation accordingly.
2. **`JMSXDeliveryCount` support was described as optional**: ActiveMQ Classic exposes this property, and Jakarta Messaging 3.1 requires it. Replaced the optional-support wording with the accurate provider and specification behavior.
3. **The collision-avoidance setting used the internal field name**: `collisionAvoidanceFactor` is a protected implementation field. The public JavaBean and XML configuration property is `collisionAvoidancePercent`, exposed through `getCollisionAvoidancePercent()` and `setCollisionAvoidancePercent(short)`. Corrected the property table.
4. **Delay and cap semantics needed precision**: Clarified that `initialRedeliveryDelay` controls the first redelivery, `redeliveryDelay` is used for subsequent fixed/base calculations, and collision avoidance is applied after the exponential delay cap. Because jitter is added after the cap, an observed delay can be slightly greater than `maximumRedeliveryDelay`.

## Review Notes
- The Java example uses public, non-deprecated APIs present in both supported ActiveMQ Classic 5.19.8 and 6.2.7 source tags.
- The configured `maximumRedeliveries` value of `5` permits five redeliveries in addition to the original delivery, as the post states.
- The broker redelivery plugin description, `schedulerSupport="true"` requirement, ordering tradeoff, poison acknowledgement behavior, and dead-letter strategy settings were verified as correct.
- ActiveMQ Classic 5.x's primary client artifact uses `javax.jms` (with Jakarta client variants in supported later 5.x lines), while ActiveMQ Classic 6.x uses `jakarta.jms`; the shown snippet references only ActiveMQ classes and is valid for both client lines.
- The post's official `RedeliveryPolicy` API link currently renders documentation labeled ActiveMQ 5.17.0, but the methods and behavior discussed were cross-checked against the supported 5.19.8 and 6.2.7 source tags.
