# Validation Summary: Why ActiveMQ Reports “Duplicate from Store”—and How Consumer Contention Triggers It

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Apache ActiveMQ Classic
- JMS / Jakarta Messaging message identifiers and redelivery metadata
- ActiveMQ Classic message-store cursors and duplicate audits
- ActiveMQ Classic JMX (`QueueViewMBean` and `DestinationViewMBean`)
- ActiveMQ Classic network connectors and failover transport
- KahaDB and JDBC persistence adapters
- Apache ActiveMQ Artemis

## Sources Consulted

- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic `QueueViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html)
- [ActiveMQ Classic `DestinationViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/DestinationViewMBean.html)
- [ActiveMQ Classic `BaseDestination` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/BaseDestination.java)
- [ActiveMQ Classic `AbstractStoreCursor` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/cursors/AbstractStoreCursor.java)
- [ActiveMQ Classic `ActiveMQMessageAuditNoSync` source](https://github.com/apache/activemq/blob/main/activemq-client/src/main/java/org/apache/activemq/ActiveMQMessageAuditNoSync.java)
- [Apache issue AMQ-4952: duplicate detected by cursor audit](https://issues.apache.org/jira/browse/AMQ-4952)
- [Apache issue AMQ-5249: cursor/store synchronization cases](https://issues.apache.org/jira/browse/AMQ-5249)
- [ActiveMQ Classic failover transport reference](https://activemq.apache.org/components/classic/documentation/failover-transport-reference)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [ActiveMQ Classic message properties](https://activemq.apache.org/components/classic/documentation/activemq-classic-message-properties)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
- [ActiveMQ Artemis duplicate-message detection](https://activemq.apache.org/components/artemis/documentation/latest/duplicate-detection.html)
- [ActiveMQ Artemis paging](https://activemq.apache.org/components/artemis/documentation/latest/paging.html)

## Issues Found

- A generic producer retry was grouped with failover replay as a cause of a repeated broker message ID. ActiveMQ Classic's cursor audit keys on the broker/JMS message identity, while an application-level resend normally receives a new JMS message ID. The post now names network-bridge and failover-transport replay of an in-flight send, and distinguishes a new-ID application retry as a business-level duplicate.
- An undersized audit was listed without explaining its actual effect. A small producer/depth window causes old audit entries to be evicted and can let duplicates escape detection; it does not create a duplicate store entry. The list now identifies it as a diagnostic factor and states the eviction behavior.
- The JMX wording implied that the MBean could show whether `sendDuplicateFromStoreToDLQ` was explicitly configured. It exposes the effective boolean value but cannot distinguish an explicit setting from the version-dependent default. The post now directs readers to inspect broker configuration for that distinction.
- The JMX counter was described as a lifetime value even though destination management statistics can be reset with `resetStatistics()`. The post now calls it an absolute cumulative value and notes that it is resettable.
- The competing-consumer explanation mentioned sequential redelivery only. After a disconnect or ambiguous acknowledgement, the broker can redeliver while the original handler may still be running, so the post now notes that duplicate processing can briefly overlap even though normal competing dispatch does not send one available queue entry to both consumers.
- The post said delivery remains “at least once across failures,” which could be read as an unconditional delivery guarantee regardless of persistence and acknowledgement configuration. It now states the narrower, accurate point: failures can cause redelivery or ambiguous send and acknowledgement outcomes.

## Review Notes

- The documented `sendDuplicateFromStoreToDLQ` default is `true` before ActiveMQ Classic 5.17.0 and `false` from 5.17.0 onward.
- `enableAudit` defaults to `true`; disabling it removes duplicate detection at the destination cursor and is not a root-cause fix.
- `QueueViewMBean` extends `DestinationViewMBean`, which exposes `DuplicateFromStoreCount`, the audit settings discussed in the post, and `resetStatistics()`.
- The post's distinction among a same-ID store/cursor duplicate, JMS redelivery, and separate messages representing one business operation is technically sound.
- The post contains a conceptual text diagram but no executable code, terminal commands, or configuration snippets requiring runtime validation.
