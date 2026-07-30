# Validation Summary: Why Messages Land in ActiveMQ.DLQ—and How to Diagnose the Poison Message

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Apache ActiveMQ Classic
- Java Message Service (JMS) / Jakarta Messaging
- ActiveMQ Classic dead-letter strategies and redelivery policies
- ActiveMQ Classic JMX management and `QueueViewMBean`
- KahaDB, store cursors, failover, and network connectors
- XML broker destination policies

## Sources Consulted

- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [ActiveMQ Classic redelivery policy](https://activemq.apache.org/components/classic/documentation/redelivery-policy)
- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic JMX documentation](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic `QueueViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html)
- [ActiveMQ Classic `DestinationViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/DestinationViewMBean.html)
- [ActiveMQ Classic `BrokerViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/BrokerViewMBean.html)
- [ActiveMQ Classic prefetch documentation](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic security documentation](https://activemq.apache.org/components/classic/documentation/security)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.pdf)
- [ActiveMQ Classic current `AbstractDeadLetterStrategy` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/policy/AbstractDeadLetterStrategy.java)
- [ActiveMQ Classic current `PolicyEntry` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/policy/PolicyEntry.java)
- [ActiveMQ Classic current `BaseDestination` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/BaseDestination.java)
- [ActiveMQ Classic current `Queue` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/Queue.java)
- [ActiveMQ Classic current `RegionBroker` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/RegionBroker.java)

## Issues Found

- The broker-policy subsection could be read as saying that a discarding dead-letter strategy is another route into the DLQ. Changed the heading and explanation to state explicitly that this strategy drops the message instead of sending it to a DLQ.
- The individual-DLQ guidance advised checking producer authorization on the resulting DLQs. ActiveMQ Classic forwards dead-lettered messages internally with broker context, so an application producer does not need DLQ write permission for that forwarding. Changed the guidance to check browse/administration permissions on the DLQs and write permission on the original destinations used for replay.

## Review Notes

- The `sendDuplicateFromStoreToDLQ` version statement is correct: its default changed from `true` to `false` in ActiveMQ Classic 5.17.0.
- The JMX API page linked by the post is generated for ActiveMQ Classic 5.17.0, but the counters and queue operations discussed remain present in the current ActiveMQ Classic source.
- JMX browsing is bounded by the destination's `maxBrowsePageSize` and is not a consistent snapshot while the queue is changing, so the post's bounded-sample warning is appropriate.
