# Validation Summary: How to Build a Serverless ETL Pipeline on GCP Using Cloud Functions Dataflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Storage
- Cloud Functions
- Dataflow
- Apache Beam Python SDK
- BigQuery
- Google Cloud CLI
- Python

## Sources Consulted
- Google Cloud Dataflow classic template creation docs: https://cloud.google.com/dataflow/docs/guides/templates/creating-templates
- Google Cloud Dataflow classic template launch docs: https://cloud.google.com/dataflow/docs/guides/templates/running-templates
- Google Cloud Dataflow templates.launch REST API reference: https://cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.templates/launch
- Google Cloud Functions Cloud Storage trigger docs: https://docs.cloud.google.com/functions/1stgendocs/tutorials/storage-1st-gen
- Google Cloud Functions Python dependency docs: https://cloud.google.com/functions/docs/writing/specifying-dependencies-python
- Google Cloud supported Python runtime docs: https://docs.cloud.google.com/functions/docs/runtime-support
- Google Cloud Storage bucket creation docs: https://docs.cloud.google.com/storage/docs/creating-buckets
- Google Cloud Storage gsutil guidance: https://docs.cloud.google.com/storage/docs/gsutil
- BigQuery schema and bq command docs: https://docs.cloud.google.com/bigquery/docs/schemas
- Apache Beam BigQuery I/O docs: https://beam.apache.org/documentation/io/built-in/google-bigquery/

## Issues Found
- The Dataflow pipeline accepted `input_file` as a normal Python function argument, but the Cloud Function launches a classic Dataflow template with a runtime `input_file` parameter. Classic templates require `ValueProvider` options for parameters supplied at job launch time. Added an `ETLOptions` class with `parser.add_value_provider_argument("--input_file")` and changed `ReadFromText` to read from that runtime option.
- The template build command supplied `--input_file=gs://my-project-raw-data/placeholder.csv`. For a runtime classic template parameter, this value should be supplied when launching the template, not when staging it. Removed the placeholder argument from the template creation command.
- The Cloud Function imported `googleapiclient.discovery` but the post did not include the required Python dependency metadata. Added a `requirements.txt` snippet with `google-api-python-client>=2.0.0`.
- The generated Dataflow job name used the uploaded file name directly, which could include invalid characters such as underscores from `test_data.csv`. Added a small sanitizer that lowercases the name and replaces non `[a-z0-9-]` characters with hyphens before launching the template.
- The Cloud Storage examples used `gsutil`, which Google now documents as the legacy Cloud Storage CLI and recommends replacing with `gcloud storage`. Updated bucket creation and upload commands to `gcloud storage buckets create` and `gcloud storage cp`.

## Review Notes
The Python snippets were parsed locally with `ast.parse` and are syntactically valid. The local environment did not have `gcloud` or `bq` installed, so CLI verification was performed against official Google Cloud documentation instead of local help output.
