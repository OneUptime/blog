# Validation Summary: How to Build Redis Monitoring with the TIG Stack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Telegraf (InfluxData agent for metrics collection)
- InfluxDB 2.x (time-series database)
- Grafana (visualization and alerting)
- Flux query language

## Sources Consulted
- InfluxData official documentation for InfluxDB 2.x repository setup (https://docs.influxdata.com/influxdb/v2/install/)
- InfluxData Telegraf Redis input plugin documentation (https://github.com/influxdata/telegraf/tree/master/plugins/inputs/redis)
- Telegraf Redis plugin source code (`plugins/inputs/redis/redis.go`) for field name verification
- Flux language specification for `keys()`, `keep()`, `distinct()`, `derivative()`, `pivot()`, and `aggregateWindow()` functions
- InfluxDB 2.x CLI reference for `influx setup` command flags
- Debian/Ubuntu `apt-key` deprecation documentation

## Issues Found

### Issue 1: InfluxDB installation commands were broken (3 bugs)
**What was wrong:** The repository setup commands had three distinct problems:
1. The GPG key was corrupted by appending the literal string " influxdb" to its content before piping to `apt-key add`
2. The `signed-by` directive in the sources list pointed to `/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg`, but no prior command placed the key at that path — `apt-get update` would fail with a signature verification error
3. Used the deprecated `apt-key add` command (removed in Ubuntu 24.04+)
4. The repository URL used `/ubuntu` instead of the current unified `/debian` path for Debian-based distributions

**What was changed:** Replaced the three-line key/repo setup with the modern approach: download the key, dearmor it with `gpg` and place it directly at the `signed-by` path, and use the `/debian` repo URL.

**Why:** The original commands would fail to install InfluxDB on any system. The key corruption and missing keyring file are fatal errors.

### Issue 2: Flux query to list fields used `keys()` incorrectly
**What was wrong:** The query used `keys() |> distinct(column: "_field")` to list available field names. The `keys()` function returns column names (like `_time`, `_value`, `_field`, `_measurement`) as values in a new `_value` column — it does not return field values. After `keys()`, the `_field` column no longer exists, so `distinct(column: "_field")` would error.

**What was changed:** Replaced `keys()` with `keep(columns: ["_field"])`, which retains only the `_field` column containing field names, allowing `distinct()` to correctly deduplicate them.

**Why:** The original query would error or return column metadata instead of the intended list of Redis metric field names.

### Issue 3: Field reference table contained non-existent Telegraf fields
**What was wrong:** Two fields in the reference table do not exist in the Telegraf Redis plugin:
- `replication_lag` — does not exist. Replication lag is collected as `lag` (in seconds, not bytes) under a separate `redis_replication` measurement, not the `redis` measurement
- `aof_current_size` — does not exist. The plugin collects AOF-related fields like `aof_enabled`, `aof_last_bgrewrite_status`, and `aof_rewrite_in_progress`, but not AOF file size

**What was changed:**
- Replaced `replication_lag - bytes behind master (on replica)` with `master_repl_offset - replication stream offset`
- Replaced `aof_current_size - AOF file size` with `aof_last_bgrewrite_status - last AOF rewrite result`

**Why:** Listing non-existent field names in a reference table would cause users to write queries that return no data.

## Review Notes
- The Grafana installation step (`sudo apt-get install grafana`) assumes the Grafana APT repository has already been added to the system. In practice, users would need to add the Grafana repo first. This is a minor omission since the post focuses on TIG integration rather than basic Grafana setup.
- The Telegraf Redis plugin may emit `connected_clients` as `clients` depending on the version. The blog uses `connected_clients` throughout its Flux queries, which is consistent with many community examples but may not match all Telegraf versions. Users should verify with `telegraf --config /etc/telegraf/telegraf.conf --test` output.
- The memory usage percentage Flux query will produce a division-by-zero error if `maxmemory` is set to 0 (the default, meaning no memory limit). A production dashboard should handle this edge case.
- InfluxDB 3.x (InfluxDB Cloud Serverless and the new OSS engine) is moving away from Flux toward SQL and InfluxQL. The Flux queries in this post are valid for InfluxDB 2.x but may need adaptation for InfluxDB 3.x deployments.
