# Validation Summary: How to Configure Log Retention Tiers with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib AWS S3 exporter
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector filter processor
- AWS S3 lifecycle configuration and Glacier storage classes
- AWS CLI `s3api put-bucket-lifecycle-configuration`
- Elasticsearch Index Lifecycle Management
- ClickHouse table TTL
- Amazon Athena and Spark

## Sources Consulted
- OpenTelemetry Collector Contrib AWS S3 exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/README.md
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry OTTL log context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Logs Data Model severity numbers: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- AWS CLI `put-bucket-lifecycle-configuration` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS S3 Glacier storage classes documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- AWS S3 archive retrieval options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- Elasticsearch ILM rollover documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Elasticsearch ILM phases and actions documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-index-lifecycle.html
- ClickHouse table TTL ALTER documentation: https://clickhouse.com/docs/sql-reference/statements/alter/ttl

## Issues Found
- The AWS S3 exporter example used `s3_partition`, but the documented option is `s3_partition_format`. I changed the configuration key so the exporter will use the intended date-partitioned path.
- The transform processor example used bare `attributes` paths in a log context. Current OTTL log context documentation exposes log record attributes as `log.attributes`, so I updated the `delete_key` calls accordingly.
- The filter processor example used the older `logs.log_record` configuration shape and a bare `severity_number` path. Current filter processor documentation uses `log_conditions` with OTTL paths such as `log.severity_number`, so I updated the snippet and explanation to use `log.severity_number < SEVERITY_NUMBER_WARN`.
- The post described S3 Standard for 30 days and Glacier for the remaining 60 days without noting Glacier minimum storage duration charges. I added a short caveat because S3 Glacier Flexible Retrieval has a 90-day minimum storage duration charge.
- The post did not say that the AWS S3 exporter is a contrib component. I clarified that the S3 example requires the OpenTelemetry Collector Contrib distribution.

## Review Notes
The AWS CLI lifecycle command, S3 lifecycle JSON shape, OpenTelemetry severity threshold for WARN and above, Elasticsearch ILM policy shape, and ClickHouse `ALTER TABLE ... MODIFY TTL` syntax were verified as technically correct. The cost figures are presented as rough estimates and remain backend-dependent; storage request, retrieval, metadata, and minimum-duration charges can change the actual bill.
