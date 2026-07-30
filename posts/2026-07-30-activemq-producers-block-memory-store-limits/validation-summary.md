# Validation Summary: Why ActiveMQ Producers Block When Memory or Store Usage Reaches Its Limit

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- ActiveMQ Classic
- Apache ActiveMQ Artemis
- Java Message Service (JMS)
- OpenWire, Core, and AMQP producer flow control
- KahaDB, message cursors, temporary storage, paging, and disk-capacity policies
- JMX broker and destination monitoring

## Sources Consulted

- [ActiveMQ Classic producer flow control](https://activemq.apache.org/components/classic/documentation/producer-flow-control)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic JMX](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic KahaDB](https://activemq.apache.org/components/classic/documentation/kahadb)
- [Why KahaDB log files remain after cleanup](https://activemq.apache.org/components/classic/documentation/why-do-kahadb-log-files-remain-after-cleanup)
- [Apache ActiveMQ Artemis flow control](https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html)
- [Apache ActiveMQ Artemis paging](https://artemis.apache.org/components/artemis/documentation/latest/paging.html)
- [Apache ActiveMQ Artemis address settings](https://artemis.apache.org/components/artemis/documentation/latest/address-settings.html)
- [Apache ActiveMQ Artemis configuration reference](https://artemis.apache.org/components/artemis/documentation/latest/configuration-index.html)
- [Apache ActiveMQ Artemis address model](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)

## Issues Found

- The original capacity formula subtracted the acknowledged consumer rate from the producer rate without limiting that simplification to a single queue. That calculation becomes incorrect for multicast fan-out because one publication is routed to multiple subscription queues, and acknowledgements from separate subscriptions cannot be aggregated and subtracted from the original publication count. The formula now uses retained bytes added minus retained bytes released, states that the calculation applies only for positive growth, gives the message-rate simplification only for a single queue with roughly uniform message sizes, and requires per-subscription retention accounting for multicast.

## Review Notes

- The Classic XML snippets use documented `producerFlowControl`, `memoryLimit`, `sendFailIfNoSpaceAfterTimeout`, `memoryUsage`, `storeUsage`, and `tempUsage` settings. Per-destination `sendFailIfNoSpace` and `sendFailIfNoSpaceAfterTimeout` require ActiveMQ Classic 5.16.0 or newer, as the post notes in version-neutral language.
- The Artemis XML snippet and the `PAGE`, `BLOCK`, `FAIL`, and `DROP` address-full policies match the current documentation. `max-size-bytes-reject-threshold` is specific to AMQP clients using `BLOCK`.
- Artemis page limits and `page-full-policy` are available from Artemis 2.28.0. Current documentation lists `DROP` and `FAIL` as the page-full outcomes.
- Artemis configuration-reference defaults and generated broker-instance defaults can differ, so the post correctly advises checking the deployed `broker.xml` and effective wildcard match.
