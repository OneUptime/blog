# Validation Summary: How to Run Apache Flink on Kubernetes Using the Flink Operator

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Flink
- Apache Flink Kubernetes Operator
- Kubernetes
- Helm
- Apache Kafka connector for Flink
- Maven
- Docker
- Amazon S3 filesystem support
- Prometheus / Prometheus Operator

## Sources Consulted
- Apache Flink Kubernetes Operator 1.7 Quick Start: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.7/docs/try-flink-kubernetes-operator/quick-start/
- Apache Flink Kubernetes Operator custom resource reference: https://apache.googlesource.com/flink-kubernetes-operator/+/HEAD/docs/content/docs/custom-resource/reference.md
- Apache Flink Kubernetes Operator job management docs: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.9/docs/custom-resource/job-management/
- Apache Flink 1.18 Kafka connector docs: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/kafka/
- Apache Flink 1.18 state backend docs: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/ops/state/state_backends/
- Apache Flink 1.18 Amazon S3 filesystem docs: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/filesystems/s3/
- Apache Flink metric reporter docs: https://nightlies.apache.org/flink/flink-docs-master/docs/deployment/metric_reporters/
- Apache Flink Kubernetes Operator metrics docs: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.10/docs/operations/metrics-logging/

## Issues Found
- The operator installation omitted cert-manager, which the official quick start requires for the webhook unless the webhook is disabled. Added the cert-manager installation command before the Helm install.
- The Java Kafka example used `FlinkKafkaConsumer`, `FlinkKafkaProducer`, undefined `properties`, and missing imports. In Flink 1.18 the docs direct users to `KafkaSource` and `KafkaSink`; updated the sample to those APIs and added the required imports and broker configuration.
- The windowing example used `.window(Time.seconds(5))`, which is not the correct keyed window API. Changed it to `TumblingProcessingTimeWindows.of(Time.seconds(5))`.
- The Kafka sink wrote `Tuple2<String, Integer>` records through a string serializer. Added a map step that converts the count output to a string before `sinkTo`.
- The Maven snippet was not a valid minimal POM and used `${flink.version}` for `flink-connector-kafka`, while Flink 1.18 documents connector artifact versions such as `3.2.0-1.18`. Added model coordinates, Java 11 compiler settings, provided scope for Flink runtime libraries, and the correct Kafka connector version property.
- The Dockerfile copied `target/libs/*.jar`, a path not produced by the shown Maven build. Removed that copy instruction.
- The S3 section did not mention that the Flink image must include an S3 filesystem plugin for `s3://` checkpoint and savepoint paths. Added the plugin requirement and noted that IAM roles are preferred over static keys on AWS.
- The upgrade section implied every patch automatically savepoints regardless of configuration. Clarified that the behavior applies when `upgradeMode: savepoint` is configured.
- The Prometheus configuration used the obsolete reporter class key. Updated it to `metrics.reporter.prom.factory.class: org.apache.flink.metrics.prometheus.PrometheusReporterFactory`.
- The monitoring example used a `ServiceMonitor` without defining a matching metrics Service. Changed it to a `PodMonitor` and added the required pod label and named metrics container port.
- The restore-from-savepoint example only set `initialSavepointPath`. The operator docs specify `savepointRedeployNonce` for redeploying from a target savepoint, so that field was added.

## Review Notes
The post remains version-specific to Flink 1.18 and Flink Kubernetes Operator 1.7. Those versions are older than the latest stable releases as of this validation date, but the examples now match the versions used in the post. The local commands were not executed against a live Kubernetes, Kafka, S3, or Prometheus environment.
