# Validation Summary: How to Build Your First ETL Pipeline in Cloud Data Fusion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Data Fusion
- Cloud Data Fusion Studio visual designer
- Cloud SDK / gcloud
- Wrangler directives
- Cloud Storage
- BigQuery
- CDAP lifecycle and scheduling APIs
- JavaScript transform plugin

## Sources Consulted
- Google Cloud SDK reference for `gcloud beta data-fusion instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/data-fusion/instances/create
- Google Cloud Data Fusion console overview and editions: https://docs.cloud.google.com/data-fusion/docs/concepts/console-overview
- Google Cloud Data Fusion deploy and run pipelines: https://docs.cloud.google.com/data-fusion/docs/concepts/deploy-and-run-pipelines
- Google Cloud Data Fusion schedule pipelines: https://docs.cloud.google.com/data-fusion/docs/how-to/schedule-pipelines
- Google Cloud Data Fusion Wrangler command-line directives: https://docs.cloud.google.com/data-fusion/docs/concepts/wrangler-cli-directives
- Google Cloud Data Fusion send records to error: https://docs.cloud.google.com/data-fusion/docs/how-to/wrangler-send-records-to-error
- Google Cloud Data Fusion CDAP reference for `apiEndpoint`: https://docs.cloud.google.com/data-fusion/docs/reference/cdap-reference
- Cloud Storage batch source plugin documentation: https://cloud.google.com/data-fusion/docs/how-to/configure-cloud-storage-batch-source
- CDAP Wrangler directive reference for set-type, set-column, parse-as-simple-date, filtering, trimming, and case conversion: https://cdap.atlassian.net/wiki/spaces/DOCS
- CDAP Lifecycle HTTP RESTful API schedule documentation: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/477560983/Lifecycle%2BHTTP%2BRESTful%2BAPI

## Issues Found
- The instance creation command used `--type=BASIC`, but the current `gcloud beta data-fusion instances create` command uses `--edition=basic`. Updated the command and wording from instance types to instance editions.
- The command for opening the UI returned `apiEndpoint`, which is the CDAP API endpoint. Updated it to return `serviceEndpoint` and clarified that API calls should use `apiEndpoint`.
- The edition descriptions implied Basic was mainly for development and that Enterprise adds compute resources. Updated the wording to match official edition guidance more closely.
- The Cloud Storage source configuration used `Skip Header`, but the documented property is `Use first row as header`. Updated the field name.
- The pipeline creation step suggested Realtime pipelines immediately after creating a Basic instance, but Basic has limitations around streaming pipelines. Updated the wording to make Batch the example choice and note that Realtime requires a supporting edition.
- The Wrangler date example used deprecated `parse-as-date` syntax and would not parse a formatted `yyyy-MM-dd` string into the claimed date output. Replaced it with `parse-as-simple-date` followed by a date conversion.
- The invalid-row filter used `condition-if-matched` with a column reference syntax that does not match the documented filter directive examples. Updated it to `filter-rows-on condition-true (quantity < 0)`.
- The error handling section described connecting a Wrangler error port directly to a sink. Official guidance uses a `send to error` directive and an Error Collector plugin, so the section and diagram were corrected.
- The schedule API snippet used an incorrect request method and body shape for adding a CDAP schedule. Updated it to use `PUT`, a schedule object with `program` and `trigger` fields, and a follow-up enable call because new schedules are initially disabled.
- The Wrangler description said 150+ directives; current Google documentation says Wrangler provides 50+ directives. Updated the count.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference instead of local `--help`.
- The post remains a beginner-oriented guide and does not cover IAM/service account setup, dataset creation, or detailed BigQuery table creation behavior; those are useful future improvements but not required for technical correctness of the existing walkthrough.
