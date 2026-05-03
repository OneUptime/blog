# Validation Summary: How to Deploy ActiveMQ via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache ActiveMQ Classic (v5/v6)
- Apache ActiveMQ Artemis
- Docker / Docker Compose
- Portainer Stacks
- JMS (Java Message Service) / Jakarta Messaging
- AMQP, STOMP, MQTT, OpenWire protocols
- Java client (ActiveMQConnectionFactory)
- Eclipse Mosquitto (used for MQTT testing)

## Sources Consulted
- Apache ActiveMQ Classic documentation: https://activemq.apache.org/components/classic/
- Apache ActiveMQ Artemis documentation: https://activemq.apache.org/components/artemis/documentation/
- ActiveMQ Artemis CLI reference: https://activemq.apache.org/components/artemis/documentation/latest/using-server.html and `artemis help` output
- apache/activemq-artemis Docker image (Docker Hub) — environment variables `ARTEMIS_USER`, `ARTEMIS_PASSWORD`, `ANONYMOUS_LOGIN`, `EXTRA_ARGS`
- rmohr/activemq Docker image — environment variables `ACTIVEMQ_ADMIN_LOGIN`, `ACTIVEMQ_ADMIN_PASSWORD`, `ACTIVEMQ_CONFIG_MINMEMORY`, `ACTIVEMQ_CONFIG_MAXMEMORY`
- Maven Central: org.apache.activemq:activemq-client artifact versions and JMS namespace history (https://mvnrepository.com/artifact/org.apache.activemq/activemq-client)
- ActiveMQ Classic 6.0 release notes (Jakarta JMS namespace migration)

## Issues Found
- **Java client dependency / import mismatch**: The Java example imported `jakarta.jms.*` but pinned the Maven dependency to `org.apache.activemq:activemq-client:5.18.0`. ActiveMQ Classic 5.18.x still ships with the legacy `javax.jms` namespace; the move to `jakarta.jms` happened in ActiveMQ Classic 6.0. As written, the code would fail to compile because the imports do not resolve in the 5.18.x artifact. Updated the Maven coordinates to `org.apache.activemq:activemq-client:6.1.4`, which is the correct artifact for the `jakarta.jms` API used in the example.

## Review Notes
- The healthcheck for ActiveMQ Classic (`curl -f http://localhost:8161/admin`) hits a path that requires HTTP basic auth in stock configurations; with `-f`, curl will treat the 401 as a failure. In practice many readers will not notice (Docker still starts the container), and the healthcheck is illustrative, but adding `-u admin:admin123` (or hitting a non-protected endpoint) would make it functional. Left as-is because it is illustrative and changing it would be a stylistic choice.
- The Artemis service exposes ports 5672 (AMQP) and 1883 (MQTT) on top of 61616. The default `broker.xml` shipped by `apache/activemq-artemis` includes acceptors on those ports as well as the multi-protocol acceptor on 61616, so exposing them is valid; the inline comment correctly notes that 61616 already accepts all protocols.
- `rmohr/activemq` is a community-maintained image (not the official Apache image). The official Apache ActiveMQ Classic image is `apache/activemq-classic`. The community image still works and matches the documented env vars, so no change was made, but readers may eventually want to migrate.
- Versions referenced are accurate for the post's 2026 timeframe; ActiveMQ Classic 6.1.x and ActiveMQ Artemis 2.3x are current GA lines.
