# Validation Summary: How to Set Up Redis Monitoring with Datadog

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Redis
- Datadog Agent 7
- Datadog Redis integration (redisdb check)
- Datadog Python library (datadogpy)
- Docker / Docker Compose

## Sources Consulted
- Datadog Redis integration documentation: https://docs.datadoghq.com/integrations/redisdb/
- Datadog integrations-core redisdb conf.yaml.example: https://github.com/DataDog/integrations-core/blob/master/redisdb/datadog_checks/redisdb/data/conf.yaml.example
- Datadog integrations-core redisdb metadata.csv (metric names): https://github.com/DataDog/integrations-core/blob/master/redisdb/metadata.csv
- Datadog Docker Agent documentation: https://docs.datadoghq.com/containers/docker/
- datadogpy Python library documentation: https://datadogpy.readthedocs.io/

## Issues Found

1. **Incorrect metric name `redis.net.latency_p99`**: This metric does not exist in the Datadog Redis integration. There are no percentile latency metrics under the `redis.net.*` namespace. Replaced with `redis.info.latency_ms` (latest fork latency in milliseconds), which is an actual metric collected by the integration.

2. **Incorrect metric name `redis.config.maxmemory`**: The `redis.config.*` namespace does not exist in the Datadog Redis integration. The correct metric name is `redis.mem.maxmemory`. This affected the dashboard section and the monitor query in the Python code example. Both occurrences were corrected.

## Review Notes
- The Docker image `gcr.io/datadoghq/agent:7` is valid and works, but Datadog now recommends `registry.datadoghq.com/agent:7` as the primary container registry. The current value is not wrong, just not the latest recommended default.
- The Python code uses the legacy `datadogpy` library (`import datadog`). Datadog now also offers a newer generated client library (`datadog-api-client-python`) with a different API surface. The legacy library still works, but new projects may prefer the newer client.
- All configuration options (`collect_client_metrics`, `command_stats`, `keys`, `warn_on_missing_keys`) were verified as valid against the official conf.yaml.example.
- The agent commands (`datadog-agent check redisdb`, `systemctl restart datadog-agent`) are correct.
- The config file path `/etc/datadog-agent/conf.d/redisdb.d/conf.yaml` is correct for Linux installations.
