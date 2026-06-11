# Validation Summary: How to Build Log Archival Strategies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry OTLP and syslog receivers
- OpenTelemetry AWS S3 exporter
- Amazon S3 lifecycle policies and Glacier restore workflows
- Terraform AWS provider
- AWS SDK for JavaScript v3
- Node.js TypeScript
- Node.js zlib gzip/gunzip compression

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib syslog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- OpenTelemetry Collector Contrib AWS S3 exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/README.md
- OpenTelemetry attributes processor examples: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/testdata/config.yaml
- AWS S3 archive retrieval options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- AWS S3 lifecycle configuration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- AWS S3 lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- AWS SDK for JavaScript v3 S3 API reference: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/GetObject
- Node.js zlib documentation: https://nodejs.org/api/zlib.html

## Issues Found
- The OpenTelemetry Collector example used `archive.ingested_at: ${timestamp}` in the attributes processor. Collector substitution treats `${...}` as configuration/environment substitution, not a per-log runtime timestamp. Removed that attribute and adjusted the comment to describe retention metadata only.
- The AWS S3 exporter example used non-current field names `bucket` and `partition`. Updated the snippet to use `s3_bucket`, `s3_prefix`, `s3_partition_format`, `s3_partition_timezone`, and `compression` as documented by the current OpenTelemetry Collector Contrib AWS S3 exporter.
- The archive service imported `pipeline` but did not use it, and its custom gzip stream wrapper did not reject on compression errors. Replaced it with promisified Node.js `zlib.gzip`.
- The archive service computed an unused `cutoffDate` in `migrateToArchive`, which would fail stricter TypeScript builds. Removed the unused variable because the text says Glacier transition is handled by S3 lifecycle rules.
- The Terraform lifecycle example enabled bucket versioning but only expired current object versions. Added `noncurrent_version_expiration` blocks so the stated retention periods also apply to noncurrent versions.
- The retrieval example attempted to fetch generated S3 prefixes with `GetObject`, but S3 `GetObject` requires a full object key. Added `ListObjectsV2Command` lookup by prefix, including pagination, before retrieving objects.
- The retrieval example read gzip-compressed objects with `transformToString()` and then called `JSON.parse()` without decompression. Updated it to read bytes with `transformToByteArray()`, gunzip the payload, and parse the decompressed UTF-8 JSON.
- The retrieval example referenced `LogRecord` without defining it in the standalone snippet. Added a local `LogRecord` interface.
- The retrieval example incremented the time range with local-time `setHours()` while generating UTC S3 prefixes. Changed it to `setUTCHours()` for consistent UTC partition traversal.

## Review Notes
- The examples still include placeholder methods for hot-storage querying and S3 deletion because the implementation depends on the user's storage backend.
- I verified the external GitHub, OneUptime, and related-reading links resolve successfully.
- I did not execute the AWS examples against a live AWS account; API names and behavior were checked against official AWS and OpenTelemetry documentation.
