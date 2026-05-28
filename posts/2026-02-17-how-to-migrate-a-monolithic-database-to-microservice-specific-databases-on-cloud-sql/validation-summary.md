# Validation Summary: How to Migrate a Monolithic Database to Microservice-Specific Databases

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Google Cloud CLI
- PostgreSQL SQL and pg_dump
- Python asynchronous service examples
- Google Cloud Pub/Sub
- Microservices database-per-service and Saga patterns
- Data denormalization and change data capture

## Sources Consulted
- Google Cloud SDK documentation for `gcloud sql instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud SQL for PostgreSQL create instance documentation: https://docs.cloud.google.com/sql/docs/postgres/create-instance
- Google Cloud SDK documentation for `gcloud sql databases create`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/databases/create
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- PostgreSQL 15 `pg_dump` documentation: https://www.postgresql.org/docs/15/app-pgdump.html
- PostgreSQL object size function documentation: https://www.postgresql.org/docs/16/functions-admin.html
- Microservices.io Database per Service pattern: https://microservices.io/patterns/data/database-per-service.html
- Microservices.io Saga pattern: https://microservices.io/patterns/data/saga

## Issues Found
- The PostgreSQL table size query used `table_name::regclass` without schema qualification and referenced `tables.table_name` without an alias. Updated the query to use a table alias, schema-qualified `format('%I.%I', ...)::regclass`, and a schema-qualified column count.
- The foreign key discovery query joined `information_schema` views only by `constraint_name`, which can produce incorrect matches when names overlap across schemas. Added `constraint_schema` joins and restricted the query to the `public` schema.
- The Cloud SQL instance examples used custom `--tier db-custom-*` values and storage sizes with `GB` suffixes. Updated them to the current documented custom instance style using `--cpu`, `--memory`, and numeric `--storage-size` values in GB.
- The SQL comment said the sample `orders` table only had a foreign key to users, but it also referenced products. Updated the comment.
- The commented cross-service join selected product name but omitted item quantity and price even though the later response shape uses those fields. Added `oi.quantity` and `oi.price` to the example select list.
- The Pub/Sub publishing example passed a short topic ID directly to `publisher.publish`. Updated it to create a fully qualified topic path with `publisher.topic_path(project_id, "user-events")` before publishing.

## Review Notes
The post is technically sound after the fixes. The Python snippets are illustrative and assume existing async database, HTTP, and Pub/Sub client setup; a future expansion could show imports, client initialization, error handling, idempotency, and retry behavior for production migrations.
