# Validation Summary: How to Send Logs to Kafka from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Logging
- Kubernetes
- Logging operator / Fluentd
- Apache Kafka
- Confluent Cloud
- Amazon MSK

## Sources Consulted
- Rancher documentation: Outputs and ClusterOutputs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Rancher documentation: Logging Architecture: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging/logging-architecture
- Logging operator documentation: Kafka output plugin for Fluentd: https://kube-logging.dev/docs/configuration/plugins/outputs/kafka/
- Logging operator documentation: Buffer configuration: https://kube-logging.dev/docs/configuration/plugins/outputs/buffer/
- Logging operator documentation: Parser filter: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging operator documentation: Record Transformer filter: https://kube-logging.dev/4.5/docs/configuration/plugins/filters/record_transformer/
- Logging operator CRD documentation: ClusterFlow: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Fluentd documentation: parser filter: https://docs.fluentd.org/filter/parser
- Fluentd documentation: record_transformer filter: https://docs.fluentd.org/filter/record_transformer
- Fluentd documentation: file buffer: https://docs.fluentd.org/buffer/file
- Fluentd documentation: configuration parameter types: https://docs.fluentd.org/plugin-development/api-config-types
- Fluent plugin for Kafka README and source: https://github.com/fluent/fluent-plugin-kafka
- Confluent documentation: Kafka Client Quick Start for Confluent Cloud: https://docs.confluent.io/cloud/current/client-apps/config-client.html
- Confluent documentation: Connect self-managed Kafka clients to Confluent Cloud: https://docs.confluent.io/cloud/current/cp-component/clients-cloud-config.html
- Amazon MSK documentation: Port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- Amazon MSK documentation: Get the bootstrap brokers for an Amazon MSK cluster: https://docs.aws.amazon.com/msk/latest/developerguide/msk-get-bootstrap-brokers.html
- Apache Kafka documentation: Basic Kafka Operations: https://kafka.apache.org/38/operations/basic-kafka-operations/

## Issues Found
- The basic Kafka output used `retry_max_interval: 30`, but the Logging operator buffer schema expects a time string. I changed it to `30s` so the CRD value matches the documented type.
- The `ClusterFlow` parser filter used `suppress_parse_error_log`, which Fluentd v1 no longer supports. I replaced it with `emit_invalid_record_to_error: false`, which is the supported way to suppress parser error routing for invalid records.
- The message key example used `message_key_key: kubernetes.pod_name`, but `fluent-plugin-kafka` reads `message_key_key` as a top-level record field name, not a nested record accessor. I changed the example to first copy `kubernetes.pod_name` into a top-level `message_key` field with `record_transformer`, then reference `message_key_key: message_key`.
- The Confluent Cloud example incorrectly set `scram_mechanism: sha256`. Current Confluent Cloud Kafka client guidance requires SASL/PLAIN or OAuth over TLS, not SCRAM for standard API key/secret authentication. I removed the SCRAM setting and clarified the text to say the example uses SASL/PLAIN over TLS.
- The SASL example heading was too broad for the configuration shown. I updated the heading to `SASL/SCRAM Authentication` so it matches the actual YAML.
- The Amazon MSK intro line was broadened beyond the exact configuration shown. I clarified that the example is specifically for Amazon MSK with TLS encryption.

## Review Notes
- The post is technically relevant and salvageable; no removal or downgrade was needed.
- Rancher’s current documentation still shows `logging.banzaicloud.io/v1beta1` for `ClusterFlow` and `ClusterOutput`, so the API group used in the post remains valid as of May 7, 2026.
- The examples were validated against current documentation and plugin behavior, but they were not executed on a live Rancher/Kubernetes cluster during this review.
- The Amazon MSK example covers TLS-encrypted brokers on port `9094`. It does not cover IAM authentication, SASL/SCRAM authentication, or mutual TLS client certificate configuration for MSK.
