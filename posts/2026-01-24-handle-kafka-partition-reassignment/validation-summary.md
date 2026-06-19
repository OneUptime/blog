# Validation Summary: How to Handle Kafka Partition Reassignment

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Apache Kafka partition reassignment
- Kafka command-line tools (`kafka-reassign-partitions.sh`, `kafka-topics.sh`, `kafka-log-dirs.sh`, `kafka-consumer-groups.sh`)
- Kafka Java consumer API
- Kafka consumer group rebalancing
- Cruise Control REST API
- Python scripting with `subprocess`

## Sources Consulted
- Apache Kafka documentation: Basic Kafka Operations - limiting bandwidth usage during data migration: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Apache Kafka Javadoc: `CooperativeStickyAssignor`: https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/consumer/CooperativeStickyAssignor.html
- Apache Kafka Javadoc: `ConsumerRebalanceListener`: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka upgrade notes for cooperative rebalancing and `onPartitionsLost`: https://kafka.apache.org/30/getting-started/upgrade/
- Cruise Control REST API documentation: https://github.com/linkedin/cruise-control/wiki/rest-apis

## Issues Found
- The throttle adjustment command reran `--execute` without Kafka's documented `--additional` option. Added `--additional` to match the documented way to alter throttles during an active reassignment.
- The post claimed partition reassignment triggers consumer group rebalancing. Corrected this to explain that broker-side replica movement does not normally change consumer partition ownership, though consumers can still be affected by broker load, leader movement, or separate group changes.
- The Java rebalance listener example used `Duration.ofMillis(...)` without importing `java.time.Duration`. Added the missing import.
- The Cruise Control rebalance example used `throttle_added_broker` for a normal rebalance and omitted `dryrun=false` for execution examples. Replaced it with `replication_throttle` and added `dryrun=false` where the examples are intended to execute.
- The Python helper parsed `kafka-topics.sh --describe` output with fixed tab positions that could read the wrong fields. Replaced that with key/value field parsing.
- The Python helper did not detect Kafka's current reassignment completion wording (`is completed`). Added that status check.
- The Python helper could generate invalid duplicate broker replicas if the requested replication factor exceeded the number of target brokers. Added validation to reject that plan.
- The Python helper manually deleted only broker-level throttle configs after completion. Changed cleanup to use `kafka-reassign-partitions.sh --verify`, which is the documented cleanup path for reassignment throttles.

## Review Notes
- Kafka command-line tools were not installed in the local environment, so CLI verification was performed against Apache Kafka documentation rather than local `--help` output.
- The cooperative assignor example is valid for current Kafka clients, but production migrations from older eager assignors should use Kafka's documented rolling upgrade path.
