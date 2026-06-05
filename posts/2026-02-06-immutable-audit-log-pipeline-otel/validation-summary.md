# Validation Summary: How to Build an Immutable Audit Log Pipeline Using OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python Logs API and SDK
- OpenTelemetry Collector
- OpenTelemetry Collector filter, attributes, batch, awss3, and Elasticsearch components
- OpenTelemetry Collector file_storage extension and persistent sending queues
- Amazon S3 Object Lock
- AWS CLI s3api
- Python boto3
- JSON and SHA-256 content hashing

## Sources Consulted
- OpenTelemetry Python Logs API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/_logs.html
- OpenTelemetry Python Logs SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/_logs.html
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry awss3 exporter documentation: https://otel.fyi/components/exporter/awss3exporter
- OpenTelemetry Collector resiliency and persistent queue documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- AWS CLI create-bucket documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI put-object-lock-configuration documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-lock-configuration.html

## Issues Found
- The architecture and Collector section said the Collector added integrity or chain hashing, but the shown Collector configuration did not implement a chain hash. Updated the wording to say the application performs integrity hashing and the Collector adds pipeline metadata.
- The Python example filtered later on `service.name`, but the `LoggerProvider` did not set a resource with `service.name`. Added `Resource.create({"service.name": "audit.service"})` to the `LoggerProvider`.
- The OTLP/gRPC exporter endpoint was shown without a URL scheme and without `insecure=True`. Added `insecure=True` for the plaintext in-cluster Collector endpoint.
- The Collector filter processor used legacy `logs.include.resource_attributes` syntax. Replaced it with the current OTTL-based `log_conditions` form that drops records whose resource `service.name` is not `audit.service`.
- The awss3 exporter used `s3_partition: "minute"`, which is not the current documented field. Replaced it with `s3_partition_format: "year=%Y/month=%m/day=%d/hour=%H/minute=%M"`.
- The persistent queue snippet configured the `file_storage` extension but did not enable it under `service.extensions`. Added `service: extensions: [file_storage]`.

## Review Notes
The post is technically valid after these fixes. The audit integrity check verifies per-record content hashes, but it is not a full tamper-evident hash chain; adding chain hashing would require a deterministic ordering and stateful hash-chain implementation outside the shown Collector configuration.
