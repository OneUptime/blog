# Validation Summary: How to Monitor Redis Cloud Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Cloud (managed Redis service)
- Redis Cloud REST API
- Prometheus
- Grafana
- Python (requests library)
- cURL

## Sources Consulted
- Redis Cloud REST API documentation — https://redis.io/docs/latest/operate/rc/api/
- Redis Cloud API authentication — https://redis.io/docs/latest/operate/rc/api/get-started/use-rest-api/
- Redis Enterprise database stats API — https://redis.io/docs/latest/operate/rs/references/rest-api/requests/bdbs/stats/
- Prometheus and Grafana with Redis Cloud — https://redis.io/docs/latest/integrate/prometheus-with-redis-cloud/
- Prometheus metrics v1 definitions — https://redis.io/docs/latest/integrate/prometheus-with-redis-enterprise/prometheus-metrics-v1/
- Prometheus metrics v2 definitions — https://redis.io/docs/latest/integrate/prometheus-with-redis-enterprise/prometheus-metrics-definitions/
- Redis Cloud alert types — https://redis.io/docs/latest/operate/rc/databases/monitor-performance/

## Issues Found

### 1. Python script used wrong field names and data nesting
**What was wrong:** The Python script accessed API response fields using camelCase names (`instantaneousOpsPerSec`, `memoryUsagePercent`, `connectedClients`) at the top level of the response object. However, the JSON response example shown directly above the script uses snake_case names (`instantaneous_ops_per_sec`, `used_memory`, `conns`) nested under `intervals[0]`. The field `memoryUsagePercent` does not exist in the API response at all — memory is returned as `used_memory` in bytes.

**What was changed:** Fixed the script to access `data["intervals"][0]` and use the correct snake_case field names matching the documented API response. Changed the memory threshold check from a percentage to a byte-based comparison since the API returns memory in bytes, not as a percentage.

### 2. Prometheus metric names were fabricated
**What was wrong:** The post listed Prometheus metrics with a `redis_cloud_db_` prefix (`redis_cloud_db_memory_used_bytes`, `redis_cloud_db_instantaneous_ops_per_sec`, etc.). This prefix does not exist in Redis Cloud's Prometheus integration. The actual v1 metrics use the `bdb_` prefix (e.g., `bdb_used_memory`, `bdb_instantaneous_ops_per_sec`, `bdb_conns`, `bdb_read_hits`, `bdb_read_misses`).

**What was changed:** Replaced all five metric names with the correct `bdb_`-prefixed names from the official Prometheus v1 metrics documentation.

### 3. Prometheus metrics_path was incorrect
**What was wrong:** The Prometheus scrape config used `metrics_path: /metrics`, but the Redis Cloud Prometheus endpoint serves metrics at `/` (v1) or `/v2` (v2), not at `/metrics`.

**What was changed:** Changed `metrics_path: /metrics` to `metrics_path: /`.

### 4. Grafana query used wrong metric names
**What was wrong:** The Grafana cache hit rate query referenced the fabricated `redis_cloud_db_keyspace_hits_total` and `redis_cloud_db_keyspace_misses_total` metrics.

**What was changed:** Updated to use the correct `bdb_read_hits` and `bdb_read_misses` metric names.

## Review Notes
- The Prometheus metric names used in the fixes are from the v1 metrics API (`bdb_` prefix). Redis Cloud also offers v2 metrics with `endpoint_` and `redis_server_` prefixes. The post may want to mention both versions in a future update.
- The Redis Cloud REST API stats endpoint path (`/v1/subscriptions/{sub-id}/databases/{db-id}/stats`) could not be fully verified in the public API documentation. The documented Redis Enterprise Software endpoint uses `/v1/bdbs/stats/{uid}` instead. The Cloud API path used in the post is plausible but readers should verify against their Redis Cloud API console.
- The alert section uses simplified names (e.g., "Memory usage" instead of the official "Dataset size has reached") and a 5-second sync lag threshold where the default is 600 seconds. These are acceptable as example configurations but readers should check the current console for exact labels and defaults.
- The Prometheus scrape config does not include authentication. Redis Cloud's Prometheus endpoint may require credentials depending on the setup — readers should follow the setup instructions in the Redis Cloud console.
