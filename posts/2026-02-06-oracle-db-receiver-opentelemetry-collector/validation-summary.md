# Validation Summary: How to Configure the Oracle DB Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Oracle DB receiver
- Oracle Database monitoring
- Oracle Go driver connection strings
- Collector processors and exporters
- OTLP HTTP export

## Sources Consulted
- OpenTelemetry Collector Contrib Oracle DB receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/oracledbreceiver
- OpenTelemetry Collector Contrib Oracle DB receiver generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/oracledbreceiver/documentation.md
- OpenTelemetry Collector Contrib Oracle DB receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/oracledbreceiver/metadata.yaml
- Oracle Go driver documentation: https://github.com/sijms/go-ora
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- Several receiver metric names did not exist in the current Oracle DB receiver metadata, including tablespace, buffer-cache, wait-event, Data Guard, RAC, storage, and SQL*Net-style metric names. Replaced them with documented metrics such as `oracledb.tablespace_size.usage`, `oracledb.logical_reads`, `oracledb.physical_reads`, `oracledb.physical_read_io_requests`, and `oracledb.physical_write_io_requests`.
- The post described unsupported receiver connection-pool configuration fields. Replaced that section with the receiver's documented secondary connection fields: `endpoint`, `username`, `password`, and `service`.
- The TNS names example implied `TNS_ADMIN`/`tnsnames.ora` behavior that is not documented for this receiver's Go driver path. Replaced it with a driver-supported connect descriptor example using the `connStr` URL option.
- The wallet option used `wallet_location`, but go-ora documents `wallet`. Updated SSL wallet examples accordingly.
- The performance configuration used the deprecated `resourcedetection` component alias. Updated it to `resource_detection` and changed the pipeline reference to match.
- The filter processor example used an older nested `metrics.datapoint` layout and an unsupported metric name. Updated it to current `metric_conditions` syntax with `datapoint.value_int` and `oracledb.enqueue_deadlocks`.
- The permission grants listed many views not required by the current receiver documentation and omitted `V_$RESOURCE_LIMIT` and `DBA_TABLESPACE_USAGE_METRICS`. Updated the grant list to match the documented receiver permissions.
- The encryption guidance used OCI-style `sqlnet.ora` client configuration for a receiver that documents go-ora URL options. Replaced it with SSL wallet and native encryption URL-option examples.
- The summary called the alpha contrib receiver "production-grade." Reworded that claim to describe it as Oracle Database monitoring through the Collector contrib distribution.

## Review Notes
The Oracle DB receiver is currently documented as alpha for metrics, and many individual metrics are marked development. The examples now use documented configuration keys and metric names, but they were not tested against a live Oracle instance.
