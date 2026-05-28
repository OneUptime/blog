# Validation Summary: How to Migrate On-Premises MongoDB to Google Cloud Firestore or MongoDB Atlas

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Google Cloud Platform
- Google Cloud Firestore
- MongoDB
- MongoDB Atlas
- Atlas CLI
- MongoDB Database Tools
- Python
- PyMongo
- Google Cloud Firestore Python client

## Sources Consulted
- MongoDB Atlas CLI install documentation: https://www.mongodb.com/docs/atlas/cli/current/install-atlas-cli/
- MongoDB Atlas CLI `atlas clusters create` documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-create/
- MongoDB Atlas CLI `atlas projects create` documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-projects-create/
- MongoDB Atlas GCP regions documentation: https://www.mongodb.com/docs/atlas/reference/google-gcp/
- MongoDB Atlas migration architecture documentation: https://www.mongodb.com/docs/atlas/architecture/current/migration/
- MongoDB Atlas import and live migration documentation: https://www.mongodb.com/docs/atlas/import/live-import/
- MongoDB Database Tools `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Database Tools `mongorestore` examples: https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/
- MongoDB BSON document size limits: https://www.mongodb.com/docs/manual/reference/limits/
- Firestore quotas and limits: https://docs.cloud.google.com/firestore/quotas
- Firestore transactions and batched writes: https://cloud.google.com/firestore/docs/manage-data/transactions
- Firestore aggregation query documentation: https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- Firestore Python query sample with `FieldFilter`: https://docs.cloud.google.com/firestore/docs/samples/firestore-query-order-with-filter-async

## Issues Found
- The post said Atlas Live Migration uses MongoDB change streams to replicate changes. MongoDB's current Atlas migration architecture documentation describes Atlas Live Migration as using Mongosync behind the scenes for continuous synchronization, so the text was corrected.
- The Firestore aggregation comparison said only "Limited (use BigQuery for analytics)." Firestore supports limited read-time aggregation queries for count, sum, and average, so the table was updated to reflect the current supported operations while preserving the BigQuery guidance for analytics.
- The comparison table described Firestore transactions as ACID "up to 500 docs." Current Firestore limits are expressed through request size, transaction time, and write/field-transform constraints, so the row was made less misleading.
- The document size comparison used MB. MongoDB documents are limited to 16 MiB and Firestore documents to 1 MiB, so the table and decision bullets were updated to use the documented units.
- The Firestore Python query used positional `.where("total", ">", 100)`. Current official Python samples use `where(filter=FieldFilter(...))`, so the query example was updated and the `FieldFilter` import was added.
- The cost comparison hard-coded an approximate MongoDB Atlas M30 monthly price. Atlas pricing varies by region and configuration, so the claim was replaced with a configuration-dependent pricing description.

## Review Notes
The remaining examples are illustrative and assume prerequisites not shown in full, such as Atlas project selection, database users, network access lists, Firestore authentication, and suitable migration credentials. The `mongodump` and `mongorestore` commands use valid options for directory-based compressed dumps, but production migrations should also validate auth, TLS, namespace selection, and cutover procedures for the specific environment.
