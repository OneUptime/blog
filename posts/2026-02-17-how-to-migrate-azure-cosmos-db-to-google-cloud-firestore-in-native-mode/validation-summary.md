# Validation Summary: How to Migrate Azure Cosmos DB to Google Cloud Firestore in Native Mode

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Google Cloud Firestore in Native mode
- Azure CLI
- Google Cloud CLI
- Python
- Azure Cosmos DB Python SDK
- Google Cloud Firestore Python client library
- Firebase/Cloud Functions Firestore triggers

## Sources Consulted
- Azure Cosmos DB Data Migration Tool: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-migrate-desktop-tool
- Azure Cosmos DB Python SDK quickstart: https://learn.microsoft.com/en-us/azure/cosmos-db/quickstart-python
- Azure Cosmos DB documentation for APIs: https://learn.microsoft.com/en-gb/azure/cosmos-db/nosql/
- Azure CLI `az cosmosdb sql container`: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container
- Firestore overview and data model: https://docs.cloud.google.com/firestore/native/docs/overview
- Firestore multiple databases: https://cloud.google.com/firestore/native/docs/manage-databases
- Firestore TTL policies: https://docs.cloud.google.com/firestore/docs/ttl
- Firestore multiple range and inequality filters: https://cloud.google.com/firestore/docs/query-data/multiple-range-fields
- Firestore query limitations: https://cloud.google.com/firestore/docs/query-data/queries
- Firestore Python client `BaseQuery.where` and `order_by`: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.base_query.BaseQuery
- Firestore Python `FieldFilter`: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.base_query.FieldFilter
- Firestore composite index CLI: https://docs.cloud.google.com/sdk/gcloud/reference/firestore/indexes/composite/create
- Cloud Functions for Firebase Firestore triggers: https://firebase.google.com/docs/functions/firestore-events

## Issues Found
- The post described Firestore as one database per project. Firestore now supports multiple databases per project, so the data-model table was updated to say a Firestore database can be default or named within a project.
- The post mapped Cosmos DB partition keys to collection groups and document hierarchy. Firestore has no direct partition-key equivalent, so this was corrected to document paths and indexes.
- The post referred to the Cosmos DB SQL/Core API as the primary current name. Microsoft documentation now uses Azure Cosmos DB for NoSQL, so the introduction was updated to mention the former SQL/Core name.
- The post said Firestore does not support inequality filters on multiple fields and that range filters and `orderBy` must be on the same field. Current Firestore documentation supports range or inequality filters on multiple fields with limits and ordering/index constraints, so the limitations and example query were corrected.
- The Firestore Python query examples used positional `where()` arguments. Current official Python samples use `FieldFilter` with the `filter=` keyword, so the examples were updated.
- The Cosmos DB example was marked as strict JSON while using comments. The code fence was changed to `jsonc`.
- The import section called the Google Cloud Firestore Python client library the Admin SDK. The wording was corrected.
- The import example stated Firestore batches support up to 500 operations. Current official limits emphasize request-size and related quotas rather than that specific blanket limit, so the comment was changed to batching for request-size control and retries.
- The composite index example did not match the corrected range query. The second index and `gcloud firestore indexes composite create` example were updated for `total` plus `createdAt`.
- The `array-contains` limitation was oversimplified. It was corrected to Firestore's current disjunction-based limitation.

## Review Notes
The guide is accurate as a high-level migration tutorial after these corrections. For a production migration, the export and import scripts should still be expanded with authentication setup, retry handling, write-rate controls, checkpointing, and validation of document counts and application query behavior.
