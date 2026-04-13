# How to Monitor MongoDB Operations Per Second (opcounters)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Opcounter, Performance, Metric

Description: Learn how to monitor MongoDB operations per second using opcounters from serverStatus to track insert, query, update, delete, and command rates in real time.

---

MongoDB's `opcounters` in `db.serverStatus()` report the cumulative count of each operation type since the server started. By sampling these counters at intervals, you can calculate operations per second (ops/s) - a fundamental metric for understanding database load and detecting performance anomalies.

## Reading opcounters from serverStatus

```javascript
db.adminCommand({ serverStatus: 1 }).opcounters
```

Output:

```json
{
  "insert": 1234567,
  "query": 9876543,
  "update": 456789,
  "delete": 12345,
  "getmore": 23456,
  "command": 3456789
}
```

These are monotonically increasing counters since the last mongod start.

## Calculating Ops/Second

Take two samples separated by an interval and compute the difference:

```python
import pymongo
import time

client = pymongo.MongoClient("mongodb://localhost:27017")
admin_db = client.admin

def get_opcounters():
    status = admin_db.command("serverStatus")
    return status["opcounters"]

def get_ops_per_second(interval_seconds=5):
    sample1 = get_opcounters()
    time.sleep(interval_seconds)
    sample2 = get_opcounters()

    ops = {}
    for op in ["insert", "query", "update", "delete", "getmore", "command"]:
        delta = sample2[op] - sample1[op]
        ops[f"{op}_per_sec"] = round(delta / interval_seconds, 2)

    return ops

while True:
    ops = get_ops_per_second(interval_seconds=10)
    print(
        f"insert={ops['insert_per_sec']}/s  "
        f"query={ops['query_per_sec']}/s  "
        f"update={ops['update_per_sec']}/s  "
        f"delete={ops['delete_per_sec']}/s"
    )
```

## Monitoring with mongostat

`mongostat` samples opcounters automatically and displays them in a table:

```bash
# Sample every 1 second
mongostat --host localhost:27017 1

# Connect to Atlas
mongostat --uri "mongodb+srv://user:pass@cluster.mongodb.net" 1
```

Sample output:

```text
insert query update delete getmore command dirty  used flushes vsize   res qrw arw net_in net_out conn  time
    42   215     18      3       0   342|0   0.0%  4.0%       0 1.57G 302M 0|0 1|0   89k    221k   15  Dec  1 10:30:00.123
```

## What the Opcounters Mean

```text
insert  - Number of insert operations
query   - Number of query operations (find, aggregate)
update  - Number of update operations
delete  - Number of remove operations
getmore - Number of getmore operations (cursor iteration)
command - Number of commands (includes most driver calls)
```

## Tracking Opcounters in Grafana

Export opcounters as Prometheus metrics using the MongoDB Exporter:

```yaml
# prometheus.yml scrape config
scrape_configs:
  - job_name: mongodb
    static_configs:
      - targets: ["mongodb-exporter:9216"]
```

Useful PromQL queries:

```text
# Insert rate
rate(mongodb_ss_opcounters{legacy_op_type="insert"}[5m])

# Total operation rate
sum(rate(mongodb_ss_opcounters[5m])) by (legacy_op_type)
```

## Setting Alerts on High Op Rates

Alert when the query rate exceeds your baseline:

```python
ALERT_THRESHOLDS = {
    "query_per_sec": 5000,
    "insert_per_sec": 2000,
    "update_per_sec": 1000,
}

ops = get_ops_per_second(10)
for metric, threshold in ALERT_THRESHOLDS.items():
    if ops.get(metric, 0) > threshold:
        print(f"ALERT: {metric} = {ops[metric]} exceeds threshold {threshold}")
```

## opcountersRepl for Replica Sets

On replica set members, `opcountersRepl` tracks operations applied through replication separately from client-initiated operations:

```javascript
db.adminCommand({ serverStatus: 1 }).opcountersRepl
```

High `opcountersRepl` relative to `opcounters` indicates the member is primarily handling replicated writes rather than client traffic.

## Summary

MongoDB opcounters provide the foundation for operation rate monitoring. Sampling `serverStatus().opcounters` at regular intervals and computing deltas gives you real-time insert, query, update, and delete rates. Use `mongostat` for quick interactive monitoring, export to Prometheus and Grafana for dashboards, and set alert thresholds to catch unusual spikes before they become user-visible performance problems.
