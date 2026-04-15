# How to Manage ClickHouse Docker Container Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker, Logging, Log Management, Troubleshooting, Observability

Description: Learn how to configure, access, and manage ClickHouse logs in Docker containers including log levels, rotation, and forwarding to centralized log systems.

---

ClickHouse produces several types of logs that are critical for troubleshooting and monitoring. When running in Docker, managing these logs properly prevents disk exhaustion and enables effective debugging.

## ClickHouse Log Files

By default, ClickHouse writes logs to `/var/log/clickhouse-server/`:

| File | Content |
|------|---------|
| `clickhouse-server.log` | Main server log |
| `clickhouse-server.err.log` | Stderr output |

## Viewing Logs with Docker

View real-time logs from the Docker daemon:

```bash
# Follow all container logs
docker logs -f clickhouse

# Show last 100 lines
docker logs --tail 100 clickhouse

# Filter for errors
docker logs clickhouse 2>&1 | grep -i error
```

## Configuring Log Level

Control verbosity via configuration override. Create `config/logging.xml`:

```xml
<clickhouse>
    <logger>
        <level>warning</level>
        <log>/var/log/clickhouse-server/clickhouse-server.log</log>
        <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
        <size>1000M</size>
        <count>10</count>
    </logger>
</clickhouse>
```

Log levels from most to least verbose: `trace`, `debug`, `information`, `notice`, `warning`, `error`, `critical`, `fatal`.

Mount the config in your Compose file:

```yaml
volumes:
  - ./config/logging.xml:/etc/clickhouse-server/config.d/logging.xml
```

## Persisting Logs to a Host Volume

Mount the log directory to the host to retain logs across container restarts:

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - ./logs:/var/log/clickhouse-server
```

Fix permissions:

```bash
mkdir -p logs
sudo chown -R 101:101 logs
```

## Docker Logging Drivers

Configure the Docker logging driver to control log retention:

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "5"
```

## Forwarding Logs to a Central System

Use the `fluentd` or `loki` Docker logging driver to forward logs:

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-external-labels: "job=clickhouse,env=production"
```

## Querying Logs from Inside ClickHouse

ClickHouse also stores query logs in system tables, which are often more useful than raw file logs:

```sql
-- Recent slow queries
SELECT
    query_start_time,
    round(query_duration_ms / 1000, 2) AS duration_sec,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 1000
ORDER BY query_start_time DESC
LIMIT 20;

-- Error log from system table
SELECT event_time, level, message
FROM system.text_log
WHERE level IN ('Error', 'Warning')
ORDER BY event_time DESC
LIMIT 50;
```

## Summary

Managing ClickHouse logs in Docker requires configuring log levels, setting rotation policies, and optionally forwarding to a centralized logging system. Combining Docker log driver settings with ClickHouse's built-in system tables gives you comprehensive visibility into server behavior and query performance.
