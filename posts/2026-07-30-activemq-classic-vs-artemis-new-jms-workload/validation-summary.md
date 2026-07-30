# Validation Summary: ActiveMQ Classic or Artemis? How to Choose for a New JMS Workload

## Status
validated

## Post Type
Technical decision guide

## Technologies Covered
- ActiveMQ Classic 6.3.x, 6.2.x, and 5.19.x
- Apache Artemis 2.55
- JMS 1.1 and JMS 2.0
- Jakarta Messaging 3.1
- OpenWire, Artemis Core, AMQP 1.0, MQTT, and STOMP
- ActiveMQ Classic virtual destinations, message cursors, producer flow control, JMX, and networks of brokers
- Apache Artemis addresses, queues, anycast/multicast routing, paging, flow control, management, clustering, HA, and federation
- KahaDB and the Apache Artemis journal

## Sources Consulted
- ActiveMQ Classic downloads, supported series, Java versions, and JMS API support — https://activemq.apache.org/components/classic/download/
- ActiveMQ Classic Jakarta Messaging 3.1 and JMS 2.0 support — https://activemq.apache.org/components/classic/documentation/jms2
- ActiveMQ Classic features and supported protocols — https://activemq.apache.org/components/classic/documentation/features-overview
- ActiveMQ Classic prefetch behavior — https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for
- ActiveMQ Classic message cursors — https://activemq.apache.org/components/classic/documentation/message-cursors
- ActiveMQ Classic producer flow control — https://activemq.apache.org/components/classic/documentation/producer-flow-control
- ActiveMQ Classic JMX MBeans and destination attributes — https://activemq.apache.org/components/classic/documentation/jmx
- ActiveMQ Classic virtual destinations — https://activemq.apache.org/components/classic/documentation/virtual-destinations
- ActiveMQ Classic networks of brokers — https://activemq.apache.org/components/classic/documentation/networks-of-brokers
- Apache Artemis 2.55 download and Java compatibility — https://artemis.apache.org/components/artemis/download/
- Apache Artemis version history, including the 2.50 project-name change — https://artemis.apache.org/components/artemis/documentation/latest/versions.html
- Apache Artemis project history and HornetQ donation — https://artemis.apache.org/components/artemis/documentation/hacking-guide/
- Apache Artemis protocols and interoperability — https://artemis.apache.org/components/artemis/documentation/latest/protocols-interoperability.html
- Apache Artemis client classpath and JMS/Jakarta artifacts — https://artemis.apache.org/components/artemis/documentation/latest/client-classpath.html
- Apache Artemis address model — https://artemis.apache.org/components/artemis/documentation/latest/address-model.html
- Apache Artemis Core flow control — https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html
- Apache Artemis paging and address-full policies — https://artemis.apache.org/components/artemis/documentation/latest/paging.html
- Apache Artemis management API and JMX model — https://artemis.apache.org/components/artemis/documentation/latest/management.html
- Apache Artemis OpenWire compatibility, advisories, and virtual-topic translation — https://artemis.apache.org/components/artemis/documentation/latest/openwire.html
- ActiveMQ Classic-to-Artemis architectural and storage differences — https://artemis.apache.org/components/artemis/migration-documentation/key-differences.html
- ActiveMQ Classic-to-Artemis message migration options — https://activemq.apache.org/components/classic/documentation/activemq-artemis-roadmap

## Issues Found
1. **The supported ActiveMQ Classic series list omitted 6.3.x.** ActiveMQ Classic 6.3.0 was released on July 27, 2026 and Apache lists 6.3.x as stable and supported alongside 6.2.x and 5.19.x. Updated the supported-series sentence to include 6.3.x and updated the following compatibility bullet to state that both 6.3.x and 6.2.x use `jakarta.jms`, require Java 17 or later, and have partial Jakarta Messaging 3.1/JMS 2 functionality.

## Review Notes
- The post contains no runnable code, shell commands, or configuration snippets, but it has substantial technical implementation detail and therefore received a full technical review.
- All external links in the post resolve to the intended official Apache documentation.
- The remaining claims about broker identity, protocol support, routing, backlog handling, flow control, management objects, OpenWire compatibility, and non-interchangeable stores/configuration models are consistent with the cited official documentation.
- The release and compatibility statements are version-sensitive. In particular, the `latest` Apache Artemis documentation links currently refer to 2.55.0 and will advance when a newer release is published.
