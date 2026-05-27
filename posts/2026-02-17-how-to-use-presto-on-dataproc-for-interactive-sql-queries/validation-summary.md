# Validation Summary: How to Use Presto on Dataproc for Interactive SQL Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc
- Dataproc optional components
- Presto and Trino
- Google Cloud CLI
- Cloud Storage
- BigQuery connector
- Hive connector and Hive Metastore
- SQL

## Sources Consulted
- Google Cloud Dataproc optional Presto component: https://cloud.google.com/dataproc/docs/concepts/components/presto
- Google Cloud Dataproc optional Trino component: https://docs.cloud.google.com/dataproc/docs/concepts/components/trino
- Google Cloud Dataproc 2.1 image release notes: https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-release-2.1
- Google Cloud SDK `gcloud dataproc jobs submit presto`: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/presto
- Google Cloud SDK `gcloud dataproc jobs submit trino`: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/trino
- Trino Hive connector documentation: https://trino.io/docs/current/connector/hive.html
- Trino BigQuery connector documentation: https://trino.io/docs/current/connector/bigquery.html
- Trino resource management properties: https://trino.io/docs/current/admin/properties-resource-management.html
- Presto BigQuery connector documentation: https://prestodb.io/docs/current/connector/bigquery.html

## Issues Found
- Dataproc image `2.1-debian11` was shown with `--optional-components=PRESTO`, `presto` CLI commands, `presto:` properties, and `gcloud dataproc jobs submit presto`. Dataproc 2.1 and later expose the Presto optional component as Trino, so these examples were changed to `--optional-components=TRINO`, `trino`, `trino:`/`trino-catalog:` properties, and `gcloud dataproc jobs submit trino`.
- The CLI example used `localhost:8080`, but the current Dataproc component documentation lists the Trino/Presto server and web UI on port `8060` by default. Updated the CLI command to `localhost:8060`.
- The BigQuery connector setup used Spark BigQuery connector metadata and `presto:connector.name=bigquery`, which does not configure a Trino catalog. Replaced it with `trino-catalog:` catalog properties and a catalog properties file under `/usr/lib/trino/etc/catalog/`.
- The BigQuery public dataset query used an invalid catalog/project path for the configured connector. Added a `bigquery_public` catalog pointing at `bigquery-public-data` and changed the sample query to `bigquery_public.samples.shakespeare`.
- The federated query treated a BigQuery project ID as a schema name. Updated the example to use a dataset-style path, `bigquery.user_dataset.users`.
- The tuning example used `presto:` prefixes and `query.max-total-memory-per-node`, which is not a current Trino resource management property. Updated it to use `trino:` prefixes and `query.max-total-memory`.
- The article described Presto SQL as simply "standard SQL". Adjusted the wording to say Presto and Trino use a familiar SQL dialect with broad ANSI SQL compatibility.

## Review Notes
The post remains framed around Presto, but the examples now explicitly reflect Dataproc 2.1 behavior where the deployable component is Trino. A future revision could rename the title to mention Trino directly, but the current wording is technically accurate for a Presto-compatible SQL guide on Dataproc 2.1 and later.
