# Validation Summary: How to Migrate from MySQL to Cloud Spanner Using the Spanner Migration Tool

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Spanner
- Spanner Migration Tool
- MySQL
- Google Cloud CLI
- Python
- Google Cloud Spanner Python client library

## Sources Consulted
- Google Cloud Spanner Migration Tool setup documentation: https://docs.cloud.google.com/spanner/docs/set-up-spanner-migration-tool
- Spanner Migration Tool installation documentation: https://googlecloudplatform.github.io/spanner-migration-tool/install.html
- Spanner Migration Tool schema command documentation: https://googlecloudplatform.github.io/spanner-migration-tool/cli/schema.html
- Spanner Migration Tool data command documentation: https://googlecloudplatform.github.io/spanner-migration-tool/cli/data.html
- Spanner Migration Tool CLI flags documentation: https://googlecloudplatform.github.io/spanner-migration-tool/cli/flags.html
- Spanner Migration Tool MySQL data type mapping documentation: https://googlecloudplatform.github.io/spanner-migration-tool/data-types/mysql.html
- Spanner Migration Tool output artifacts documentation: https://googlecloudplatform.github.io/spanner-migration-tool/reports.html
- Google Cloud Spanner schema design best practices: https://docs.cloud.google.com/spanner/docs/schema-design
- Google Cloud Spanner primary key migration overview: https://docs.cloud.google.com/spanner/docs/primary-keys-overview
- Google Cloud Spanner primary key default values documentation: https://docs.cloud.google.com/spanner/docs/primary-key-default-value
- gcloud spanner databases create reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- Google Cloud Spanner Python mutation API documentation: https://docs.cloud.google.com/spanner/docs/getting-started/python

## Issues Found
- The installation section used `go build -o spanner-migration-tool`, but current official source-build instructions use `make build`, and Google documents installation through the `spanner-migration-tool` gcloud component. Updated the section to show `gcloud components install spanner-migration-tool`, `gcloud alpha spanner migrate web`, and `make build`.
- The schema conversion commands omitted `--dry-run`, which means the schema command can apply the generated schema instead of only producing review artifacts. Added `--dry-run`.
- The schema export command used an unsupported `--schema-output` flag. Replaced it with the documented `--prefix` flag and the generated `my-app-db.schema.txt` artifact.
- The data migration command omitted the required `--session` flag. Added `--session=my-app-db.session.json`.
- The source connection examples omitted the `password` source-profile parameter. Added it to match the documented direct-connection profile fields.
- The MySQL type conversion table mapped `FLOAT / DOUBLE` to `FLOAT64` and `BLOB` to `BYTES(MAX)`. Updated it to map `FLOAT` to `FLOAT32`, `DOUBLE` to `FLOAT64`, and `BLOB` to `BYTES(65535)` per SMT documentation.
- The auto-increment section said SMT converts auto-increment columns to plain `INT64`. Current SMT documentation maps them to Spanner identity columns. Updated the claim and sample DDL.
- The Python example used a nonexistent `spanner.Mutation.insert` pattern and then attempted to read mutation internals. Replaced it with the documented `database.batch()` and `batch.insert(...)` API.
- The validation section said to run checksums but only showed a row spot-check query. Changed the wording to "Spot-check key tables" so the text matches the command.

## Review Notes
The guide is now technically consistent with current Spanner Migration Tool and Cloud Spanner documentation. For production migrations, the post could later add more detail about minimal-downtime migration setup, Dataflow/Datastream requirements, authentication, and handling foreign-key or UUID remapping across related tables, but those are scope expansions rather than correctness fixes.
