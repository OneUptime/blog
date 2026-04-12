# Validation Summary: How to Set Up MongoDB Alerting for Production

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Admin API (v2)
- MongoDB Atlas Alert Configurations
- Prometheus alerting rules
- MongoDB Exporter (Percona) metrics
- Node Exporter filesystem metrics
- PyMongo (Python MongoDB driver)
- Slack webhook notifications

## Sources Consulted
- MongoDB Atlas Admin API v2 OpenAPI Specification (https://github.com/mongodb/openapi)
- MongoDB Atlas Alert Event Types Reference (https://www.mongodb.com/docs/atlas/reference/atlas-alert-event-types/)
- MongoDB Atlas Versioned API Overview (https://www.mongodb.com/docs/atlas/api/versioned-api-overview/)
- MongoDB Atlas API Migration Guide (https://www.mongodb.com/docs/atlas/api/migrate-to-new-version/)
- MongoDB Atlas Deprecated v1 API Documentation (https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/)
- Terraform mongodbatlas_alert_configuration resource documentation (https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/alert_configuration)

## Issues Found

1. **Deprecated Atlas API version (Step 1)**: The `BASE_URL` used the deprecated v1.0 API endpoint (`/api/atlas/v1.0/`). Updated to v2 (`/api/atlas/v2/`) and added the required `Accept: application/vnd.atlas.2025-01-01+json` version header to all curl commands.

2. **Invalid event type `DISK_SPACE_USED_EXCEEDS` (Step 2)**: This event type does not exist in the Atlas API. Disk usage alerts must use `eventTypeName: "OUTSIDE_METRIC_THRESHOLD"` with a `metricThreshold` object specifying `metricName: "DISK_PARTITION_SPACE_USED_DATA"`. Replaced the `threshold` object with the correct `metricThreshold` structure.

3. **Misleading heading, description, and comment for oplog window alert (Step 3)**: The step was titled "Replication Lag Alert" with a comment saying "Alert when replication lag exceeds 30 seconds," but the actual alert configured was `REPLICATION_OPLOG_WINDOW_RUNNING_OUT` with a threshold of less than 1 hour. The oplog window and replication lag are different concepts. Updated the heading to "Oplog Window Alert," the description to "Alert when the oplog window is running low," and the comment to "Alert when oplog window drops below 1 hour."

4. **Slack `channelName` included `#` prefix (Step 3)**: Per the Atlas API spec, the `channelName` field should not include the `#` prefix. Changed `"#mongodb-alerts"` to `"mongodb-alerts"`.

5. **Invalid event type `CONNECTIONS_PERCENT_OVER_CONFIGURED_LIMIT` (Step 4)**: This event type does not exist in the Atlas API. Connection percentage alerts must use `eventTypeName: "OUTSIDE_METRIC_THRESHOLD"` with a `metricThreshold` object specifying `metricName: "CONNECTIONS_PERCENT"`. Replaced the `threshold` object with the correct `metricThreshold` structure.

6. **Summary text mismatch (Summary section)**: Updated the summary paragraph to reference "oplog window thresholds" and "replication lag" instead of just "replication lag above 30 seconds," to accurately reflect the alerts configured in the post.

## Review Notes
- The Prometheus alert rule `MongoDBSlowQueryRate` uses `rate(mongodb_mongod_op_latencies_latency_total{type="reads"}[5m]) > 100`, which measures the rate of cumulative read latency (microseconds/second), not strictly "slow queries." The alert name is slightly misleading but the PromQL is syntactically valid. A more descriptive name would be `MongoDBHighReadLatencyRate`.
- The Prometheus metric names (e.g., `mongodb_ss_connections`, `mongodb_mongod_replset_member_replication_lag_seconds`, `mongodb_mongod_op_latencies_latency_total`) are specific to the Percona MongoDB Exporter. Other exporters may use different metric names. The post could benefit from noting which exporter is assumed.
- The Python script in Step 6 is correct and functional. The connection utilization formula `current / (current + available)` correctly matches MongoDB's `serverStatus` output where total capacity = current + available.
- The post mentions "authentication failures" in both the intro and summary as a category to alert on, but no alert configuration for authentication failures is actually provided in any of the steps.
