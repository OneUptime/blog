# Validation Summary: How to Scale Flink Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Flink DataStream API
- Apache Flink TaskManager memory and network configuration
- Apache Flink reactive scaling and savepoints
- Apache Flink Kubernetes Operator
- Kubernetes Deployments and HorizontalPodAutoscaler
- Apache Kafka source connector
- Prometheus alerting rules

## Sources Consulted
- Apache Flink 1.17 Configuration: https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/deployment/config/
- Apache Flink 1.17 Elastic Scaling: https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/deployment/elastic_scaling/
- Apache Flink 1.17 Parallel Execution: https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/dev/datastream/execution/parallel/
- Apache Flink 1.17 Kafka Connector: https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/connectors/datastream/kafka/
- Apache Flink 1.17 State Backends: https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/ops/state/state_backends/
- Apache Flink 1.17 Command-Line Interface: https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/deployment/cli/
- Apache Flink Kubernetes Operator configuration reference: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/docs/operations/configuration/
- Apache Flink Kubernetes Operator custom resource reference: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/docs/custom-resource/reference/
- Apache Flink Kubernetes Operator 1.11.0 release announcement: https://flink.apache.org/2025/03/03/apache-flink-kubernetes-operator-1.11.0-release-announcement/

## Issues Found
- The reactive scaling section did not mention Flink's deployment-mode restriction. Added a caveat that reactive mode is supported for standalone application deployments, including standalone Kubernetes application clusters, and not native Kubernetes/YARN.
- The Flink Kubernetes Operator example used `state.backend`; updated it to the current `state.backend.type` key for configuring RocksDB.
- The Flink Kubernetes Operator autoscaler example used the older `kubernetes.operator.job.autoscaler.*` prefix and older utilization settings. Updated it to current `job.autoscaler.*` keys and the non-deprecated utilization target form.
- The Kafka section said source parallelism should match or be a multiple of partitions, including 32 for 16 partitions. Flink's Kafka source creates idle readers when parallelism exceeds partition count, so the guidance now recommends matching partition count.
- The `flink run` command put an inline comment after a line-continuation backslash, which would break shell execution. Removed the inline comment from the continued command.

## Review Notes
The Java snippets remain illustrative and omit surrounding imports, placeholder source/sink definitions, and user-defined classes. The Flink APIs shown are valid for the Flink 1.17-era examples after the targeted corrections above, but readers would still need to supply the omitted application-specific code.
