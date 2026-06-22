# Validation Summary: How to Fix 'CommitFailedException' in Kafka Consumer

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Kafka consumers
- Kafka Java client
- Kafka consumer group coordination
- Kafka offset commits
- Spring Boot Kafka configuration
- Kafka command-line tools

## Sources Consulted
- Apache Kafka Consumer Configuration Reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka `KafkaConsumer` Java API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka Basic Kafka Operations, consumer group tool examples: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka KIP-62: Allow consumer to send heartbeats from a background thread: https://cwiki.apache.org/confluence/display/KAFKA/KIP-62%3A%2BAllow%2Bconsumer%2Bto%2Bsend%2Bheartbeats%2Bfrom%2Ba%2Bbackground%2Bthread

## Issues Found
- The introduction attributed the exception mainly to session timeouts during long processing. Updated it to distinguish modern clients, where exceeding `max.poll.interval.ms` is the typical cause, from older clients where long processing could also cause session timeouts because heartbeats were tied to polling.
- The timeout relationship diagram and comments treated `heartbeat.interval.ms < session.timeout.ms / 3` and `session.timeout.ms < max.poll.interval.ms` as hard rules. Updated this to match Kafka documentation: heartbeat must be lower than session timeout and is typically no higher than one third of it; keeping session timeout below max poll interval is a practical recommendation rather than a strict client validation rule.
- The async processing example could commit offsets for a partition after a later task completed while an earlier task was still running. Updated the example to track in-flight and completed offsets per partition and commit only through completed lower offsets.
- The manual partition assignment section said there was "no consumer group." Updated the wording to "no group management or automatic rebalancing" because manual assignment does not use Kafka's group management functionality, but a `group.id` can still be used for Kafka-based offset commits.

## Review Notes
The Kafka CLI commands for describing consumer groups, group state, and members match the official Kafka operations documentation. The Java examples remain illustrative snippets and omit some imports and placeholder application methods, but the Kafka APIs and configuration names used are current.
