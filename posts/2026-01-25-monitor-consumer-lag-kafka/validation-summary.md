# Validation Summary: How to Monitor Consumer Lag in Kafka

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka consumer groups and offsets
- Kafka command-line tools
- Kafka Java AdminClient
- Kafka JMX consumer metrics
- Prometheus and PromQL
- danielqsj/kafka_exporter
- LinkedIn Burrow
- Grafana dashboard concepts

## Sources Consulted
- Apache Kafka monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka `KafkaConsumer` Javadocs: https://kafka.apache.org/22/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Confluent consumer group CLI documentation: https://docs.confluent.io/kafka/operations-tools/manage-consumer-groups.html
- Confluent Kafka Admin API Javadocs: https://docs.confluent.io/platform/current/clients/javadocs/javadoc/org/apache/kafka/clients/admin/Admin.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- danielqsj/kafka_exporter README: https://github.com/danielqsj/kafka_exporter
- LinkedIn Burrow README: https://github.com/linkedin/burrow
- LinkedIn Burrow Kafka consumer configuration wiki: https://github.com/linkedin/Burrow/wiki/Consumer-Kafka
- LinkedIn Burrow consumer group status API wiki: https://github.com/linkedin/Burrow/wiki/http-request-consumer-group-status
- LinkedIn Burrow consumer lag evaluation rules: https://github.com/linkedin/Burrow/wiki/Consumer-Lag-Evaluation-Rules
- Apache Kafka KIP-635 for GetOffsetShell/kafka-get-offsets flags: https://cwiki.apache.org/confluence/display/KAFKA/KIP-635%3A%2BGetOffsetShell%3A%2Bsupport%2Bfor%2Bmultiple%2Btopics%2Band%2Bconsumer%2Bconfiguration%2Boverride

## Issues Found
- The post described log end offset as the latest message offset. Updated the explanation and example to clarify that log end offset is the next offset after the latest message, so a committed offset of 3 and log end offset of 5 means offsets 3 and 4 are pending.
- The JMX startup example exported `KAFKA_JMX_OPTS` but did not pass those JVM options to a plain `java -jar` command. Updated the command to run `java $KAFKA_JMX_OPTS -jar my-consumer.jar`.
- The PromQL examples used `rate()` on `kafka_consumergroup_lag`, which is a gauge. Replaced those examples with `deriv()` because Prometheus documents `deriv()` for gauges and `rate()` for counters.
- The PromQL alert used uppercase `AND`. Changed it to PromQL's lowercase `and` operator.
- The Java AdminClient example used `Collectors.toMap(...)` without importing `java.util.stream.Collectors`. Added the missing import so the snippet compiles with the Kafka client dependency present.
- The Burrow API status description listed `WARNING` and `ERROR`, but Burrow documents status values such as `WARN` and `ERR`. Updated the text to match Burrow's documented statuses.
- The PromQL comment said "Topics with no active consumers", but the query checks for topics without committed consumer offsets, not live group membership. Updated the comment to avoid overclaiming.

## Review Notes
- The `kafka.tools.GetOffsetShell --broker-list` example remains usable for compatibility, but `--broker-list` is deprecated in favor of `--bootstrap-server`/`kafka-get-offsets.sh` in newer Kafka tooling.
- The JMX example disables authentication and SSL. That is acceptable as a minimal local example, but production deployments should secure remote JMX.
