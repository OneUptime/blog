# Validation Summary: How to Deploy Memcached via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Memcached 1.6 (alpine image)
- Portainer (Stacks / docker-compose)
- Docker / Docker Compose
- prom/memcached-exporter (Prometheus exporter)
- Prometheus (scrape config)
- pymemcache (Python client)
- PHP Memcached extension
- BusyBox `nc` (used in healthcheck and connectivity test)

## Sources Consulted
- Official Memcached Docker image: https://hub.docker.com/_/memcached and https://github.com/docker-library/memcached
- Memcached command-line flags: `man memcached` / https://github.com/memcached/memcached/wiki/ConfiguringServer
- prom/memcached-exporter source (metric names): https://github.com/prometheus/memcached_exporter/blob/master/pkg/exporter/exporter.go
- pymemcache API docs: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.client.base.html
- PHP Memcached extension docs: https://www.php.net/manual/en/book.memcached.php
- Prometheus scrape config reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
1. **Incorrect Prometheus metric name `memcached_limit_maxbytes`.** The prom/memcached-exporter exposes this as `memcached_limit_bytes` (verified in `pkg/exporter/exporter.go`). Updated the metrics list in Step 5 to use the correct name.
2. **`memcached_get_hit_ratio` is not a metric exposed by the exporter.** The exporter only emits raw counters (`memcached_commands_total{command="get",status="hit"}` / `{status="miss"}`); a hit ratio must be computed from those. Replaced the bullet with the correct metric names and a brief note on how to compute the ratio.

## Review Notes
- The healthcheck `echo stats | nc localhost 11211 | grep -q uptime` relies on BusyBox `nc`, which is present in `memcached:1.6-alpine` (Alpine ships with BusyBox). It can occasionally hang because Memcached does not close the connection after a `stats` response; if the healthcheck appears slow/flaky in practice, adding `-w 1` to `nc` (final-read timeout) makes it more reliable. Left as-is since the 10s healthcheck timeout will still mark it failing rather than hanging the container.
- The Conclusion states Memcached "does not support … authentication". Memcached does support SASL when compiled with `--enable-sasl`, but the official `memcached:1.6-alpine` image is built without SASL, so the statement is accurate for users following this guide. Worth being aware of if a reader asks about authentication options.
- The cache-invalidation tip in the Conclusion (using a version prefix like `v2:user:1000`) does not literally invalidate the old keys; it just makes them unreachable so they age out via LRU/TTL. Technically correct, just an implementation detail worth noting.
- `prom/memcached-exporter:latest` is used in the compose file; pinning to a specific tag is recommended for reproducibility but this is a stylistic preference, not a correctness issue.
- `version: "3.8"` in compose is harmless but no longer required by modern Docker Compose; left unchanged to match the rest of the blog series.
