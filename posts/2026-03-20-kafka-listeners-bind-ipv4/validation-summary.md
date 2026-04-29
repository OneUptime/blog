# Validation Summary: How to Configure Kafka Listeners to Bind to IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- Kafka listener configuration
- Kafka KRaft mode
- Apache ZooKeeper-based Kafka mode (legacy)
- Linux networking and firewall tools (`ss`, `nc`, `ufw`, `iptables`)

## Sources Consulted
- Apache Kafka broker configuration reference: https://kafka.apache.org/42/configuration/broker-configs/
- Apache Kafka listener configuration guide: https://kafka.apache.org/42/security/listener-configuration/
- Apache Kafka KRaft operations guide: https://kafka.apache.org/42/operations/kraft/
- Apache Kafka quickstart: https://kafka.apache.org/42/getting-started/quickstart/
- Apache Kafka 4.0 upgrade guide: https://kafka.apache.org/40/getting-started/upgrade/
- Local CLI help output for `ss`: `ss --help`
- Local CLI help output for `nc`: `nc -h`
- Local CLI help output for `iptables`: `iptables --help`
- Local CLI help output for `ufw`: `ufw --help`

## Issues Found
- The introduction implied Kafka defaults to binding to all interfaces. Kafka's broker configuration docs distinguish `0.0.0.0` from an empty hostname, so the wording was corrected to avoid overstating the default binding behavior.
- The listener-name comment implied only protocol names such as `PLAINTEXT` or `SSL` are valid. Kafka also supports custom listener names such as `CONTROLLER`, `INTERNAL`, and `EXTERNAL`, so that explanation was corrected.
- The KRaft example omitted `controller.listener.names=CONTROLLER`, which is required when the server has the controller role. That property was added, the quorum setting was updated to the current `controller.quorum.bootstrap.servers` form used in modern KRaft documentation, and the `broker.id` line was clarified as applying to older ZooKeeper-based clusters.
- The `advertised.listeners` explanation and the conclusion were too narrow. Kafka advertises endpoints to clients and other brokers, and NAT scenarios may require an advertised address that differs from the bound listener address. Both explanations were corrected.
- The socket-verification note only expected `9092` even though the example also configured a controller listener on `9093`. The expected result was updated to include both ports.
- The firewall examples allowed `9092` traffic but omitted `9093` for the KRaft controller quorum shown earlier in the post. Matching `9093` examples were added for both `ufw` and `iptables`.
- The producer test used `kafka-console-producer.sh --broker-list`. Current Kafka quickstart documentation uses `--bootstrap-server`, so the example was updated to the current CLI syntax.

## Review Notes
- ZooKeeper mode references remain relevant only for older Kafka releases. Apache Kafka 4.0 and later are KRaft-only.
- The `systemctl restart kafka` service name and `/var/log/kafka/server.log` path are distribution-specific examples rather than universal Kafka defaults.
- The firewall rules are syntactically valid examples, but real deployments should scope the source addresses to the actual client, broker, and controller networks in use.
