# Validation Summary: How to Send Redis Metrics to InfluxDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INFO command metrics)
- InfluxDB 2.x (time-series database)
- Telegraf (metrics collection agent)
- Flux (InfluxDB query language)

## Sources Consulted
- Telegraf Redis Input Plugin README — https://github.com/influxdata/telegraf/blob/master/plugins/inputs/redis/README.md
- Telegraf InfluxDB v2 Output Plugin README — https://github.com/influxdata/telegraf/blob/master/plugins/outputs/influxdb_v2/README.md
- InfluxDB Flux data types documentation — https://docs.influxdata.com/flux/v0/data-types/basic/int/
- Flux specification (expressions and operators) — https://docs.influxdata.com/flux/v0/spec/expressions/
- Telegraf configuration options (field filtering) — https://docs.influxdata.com/telegraf/v1/configuration/
- InfluxData Linux package installation docs — https://docs.influxdata.com/telegraf/v1/install/
- The Future of Flux — https://docs.influxdata.com/flux/v0/future-of-flux/

## Issues Found

1. **Description mentioned "retention policies" but post does not cover them.**
   - The post description claimed coverage of "retention policies" but the body has no section or mention of retention policies.
   - Removed "retention policies" from the description to accurately reflect the content.

2. **Flux cache hit rate query used integer division.**
   - The `map()` function in the cache hit rate query divided `r.keyspace_hits / (r.keyspace_hits + r.keyspace_misses)`. Since Telegraf stores these counters as integers from Redis INFO, Flux integer division truncates the result (e.g., `500 / 1000` returns `0` instead of `0.5`), producing incorrect hit rate values.
   - Fixed by wrapping operands in `float()` conversions: `float(v: r.keyspace_hits) / float(v: r.keyspace_hits + r.keyspace_misses)`.

3. **Deprecated `fieldpass` option in commented example.**
   - The commented-out Telegraf field filtering example used `fieldpass`, which has been deprecated in favor of `fieldinclude`.
   - Updated the commented example to use `fieldinclude`.

## Review Notes
- Flux is in maintenance mode and is not supported in InfluxDB 3.x, which uses SQL and InfluxQL instead. The post targets InfluxDB 2.x (evident from the `influxdb_v2` output plugin), so the Flux queries are appropriate for that version. Readers migrating to InfluxDB 3.x should be aware they will need to rewrite queries in SQL.
- The `keyspace_hits` and `keyspace_misses` metrics from Redis INFO are cumulative counters. The cache hit rate query calculates the cumulative hit rate at each data point, which is a valid approach. For a per-interval hit rate, `difference()` or `derivative()` could be applied before the calculation.
- The memory usage percentage query hardcodes 4GB (4294967296 bytes) as the maxmemory value. The comment makes this assumption clear, but a production query should ideally use the actual `maxmemory` config value.
- The Telegraf APT repository installation commands use the correct modern approach (dearmored key in `/etc/apt/trusted.gpg.d/` with `signed-by`).
