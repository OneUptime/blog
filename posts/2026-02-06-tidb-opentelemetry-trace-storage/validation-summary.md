# Validation Summary: How to Set Up TiDB for OpenTelemetry Trace Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- TiDB v7.5
- TiUP
- TiKV
- TiFlash
- SQL / MySQL-compatible clients

## Sources Consulted
- OpenTelemetry Collector exporter registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- TiDB v7.5 partitioning documentation: https://docs.pingcap.com/tidb/v7.5/partitioned-table/
- TiDB v7.5 system variables documentation: https://docs.pingcap.com/tidb/v7.5/system-variables/
- TiDB v7.5 configuration file documentation: https://docs.pingcap.com/tidb/v7.5/tidb-configuration-file/
- TiDB v7.5 CREATE INDEX documentation: https://docs.pingcap.com/tidb/v7.5/sql-statement-create-index/
- TiUP cluster deploy documentation: https://docs.pingcap.com/tidb/stable/tiup-component-cluster-deploy/
- TiDB architecture documentation: https://docs.pingcap.com/tidb/stable/tidb-architecture/

## Issues Found
- The post claimed the OpenTelemetry Collector could use a contrib SQL exporter for traces with `driver`, `datasource`, and table mapping fields. The official exporter registry does not list a generic SQL trace exporter, so this configuration would not load in a standard Collector distribution. I changed the guidance to use the OTLP exporter to send traces to a bridge service that performs MySQL/TiDB batch inserts.
- The architecture diagram implied that the Collector writes SQL directly to TiDB. I updated it to include the trace writer service used by the corrected Collector configuration.
- The post claimed custom attribute queries would be fast through secondary indexes, but the schema did not define an attribute lookup index. I added `idx_attr_key_value` on `span_attributes`.
- The schema discussed operation lookups but did not define an operation/time index. I added `idx_operation_time`.
- The duration index was defined as `(service_name, duration_ns)`, while the sample slow-trace query filters by `duration_ns` without `service_name`. I changed the index to lead with `duration_ns`.
- The tuning section described `tidb_mem_quota_query` as a transaction-size limit. In TiDB v7.5 it controls session memory quota behavior, while the transaction total-size setting is a configuration parameter. I corrected the comment.
- The `tidb_scatter_region` comment implied a general concurrent-region setting. The TiDB v7.5 system variable scatters newly split Regions during table creation, so I corrected the description.
- The tuning section said the Collector issues repeated INSERT statements, which was no longer true after correcting the exporter path. I changed this to the writer service.

## Review Notes
The corrected setup still depends on implementing and operating a separate trace writer service. In a future revision, the post could add a small bridge-service example and retention handling for `span_attributes`, but those additions were outside the scope of this technical correction pass.
