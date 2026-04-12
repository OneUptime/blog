# Validation Summary: How to Monitor MongoDB Document Metrics (inserted, updated, deleted)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`serverStatus` command, `metrics.document`, `opcounters`)
- Python (PyMongo driver)
- Prometheus / Grafana (PromQL queries with Percona MongoDB Exporter metrics)

## Sources Consulted
- MongoDB `serverStatus` documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `metrics.document` reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#mongodb-serverstatus-serverstatus.metrics.document
- MongoDB `opcounters` reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#mongodb-serverstatus-serverstatus.opcounters
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html#pymongo.database.Database.command
- Percona MongoDB Exporter metrics reference

## Issues Found
No technical issues found.

## Review Notes
- The Prometheus metric names (`mongodb_metrics_document_inserted_total`, `mongodb_opcounters_query_total`, etc.) are specific to the Percona MongoDB Exporter. Other exporters (e.g., the community mongodb_exporter) may use different naming conventions. This is not an error but worth noting for readers using a different exporter.
- The `updated` metric description says "matched and modified." In practice, `metrics.document.updated` tracks documents updated — the distinction between matched vs. modified (where an update matches a document but the values are already identical) is subtle and version-dependent. The description is practically accurate for typical use cases.
- The `opcounters.query` field used in the read efficiency section is correct for standalone/replica set deployments. Note that in newer MongoDB versions (7.1+), opcounters behavior may differ with the Slot-Based Execution Engine.
