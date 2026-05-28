# Validation Summary: How to Implement Cross-Language Pipelines in Dataflow Using Multi-SDK Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam
- Apache Beam Python SDK
- Apache Beam Java cross-language transforms
- Kafka I/O
- Beam SQL
- Beam schemas

## Sources Consulted
- Apache Beam Python multi-language pipelines quickstart: https://beam.apache.org/documentation/sdks/python-multi-language-pipelines/
- Apache Beam Python custom multi-language pipelines guide: https://beam.apache.org/documentation/sdks/python-custom-multi-language-pipelines-guide/
- Apache Beam 2.52.0 Python Kafka API reference: https://beam.apache.org/releases/pydoc/2.52.0/apache_beam.io.kafka.html
- Apache Beam 2.52.0 external transforms API reference: https://beam.apache.org/releases/pydoc/2.52.0/apache_beam.transforms.external.html
- Apache Beam 2.52.0 SQL transform API reference: https://beam.apache.org/releases/pydoc/2.52.0/apache_beam.transforms.sql.html
- Apache Beam 2.52.0 ExpansionServiceOptions Javadoc: https://beam.apache.org/releases/javadoc/2.52.0/org/apache/beam/sdk/expansion/service/ExpansionServiceOptions.html
- Google Cloud Dataflow Runner v2 documentation: https://cloud.google.com/dataflow/docs/runner-v2
- Maven Central expansion service artifact URL: https://repo1.maven.org/maven2/org/apache/beam/beam-sdks-java-io-expansion-service/2.52.0/beam-sdks-java-io-expansion-service-2.52.0.jar

## Issues Found
- The Kafka example used `expansion_service_jar` as a `PipelineOptions` keyword and deployment flag. Beam's Kafka transforms accept `expansion_service` on `ReadFromKafka` and `WriteToKafka`, so the example now uses `JavaJarExpansionService` and passes it to those transforms.
- The custom Java transform example passed a URN to `JavaExternalTransform`, but Beam 2.52.0 documents `JavaExternalTransform` as taking a fully qualified Java class name. The example now uses `ExternalTransform` with an `ImplicitSchemaPayloadBuilder`, which matches the URN-based pattern shown in Beam's multi-language guide.
- The expansion service startup command used unsupported `--port` and `--javaClassLookupAllowedNamespaces` flags. It now shows the documented positional port form for a custom shaded expansion service JAR.
- The schema-aware custom transform example used `JavaExternalTransform` without importing it and used a non-schema-transform URN. It now uses `SchemaAwareExternalTransform` with a `beam:schematransform` identifier.
- Several Python snippets referenced `json` or `typing` without importing them. The missing imports were added.
- The SQL example serialized output rows with `row._asdict()`, which is not the documented Beam Row access pattern. It now serializes fields via row attributes.
- The post described Runner v2 as something to always pass as an experiment. The wording now reflects current Dataflow behavior more accurately: Dataflow jobs using multi-language pipelines must use Runner v2, while Python SDK 2.45.0 and later use Runner v2 as the only Dataflow runner.

## Review Notes
The examples still use placeholder project names, bucket names, Kafka endpoints, and user-defined functions such as `enrich_event`, `preprocess`, and `postprocess`. Those are acceptable tutorial placeholders, but a future revision could make the snippets fully runnable end to end with sample implementations.
