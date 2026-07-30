# Validation Summary: Monitoring ActiveMQ with JMX and Prometheus: Queue Age, Backlog, Consumer Count, and Store Usage

## Status
validated

## Post Type
Technical monitoring guide

## Technologies Covered
- ActiveMQ Classic
- Java Management Extensions (JMX)
- ActiveMQ Classic broker and destination MBeans
- Prometheus JMX Exporter
- Prometheus and PromQL
- Java Message Service (JMS) / Jakarta Messaging
- KahaDB

## Sources Consulted
- ActiveMQ Classic JMX reference: https://activemq.apache.org/components/classic/documentation/jmx
- ActiveMQ Classic queue-size semantics: https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue
- ActiveMQ Classic `QueueViewMBean` API: https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html
- ActiveMQ Classic `DestinationViewMBean` API: https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/DestinationViewMBean.html
- ActiveMQ Classic 6.2.7 `BrokerViewMBean` source: https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/BrokerViewMBean.java
- ActiveMQ Classic 6.2.7 `DestinationViewMBean` source: https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/DestinationViewMBean.java
- ActiveMQ Classic 6.2.7 `HealthViewMBean` source: https://github.com/apache/activemq/blob/activemq-6.2.7/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/HealthViewMBean.java
- ActiveMQ Classic producer flow control and system usage: https://activemq.apache.org/components/classic/documentation/producer-flow-control
- ActiveMQ Classic KahaDB documentation: https://activemq.apache.org/components/classic/documentation/kahadb
- ActiveMQ Classic advisory messages: https://activemq.apache.org/components/classic/documentation/advisory-message
- Prometheus JMX Exporter Java agent documentation: https://prometheus.github.io/jmx_exporter/deployment/java-agent/
- Prometheus JMX Exporter configuration reference: https://prometheus.github.io/jmx_exporter/reference/configuration/
- Prometheus JMX Exporter rule documentation: https://prometheus.github.io/jmx_exporter/configuration/rules/
- Prometheus query function documentation for `rate()` and `increase()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rule documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Jakarta Messaging `Message` API documentation for `JMSTimestamp`: https://jakarta.ee/specifications/platform/11/apidocs/jakarta/jms/message

## Issues Found
- The broker attribute list described connector connection counts and health status as broker attributes. Connector and health data are exposed through separate MBeans, and the health MBean's `CurrentStatus` is not refreshed automatically. The list now names the actual `BrokerViewMBean` attributes `CurrentConnectionsCount`, `TotalConnectionsCount`, and `TempPercentUsage`.
- The message-age section grouped consumer-observed processed age and a bounded management sample under a "true oldest-pending" SLI. Neither method guarantees the age of the current oldest outstanding message. The section now distinguishes processed-age and diagnostic sampling from an application-maintained oldest-pending metric.
- `JMSTimestamp` was described as provider-set send time. The Jakarta Messaging specification defines it as a timestamp from when the message is handed to the provider for sending; it can be zero when timestamps are disabled and is not the broker arrival time. The wording was corrected accordingly.

## Review Notes
- The documented JMX Exporter Java-agent argument, YAML keys, object-name filters, and `/metrics` path are valid in the current JMX Exporter 1.6.0 documentation. The port-only agent form binds to `0.0.0.0`, so deployments should follow the post's instruction to bind or protect the endpoint according to their network model.
- The ActiveMQ documentation site's generated MBean API pages identify themselves as ActiveMQ 5.17.0. The relevant broker and destination attributes were also checked against the supported ActiveMQ Classic 6.2.7 source and remain present.
- The example Prometheus metric names are intentionally illustrative because final names and types depend on the exporter's rules. The post correctly tells readers to inspect and integration-test the emitted metrics.
