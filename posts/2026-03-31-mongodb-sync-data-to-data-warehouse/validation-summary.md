# Validation Summary: How to Sync MongoDB Data to a Data Warehouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongoexport, change streams, pymongo)
- Google BigQuery (bq CLI, google-cloud-bigquery Python client)
- Python (pymongo, bson, google-cloud-bigquery)
- Managed ELT tools (Fivetran, Airbyte, Stitch, dbt)

## Sources Consulted
- MongoDB `mongoexport` documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- pymongo `Collection.watch()` API: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.watch
- Google Cloud BigQuery `bq load` CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference#bq_load
- Google Cloud BigQuery Python client `insert_rows_json`: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client#google_cloud_bigquery_client_Client_insert_rows_json

## Issues Found
1. **Dead code in incremental sync example**: The line `rows = [json.dumps(d, default=str) for d in docs]` computed a variable that was never used. The next line correctly passed `docs` (raw dicts) to `bq_client.insert_rows_json()`, which expects a list of dictionaries, not JSON strings. Removed the dead `rows` line and the now-unused `import json` from that code block to avoid confusing readers.

## Review Notes
- The managed ELT table describes Fivetran as "CDC via oplog." Fivetran's MongoDB connector actually uses change streams (which are built on top of the oplog). This is not strictly wrong but could be more precise by saying "CDC via change streams."
- The claim "MongoDB `_id` fields are ObjectIds, not strings" is true by default, but `_id` can technically be any BSON type. This is a reasonable simplification for the target audience.
- The `serialize_doc` function only handles top-level ObjectId values. Nested documents with ObjectId fields would require recursive serialization. This is acceptable for a tutorial example.
- The flatten_document function references `json.dumps` for list serialization but doesn't include an import statement. In context of the full post (where json is imported in earlier examples), this is understandable but worth noting.
