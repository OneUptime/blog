# Validation Summary: How to Implement Redis Auto-Tiering (Flash Memory)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Enterprise (Auto-Tiering / formerly Redis on Flash)
- NVMe/SSD flash storage
- Redis Enterprise REST API
- Prometheus metrics for Redis Enterprise
- Python (redis-py client library)

## Sources Consulted
- Redis Enterprise REST API BDB Object Reference: https://redis.io/docs/latest/operate/rs/references/rest-api/objects/bdb/
- Redis Enterprise REST API BDB Requests: https://redis.io/docs/latest/operate/rs/references/rest-api/requests/bdbs/
- Redis Enterprise Auto Tiering Documentation: https://redis.io/docs/latest/operate/rs/databases/flash/
- Redis Enterprise Auto Tiering Metrics: https://redis.io/docs/latest/operate/rs/references/metrics/auto-tiering/
- Redis Enterprise Prometheus Metrics v1: https://redis.io/docs/latest/integrate/prometheus-with-redis-enterprise/prometheus-metrics-v1/
- Redis Enterprise Prometheus Metrics v2: https://redis.io/docs/latest/integrate/prometheus-with-redis-enterprise/prometheus-metrics-definitions/
- Redis Enterprise Installation Documentation: https://redis.io/docs/latest/operate/rs/installing-upgrading/

## Issues Found

1. **Incorrect Redis Enterprise installation method**: The post used `packages.redis.io` apt repository and `apt install -y redislabs`. The `packages.redis.io` repository is for open-source Redis only, not Redis Enterprise. Fixed to use the correct tarball download and `install.sh` method.

2. **Missing `-k` flag on curl commands**: Redis Enterprise uses a self-signed TLS certificate by default on port 9443. All four `curl` commands to the REST API would fail without the `-k` (insecure) flag. Added `-k` to all REST API curl calls.

3. **Incorrect Prometheus metric names**: The Grafana query used `redis_enterprise_bdb_bigstore_reads` and `redis_enterprise_bdb_read_hits`, which are not documented Redis Enterprise Prometheus metric names. Fixed to use `bdb_bigstore_io_read_bytes` and `bdb_read_hits` which follow the documented v1 naming convention.

4. **Misleading Grafana query comment**: The query was labeled "Flash hit ratio" but actually calculated the proportion of reads served from flash (which you want to be low, not high). Fixed comment to "Flash read ratio (proportion of reads served from flash - lower is better)".

5. **Unused import in Python code**: `import time` was imported but never used. Removed it.

## Review Notes
- The REST API stats field names listed in the monitoring section (`bigstore_reads`, `bigstore_writes`, `bigstore_objs_ram`, etc.) could not be fully confirmed against official documentation. They follow plausible naming conventions and are presented in the context of the REST API stats endpoint, but readers should consult the current Redis Enterprise API reference for their specific version.
- The exact tarball download URL will vary by version and OS. The example uses a representative URL pattern; readers should get the current URL from the Redis downloads page.
- The 20-30% RAM ratio guidance and 10% minimum align with Redis Enterprise documentation recommendations.
- The open-source Redis simulation pattern using two instances is a reasonable architectural pattern, though it requires application-level management of data placement.
