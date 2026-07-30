# Validation Summary: Why an ActiveMQ Queue Keeps Growing—and How to Find the Bottleneck

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Apache ActiveMQ Classic
- Apache Artemis
- JMS and Jakarta Messaging selectors, acknowledgement, transactions, durable subscriptions, and message groups
- JMX and broker management APIs
- ActiveMQ Classic prefetch, cursors, KahaDB, and JDBC persistence
- Artemis addresses, queues, routing types, paging, non-destructive queues, ring queues, redelivery, and metrics
- Queue capacity planning and backlog-rate analysis

## Sources Consulted

- [ActiveMQ Classic queue-size and destination-counter definitions](https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue)
- [ActiveMQ Classic JMX management](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic prefetch](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic message groups](https://activemq.apache.org/components/classic/documentation/message-groups)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [ActiveMQ Classic redelivery policy](https://activemq.apache.org/components/classic/documentation/redelivery-policy)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [Apache Artemis management and queue counters](https://artemis.apache.org/components/artemis/documentation/latest/management.html)
- [Apache Artemis `QueueControl` API](https://artemis.apache.org/components/artemis/documentation/javadocs/javadoc-latest/org/apache/activemq/artemis/api/core/management/QueueControl.html)
- [Apache Artemis metrics](https://artemis.apache.org/components/artemis/documentation/latest/metrics.html)
- [Apache Artemis address model, routing, FQQNs, and queue/consumer filters](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- [Apache Artemis paging](https://artemis.apache.org/components/artemis/documentation/latest/paging.html)
- [Apache Artemis message grouping](https://artemis.apache.org/components/artemis/documentation/latest/message-grouping.html)
- [Apache Artemis non-destructive queues](https://artemis.apache.org/components/artemis/documentation/latest/non-destructive-queues.html)
- [Apache Artemis ring queues](https://artemis.apache.org/components/artemis/documentation/latest/ring-queues.html)
- [Apache Artemis redelivery and undelivered messages](https://artemis.apache.org/components/artemis/documentation/latest/undelivered-messages.html)
- [Apache Artemis data tools](https://artemis.apache.org/components/artemis/documentation/latest/data-tools.html)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)

## Issues Found

- The initial backlog equation treated acknowledgement as removal without qualifying non-destructive queues. It now describes removal explicitly and states that acknowledgements are the main removal signal for ordinary destructive queues.
- The Artemis metric list used `messagesAcknowledged` without noting that the `listQueues` field is named `messagesAcked`, described last-delivery and last-acknowledgement timestamps as though they were queue-level fields, and implied that current `QueueControl`/`listQueues` output exposes non-destructive state. The list now gives the exact `listQueues` name, identifies the timestamps as per-consumer fields, and limits the listed queue-state fields to those exposed by the documented APIs.
- The capacity example said another million messages would “arrive” in about 55 minutes. At 1,200 incoming messages/s, one million messages arrive sooner; 55 minutes is the time for the backlog to grow by one million at the 300 messages/s net growth rate. The wording now refers to backlog growth.
- The redelivery sequence assigned delay and redelivery solely to the broker and assumed that dead-letter handling always terminates the loop. Classic commonly applies its redelivery policy in the client, Artemis defaults to zero redelivery delay, and either broker can be configured for unbounded attempts. The sequence now covers client- or broker-managed redelivery, optional delay, discard limits, and unbounded retries.
- The durable-subscription bullet implied that every broker represents such a subscription as a queue. That is specifically the Artemis core model. The wording now describes pending-message accumulation generally and qualifies the queue representation as Artemis-specific.
- The message-age heuristic treated an expiration-bounded backlog as necessarily intentional and as message loss. Expired messages can be forwarded to an expiry address, and expiration can be accidental. The heuristic now says to verify that expiry or forwarding is intentional.

## Review Notes

- The existing official-documentation links all returned HTTP 200 during validation.
- The current Apache Artemis documentation reviewed was version 2.55.0. The post appropriately tells readers to identify the exact broker version and keep Classic and Artemis metric definitions separate.
- Current Artemis definitions include scheduled, paged, and in-delivery messages in `messageCount`; the post's warning not to add `deliveringCount` blindly is correct.
- The post contains pseudocode-style rate equations rather than executable code, commands, or configuration snippets. The equations and the one-million-message forecast were checked arithmetically.
