# Validation Summary: How to Create a Dataflow Classic Template for Reusable Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataflow Classic Templates
- Apache Beam Python SDK
- Apache Beam Java SDK
- Google Cloud Storage
- BigQuery
- Google Cloud CLI
- Dataflow REST API
- Cloud Scheduler
- Google Auth Library for Python

## Sources Consulted
- Google Cloud Dataflow templates overview: https://cloud.google.com/dataflow/docs/concepts/dataflow-templates
- Google Cloud guide to creating classic Dataflow templates: https://cloud.google.com/dataflow/docs/guides/templates/creating-templates
- Google Cloud Dataflow REST API, projects.locations.templates.launch: https://cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.templates/launch
- Google Cloud Dataflow REST API, LaunchTemplateParameters: https://cloud.google.com/dataflow/docs/reference/rest/v1b3/LaunchTemplateParameters
- Google Cloud Dataflow REST API, RuntimeEnvironment: https://cloud.google.com/dataflow/docs/reference/rest/v1b3/RuntimeEnvironment
- Google Cloud CLI reference, gcloud dataflow jobs run: https://cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Google Cloud CLI reference, gcloud scheduler jobs create http: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Apache Beam Python ValueProvider documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.options.value_provider.html
- Apache Beam Java BigQueryIO.Write documentation: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/bigquery/BigQueryIO.Write.html
- Google Auth Library for Python documentation: https://google-auth.readthedocs.io/en/latest/reference/google.auth.html

## Issues Found
- The Python API example used `oauth2client.client.GoogleCredentials`, which is deprecated. Updated it to use `google.auth.default()` with the Cloud Platform scope.
- The Cloud Scheduler command omitted `--location`, which is required by the current `gcloud scheduler jobs create http` command resource syntax unless otherwise provided. Added `--location=us-central1`.
- The Python pipeline and metadata defined an `error_output_path` dead-letter parameter but the pipeline never wrote invalid rows to that path. Removed the unused parameter from the code and metadata to keep the template parameters accurate.
- The CSV parser could still raise `ValueError` for invalid numeric amounts even though the pipeline then filters failed parses. Updated the parser to return `None` for missing fields or invalid amounts.

## Review Notes
Classic Templates remain supported, but Google Cloud documentation recommends Flex Templates for new Dataflow templates because Flex Templates support dynamic graph construction and do not require `ValueProvider` for input parameters.
