# Validation Summary: How to Monitor MongoDB Replica Set Health with Custom Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog, `rs.status()` / `replSetGetStatus`)
- Python 3 with PyMongo
- prometheus_client Python library
- Prometheus (scrape configuration, alerting rules)
- Grafana (PromQL dashboard panels)

## Sources Consulted
- PyMongo `bson.Timestamp` API documentation: https://pymongo.readthedocs.io/en/stable/api/bson/timestamp.html
- MongoDB `replSetGetStatus` command documentation: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- prometheus_client Python library documentation: https://prometheus.github.io/client_python/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found

1. **`bson.Timestamp.as_datetime()` does not exist (line 90)**: The oplog `ts` field is a `bson.Timestamp` object in PyMongo, which has `.time` (Unix epoch seconds as int) and `.inc` attributes but no `as_datetime()` method. Changed `(last["ts"].as_datetime() - first["ts"].as_datetime()).total_seconds()` to `last["ts"].time - first["ts"].time`, which directly computes the difference in seconds using the integer epoch values.

2. **Description incorrectly said "Prometheus push gateway"**: The code uses `start_http_server()` from `prometheus_client`, which starts an HTTP endpoint that Prometheus scrapes (pull model). No push gateway is involved. Changed to "Prometheus HTTP exporter".

3. **Introduction said "pushes data to Prometheus"**: Same pull-vs-push inaccuracy. Changed to "exposes data for Prometheus to scrape".

## Review Notes
- The `member_health` gauge uses `state` as a label. When a member changes state (e.g., SECONDARY to PRIMARY during an election), the old time series with the previous state label value will remain stale until it is explicitly removed or times out. In a production collector, calling `.clear()` on the gauge before each collection cycle or using `remove()` for old label combinations would prevent stale series.
- The replication lag calculation uses `optimeDate` which gives wall-clock precision only to the second. For sub-second lag monitoring, the `optime.ts` Timestamp (with its incrementing counter) would be more precise.
- The collector reconnects on every loop iteration implicitly via the same `MongoClient` instance, which is fine since PyMongo handles connection pooling internally.
