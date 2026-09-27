# Validation Summary: How to Diagnose Data Prepper Kafka Source Span ClassCastException

## Status
validated

## Post Type
Technical troubleshooting guide with a YAML diagnostic pipeline and data-flow examples.

## Technologies Covered
- OpenSearch Data Prepper Kafka source and Kafka buffer
- Apache Kafka consumer groups, offsets, and serialization
- OpenTelemetry traces and OTLP
- Java event types, JacksonLog, Span, and ClassCastException
- Data Prepper trace processors and OpenSearch trace analytics
- YAML pipeline configuration

## Sources Consulted
- [Data Prepper Kafka source documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/kafka/)
- [Data Prepper Kafka buffer documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/buffers/kafka/)
- [Parse JSON processor documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/parse-json/)
- [OTel trace processor documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/)
- [Service map processor documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/service-map/)
- [Apache Kafka KafkaConsumer API](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [OpenTelemetry Collector Kafka receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md)
- [Data Prepper upstream: writes OTLP request bytes to the byte buffer](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-source/src/main/java/org/opensearch/dataprepper/plugins/source/oteltrace/OTelTraceGrpcService.java#L108-L115)
- [Data Prepper upstream: supplies the decoder](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-source/src/main/java/org/opensearch/dataprepper/plugins/source/oteltrace/OTelTraceSource.java#L75-L80)
- [Data Prepper upstream: KafkaCustomConsumer implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/main/java/org/opensearch/dataprepper/plugins/kafka/consumer/KafkaCustomConsumer.java)
- [Data Prepper upstream: otel_traces](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OTelTraceRawProcessor.java)
- [Data Prepper upstream: buffer deserializer](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/main/java/org/opensearch/dataprepper/plugins/kafka/buffer/serialization/BufferMessageDeserializer.java)
- [Data Prepper upstream: Kafka buffer OpenTelemetry integration test](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/integrationTest/java/org/opensearch/dataprepper/plugins/kafka/buffer/KafkaBufferOTelIT.java)
- [Data Prepper TopicConsumerConfig.java](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/main/java/org/opensearch/dataprepper/plugins/kafka/configuration/TopicConsumerConfig.java)
- [Data Prepper MessageFormat.java](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/main/java/org/opensearch/dataprepper/plugins/kafka/util/MessageFormat.java)

## Issues Found
- Corrected the initial Kafka-buffer diagram and repair explanation: the pinned implementation persists OTLP request bytes and uses the trace source's decoder to reconstruct typed spans downstream. It does not persist decoded Span objects along the depicted path. Verified against the linked OTelTraceGrpcService and OTelTraceSource implementations.

## Review Notes
- Confirmed that the pinned Kafka consumer constructs JacksonLog events for generic records. OTelTraceRawProcessor is registered as `otel_traces` and processes Record<Span>; retrieving a non-Span event at that boundary explains the described cast failure. Field names and JSON serialization alone do not establish the Java event type.
- Confirmed the byte-buffer branch in OTelTraceGrpcService writes serialized OTLP trace requests, and OTelTraceSource provides an OTelTraceDecoder. BufferMessageDeserializer parses the KafkaBufferMessage Protobuf envelope before delegating payload decoding. The linked KafkaBufferOTelIT includes a trace round trip and validates the resulting Span.
- Parsed the YAML example successfully with PyYAML. Its source, bootstrap_servers, topics, topic-level group_id and serde_format, and stdout sink structure match the documented configuration. Authentication and broker encryption remain deployment-specific, as the post states; Kafka encryption defaults to SSL.
- Confirmed that separate consumer groups isolate group offsets, while adding consumers to the production group can redistribute partitions. The post correctly treats retention, acknowledgments, replay, and duplicate handling as separate concerns from event-type correctness.
- The Collector Kafka receiver documents trace encodings, including OTLP Protobuf and JSON, supporting the proposed encoding-aware transport bridge. Actual receiver and exporter availability must be checked in the installed distribution and release.
- Implementation claims are explicitly pinned to commit `0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42`. They should not be read as guarantees for every release. The linked source files were retrieved from GitHub's raw-content endpoint and inspected, including the referenced decoder and byte-write locations.
- The two text blocks describe data flow rather than executable commands. There are no terminal commands to validate. No deprecated API or configuration used by the example was identified.
- Validation was based on official documentation, upstream source inspection, and YAML parsing. No live Kafka/Data Prepper/OpenSearch deployment was provisioned, no production offsets were changed, and upstream integration tests were inspected rather than executed. End-to-end trace-group and service-map behavior still requires the deployment-specific fixture replay described in the post.
- The primary review verified the corrected README after this independent source check; its documentation and YAML checks required no further edits.
