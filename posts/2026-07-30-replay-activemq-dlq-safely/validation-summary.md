# Validation Summary: How to Replay ActiveMQ DLQ Messages Safely Without Losing or Duplicating Them

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Apache ActiveMQ Classic
- Java Management Extensions (JMX) and `QueueViewMBean`
- Dead Letter Queues (DLQs)
- Jakarta Messaging (JMS) selectors, acknowledgment, redelivery, and message identifiers
- Idempotent message processing

## Sources Consulted
- ActiveMQ Classic `QueueViewMBean` API: https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html
- ActiveMQ Classic JMX reference: https://activemq.apache.org/components/classic/documentation/jmx
- ActiveMQ Classic message redelivery and DLQ handling: https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling
- ActiveMQ Classic current `QueueView` implementation: https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/QueueView.java
- ActiveMQ Classic current queue move, copy, and retry implementation: https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/Queue.java
- ActiveMQ Classic current broker resend implementation: https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/util/BrokerSupport.java
- ActiveMQ Classic current DLQ routing implementation: https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/RegionBroker.java
- Jakarta Messaging 3.1 specification: https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1

## Issues Found
1. The post implicitly applied its queue-oriented workflow to topic-origin DLQ messages. `retryMessage` resends to the recorded original destination, so retrying a topic-origin message republishes it to that topic and can affect subscribers other than the one whose delivery failed. The scope now explicitly covers queue-origin messages and warns about topic replay.
2. The idempotency pseudocode returned early when an operation had already completed, which skipped the later message acknowledgment and could cause repeated redelivery. It now claims the operation ID with a uniqueness constraint, applies the change only when the claim is acquired, commits, and acknowledges both new and already-processed messages.
3. The statement that broker delivery is always “at least once across failure boundaries” was too broad. Jakarta Messaging distinguishes delivery guarantees by delivery mode and forbids redelivery of an acknowledged message, while an application can still repeat business processing when work completes before acknowledgment. The text now describes that application-level ambiguity precisely.
4. The replay-cohort list treated delivery count as if the pre-DLQ count remained available. ActiveMQ Classic resets the internal redelivery counter when resending a message to the DLQ, so the DLQ message's `JMSXDeliveryCount` does not preserve its earlier attempt count. The post now requires separately recorded delivery-attempt metadata and states this limitation.
5. The description of a broker message ID as a “delivery artifact” was imprecise. Jakarta Messaging defines `JMSMessageID` as identifying the message sent by the provider. The wording now reflects that definition while retaining the important distinction from a business idempotency key.

## Review Notes
- The published ActiveMQ Classic API page is labeled 5.17.0. The same queue move, copy, and retry operations and relevant behaviors were also verified in the current Apache ActiveMQ source.
- The post contains no executable CLI commands or version-specific configuration snippets. Its language-neutral transaction example is pseudocode.
