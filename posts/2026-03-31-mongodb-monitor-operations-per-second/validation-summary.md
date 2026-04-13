# Validation Summary: How to Monitor MongoDB Operations Per Second (opcounters)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (serverStatus, opcounters, opcountersRepl)
- Python (pymongo driver)
- mongostat CLI tool
- Prometheus (percona/mongodb_exporter)
- Grafana (PromQL queries)

## Sources Consulted
- MongoDB serverStatus command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB server source code (`src/mongo/db/commands.h`, `shouldAffectQueryCounter()`) to verify which operations increment the `query` opcounter
- mongostat documentation: https://www.mongodb.com/docs/database-tools/mongostat/
- Percona mongodb_exporter source code (exporter/v1_compatibility.go, exporter/metrics.go) for Prometheus metric names

## Issues Found

1. **Incorrect `query` opcounter description**: The post described the `query` opcounter as tracking "find/count/distinct operations." According to the MongoDB source code, `count` and `distinct` do not override `shouldAffectQueryCounter()` and are counted under the `command` opcounter instead. Only `find` and `aggregate` commands increment the `query` counter. Fixed to: "Number of query operations (find, aggregate)".

2. **Incorrect PromQL metric names**: The post used `mongodb_opcounters_insert_total` and `mongodb_opcounters_total` which are not valid metric names from any version of the percona/mongodb_exporter. The current exporter uses `mongodb_ss_opcounters` with a `legacy_op_type` label. The old compatibility format uses `mongodb_op_counters_total` with a `type` label. Fixed to use the current metric format: `mongodb_ss_opcounters{legacy_op_type="insert"}` and `sum(rate(mongodb_ss_opcounters[5m])) by (legacy_op_type)`.

## Review Notes
- The PromQL metric names depend on the version of the percona/mongodb_exporter being used. The post now uses the current (0.40+) metric format. Users on older exporter versions may need to use the compatibility metric name `mongodb_op_counters_total{type="..."}` instead.
- The default exporter port 9216 is correct for the percona/mongodb_exporter.
- The Python code examples using pymongo are syntactically correct and use current APIs.
- The mongostat command syntax is correct for both direct host and URI-based connections.
