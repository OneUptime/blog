# Validation Summary: Cleaning Up Abandoned Durable Subscribers Before They Exhaust Broker Memory

## Status

validated

## Post Type

Broker operations guide

## Technologies Covered

- Apache ActiveMQ Classic
- Jakarta Messaging (JMS)
- Durable topic subscriptions
- JMX, JConsole, and the ActiveMQ Classic web console
- KahaDB
- ActiveMQ Artemis

## Sources Consulted

- [Manage durable subscribers in ActiveMQ Classic](https://activemq.apache.org/components/classic/documentation/manage-durable-subscribers)
- [ActiveMQ Classic JMX reference](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic `DurableSubscriptionView` JMX API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/DurableSubscriptionView.html)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [ActiveMQ Classic Jakarta Messaging 3.1 and JMS 2.0 support](https://activemq.apache.org/components/classic/documentation/jms2)
- [Why KahaDB log files remain after cleanup](https://activemq.apache.org/components/classic/documentation/why-do-kahadb-log-files-remain-after-cleanup)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1)
- [Jakarta Messaging 3.1 `Session` API](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/session)
- [ActiveMQ Artemis address model](https://activemq.apache.org/components/artemis/documentation/latest/address-model.html)

## Issues Found

- The durable-subscription description omitted `noLocal` from the settings that determine which messages an unshared durable subscription receives. Added `noLocal` alongside the topic and selector to match the Jakarta Messaging specification.
- The unsubscribe guidance listed an active consumer as the only restriction. Added the specification's other restrictions: a message received from the subscription must not be part of a current transaction or remain unacknowledged in the session.
- The scaling guidance presented a shared durable subscription as an ActiveMQ Classic option. ActiveMQ Classic currently does not implement shared topic consumers, so the guidance now recommends evaluating a virtual topic or queue and explicitly states the Classic limitation.

## Review Notes

The ActiveMQ Classic 5.6 introduction point, millisecond units, seven-day and hourly example values, `-1` timeout default, 300,000-millisecond task-schedule default, 30-second expiry scan default, `processExpired="false"` behavior, JMX `StorePercentUsage` metric, and KahaDB retention explanation were verified. ActiveMQ Classic only partially supports JMS 2.0 and Jakarta Messaging 3.1; the package namespace depends on the client version, but the durable-subscription identity and unsubscribe rules cited in the post apply.
