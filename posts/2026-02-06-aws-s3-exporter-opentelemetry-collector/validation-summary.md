# Validation Summary: How to Configure the AWS S3 Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- AWS S3 exporter (`awss3`)
- Amazon S3
- AWS IAM and STS assume role
- Amazon Athena
- OTLP JSON and Protocol Buffers

## Sources Consulted
- OpenTelemetry Collector Contrib AWS S3 exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awss3exporter
- OpenTelemetry Collector Contrib AWS S3 exporter Go package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/awss3exporter
- Local OpenTelemetry Collector Contrib source: `.tmp/otelcol-contrib-check/exporter/awss3exporter/config.go`
- Local OpenTelemetry Collector Contrib generated schema: `.tmp/otelcol-contrib-check/exporter/awss3exporter/config.schema.yaml`
- Local OpenTelemetry Collector Contrib partition key builder: `.tmp/otelcol-contrib-check/exporter/awss3exporter/internal/upload/partition.go`
- OpenTelemetry Collector exporter component registry: https://opentelemetry.io/docs/collector/components/exporter/
- AWS S3 storage class documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- AWS S3 server-side encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html

## Issues Found
- The exporter configuration examples used top-level `s3_bucket`, `region`, `s3_prefix`, `compression`, storage class, role, and retry fields. Updated them to use the supported `s3uploader` block.
- The post described `encoding` as the normal format selector and listed unsupported `json` encoding. Updated the guidance to use `marshaler` for `otlp_json` and `otlp_proto`, and documented the supported `sumo_ic` and `body` marshalers.
- The partitioning examples used unsupported Go template fields such as `{{ .Year }}`, `{{ .SignalType }}`, and `s3_partition`. Replaced them with the supported `s3_partition_format` `strftime` syntax and corrected the generated S3 path examples.
- The advanced and production examples used unsupported `aws_auth` and `s3_encryption` blocks. Replaced `aws_auth` with `s3uploader.role_arn` and changed encryption guidance to bucket-level default server-side encryption.
- The storage class examples used unsupported `s3_storage_class`. Replaced it with `s3uploader.storage_class`.
- The IAM example included unnecessary `GetObject`, `ListBucket`, and `PutObjectAcl` permissions for the shown configuration. Reduced the base policy to `s3:PutObject`.
- The Athena example flattened trace fields that do not match OTLP JSON. Replaced it with a nested `resourceSpans` example and noted that production analytics often require a schema matching OTLP JSON or conversion to Parquet.
- The fixed version prerequisite `0.80.0 or later` was not backed by the current docs and is misleading for a current guide. Changed it to require OpenTelemetry Collector Contrib without naming that version.

## Review Notes
The AWS S3 exporter is still listed as alpha for traces, metrics, and logs in the OpenTelemetry Collector exporter registry. I could not run upstream Go tests locally because `go` is not installed in the workspace; validation was done against the official docs, generated schema, and source files.
