# Validation Summary: How to Install and Configure Kafka on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka 3.6.1
- Apache ZooKeeper
- Kafka KRaft mode
- Java (OpenJDK 11)
- systemd
- Ubuntu (20.04 / 22.04 / 24.04)
- SASL / SSL (TLS) security
- JMX monitoring

## Sources Consulted
- Apache Kafka downloads directory — https://downloads.apache.org/kafka/ (current versions only)
- Apache Kafka archive — https://archive.apache.org/dist/kafka/3.6.1/ (verified 3.6.1 tarball returns HTTP 200)
- Apache Kafka KRaft operations docs — https://kafka.apache.org/38/operations/kraft/
- Kafka metadata shell reference — https://books.japila.pl/kafka-internals/tools/kafka-metadata-shell/
- Confluent CLI tools documentation — https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found
1. **Broken download URL.** The post pointed to `https://downloads.apache.org/kafka/3.6.1/kafka_2.13-3.6.1.tgz`. `downloads.apache.org` only hosts current releases, and 3.6.1 has been removed (it now returns HTTP 404). Changed the URL to `https://archive.apache.org/dist/kafka/3.6.1/kafka_2.13-3.6.1.tgz`, which serves the archived 3.6.1 tarball (verified HTTP 200, Last-Modified 2023-12-05). This keeps the author's chosen version intact while making the command work.

2. **Non-existent CLI tool / invalid flag.** The "Check Broker Health" section invoked `/opt/kafka/bin/kafka-metadata.sh --snapshot ... --command "cat"`. There is no `kafka-metadata.sh` script in the Kafka distribution; the correct tool is `kafka-metadata-shell.sh`. That tool also does not accept a `--command` flag — it opens an interactive shell (`ls`, `cat`, `tree`, `exit`, etc.) after loading the snapshot. Corrected the script name to `kafka-metadata-shell.sh`, removed the invalid `--command "cat"` flag, and noted in a comment that it launches an interactive shell.

## Review Notes
- All other commands and configuration were verified as correct: `kafka-topics.sh`, `kafka-console-producer.sh`/`-consumer.sh`, `kafka-consumer-groups.sh` (including `--reset-offsets ... --to-earliest --execute`), `kafka-configs.sh --alter`, `kafka-storage.sh random-uuid`/`format`, and `zookeeper-shell.sh` all use valid subcommands and flags.
- `server.properties`, `zookeeper.properties`, and KRaft `server.properties` keys (e.g. `process.roles`, `node.id`, `controller.quorum.voters`, `offsets.topic.replication.factor`, `transaction.state.log.min.isr`) are all valid for Kafka 3.6.
- SASL (`sasl.mechanism.inter.broker.protocol`, `sasl.enabled.mechanisms`) and SSL property names and the JAAS `PlainLoginModule` config are correct.
- Minor (not corrected, not an error): in the KRaft section the post formats storage before editing `kraft/server.properties`. The shipped default config is valid for a single-node format, so this works, but editing the config first is the more natural order.
- Version caveat: the post pins Kafka 3.6.1. As of mid-2026 the current Kafka line is 4.x (and ZooKeeper mode has been removed in Kafka 4.0 in favor of KRaft). The 3.6.1 instructions remain accurate for that release, but readers targeting current Kafka should follow the KRaft-only path.
