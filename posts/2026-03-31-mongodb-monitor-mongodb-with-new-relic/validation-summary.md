# Validation Summary: How to Monitor MongoDB with New Relic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- New Relic Infrastructure Agent
- New Relic MongoDB On-Host Integration (nri-mongodb)
- New Relic APM (Node.js and Python agents)
- NRQL (New Relic Query Language)
- NerdGraph API
- pymongo
- MongoDB Node.js driver

## Sources Consulted
- nri-mongodb GitHub repository: https://github.com/newrelic/nri-mongodb
- nri-mongodb sample config (mongodb-config.yml.sample): https://github.com/newrelic/nri-mongodb/blob/master/mongodb-config.yml.sample
- nri-mongodb spec.csv (canonical env var names): https://github.com/newrelic/nri-mongodb/blob/master/spec.csv
- nri-mongodb source code for metric names (src/metrics/server.go, src/metrics/collection.go, src/metrics/repl_set.go)
- New Relic CLI command reference: https://github.com/newrelic/newrelic-cli/blob/main/docs/cli/newrelic.md
- NerdGraph NRQL condition alerts documentation: https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-api-nrql-condition-alerts/
- New Relic Python agent pymongo instrumentation documentation

## Issues Found

1. **YAML config: `CLUSTER_NAME` should be `MONGODB_CLUSTER_NAME`** — The nri-mongodb integration's spec.csv and sample config use `MONGODB_CLUSTER_NAME` as the environment variable name, not `CLUSTER_NAME`. Fixed the config snippet.

2. **Python example missing `import os`** — The code used `os.environ["MONGODB_URI"]` without importing the `os` module. Added `import os`.

3. **NRQL queries used wrong event type (`FROM Metric`)** — The nri-mongodb integration reports metrics as Infrastructure sample events (`MongodSample`, `MongoCollectionSample`, etc.), not to the generic `Metric` event type. Fixed all three queries to use the correct event types.

4. **NRQL metric names had incorrect `mongodb.` prefix** — The actual attribute names in the integration events do not have a `mongodb.` prefix. Changed `mongodb.connections.current` to `connections.current`, `mongodb.collection.avgObjSize` to `collection.avgObjSizeInBytes`, and `mongodb.replset.lag` to `replset.replicationLag`.

5. **Collection metric name was wrong** — The correct attribute name is `collection.avgObjSizeInBytes` (not `collection.avgObjSize`), as confirmed in the nri-mongodb source code (`src/metrics/collection.go`).

6. **Misleading NRQL comment "Find slowest collections"** — The `avgObjSizeInBytes` metric measures average document size, not collection query performance or speed. Changed the comment to "Find collections with largest average document size".

7. **Replication lag metric name was wrong** — The correct attribute is `replset.replicationLag` (not `replset.lag`), as confirmed in the nri-mongodb source code (`src/metrics/repl_set.go`).

8. **Alert CLI command `newrelic alerts conditions create` does not exist** — The New Relic CLI has no `alerts` top-level subcommand. Alert conditions are created programmatically via the NerdGraph GraphQL API. Replaced the fabricated CLI command with a working curl-based NerdGraph API call using the `alertsNrqlConditionStaticCreate` mutation.

## Review Notes
- The `@newrelic.agent.function_trace()` decorator in the Python example is not strictly necessary since pymongo is auto-instrumented by the New Relic Python agent. However, it is not incorrect — it adds an extra function-level trace around the MongoDB calls, which can be useful for visibility. The existing comment correctly notes that pymongo calls are auto-instrumented.
- The Node.js example comment "newrelic.js - must be required first" could be slightly confusing since `newrelic.js` is also the name of the New Relic Node.js agent's configuration file. In context, the comment refers to the `require("newrelic")` call needing to be first, which is correct.
- The MongoDB user creation script uses `use admin` which is a mongo shell command, not valid JavaScript. This is correct for the mongo shell context but the code block is labeled as `javascript`. This is a common convention in MongoDB tutorials and not a practical issue.
