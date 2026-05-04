# Validation Summary: How to Configure Apache Kafka with IPv6 Listeners

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Apache Kafka (broker configuration, server.properties)
- Apache Kafka KRaft mode (controller.quorum.voters, process.roles)
- Apache ZooKeeper (zookeeper.connect)
- Kafka CLI tools (kafka-topics.sh, kafka-console-producer.sh, kafka-console-consumer.sh, kafka-broker-api-versions.sh)
- kafka-python client library (KafkaProducer, KafkaConsumer)
- JVM networking properties (java.net.preferIPv6Addresses)
- IPv6 addressing and bracket notation (RFC 3986)
- Linux networking utilities (ss)

## Sources Consulted
- Apache Kafka 4.1 Listener Configuration: https://kafka.apache.org/41/security/listener-configuration/
- Apache Kafka Broker Configs: https://kafka.apache.org/42/configuration/broker-configs/
- KIP-797 (Accept duplicate listener on port for IPv4/IPv6): https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=195726330
- KAFKA-13299 (IPv6 bracket notation): https://issues.apache.org/jira/browse/KAFKA-13299
- ZOOKEEPER-3878 (IPv6 in zookeeper.connect): https://issues.apache.org/jira/browse/ZOOKEEPER-3878
- Apache Kafka KRaft Operations: https://kafka.apache.org/41/operations/kraft/
- kafka-python source (kafka/conn.py — `get_ip_port_afi`): https://kafka-python.readthedocs.io/en/master/_modules/kafka/conn.html
- Oracle Java Networking Properties: https://docs.oracle.com/javase/7/docs/api/java/net/doc-files/net-properties.html
- RFC 3986 (URI bracket notation for IPv6 literals)

## Issues Found
No technical issues found.

All configuration directives, CLI invocations, Python client usage, and JVM options were verified against official Apache Kafka documentation and the kafka-python source. Specifically confirmed:

- `listeners` and `advertised.listeners` accept bracketed IPv6 literals (`PLAINTEXT://[2001:db8::10]:9092`).
- `zookeeper.connect` accepts bracketed IPv6 host:port pairs.
- `controller.quorum.voters` uses the `{id}@{host}:{port}` format with bracketed IPv6 hosts.
- kafka-python's `bootstrap_servers` parser explicitly handles bracketed IPv6 literals and selects `AF_INET6`.
- `-Djava.net.preferIPv6Addresses=true` is a valid JVM system property.
- Kafka CLI tools share the same bootstrap parser, so bracketed IPv6 works in `--bootstrap-server`.
- `inter.broker.listener.name`, `controller.listener.names`, and `listener.security.protocol.map` syntax are correct.

## Review Notes
- The `listener.security.protocol.map` line in the KRaft section includes `PLAINTEXT:PLAINTEXT`, which is part of the default map and is technically redundant — only `CONTROLLER:PLAINTEXT` is strictly required. The configuration is still valid as written, just slightly verbose.
- ZooKeeper-based deployment is shown alongside KRaft. Note that ZooKeeper support is removed in Apache Kafka 4.0+ (KRaft is the only mode). Readers on Kafka 4.x should use only the KRaft section.
- The `-Djava.net.preferIPv6Addresses=true` flag is a JVM-level property (not Kafka-defined); the post correctly places it in `KAFKA_OPTS`, which is the recommended location.
- When passing bracketed IPv6 addresses on the shell command line (e.g., `--bootstrap-server [2001:db8::10]:9092`), the brackets can sometimes be interpreted as glob characters by the shell. In practice this rarely matches anything and works fine, but quoting the argument (`'[2001:db8::10]:9092'`) is a safer habit. The post's commands work as written.
- The first config block's comment says "use [::] for all IPv6 interfaces" but the example then sets a specific address. This is informational and consistent with the dedicated "Listen on All IPv6 Interfaces" section that follows.
