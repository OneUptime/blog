# Validation Summary: ActiveMQ Message Selectors Can Make Consumers Appear Hung: Page Size and Prefetch Explained

## Status

validated

## Post Type

Technical troubleshooting and configuration guide

## Technologies Covered

- Apache ActiveMQ Classic
- Jakarta Messaging (JMS) selectors
- ActiveMQ Classic destination policies and message cursors
- ActiveMQ Classic consumer prefetch
- JMX queue and subscription monitoring
- KahaDB persistence
- Apache ActiveMQ Artemis

## Sources Consulted

- [ActiveMQ Classic selectors](https://activemq.apache.org/components/classic/documentation/selectors)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1)
- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic message groups](https://activemq.apache.org/components/classic/documentation/message-groups)
- [ActiveMQ Classic prefetch limits](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic destination options](https://activemq.apache.org/components/classic/documentation/destination-options)
- [ActiveMQ Classic second-consumer prefetch FAQ](https://activemq.apache.org/components/classic/documentation/i-do-not-receive-messages-in-my-second-consumer)
- [ActiveMQ Classic unstarted-connection FAQ](https://activemq.apache.org/components/classic/documentation/i-am-not-receiving-any-messages-what-is-wrong)
- [ActiveMQ Classic queue-size and JMX counter documentation](https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue)
- [ActiveMQ Classic QueueViewMBean API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html)
- [ActiveMQ Classic SubscriptionViewMBean API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/SubscriptionViewMBean.html)
- [ActiveMQ Classic slow-consumer handling](https://activemq.apache.org/components/classic/documentation/slow-consumer-handling)
- [ActiveMQ Classic KahaDB journal cleanup FAQ](https://activemq.apache.org/components/classic/documentation/why-do-kahadb-log-files-remain-after-cleanup)
- [ActiveMQ Artemis paging documentation](https://activemq.apache.org/components/artemis/documentation/latest/paging.html)

## Issues Found

- The selector introduction stated without qualification that selectors cannot inspect message bodies. Standard JMS selectors cannot, but ActiveMQ Classic has a non-portable XPath selector extension for XML bodies. The text now distinguishes standard JMS behavior from that extension.
- The missing-property warning implied that every reference to a missing property evaluates to unknown. Ordinary comparisons do, but `IS NULL` can intentionally match a missing property. The warning now applies specifically to ordinary comparisons.
- The prefetch explanation implied that acknowledgement makes an in-flight message available to another consumer. Acknowledgement removes the message; closing or failing the consumer releases an unacknowledged message for redelivery. The paragraph now states those outcomes separately.
- The JMX counter descriptions did not state their reset scope and described every dequeue as an acknowledgement. They now describe dispatches and removals since the last statistics reset and identify acknowledgement as the normal removal path.
- The diagnostic table listed an unstarted connection as a reason for seeing no consumers. A connection can be in stopped mode after its consumers have been created; `start()` controls message delivery. The row now lists conditions that explain an absent consumer, while the existing `connection.start()` reminder remains.
- The queue-design section said unmatched messages remain indefinitely. Messages with an expiration or messages removed administratively do not. The sentence now states that unmatched messages remain until they expire or are removed.

## Review Notes

The Java selector example, ActiveMQ destination-policy XML, connection URI, per-destination prefetch syntax, documented defaults (`maxPageSize` 200 and native queue prefetch 1000), JMX attribute names, pending-message-limit scope, and all documentation links were verified. The provider-specific `ActiveMQQueue` example remains valid; applications using ActiveMQ Classic 5.x use the `javax.jms` API lineage, while ActiveMQ Classic 6.x uses Jakarta Messaging packages.
