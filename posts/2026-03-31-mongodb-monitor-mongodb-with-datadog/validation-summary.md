# Validation Summary: How to Monitor MongoDB with Datadog

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- MongoDB 4.4+
- Datadog Agent 7+
- Datadog MongoDB integration (`mongo` check)
- Datadog APM (dd-trace for Node.js)
- Datadog API v1 (monitor creation)
- Kubernetes Autodiscovery annotations
- Python (requests library for API calls)

## Sources Consulted
- Datadog MongoDB integration docs: https://docs.datadoghq.com/integrations/mongo/
- Datadog integrations-core GitHub repo (mongo check conf.yaml.example and metrics.py): https://github.com/DataDog/integrations-core/tree/master/mongo
- Datadog Autodiscovery annotations docs: https://docs.datadoghq.com/containers/guide/ad_identifiers/
- Datadog secrets management docs: https://docs.datadoghq.com/agent/configuration/secrets-management/
- Datadog API v1 monitor endpoint docs: https://docs.datadoghq.com/api/latest/monitors/
- Datadog dd-trace-js docs: https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/nodejs/
- MongoDB createUser documentation: https://www.mongodb.com/docs/manual/reference/method/db.createUser/

## Issues Found

1. **Incorrect metric name `mongodb.repl.lag`**: This metric does not exist. Changed to `mongodb.replset.replicationlag`, which is the actual metric name emitted by the Datadog MongoDB integration.

2. **Incorrect metric name `mongodb.wiredtiger.cache.bytes_inuse`**: This metric does not exist. Changed to `mongodb.wiredtiger.cache.bytes_currently_in_cache`, which is the correct metric name.

3. **Incorrect metric casing `mongodb.stats.dataSize`**: Datadog normalizes MongoDB's camelCase field names to snake_case. Changed to `mongodb.stats.data_size`.

4. **Incorrect metric casing `mongodb.stats.indexSize`**: Same normalization issue. Changed to `mongodb.stats.index_size`.

5. **Invalid ENC[] secret format**: The post used `ENC[datadog_key:mongo_password]` with a colon delimiter. The correct Datadog secrets notation uses semicolons: `ENC[secret_backend_handle;secret_key]`. Changed to `ENC[mongo_credentials;password]`.

6. **Insufficient MongoDB user roles for collection-level metrics**: The config specifies `collections: [users, orders]` for collection-level metrics, but the monitor user only had `read` on `admin` and `local`. Added `readAnyDatabase` role on `admin` so the agent can read stats from application databases.

## Review Notes
- The `await` usage in the APM tracing Node.js example (line 106) is at the top level without an async wrapper. This works in Node.js 14.8+ with ES modules or Node.js 16+ with `--experimental-repl-await`, but may confuse readers using CommonJS. This is a minor style issue, not a technical error.
- The Kubernetes annotation uses the v2 Autodiscovery format (`.checks` key), which requires Datadog Agent v7.36+. This is the modern recommended format but won't work on older agents.
- The `no_data_timeframe` value of 5 minutes in the monitor definition is quite aggressive; in practice, Datadog recommends at least 10 minutes to avoid false alerts during brief collection gaps.
