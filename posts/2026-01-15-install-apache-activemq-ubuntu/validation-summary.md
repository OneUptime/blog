# Validation Summary: How to Install Apache ActiveMQ on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Apache ActiveMQ (Classic) 5.18.3
- Ubuntu (20.04 / 22.04 / 24.04 LTS)
- OpenJDK 17 (Java)
- JMS (Java Message Service) API — `javax.jms`
- STOMP, OpenWire, AMQP, MQTT, WebSocket protocols
- KahaDB persistence
- Python (`stomp.py` library)
- Java (`activemq-client`, Maven)
- systemd service management
- UFW / iptables firewall configuration
- JMX / Jolokia REST API monitoring
- SSL/TLS with `keytool`

## Sources Consulted
- Apache ActiveMQ Classic documentation — https://activemq.apache.org/components/classic/documentation/
- ActiveMQ Web Console docs — https://activemq.apache.org/components/classic/documentation/web-console
- ActiveMQ release jetty.xml — https://github.com/apache/activemq/blob/main/assembly/src/release/conf/jetty.xml
- `WebConsolePort` API docs — https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/web/WebConsolePort.html
- ActiveMQ archive distribution — https://archive.apache.org/dist/activemq/5.18.3/
- ActiveMQ default port reference (OpenWire 61616, Web Console 8161, STOMP 61613, AMQP 5672, MQTT 1883, WS 61614)

## Issues Found
1. **Java failover URL — missing string concatenation operator (compile error).** In the "Client Failover Configuration" section, the multi-line `String brokerUrl` was missing the `+` operator on the line `"initialReconnectDelay=1000&"`, so it sat directly before `"backup=true"`. As written this is a Java syntax error and would not compile. Fixed by appending `+` to the `initialReconnectDelay` line.

## Review Notes
- The `org.apache.activemq.web.WebConsolePort` bean used in the `jetty.xml` snippet was verified against the official ActiveMQ jetty.xml and API docs — it is a real, valid class. No change needed.
- ActiveMQ Classic 5.18.x correctly uses the `javax.jms` namespace (the migration to `jakarta.jms` only applies to ActiveMQ Classic 6.x), so the Java client examples and the `activemq-client` 5.18.3 dependency are consistent and correct.
- Default protocol ports (OpenWire 61616, AMQP 5672, STOMP 61613, MQTT 1883, WebSocket 61614) and the web console port 8161 all match ActiveMQ defaults.
- The download URL and version (5.18.3 from the Apache archive) are valid and well-formed.
- ActiveMQ 5.18 requires Java 11+; installing OpenJDK 17 satisfies this requirement.
- The STOMP `ack` call signature in the Python consumer (`connection.ack(message_id, subscription)`) is version-dependent across `stomp.py` releases; it works with the protocol-1.1 style but readers on newer `stomp.py` versions may need to adjust. This is a minor version caveat, not an error, so it was left as-is.
- Security examples use weak placeholder passwords, but the post explicitly flags these as defaults to change in production, which is acceptable for a tutorial.
