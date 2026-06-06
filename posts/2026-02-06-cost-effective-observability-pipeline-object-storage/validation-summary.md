# Validation Summary: How to Build a Cost-Effective Observability Pipeline with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib `awss3exporter`
- OTLP receiver and OTLP exporter
- Batch and attributes processors
- Amazon S3 and S3-compatible object storage
- MinIO and `mc`
- DuckDB `httpfs`
- AWS S3 lifecycle policies

## Sources Consulted
- OpenTelemetry Collector AWS S3 Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awss3exporter
- OpenTelemetry Collector AWS S3 Exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/config.go
- OpenTelemetry Collector AWS S3 Exporter partition key source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/internal/upload/partition.go
- OpenTelemetry Collector exporters registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- DuckDB S3 API support documentation: https://duckdb.org/docs/current/core_extensions/httpfs/s3api
- MinIO Client Quickstart Guide: https://minio.github.io/mc/
- Amazon S3 lifecycle configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/how-to-set-lifecycle-configuration-intro.html
- Amazon S3 lifecycle rule elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 pricing page: https://aws.amazon.com/s3/pricing/

## Issues Found
- The `awss3` exporter example used `s3_partition: "minute"`, but the current exporter configuration field is `s3_partition_format` and it expects a strftime-style path format. Updated the snippet to use `s3_partition_format: "year=%Y/month=%m/day=%d/hour=%H/minute=%M"`.
- The collector example claimed to export in a "Parquet-friendly" format while configuring `marshaler: otlp_json`. Updated the wording to describe batched OTLP JSON files and clarified that Parquet is a separate columnar format option for analytics.
- The Docker Compose example set MinIO credentials but the collector exporter config did not point at MinIO. Added `endpoint: http://minio:9000`, `s3_force_path_style: true`, and `disable_ssl: true` with a note to omit them for AWS S3.
- The DuckDB query used deprecated global S3 settings and omitted MinIO credentials. Updated the SQL to use DuckDB's current `CREATE OR REPLACE SECRET` S3 configuration with `KEY_ID`, `SECRET`, `ENDPOINT`, `URL_STYLE`, and `USE_SSL`.
- The S3 lifecycle JSON omitted a rule filter. Added a `Filter` with the `otel-data/` prefix so the lifecycle rule has an explicit target scope consistent with current S3 lifecycle rule documentation.
- The post referenced Google Cloud Storage alongside S3-compatible storage without noting the interoperability requirement. Added a short caveat that GCS needs S3 interoperability configured for this S3 exporter path.

## Review Notes
- The `awss3exporter` is currently listed as alpha for traces, metrics, and logs in the OpenTelemetry Collector exporter registry, so production use should account for possible behavior or configuration changes.
- The cost figures are approximate and region/workload dependent. The S3 Standard and Glacier-class storage prices are directionally consistent with current AWS pricing, but API calls, Athena scan volume, retrieval fees, and data transfer can materially change actual costs.
- YAML snippets and the JSON lifecycle snippet were syntax-checked locally. The collector was not run end-to-end against MinIO as part of this review.
