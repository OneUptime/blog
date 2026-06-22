# Validation Summary: How to Configure Kafka Cluster with ZooKeeper

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Apache Kafka
- Apache ZooKeeper
- Confluent Platform Docker images
- Docker Compose
- Kafka CLI tools
- SASL/SCRAM authentication
- JMX monitoring
- UFW firewall rules

## Sources Consulted
- Apache Kafka 3.6 Broker Configs: https://kafka.apache.org/36/configuration/broker-configs/
- Apache Kafka 3.6 SASL/SCRAM authentication: https://kafka.apache.org/36/security/authentication-using-sasl/
- Apache Kafka 4.0 KRaft vs ZooKeeper documentation: https://kafka.apache.org/40/getting-started/zk2kraft/
- Apache ZooKeeper Administrator's Guide: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- Confluent Docker Image Configuration Reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Broker Configuration Reference: https://docs.confluent.io/platform/current/installation/configuration/broker-configs.html

## Issues Found
- The introduction described Kafka as "moving toward KRaft mode", which is outdated for current Kafka releases. Updated it to clarify that the guide applies to Kafka 3.x / Confluent Platform 7.x ZooKeeper-mode clusters, while Kafka 4.0 and later support KRaft only.
- The verification section used `kafka-metadata.sh` commands, which inspect KRaft metadata logs/controllers and do not apply to a ZooKeeper-mode cluster. Replaced them with `zkCli.sh` checks for `/kafka/controller` and `/kafka/controller_epoch`.
- The SASL/SCRAM section created the inter-broker SCRAM user with `--bootstrap-server`, but inter-broker SCRAM credentials must exist before brokers start when ZooKeeper mode is used. Changed the commands to write SCRAM credentials through ZooKeeper with `--zookeeper zk1.example.com:2181/kafka`.
- The JAAS comment said the listener property was a path to a JAAS file, but the shown property is an inline JAAS configuration. Updated the comment.

## Review Notes
The ZooKeeper-mode configuration is appropriate only for Kafka versions that still support ZooKeeper. For new deployments on Kafka 4.x and later, use KRaft instead. The Docker Compose `version` key is accepted by many Compose installations but is obsolete in the current Compose Specification; it was left unchanged because it does not make the example invalid for the stated Confluent Platform 7.5-style setup.
