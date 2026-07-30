# Validation Summary: ActiveMQ Failover Transport: Reconnect, Backup Priority, and Transaction Replay Settings

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Apache ActiveMQ Classic
- ActiveMQ Classic Failover Transport
- OpenWire over TCP
- JMS and Jakarta Messaging transactions
- ActiveMQ Classic broker networks and high availability
- TLS

## Sources Consulted

- [ActiveMQ Classic Failover Transport Reference](https://activemq.apache.org/components/classic/documentation/failover-transport-reference)
- [ActiveMQ Classic FailoverTransport source](https://github.com/apache/activemq/blob/main/activemq-client/src/main/java/org/apache/activemq/transport/failover/FailoverTransport.java)
- [ActiveMQ Classic Configuring Transports](https://activemq.apache.org/components/classic/documentation/configuring-transports)
- [ActiveMQ Classic URI Protocols](https://activemq.apache.org/components/classic/documentation/uri-protocols)
- [ActiveMQ Classic InactivityMonitor](https://activemq.apache.org/components/classic/documentation/activemq-classic-inactivitymonitor)
- [ActiveMQ Classic Per Destination Policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic JMX](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic Message Redelivery and DLQ Handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [ActiveMQ Classic Clustering](https://activemq.apache.org/components/classic/documentation/clustering)
- [ActiveMQ Classic SSL Transport Reference](https://activemq.apache.org/components/classic/documentation/ssl-transport-reference)
- [ActiveMQ Classic current releases](https://activemq.apache.org/components/classic/download/)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1)

## Issues Found

- The description of failover `timeout` was too broad. The option limits how long a message command waits for the failover transport to reconnect; it is not a general broker-response timeout and does not time out `commit()`. The text now states that scope explicitly.
- The post treated every timed-out send as necessarily ambiguous. A send that only waited for a connection did not reach a broker, while a send attempted as the connection failed can still have an unknown outcome. The retry guidance now distinguishes those cases.
- The transaction section said the application must call rollback after `TransactionRolledBackException`. That exception reports that the commit resulted in rollback, and completion starts the session's next transaction. The text now tells the application to treat the failed unit of work as rolled back and replay it instead of implying another rollback call is required.
- Consumer guidance referred to acknowledging a replacement delivery in a transacted workflow. Transacted-session acknowledgements occur through commit, so “acknowledge” was changed to “commit.”
- Producer guidance referred to “destination audit counters,” but the documented destination JMX metrics do not expose a duplicate-audit counter, and broker message auditing is not business-level deduplication. The text now recommends monitoring duplicate business operations without implying such a counter or guarantee exists.
- The dynamic URI section implied that `updateClusterClients=true` alone advertises broker removals. Removal updates require the separate `updateClusterClientsOnRemove=true` setting, which defaults to `false`; the post now includes that requirement.

## Review Notes

- The failover URI examples and option names are valid for the supported ActiveMQ Classic 5.19.x and 6.2.x lines. The historical availability statements for `nested.*` (5.9+), priority backup (5.6+), transaction redelivery tracking (5.3.1+), and current `maxReconnectAttempts` semantics (5.6+) match the official reference.
- ActiveMQ Classic 5.x uses the `javax.jms` API, while ActiveMQ Classic 6.x uses the Jakarta Messaging API. The transaction ambiguity and rollback behavior described here apply to both API generations.
