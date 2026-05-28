# Validation Summary: How to Migrate from Firestore in Datastore Mode to Firestore Native Mode

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Firestore in Datastore mode
- Google Cloud Firestore Native mode
- Google Cloud CLI (`gcloud firestore`)
- Google Cloud Datastore Python client
- Google Cloud Firestore Python client
- Cloud Storage managed export/import

## Sources Consulted
- Google Cloud documentation: Choosing between Native mode and Datastore mode - https://docs.cloud.google.com/datastore/docs/firestore-or-datastore
- Google Cloud SDK reference: `gcloud firestore export` - https://docs.cloud.google.com/sdk/gcloud/reference/firestore/export
- Google Cloud SDK reference: `gcloud firestore databases create` - https://cloud.google.com/sdk/gcloud/reference/firestore/databases/create
- Google Cloud documentation: Create and manage Firestore databases - https://docs.cloud.google.com/firestore/docs/manage-databases
- Google Cloud documentation: Exporting and importing Datastore mode entities - https://cloud.google.com/datastore/docs/export-import-entities
- Google Cloud documentation: Exporting and importing Firestore data - https://cloud.google.com/firestore/native/docs/manage-data/export-import
- Google Cloud Firestore Python client reference: `Client` - https://cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.client.Client
- Google Cloud Datastore Python client reference: `Client` and `Query` - https://cloud.google.com/python/docs/reference/datastore/latest/google.cloud.datastore.client.Client
- Google Cloud Firestore documentation: Query and filter data - https://docs.cloud.google.com/firestore/native/docs/query-data/queries

## Issues Found
- The post said that once a project is set to Datastore mode, it cannot be switched to Native mode. Google now documents that empty databases can change mode and that multiple databases with different modes can exist in a project, so this was changed to say a database containing Datastore mode data cannot simply be switched.
- The export section said the export format is the same regardless of mode. This was corrected to clarify that both modes have managed export services, but exported data still reflects the source entity or document model.
- The migration script was described as reading from an export, but the code reads from the live Datastore API. The surrounding text was narrowed by keeping the script positioned as Datastore-to-Firestore migration code, and a note was added for named Firestore databases.
- The ancestor migration function hard-coded the parent collection as `users` while the example migrated `Order` entities. The function now accepts `parent_collection_name`, and the example writes `OrderItem` documents under the `orders` collection.
- The Firestore Python query snippet used positional `where()` arguments. Google documentation now shows the Python client using `FieldFilter`, so the example was updated.
- The Datastore write example used `datetime.utcnow()` without importing `datetime`. It now imports `datetime` and `timezone` and uses `datetime.now(timezone.utc)`.

## Review Notes
The validation and migration examples still stream full collections and queries for simplicity. For very large datasets, production migrations should use pagination, count aggregations where appropriate, retry handling, idempotency, and a reconciliation strategy for writes that occur during the migration window.
