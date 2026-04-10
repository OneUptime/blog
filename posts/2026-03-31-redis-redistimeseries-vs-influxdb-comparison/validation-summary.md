# Validation Summary: RedisTimeSeries vs InfluxDB: Time Series Comparison

## Status
validated

## Post Type
Comparison guide / Reference

## Technologies Covered
- RedisTimeSeries (Redis module for time series data)
- InfluxDB 2.x (time series database)
- Flux query language
- influxdb-client-python (Python client library)
- Redis CLI commands (TS.CREATE, TS.ADD, TS.RANGE, TS.CREATERULE, TS.ALTER, TS.MRANGE)

## Sources Consulted
- Redis official documentation for RedisTimeSeries commands (TS.CREATE, TS.ADD, TS.RANGE, TS.CREATERULE, TS.ALTER, TS.MRANGE) — https://redis.io/docs/latest/develop/data-types/timeseries/
- InfluxDB 2.x official documentation — https://docs.influxdata.com/influxdb/v2/
- influxdb-client-python library documentation — https://github.com/influxdata/influxdb-client-python
- Flux language specification — https://docs.influxdata.com/flux/

## Issues Found
- **Missing TS.CREATE for destination keys before TS.CREATERULE**: The `TS.CREATERULE` command requires the destination key to already exist (created via `TS.CREATE`). Both instances in the post (in "RedisTimeSeries Basics" and "Retention and Downsampling" sections) were missing this prerequisite step. Added `TS.CREATE` commands for `sensor:temperature:1h` and `sensor:cpu:1h` with appropriate retention periods before their respective `TS.CREATERULE` calls.

## Review Notes
- Flux has been deprecated in InfluxDB 3.x in favor of SQL and InfluxQL. The post's Flux examples remain correct for InfluxDB 2.x, which is still widely deployed. The post does not specify a version, so this is not an error, but readers should be aware of the deprecation for new deployments.
- The "Built-in dashboards and alerting via Grafana integration" bullet under "When to Choose InfluxDB" is slightly ambiguous — InfluxDB 2.x has its own built-in dashboards and alerting UI, while Grafana is a separate integration. The phrasing could be read as implying the built-in dashboards come via Grafana, but this is a minor clarity issue rather than a technical error.
- Performance numbers in the comparison table (1M+ points/sec for RedisTimeSeries, 100K-500K for InfluxDB) are reasonable ballpark figures commonly cited in benchmarks, though actual throughput varies significantly by hardware, configuration, and workload characteristics.
