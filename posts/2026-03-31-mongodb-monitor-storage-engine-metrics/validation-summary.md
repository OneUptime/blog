# Validation Summary: How to Monitor Storage Engine Metrics in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Shell (mongosh)
- `serverStatus` admin command
- Prometheus (alerting rules)
- Percona MongoDB Prometheus Exporter

## Sources Consulted
- MongoDB serverStatus documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB WiredTiger storage engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB WiredTiger concurrency ticket documentation: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.wiredTigerConcurrentReadTransactions
- Percona MongoDB Exporter metrics: https://github.com/percona/mongodb_exporter
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
No technical issues found.

## Review Notes
- The post uses `const` in JavaScript examples, which is correct for `mongosh` (the default MongoDB shell since version 5.0). Users on the legacy `mongo` shell would need to use `var` instead, but this is a minor compatibility note rather than an error.
- Starting with MongoDB 7.0, WiredTiger concurrency tickets have been supplemented by a new execution control mechanism (throughput probing). The `concurrentTransactions` section still appears in `serverStatus` output, so the post remains accurate, but readers on MongoDB 7.0+ should be aware of the newer admission control behavior.
- The 90% cache utilization and 60-second checkpoint thresholds are reasonable rules of thumb consistent with MongoDB operational best practices, though optimal thresholds may vary by workload.
