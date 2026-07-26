# Validation Summary: Knative KafkaSource Consumer Lag Keeps Growing: How to Find the Bottleneck

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Knative Eventing
- Knative KafkaSource
- Apache Kafka consumer groups and offsets
- Kubernetes and `kubectl`
- Knative Serving
- KEDA autoscaling
- CloudEvents HTTP delivery

## Sources Consulted

- [Knative Apache Kafka Source documentation](https://knative.dev/docs/eventing/sources/kafka-source/)
- [Knative KEDA autoscaling configuration](https://knative.dev/docs/eventing/configuration/keda-configuration/)
- [Knative Eventing metrics reference](https://knative.dev/docs/eventing/observability/metrics/eventing-metrics/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Eventing data-plane contract](https://github.com/knative/specs/blob/main/specs/eventing/data-plane.md)
- [Knative Kafka dispatcher delivery implementation](https://github.com/knative-extensions/eventing-kafka-broker/blob/be8757253c2e467de3e8acc04f2876274e1b2208/data-plane/dispatcher/src/main/java/dev/knative/eventing/kafka/broker/dispatcher/impl/RecordDispatcherImpl.java)
- [Knative Kafka dispatcher offset manager](https://github.com/knative-extensions/eventing-kafka-broker/blob/be8757253c2e467de3e8acc04f2876274e1b2208/data-plane/dispatcher/src/main/java/dev/knative/eventing/kafka/broker/dispatcher/impl/consumer/OffsetManager.java)
- [Knative Kafka dispatcher HTTP retry implementation](https://github.com/knative-extensions/eventing-kafka-broker/blob/be8757253c2e467de3e8acc04f2876274e1b2208/data-plane/dispatcher/src/main/java/dev/knative/eventing/kafka/broker/dispatcher/impl/http/WebClientCloudEventSender.java)
- [Apache Kafka 4.3 basic operations](https://kafka.apache.org/43/operations/basic-kafka-operations/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes `kubectl scale` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/)

## Issues Found

- The post described per-partition ordering as requiring a successful sink response before the partition can advance. The current dispatcher serializes a partition only until the sink attempt, configured retries, and dead letter handling finish. Updated the explanation and diagnostic table to reflect bounded retry behavior.
- The post implied that a dead letter sink must accept a failed event before the partition can advance. The current Kafka dispatcher commits the record after the dead letter attempt finishes, including when that attempt fails. Updated the text and added the operational consequence that dead letter delivery must be monitored.
- The response-code list did not state that redelivery depends on a positive retry count. Clarified that `5xx`, `404`, `408`, `409`, and `429` are retryable when `spec.delivery.retry` is greater than zero.
- The metrics paragraph could be read as guaranteeing the generic Knative source metric names for the Kafka dispatcher. Clarified that the generic reference lists these metrics but Kafka dispatcher exports vary by release during the OpenTelemetry migration.
- The offset-reset guidance did not clearly state Kafka's requirement that consumer instances be inactive. Updated it to require stopping consumers before using the reset tool and distinguished the optional producer pause used to stabilize the target end offset.
- The Apache Kafka operations link targeted the older 4.1 documentation. Updated it to the current Kafka 4.3 operations page; the documented `kafka-consumer-groups.sh --describe` command and output columns remain valid.

## Review Notes

- The `sources.knative.dev/v1` KafkaSource manifests, delivery fields, KEDA annotations, JSONPath expressions, and `kubectl` commands are current and valid.
- KEDA autoscaling for Knative Kafka dispatchers remains Alpha and enabling `controller-autoscaler-keda` is cluster-wide for the Kafka resources listed in the post.
- The KafkaSource metrics surface remains release-sensitive; operators should continue verifying the metrics exposed by their installed dispatcher image.
