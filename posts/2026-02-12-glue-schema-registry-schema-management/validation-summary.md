# Validation Summary: How to Use Glue Schema Registry for Schema Management

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- AWS Glue Schema Registry
- AWS CLI for AWS Glue
- Apache Avro
- JSON Schema
- Protocol Buffers
- Apache Kafka / Amazon MSK
- Amazon Kinesis Data Streams
- Java AWS Glue Schema Registry SerDe library
- Amazon CloudWatch metrics

## Sources Consulted
- AWS Glue Schema Registry User Guide: https://docs.aws.amazon.com/glue/latest/dg/schema-registry.html
- AWS Glue Schema Registry Java implementation guide: https://docs.aws.amazon.com/glue/latest/dg/schema-registry-gs-serde-java.html
- AWS Glue Schema Registry integrations guide: https://docs.aws.amazon.com/glue/latest/dg/schema-registry-integrations.html
- AWS CLI create-schema command reference: https://docs.aws.amazon.com/cli/latest/reference/glue/create-schema.html
- AWS CLI register-schema-version command reference: https://docs.aws.amazon.com/cli/latest/reference/glue/register-schema-version.html
- AWS CLI get-schema-version command reference: https://docs.aws.amazon.com/cli/latest/reference/glue/get-schema-version.html
- AWS Glue Schema Registry CloudWatch metrics guide: https://docs.aws.amazon.com/glue/latest/dg/schema-registry-gs-monitoring.html
- AWS Glue Schema Registry open-source SerDe library: https://github.com/awslabs/aws-glue-schema-registry

## Issues Found
- The post said Glue Schema Registry supports only Apache Avro and JSON Schema. AWS now documents support for Avro, JSON Schema, and Protocol Buffers, so the data-format description was updated.
- The compatibility mode list omitted `BACKWARD_ALL`, `FORWARD_ALL`, `FULL_ALL`, and `DISABLED`. The post now describes the complete set of supported AWS Glue Schema Registry modes while keeping the original brief explanations.
- The feature list referred to "schema compression." AWS documents optional ZLIB compression for serialized records, so that wording was corrected.
- The Kafka consumer snippet set `AVRO_RECORD_TYPE` to a raw string. AWS examples use `AvroRecordType.GENERIC_RECORD.getName()`, so the snippet now imports and uses that enum.
- The Kinesis section used a Python `aws_schema_registry` example. AWS's documented Schema Registry integration path is Java-based through KPL/KCL or the Kinesis Data Streams APIs, so the example was replaced with a Java snippet using `GlueSchemaRegistrySerializerImpl` for direct Kinesis API usage.
- The monitoring section referenced a `SchemaVersionFailure` CloudWatch metric. AWS documentation lists API-level metrics such as `RegisterSchemaVersion` success and latency and resource-level metrics such as `SchemaVersion.ThrottledByLimit` and `SchemaVersion.Size`, so the monitoring guidance was corrected.

## Review Notes
The AWS CLI command shapes for creating registries, creating schemas, registering schema versions, listing schemas, and fetching the latest schema version match the AWS CLI documentation. The Java snippets are illustrative rather than full compilable classes because imports and helper methods are intentionally abbreviated.
