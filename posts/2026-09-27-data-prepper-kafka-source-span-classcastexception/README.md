# How to Diagnose Span ClassCastException After Replacing a Data Prepper Kafka Buffer with a Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Kafka, Troubleshooting

Description: Diagnose typed-span failures when replacing a Data Prepper Kafka buffer with a Kafka source and choose a compatible recovery path.

---

A trace pipeline works with a Kafka buffer, then fails with a `ClassCastException` after Kafka is moved under `source`. The payload still contains a trace ID, so the failure can look like a corrupt span or Java dependency conflict. A more direct explanation is that the new source creates a different event type.

A Kafka source and Kafka buffer occupy different places in the Data Prepper lifecycle. They are not interchangeable simply because both read Kafka records.

## Compare the two data paths

With a buffer, the trace-aware source decodes OTLP into span events before persistence:

```text
otel_trace_source -> typed Span -> kafka buffer -> otel_traces
```

With a generic Kafka source, the Kafka consumer is responsible for constructing the event:

```text
Kafka record -> kafka source -> generic/log event -> otel_traces
```

The [Kafka source documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/kafka/) describes consuming records and creating Data Prepper events. It does not promise that setting JSON serialization reconstructs a `Span`.

In the referenced upstream [KafkaCustomConsumer implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/main/java/org/opensearch/dataprepper/plugins/kafka/consumer/KafkaCustomConsumer.java), parsed Kafka values are used to build `JacksonLog`. By contrast, [otel_traces](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OTelTraceRawProcessor.java) processes `Record<Span>`. Check those classes at the tag corresponding to your deployment.

## Read the exception before changing serialization

Record the complete exception message, including the source class, target class, and first Data Prepper processor frame. An error involving a log or generic event being cast to `Span` points at the type boundary.

Distinguish that from a deserialization error before event creation. A Kafka record containing Data Prepper's internal buffer envelope may not even be valid input for a generic JSON consumer. The [buffer deserializer](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/main/java/org/opensearch/dataprepper/plugins/kafka/buffer/serialization/BufferMessageDeserializer.java) reads a buffer-specific Protobuf envelope before decoding its data.

Write down who produced the topic and how:

| Topic producer | Contract to verify |
|---|---|
| Data Prepper Kafka buffer | Internal envelope, event metadata, release compatibility |
| Collector Kafka exporter | Selected OTLP encoding and matching consumer support |
| Application JSON producer | Generic JSON schema and event type constructed by the source |

Do not infer the wire format from a topic name containing “traces.”

## Inspect without advancing production offsets

Use a bounded staging copy or a separate diagnostic consumer group. Preserve the original group offsets and topic retention while investigating; a trial consumer sharing the production group can redistribute partitions or advance processing unexpectedly.

For an ordinary JSON topic, a diagnostic pipeline can reveal its fields without invoking a span processor:

```yaml
inspect-kafka-json:
  source:
    kafka:
      bootstrap_servers: ["kafka.internal.example:9092"]
      topics:
        - name: diagnostic-trace-json
          group_id: inspect-trace-json-v1
          serde_format: json
  sink:
    - stdout: {}
```

Supply the authentication and encryption settings required by the broker. Run this only with a prepared test topic and protect the output. This example inspects JSON; it is not a decoder for Data Prepper buffer records or an arbitrary OTLP Protobuf topic.

Seeing a `traceId` in stdout establishes field presence, not Java object type. JSON serialization does not display the interface an in-memory object implements.

## Choose a repair that preserves span semantics

If the original design required Data Prepper to persist its own typed events, restore the Kafka buffer behind `otel_trace_source`. Keep the trace-aware source as the decoder and use a compatible buffer configuration for the installed release. The upstream [Kafka buffer OpenTelemetry integration test](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/kafka-plugins/src/integrationTest/java/org/opensearch/dataprepper/plugins/kafka/buffer/KafkaBufferOTelIT.java) checks round trips involving OpenTelemetry event types.

If Kafka is intentionally an external transport boundary, use a consumer that understands the producer's trace encoding and exports valid OTLP to a trace-aware Data Prepper source. Verify the exact receiver/exporter support in that consumer's installed release.

If the topic is generic JSON, index it through a generic pipeline or implement a supported, tested conversion that creates real span events. A `parse_json` processor, adding an `eventType` field, or renaming `trace_id` to `traceId` does not by itself change the Java type to `Span`.

Avoid inventing options such as `serde_format: otel_traces` or a source-level `event_type: span` unless the deployed plugin explicitly documents and implements them.

## Verify more than the missing exception

Replay a small fixture containing root and child spans through the repaired path. Confirm that the type error disappears, the expected span IDs reach OpenSearch, and trace-group and service-map processing still work. A generic sink accepting the JSON would only prove that indexing is possible.

Check offsets, acknowledgments, retries, and duplicate handling separately. Restoring a working event type does not establish exactly-once delivery or prove that records processed during the failed migration can be recovered.

## Conclusion

A Kafka buffer preserves the pipeline's event contract; a Kafka source constructs a new one from topic records. Diagnose the actual runtime type and wire format, then restore a trace-aware decoding path before sending events to span processors.
