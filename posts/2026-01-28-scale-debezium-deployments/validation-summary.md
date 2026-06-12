# Validation Summary: How to Scale Debezium Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Debezium
- PostgreSQL logical replication
- Kafka Connect
- Apache Kafka topics and consumer groups
- Docker Compose
- Kubernetes Deployments and HorizontalPodAutoscaler
- Strimzi Kafka Operator
- Prometheus/JMX monitoring
- kafka-python

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium Partition Routing SMT documentation: https://debezium.io/documentation/reference/stable/transformations/partition-routing.html
- Debezium monitoring documentation: https://debezium.io/documentation/reference/stable/operations/monitoring.html
- Debezium Kafka Connect topic auto-creation documentation: https://debezium.io/documentation/reference/stable/configuration/topic-auto-create-config.html
- Debezium example JMX exporter configuration: https://github.com/debezium/debezium-examples/blob/main/monitoring/debezium-jmx-exporter/config.yml
- Apache Kafka Connect administration documentation: https://kafka.apache.org/42/kafka-connect/administration/
- Confluent Kafka Connect worker/internal topics documentation: https://docs.confluent.io/platform/current/connect/userguide.html
- Strimzi KafkaConnect configuration documentation: https://strimzi.io/docs/operators/latest/configuring.html
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Confluent Kafka partition count documentation: https://docs.confluent.io/kafka/operations-tools/partition-determination.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html

## Issues Found
- The connector status command was labeled as checking connector lag, but Kafka Connect status returns connector/task state, not Debezium replication lag. Changed the comment to "Check connector task status."
- The `kafka-consumer-groups --describe` example was labeled as monitoring events per second, but the command reports consumer group offsets and lag. Changed the comment to "Monitor consumer group lag."
- The JVM tuning shell example used `KAFKA_JVM_OPTS`, which is not the documented Kafka Connect environment variable for JMX/JVM options. Changed it to `KAFKA_OPTS`.
- The PostgreSQL task parallelism example set `tasks.max` to `4`, but the Debezium PostgreSQL connector always uses a single task. Changed the explanation and example to show `tasks.max` as `1`.
- The HPA section said it autoscaled on CPU only, while the YAML also configured memory metrics. Updated the text to say CPU and memory.
- The Strimzi example used `kafka.strimzi.io/v1beta2`; current Strimzi documentation shows `kafka.strimzi.io/v1` for `KafkaConnect`. Updated the API version.
- The Debezium PartitionRouting SMT class name was incorrect. Changed `io.debezium.transforms.PartitionRouting` to `io.debezium.transforms.partitions.PartitionRouting`.
- The Prometheus alert examples used metric names that did not match Debezium's documented/example JMX exporter naming. Updated the lag and queue-capacity examples and added a note that metric names depend on JMX exporter rules.

## Review Notes
- The post uses Debezium 2.5 image/plugin examples. They are version-specific and older than current Debezium documentation, but the corrected settings are consistent with the documented behavior of the PostgreSQL connector and Kafka Connect.
- The resource planning table is a rough sizing heuristic, not a guarantee. Real throughput depends heavily on database workload, row size, snapshot mode, Kafka producer settings, broker capacity, and consumer behavior.
