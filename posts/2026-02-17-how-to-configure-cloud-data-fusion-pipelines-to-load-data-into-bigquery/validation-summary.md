# Validation Summary: How to Configure Cloud Data Fusion Pipelines to Load Data into BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Data Fusion
- BigQuery
- Cloud Storage
- CDAP plugins
- Wrangler directives
- IAM roles and permissions
- ETL batch pipelines

## Sources Consulted
- Google Cloud Data Fusion plugins overview: https://cloud.google.com/data-fusion/docs/concepts/plugins
- Google Cloud Data Fusion plugin reference: https://cloud.google.com/data-fusion/plugins
- CDAP Google BigQuery Table Sink plugin reference: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/464912425/Google+BigQuery+Table+Sink
- CDAP Google Cloud Storage File Reader Batch Source plugin reference: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/606240774/Google+Cloud+Storage+File+Reader+Batch+Source
- Google Cloud Data Fusion BigQuery batch source guide: https://docs.cloud.google.com/data-fusion/docs/how-to/configure-bigquery-batch-source
- Google Cloud Data Fusion macros and macro functions: https://docs.cloud.google.com/data-fusion/docs/concepts/macros
- Google Cloud Data Fusion Wrangler directives: https://docs.cloud.google.com/data-fusion/docs/concepts/wrangler-cli-directives
- CDAP Parse as Datetime directive: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/1128988735
- CDAP Set Type directive: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/382042346/Set+Type
- CDAP Filter Row If Matched directive: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/382042202/Filter+Row+If+Matched
- Google Cloud Data Fusion pricing and editions: https://cloud.google.com/data-fusion/pricing

## Issues Found
- The prerequisites listed only Enterprise and Developer editions. Updated this to Developer, Basic, or Enterprise to match current Cloud Data Fusion editions.
- The GCS source example used "Delimiter" with CSV and "Skip Header", which do not match the current Cloud Storage File Reader source property names for this example. Updated the snippet and text to use "Use First Row as Header".
- The schema example was labeled as JSON but included a JavaScript-style comment. Removed the comment so the snippet is valid JSON.
- The Wrangler directives used incorrect syntax for `parse-as-datetime`, `set-type`, and row filtering. Updated the recipe to use the documented directive forms, including the required colon-prefixed column names for the relevant directives.
- The BigQuery sink example used "Project" instead of the documented "Project ID". Updated the property name.
- The post described a "Create Table if Not Found" boolean setting, but the current BigQuery Table sink docs describe automatic table creation when the table does not exist and the service account has permission. Reworded this section to reflect the documented behavior.
- The temporary bucket example omitted the required `gs://` URI syntax. Updated the snippet to `gs://my-temp-staging-bucket`.
- The partitioning example used "Partition Type" and "Time Partitioning Type", which do not match the documented BigQuery Table sink property names. Updated it to "Partitioning Type: Time".
- The incremental-load section referred to a generic merge key. Updated it to the documented BigQuery sink "Upsert" operation and "Table Key" setting.
- The database filter example used an unsupported `${runtime:logical.start.time}` placeholder. Replaced it with a runtime argument placeholder that the user supplies when running the pipeline.
- The append-only section referred to empty merge keys. Updated it to use the documented default "Insert" operation.

## Review Notes
The corrected post is technically accurate for the documented Cloud Data Fusion/CDAP BigQuery Table sink behavior. For a production-grade future update, the incremental-load example could explain how to persist and supply `last_successful_run_time`, because Cloud Data Fusion does not automatically infer that custom runtime argument.
