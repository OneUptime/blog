# Validation Summary: Migrating ActiveMQ Classic Virtual Topics to Artemis Addresses and Queues

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- ActiveMQ Classic virtual topics and virtual destinations
- Apache ActiveMQ Artemis addresses, queues, and routing types
- OpenWire virtual-topic consumer translation
- Fully qualified queue names (FQQNs)
- JMS and Jakarta Messaging clients
- KahaDB and Artemis message-store migration
- Artemis selectors, redelivery, expiry, dead-lettering, and management metrics

## Sources Consulted
- ActiveMQ Classic virtual destinations and default virtual-topic naming (https://activemq.apache.org/components/classic/documentation/virtual-destinations)
- Apache ActiveMQ Artemis OpenWire documentation (https://artemis.apache.org/components/artemis/documentation/latest/openwire.html)
- Apache ActiveMQ Artemis protocols and interoperability documentation (https://artemis.apache.org/components/artemis/documentation/latest/protocols-interoperability.html)
- Apache ActiveMQ Artemis address model, routing types, multicast queues, filters, and FQQNs (https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- Apache ActiveMQ Artemis JMS-to-core mapping (https://artemis.apache.org/components/artemis/documentation/latest/jms-core-mapping.html)
- Apache ActiveMQ Artemis JMS and Jakarta client classpath documentation (https://artemis.apache.org/components/artemis/documentation/latest/client-classpath)
- Apache ActiveMQ Artemis filter expressions (https://artemis.apache.org/components/artemis/documentation/latest/filter-expressions.html)
- Apache ActiveMQ Artemis management API and queue metrics (https://artemis.apache.org/components/artemis/documentation/latest/management.html)
- Apache ActiveMQ Artemis message expiry documentation (https://artemis.apache.org/components/artemis/documentation/latest/message-expiry.html)
- Apache ActiveMQ Artemis message redelivery and undelivered-message documentation (https://artemis.apache.org/components/artemis/documentation/latest/undelivered-messages.html)
- Apache ActiveMQ Artemis migration guide for virtual topics (https://artemis.apache.org/components/artemis/migration-documentation/VirtualTopics.html)
- Apache ActiveMQ Artemis message-store migration guide (https://artemis.apache.org/components/artemis/migration-documentation/message-store.html)

## Issues Found
- The post said the Artemis documentation lists supported OpenWire behavior feature by feature. The current OpenWire documentation describes supported options and examples but is not a comprehensive compatibility matrix for every ActiveMQ Classic broker extension. The wording was corrected so readers know to test the exact client and extensions they use.
- The relay guidance allowed each ActiveMQ Classic consumer queue to be forwarded to either the Artemis address or queue. Because Classic consumer queues already contain fanned-out copies, sending each backlog to the multicast address would fan every copy out again and create duplicates across target queues. The guidance now requires sending each consumer queue directly to its corresponding Artemis queue using an FQQN.

## Review Notes
- The review used the latest Artemis user manual, version 2.55.0 at validation time. The post does not pin an Artemis version, so OpenWire compatibility and configuration should be rechecked when upgrading.
- Artemis documents OpenWire JMS client interoperability for ActiveMQ Classic client libraries from 5.12.x onward, but applications must still test any Classic-specific destination or consumer extensions they rely on.
- The official migration guide also documents an offline KahaDB or mKahaDB export to Artemis XML followed by an Artemis import. The post's statement that Artemis cannot use a KahaDB directory as its own journal is correct; export/import is a conversion workflow rather than direct journal reuse.
