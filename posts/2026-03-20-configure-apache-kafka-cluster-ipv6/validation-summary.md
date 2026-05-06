# Validation Summary: How to Configure Apache Kafka Cluster with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- Apache ZooKeeper
- KRaft
- IPv6
- Java networking
- Python (`kafka-python`)
- Linux firewall configuration (`ip6tables`)

## Sources Consulted
- Apache Kafka 4.2 upgrade guide: https://kafka.apache.org/42/getting-started/upgrade/
- Apache Kafka 4.2 KRaft operations guide: https://kafka.apache.org/42/operations/kraft/
- Apache Kafka listener configuration: https://kafka.apache.org/40/security/listener-configuration/
- Apache Kafka 4.2 broker configs: https://kafka.apache.org/42/configuration/broker-configs/
- Apache Kafka 3.9 broker configs (`zookeeper.connect`): https://kafka.apache.org/39/configuration/broker-configs/
- Oracle Java networking properties: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- kafka-python usage and API docs: https://kafka-python.readthedocs.io/en/latest/usage.html and https://kafka-python.readthedocs.io/en/2.2.13/apidoc/KafkaProducer.html
- kafka-python releases: https://github.com/dpkp/kafka-python/releases
- Local inspection of `kafka-python` 2.2.15 source (`kafka/conn.py`) to verify bracketed IPv6 literal parsing for `bootstrap_servers`

## Issues Found
- The post presented ZooKeeper mode as if it were a current general Kafka deployment option. I updated the description and introductory text to scope ZooKeeper guidance to Kafka 3.x and earlier, because Kafka 4.0 and newer only support KRaft.
- The `zookeeper.connect` example used invalid placeholder values such as `2001:db8::zk1`, which are not valid IPv6 literals. I replaced them with hostnames intended to resolve via AAAA records, which also matches Kafka's documented `hostname:port` format for this setting.
- The listener comment said `::` listens on `IPv4 + IPv6`. I corrected that to the IPv6 wildcard address to avoid overclaiming dual-stack behavior, which can vary by platform and socket configuration.
- The multi-broker example used `broker.id` without saying it was a ZooKeeper-era configuration. I clarified that section applies to ZooKeeper-based clusters, since KRaft uses `node.id`.

## Review Notes
- The KRaft example uses a static controller quorum via `controller.quorum.voters`. This remains supported, but current Kafka documentation recommends dynamic quorum bootstrapping for new controller clusters.
- The `kafka-python` producer example is valid. Current client behavior accepts bracketed IPv6 literals, and literals with ports must be enclosed in brackets.
- The firewall persistence command writes to `/etc/ip6tables/rules.v6`, which is consistent with Debian/Ubuntu systems using `iptables-persistent`, but persistence details remain distribution-specific.
