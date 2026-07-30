# Validation Summary: Persistent vs Non-Persistent ActiveMQ Messages: Delivery Guarantees and Performance Tradeoffs

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Jakarta Messaging 3.1 and JMS delivery modes
- Java `MessageProducer`, `JMSProducer`, and message acknowledgement APIs
- ActiveMQ Classic 5.18.x and 6.x
- ActiveMQ Classic OpenWire sends, producer flow control, KahaDB, JDBC persistence, and message cursors
- Apache ActiveMQ Artemis Core and Jakarta Messaging clients
- Artemis durable queues, journal synchronization, paging, transactions, and HA storage

## Sources Consulted

- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
- [Jakarta Messaging 3.1 `DeliveryMode` API](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/deliverymode)
- [Jakarta Messaging 3.1 `MessageProducer` API](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/messageproducer)
- [Jakarta Messaging 3.1 `JMSProducer` API](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/jmsproducer)
- [ActiveMQ Classic persistent versus non-persistent delivery](https://activemq.apache.org/components/classic/documentation/what-is-the-difference-between-persistent-and-non-persistent-delivery)
- [ActiveMQ Classic persistence](https://activemq.apache.org/components/classic/documentation/persistence)
- [ActiveMQ Classic Jakarta Messaging 3.1 and JMS 2.0 support](https://activemq.apache.org/components/classic/documentation/jms2)
- [ActiveMQ Classic asynchronous sending](https://activemq.apache.org/components/classic/documentation/how-do-i-enable-asynchronous-sending)
- [ActiveMQ Classic producer flow control](https://activemq.apache.org/components/classic/documentation/producer-flow-control)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [ActiveMQ Classic persistence-disable options](https://activemq.apache.org/components/classic/documentation/how-do-i-disable-persistence)
- [ActiveMQ Classic `BrokerService` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/BrokerService.java)
- [Apache ActiveMQ Artemis guarantees of sends and commits](https://artemis.apache.org/components/artemis/documentation/latest/send-guarantees.html)
- [Apache ActiveMQ Artemis persistence](https://artemis.apache.org/components/artemis/documentation/latest/persistence.html)
- [Apache ActiveMQ Artemis messaging concepts](https://artemis.apache.org/components/artemis/documentation/latest/messaging-concepts.html)
- [Apache ActiveMQ Artemis Core API concepts](https://artemis.apache.org/components/artemis/documentation/latest/core.html)
- [Apache ActiveMQ Artemis client classpath](https://artemis.apache.org/components/artemis/documentation/latest/client-classpath)
- [Apache ActiveMQ Artemis paging](https://artemis.apache.org/components/artemis/documentation/latest/paging)

## Issues Found

No technical issues found.

## Review Notes

- The Java snippets are contextual rather than standalone programs, but their method names, overloads, constants, chaining, and five-second time-to-live value are correct for the APIs described.
- ActiveMQ Classic's partial JMS 2.0/Jakarta Messaging support and the `javax.jms` versus `jakarta.jms` version distinction were verified against its published support matrix.
- The Artemis defaults were verified against the latest official user manual, version 2.55.0: `blockOnDurableSend=true`, `blockOnNonDurableSend=false`, `journal-sync-non-transactional=true`, and `journal-sync-transactional=true`.
- All external links in the post resolve to the intended official documentation.
- No changes to the post were required.
