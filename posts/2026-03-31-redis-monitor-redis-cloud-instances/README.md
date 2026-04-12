# How to Monitor Redis Cloud Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cloud, Monitoring, Observability, Alerting

Description: Monitor Redis Cloud instances using built-in metrics, the Redis Cloud API, and Prometheus integration to track memory, latency, and throughput.

---

Redis Cloud provides built-in monitoring through its console, but production workloads need deeper visibility - custom alerts, historical trends, and integration with your existing observability stack. This guide covers the available monitoring options.

## Built-in Console Metrics

In the Redis Cloud console, click on a database and navigate to **Metrics**. Available charts include:

- **Memory usage** - used vs allocated
- **Operations/sec** - read and write ops
- **Network throughput** - bytes in/out
- **Connections** - current connected clients
- **Keyspace** - number of keys

These are visible for the past hour, day, or week.

## Setting Up Alerts in Redis Cloud Console

Under the **Configuration** tab, locate the **Alerts** section:

```text
Alert type: Memory usage
Threshold: 80%
Action: Email notification

Alert type: Number of connections
Threshold: 80% of plan limit
Action: Email notification

Alert type: Replica Of - sync lag is higher than
Threshold: 5 seconds
Action: Email notification
```

## Using the Redis Cloud API

Redis Cloud exposes a REST API for programmatic monitoring:

```bash
# Get the database's current metrics
curl -s -X GET \
  "https://api.redislabs.com/v1/subscriptions/<sub-id>/databases/<db-id>/stats" \
  -H "accept: application/json" \
  -H "x-api-key: <api-key>" \
  -H "x-api-secret-key: <secret-key>" | jq .
```

Key fields in the response:

```json
{
  "uid": "1",
  "intervals": [
    {
      "interval": "1hour",
      "instantaneous_ops_per_sec": 1250.0,
      "used_memory": 524288000.0,
      "conns": 42.0,
      "no_of_keys": 150000.0
    }
  ]
}
```

## Polling Metrics with a Script

```python
import requests
import time

API_KEY = "your-api-key"
SECRET_KEY = "your-secret-key"
SUB_ID = "12345"
DB_ID = "67890"

headers = {
    "x-api-key": API_KEY,
    "x-api-secret-key": SECRET_KEY,
}

def get_metrics():
    url = f"https://api.redislabs.com/v1/subscriptions/{SUB_ID}/databases/{DB_ID}/stats"
    response = requests.get(url, headers=headers)
    data = response.json()
    latest = data["intervals"][0]
    return {
        "ops_per_sec": latest.get("instantaneous_ops_per_sec", 0),
        "used_memory": latest.get("used_memory", 0),
        "connections": latest.get("conns", 0),
    }

while True:
    metrics = get_metrics()
    print(metrics)
    if metrics["used_memory"] > 450_000_000:
        print("WARNING: Memory usage above 450MB")
    time.sleep(60)
```

## Prometheus Integration

Redis Cloud supports Prometheus scraping for Flexible plan subscribers. Enable it from **Database Settings - Prometheus Integration** and add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: redis_cloud
    static_configs:
      - targets: ["metrics.redis-cloud.example.com:8070"]
    metrics_path: /
    scheme: https
    tls_config:
      insecure_skip_verify: false
```

Key Prometheus metrics:

```text
bdb_used_memory
bdb_instantaneous_ops_per_sec
bdb_conns
bdb_read_hits
bdb_read_misses
```

## Grafana Dashboard

After configuring Prometheus, import a Grafana dashboard. A sample panel for cache hit rate:

```text
Panel: Cache Hit Rate
Query: rate(bdb_read_hits[5m]) /
       (rate(bdb_read_hits[5m]) +
        rate(bdb_read_misses[5m]))
Unit: Percent (0-100)
Alert: < 90% for 5 minutes
```

## Summary

Monitor Redis Cloud instances using the built-in console for quick visibility, the REST API for programmatic polling, and Prometheus + Grafana for production-grade dashboards. Configure memory and replication lag alerts in the console as a minimum baseline, and track cache hit rate as the primary health indicator for caching workloads.
