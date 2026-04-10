# Validation Summary: How to Build Redis Monitoring with the TIG Stack (Telegraf + InfluxDB + Grafana)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Telegraf (InfluxData)
- InfluxDB 2.7
- Grafana 10.3.0
- Docker / Docker Compose
- Flux query language

## Sources Consulted
- Telegraf Redis input plugin README — https://github.com/influxdata/telegraf/blob/master/plugins/inputs/redis/README.md
- Telegraf Redis plugin source (redis.go) — https://github.com/influxdata/telegraf/blob/master/plugins/inputs/redis/redis.go
- InfluxData Telegraf Redis plugin docs — https://docs.influxdata.com/telegraf/v1/input-plugins/redis/
- Grafana legacy alerting removal blog post — https://grafana.com/blog/2024/04/04/legacy-alerting-removal-what-you-need-to-know-about-upgrading-to-grafana-alerting/
- Grafana Alerting Provisioning HTTP API — https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/alerting_provisioning/
- Grafana v10.0 breaking changes — https://grafana.com/docs/grafana/latest/breaking-changes/breaking-changes-v10-0/
- InfluxDB 2.x Docker setup documentation — https://docs.influxdata.com/influxdb/v2/install/?t=Docker

## Issues Found

### 1. Duplicate `[[inputs.redis]]` block with non-existent `commands` option
- **What was wrong:** The Telegraf configuration contained two `[[inputs.redis]]` blocks. The second block included a `commands = ["get", "set", "hget", "hset", "zadd", "zrange"]` option described as filtering COMMANDSTATS output. This option does not exist in the Telegraf Redis input plugin. Having two input blocks pointing to the same server would also cause duplicate metric collection.
- **What was changed:** Removed the second `[[inputs.redis]]` block entirely, keeping only the valid single block with `servers` and the commented-out `password` option.
- **Why:** The Telegraf Redis plugin collects all metrics from `INFO all` automatically. There is no configuration to filter specific COMMANDSTATS entries. The plugin does have a `[[inputs.redis.commands]]` subsection, but that is for executing arbitrary Redis commands as custom metrics, not for filtering COMMANDSTATS.

### 2. Grafana legacy alerting API endpoint
- **What was wrong:** The alerting setup used `curl -X POST http://admin:admin@localhost:3000/api/alert-notifications`, which is the legacy alerting API. In Grafana 10.x, unified alerting is the default and legacy alerting is disabled. This endpoint would not work on a default Grafana 10.3.0 installation.
- **What was changed:** Updated to the unified alerting provisioning API endpoint `/api/v1/provisioning/contact-points` with Bearer token authentication, which is the correct approach for Grafana 10.x.
- **Why:** Legacy alerting was deprecated in Grafana 9.0 and disabled by default in 10.x. It was fully removed in Grafana 11.0. Since the post targets Grafana 10.3.0, the unified alerting API is the correct one to use.

### 3. Incorrect description of `redis_total_commands_processed`
- **What was wrong:** The metric was described as "commands/sec" (a rate), but it is actually a cumulative counter representing the total number of commands processed.
- **What was changed:** Updated the description from "commands/sec" to "total commands processed".
- **Why:** The raw value from Redis INFO is a monotonically increasing counter. To get a rate (commands/sec), you need to apply a `derivative()` function in Flux or similar transformation.

## Review Notes
- The Telegraf installation commands use `apt-key add`, which is deprecated in newer Ubuntu/Debian versions in favor of `signed-by` in apt sources. This still works on Ubuntu Focal but may not on newer releases.
- The hit rate Flux query defines `hits` and `misses` variables but does not compute the actual hit rate ratio (hits / (hits + misses)). The individual queries are correct, but a complete hit rate calculation would require joining the two streams.
- The `docker-compose.yml` uses `version: "3.8"` which is ignored by modern Docker Compose (v2+) but is not harmful.
- The InfluxDB and Grafana Docker setup, Flux queries, and metric names are all technically correct.
