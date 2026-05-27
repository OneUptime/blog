# Validation Summary: How to Pass Runtime Parameters to Dataflow Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataflow classic templates
- Apache Beam Java SDK
- Apache Beam `ValueProvider` and `NestedValueProvider`
- Google Cloud CLI
- Dataflow REST API
- BigQueryIO
- Maven
- Python `googleapiclient`

## Sources Consulted
- Google Cloud Dataflow: Creating classic templates: https://cloud.google.com/dataflow/docs/guides/templates/creating-templates
- Google Cloud Dataflow: Running classic templates: https://cloud.google.com/dataflow/docs/guides/templates/running-templates
- Google Cloud Dataflow REST API: `projects.locations.templates.launch`: https://cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.templates/launch
- Google Cloud SDK reference: `gcloud dataflow jobs run`: https://cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Apache Beam JavaDoc: `ValueProvider`: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/options/ValueProvider.html
- Apache Beam JavaDoc: `ValueProvider.NestedValueProvider`: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/options/ValueProvider.NestedValueProvider.html
- Google Cloud Dataflow: Configuring Flex Templates: https://cloud.google.com/dataflow/docs/guides/templates/configuring-flex-templates
- Google Cloud Dataflow: Running Flex Templates: https://cloud.google.com/dataflow/docs/guides/templates/run-flex-templates

## Issues Found
- The `gcloud dataflow jobs run` example split `--parameters` across lines with spaces after commas. Google Cloud documentation states that spaces between commas and values are not allowed. Changed the example to pass a single comma-separated `--parameters=...` argument with no spaces.
- The Python REST API example used `projects().templates().launch`, the non-regional launch resource. Google Cloud recommends `projects.locations.templates.launch`; the non-regional resource is not recommended because jobs launched from it always start in `us-central1`. Updated the sample to accept a `region` argument and call `dataflow.projects().locations().templates().launch(...)`.

## Review Notes
The Java examples are illustrative snippets and omit imports and helper implementations such as `ParseFn` and `getSchema()`. The Beam APIs shown are current, and the documented `ValueProvider`, `NestedValueProvider`, template metadata, and Flex Template claims align with official documentation.
