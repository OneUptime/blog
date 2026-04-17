# How to Automate ClickHouse Dictionary Reload Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Monitoring, Automation, Reload, Alerting

Description: Learn how to monitor ClickHouse dictionary reload status, detect failed or stale dictionaries, and automate alerting and reload triggers using Python and system tables.

---

## Why Dictionary Reload Monitoring Matters

ClickHouse dictionaries serve as in-memory lookup tables. If a dictionary fails to reload (source unavailable, schema mismatch, timeout), queries that rely on it silently return wrong or stale data. Proactive monitoring catches failures before they affect analytics.

## Checking Dictionary Status

```sql
-- Current state of all dictionaries
SELECT
  database,
  name,
  status,
  last_successful_update_time,
  loading_duration,
  bytes_allocated,
  element_count
FROM system.dictionaries
ORDER BY last_successful_update_time ASC;
```

Status values:
- `LOADED` - healthy, loaded successfully
- `FAILED` - last reload attempt failed
- `LOADING` - currently loading
- `FAILED_AND_RELOADING` - failed but attempting again

## Python Monitoring Script

```python
import clickhouse_connect
from datetime import datetime, timedelta

def check_dictionaries(client, max_age_minutes: int = 60) -> dict:
    result = client.query("""
        SELECT
          database,
          name,
          status,
          last_successful_update_time,
          last_exception
        FROM system.dictionaries
    """)

    issues = {
        "failed": [],
        "stale": [],
        "healthy": []
    }

    cutoff = datetime.now() - timedelta(minutes=max_age_minutes)

    for row in result.named_results():
        name = f"{row['database']}.{row['name']}"
        status = row['status']
        last_ok = row['last_successful_update_time']
        exception = row['last_exception']

        if status == 'FAILED':
            issues["failed"].append({
                "name": name,
                "error": exception
            })
        elif last_ok and last_ok < cutoff:
            issues["stale"].append({
                "name": name,
                "last_updated": last_ok
            })
        else:
            issues["healthy"].append(name)

    return issues


if __name__ == '__main__':
    client = clickhouse_connect.get_client(host='localhost')
    report = check_dictionaries(client, max_age_minutes=120)

    if report["failed"]:
        print("FAILED DICTIONARIES:")
        for d in report["failed"]:
            print(f"  {d['name']}: {d['error']}")

    if report["stale"]:
        print("STALE DICTIONARIES (not updated recently):")
        for d in report["stale"]:
            print(f"  {d['name']}: last updated {d['last_updated']}")

    print(f"Healthy: {len(report['healthy'])} dictionaries")
```

## Triggering Manual Reload

```sql
-- Reload a specific dictionary
SYSTEM RELOAD DICTIONARY user_segment_dict;

-- Reload all dictionaries
SYSTEM RELOAD DICTIONARIES;
```

From Python:

```python
def reload_failed_dictionaries(client, issues: dict) -> None:
    for d in issues["failed"]:
        dict_name = d["name"].split(".")[-1]
        try:
            client.command(f"SYSTEM RELOAD DICTIONARY {dict_name}")
            print(f"Reloaded: {dict_name}")
        except Exception as e:
            print(f"Reload failed for {dict_name}: {e}")
```

## Prometheus Metrics for Dictionary Health

Export dictionary state as metrics:

```python
from prometheus_client import Gauge

dict_load_duration = Gauge('clickhouse_dictionary_load_duration_seconds',
                            'Time to load dictionary',
                            ['database', 'name'])

def export_metrics(client):
    result = client.query("""
        SELECT database, name, loading_duration
        FROM system.dictionaries
        WHERE status = 'LOADED'
    """)
    for row in result.result_rows:
        dict_load_duration.labels(database=row[0], name=row[1]).set(row[2])
```

## Cron-Based Monitoring

```bash
# /etc/cron.d/clickhouse-dict-monitor
# Check every 10 minutes
*/10 * * * * clickhouse python3 /opt/scripts/dict_monitor.py \
  >> /var/log/ch_dict_monitor.log 2>&1
```

## Dictionary LIFETIME and Reload Frequency

Control reload frequency in the dictionary definition:

```sql
CREATE DICTIONARY user_segment_dict (
  user_id UInt64,
  segment String
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE 'user_segments' DB 'analytics'))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);  -- reload every 5-10 minutes
```

## Summary

Monitor ClickHouse dictionary health via `system.dictionaries`, checking for `FAILED` status and stale `last_successful_update_time`. Automate monitoring with a Python script that detects failures and triggers `SYSTEM RELOAD DICTIONARY` for failed dictionaries. Export dictionary load duration and element count as Prometheus metrics for dashboard visibility. Set appropriate `LIFETIME` values so dictionaries refresh automatically without manual intervention.
