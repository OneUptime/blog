# How to Set Up Redis Monitoring with New Relic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, New Relic, Monitoring, Observability, Integration

Description: Configure the New Relic Redis integration to collect metrics, build dashboards, and set NRQL-based alerts for Redis memory, latency, and throughput.

---

New Relic's infrastructure agent includes a Redis on-host integration that streams key metrics into New Relic One. This guide covers installation, configuration, and building alerts with NRQL.

## Installing the New Relic Infrastructure Agent

```bash
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash
sudo NEW_RELIC_API_KEY=<YOUR_KEY> NEW_RELIC_ACCOUNT_ID=<ACCOUNT_ID> /usr/local/bin/newrelic install -n infrastructure-agent-installer
```

## Enabling the Redis Integration

Install the Redis on-host integration package:

```bash
sudo apt-get install nri-redis
```

Create the integration configuration:

```bash
sudo nano /etc/newrelic-infra/integrations.d/redis-config.yml
```

```yaml
integrations:
  - name: nri-redis
    env:
      HOSTNAME: localhost
      PORT: 6379
      UNIX_SOCKET_PATH: ""
      USE_TLS: false
      CONFIG_INVENTORY: true
      RENAMED_COMMANDS: ""
    interval: 15s
    labels:
      environment: production
      service: redis
```

Restart the agent:

```bash
sudo systemctl restart newrelic-infra
```

## Verifying Data in New Relic

After a few minutes, query your Redis data with NRQL:

```sql
SELECT latest(net.commandsProcessedPerSecond)
FROM RedisSample
FACET entityName
SINCE 30 minutes ago
```

List all available metrics:

```sql
SELECT keyset()
FROM RedisSample
LIMIT 1
```

## Building a Dashboard

Create a dashboard with these NRQL queries:

```sql
-- Memory usage as percentage of total system memory
SELECT latest(system.usedMemoryBytes) / latest(system.totalSystemMemoryBytes) * 100
AS 'Memory %'
FROM RedisSample
FACET entityName TIMESERIES

-- Cache hit ratio
SELECT average(db.keyspaceHitsPerSecond)
  / (average(db.keyspaceHitsPerSecond)
  + average(db.keyspaceMissesPerSecond)) * 100
AS 'Hit Ratio %'
FROM RedisSample TIMESERIES
```

## Alerting with NRQL

Create an alert condition in New Relic for high eviction rate:

```sql
SELECT average(db.evictedKeysPerSecond) * 60
FROM RedisSample
WHERE environment = 'production'
```

Set the threshold to trigger a critical incident when evictions exceed 100/minute for 5 minutes.

## APM-Level Redis Monitoring

If your application uses the New Relic APM agent (Python, Node.js, Java), Redis calls are automatically traced as database spans. This gives you end-to-end visibility from application code to Redis command execution time, helping you identify slow queries originating from specific code paths.

```python
# New Relic Python agent instruments redis-py automatically
import newrelic.agent
newrelic.agent.initialize("newrelic.ini")

import redis
r = redis.Redis(host="localhost", port=6379)
r.set("key", "value")  # Automatically traced
```

## Summary

New Relic's nri-redis integration collects Redis metrics every 15 seconds and makes them queryable with NRQL. Combine infrastructure-level metrics with APM distributed tracing to pinpoint whether Redis latency is caused by server-side slowness or network and application overhead.
