# Validation Summary: How to Use Data Catalog to Track Data Lineage Across BigQuery Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Data Lineage API
- Google Cloud Dataplex / Knowledge Catalog
- BigQuery
- Dataflow
- Cloud Composer / Managed Service for Apache Airflow
- Dataproc / Managed Service for Apache Spark
- Google Cloud CLI
- Python `google-cloud-datacatalog-lineage` client library

## Sources Consulted
- Google Cloud: About data lineage - https://docs.cloud.google.com/dataplex/docs/about-data-lineage
- Google Cloud: Use data lineage with Google Cloud systems - https://docs.cloud.google.com/dataplex/docs/use-lineage
- Google Cloud: About lineage visualization - https://docs.cloud.google.com/dataplex/docs/lineage-views
- Google Cloud: Data lineage considerations - https://docs.cloud.google.com/dataplex/docs/lineage-considerations
- Google Cloud Python client: `SearchLinksRequest` - https://docs.cloud.google.com/python/docs/reference/lineage/latest/google.cloud.datacatalog_lineage_v1.types.SearchLinksRequest
- Google Cloud Python client: `BatchSearchLinkProcessesRequest` - https://docs.cloud.google.com/python/docs/reference/lineage/latest/google.cloud.datacatalog_lineage_v1.types.BatchSearchLinkProcessesRequest
- Google Cloud Python client: `LineageEvent`, `EventLink`, `Run`, and `EntityReference` references - https://docs.cloud.google.com/python/docs/reference/lineage/latest/google.cloud.datacatalog_lineage_v1.types
- Google Cloud Data Lineage REST API reference - https://cloud.google.com/dataplex/docs/reference/data-lineage/rest
- Google Cloud SDK reference for `gcloud data-catalog` - https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog

## Issues Found
- The post described lineage primarily as a Data Catalog feature. Data Catalog is deprecated, and current docs describe data lineage under Dataplex / Knowledge Catalog while retaining Data Lineage API and client names. Updated the wording to "Google Cloud data lineage" where necessary.
- The list of automatically captured BigQuery operations was inaccurate. BigQuery Data Transfer Service recurring load jobs are not automatically recorded, while copy jobs, Cloud Storage URI load jobs, several DDL statements, and additional DML statements are supported. Updated the list.
- The enablement instructions used `datacatalog.googleapis.com`. Current guidance requires Data Lineage API in recording projects and Data Lineage API plus Dataplex API in the viewing project. Updated the command and explanation.
- The IAM section implied pipeline service accounts need `datalineage.events.create` for automatic lineage. Current docs state automatic lineage is captured after enabling the API; viewer permissions are needed for viewing/querying, and admin permissions are relevant for custom lineage. Updated the wording.
- The console timing claim omitted documented latency. Added that BigQuery lineage can take up to 24 hours after a job completes.
- The table-lineage Python example printed `link.name` as the process. `SearchLinks` returns links; associated processes must be retrieved with `batch_search_link_processes`. Updated the example accordingly.
- The column-level Python example fabricated process-run column mapping behavior that is not supported by the shown public Python types. Replaced it with accurate console-filter guidance for column-level lineage.
- The custom lineage event example used `LineageEvent.Link`, which is not a valid Python client type, omitted required `LineageEvent.start_time`, and used Unix timestamps for 2025 instead of the example's 2026 date. Updated it to use `EventLink`, added event times, and corrected timestamps.
- The retention/export command used a `gcloud data-catalog lineage` surface that is not present in the current `gcloud data-catalog` reference. Replaced it with a Python `list_processes` example that uses the Data Lineage API.

## Review Notes
- Python snippets were checked for syntax locally. The `google-cloud-datacatalog-lineage` package is not installed in this workspace, so local runtime execution was not possible.
- Current Google documentation says Data Catalog is deprecated in favor of Dataplex / Knowledge Catalog, but API, client library, CLI, and IAM names still retain Dataplex/Data Catalog lineage naming in places.
