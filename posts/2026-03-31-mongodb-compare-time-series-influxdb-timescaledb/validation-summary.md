# Validation Summary: How to Compare MongoDB Time Series vs InfluxDB vs TimescaleDB

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB Time Series Collections
- InfluxDB (2.x, with notes on 1.x TICK stack)
- TimescaleDB (PostgreSQL extension)
- Flux query language
- SQL / time_bucket function
- MongoDB Aggregation Pipeline

## Sources Consulted
- MongoDB Time Series Collections documentation: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- InfluxDB 2.x documentation (UI, alerting via tasks/checks): https://docs.influxdata.com/influxdb/v2/
- InfluxDB TICK stack (Chronograf, Kapacitor) documentation: https://docs.influxdata.com/chronograf/ and https://docs.influxdata.com/kapacitor/
- TimescaleDB documentation (hypertables, compression, time_bucket): https://docs.timescale.com/
- TimescaleDB multi-node deprecation notice: https://docs.timescale.com/about/latest/timescaledb-editions/
- InfluxDB TSM storage engine documentation: https://docs.influxdata.com/influxdb/v2/reference/internals/storage-engine/

## Issues Found
1. **InfluxDB operational description referenced 1.x TICK stack components**: The post mentioned "Chronograf" (query UI) and "Kapacitor" (alerting) as built-in InfluxDB features. These are separate components from the InfluxDB 1.x TICK stack. Since the post uses Flux query examples (InfluxDB 2.x), the operational section should reference the built-in UI and built-in alerting via tasks/checks that ship with InfluxDB 2.x. **Fixed** by updating the description to reference the built-in UI and tasks/checks alerting in InfluxDB 2.x.

## Review Notes
- The Flux query language example is correct for InfluxDB 2.x but Flux has been deprecated in InfluxDB 3.x in favor of SQL and InfluxQL. The post does not specify an InfluxDB version; this is worth noting for future updates.
- TimescaleDB Distributed (multi-node) was deprecated by Timescale in late 2023. The post mentions "Multi-node requires TimescaleDB Distributed" without noting this deprecation. A future update could clarify this.
- Insert performance numbers are presented as rough ranges, which is appropriate since actual throughput varies significantly by hardware, schema, and workload. These are reasonable ballpark figures.
- The compression ratios are presented as typical ranges and are consistent with published benchmarks and documentation.
