# Validation Summary: How to Build a Dataflow Flex Template with Custom Dependencies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataflow
- Dataflow Flex Templates
- Apache Beam Python SDK
- Docker
- Artifact Registry
- BigQuery
- Dataflow REST API
- gcloud CLI

## Sources Consulted
- Google Cloud Dataflow: Configure Flex Templates: https://cloud.google.com/dataflow/docs/guides/templates/configuring-flex-templates
- Google Cloud Dataflow: Build and run an example Flex Template: https://cloud.google.com/dataflow/docs/guides/templates/using-flex-templates
- Google Cloud Dataflow: Run Flex Templates: https://cloud.google.com/dataflow/docs/guides/templates/run-flex-templates
- Google Cloud Dataflow: Use custom containers: https://cloud.google.com/dataflow/docs/guides/using-custom-containers
- Google Cloud Dataflow: Run a Dataflow job in a custom container: https://cloud.google.com/dataflow/docs/guides/run-custom-container
- Google Cloud SDK: gcloud dataflow flex-template build: https://cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/build
- Google Cloud SDK: gcloud dataflow flex-template run: https://cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/run
- Google Cloud Dataflow REST API: projects.locations.flexTemplates.launch: https://cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.flexTemplates/launch
- Apache Beam 2.53.0 Python BigQuery I/O documentation: https://beam.apache.org/releases/pydoc/2.53.0/apache_beam.io.gcp.bigquery.html
- Apache Beam Python SDK support matrix: https://beam.apache.org/documentation/sdks/python/

## Issues Found
- The Dockerfile was described as using the official Apache Beam Python SDK image, but it used the Dataflow Flex Template launcher base image directly. I changed it to a multi-stage Dockerfile that copies the Flex Template launcher into `apache/beam_python3.11_sdk:2.53.0`.
- The original Dockerfile installed system libraries only in the launcher image. That does not guarantee that system dependencies are available to Dataflow workers. I updated the Dockerfile and launch examples so the same custom Beam SDK container is used as the worker SDK container through `sdk_container_image` / `sdkContainerImage`.
- The BigQuery write used `CREATE_IF_NEEDED` without providing a schema. Apache Beam requires a schema when it needs to create a BigQuery table. I changed the example to use `CREATE_NEVER` and clarified that `output_table` should be an existing table.
- The REST API example used `launch_parameter`, but the Dataflow Flex Templates REST API uses the JSON field `launchParameter`. I corrected the field name.
- The custom container launch path needed Runner v2 for batch Python custom containers. I added `--additional-experiments=use_runner_v2` to the gcloud example and `additionalExperiments` to the REST environment.

## Review Notes
- The gcloud examples and Flex Template metadata structure match current Google Cloud documentation.
- The post still uses `latest` for the Dataflow template launcher base image. Google Cloud recommends pinning base image tags for stability, but the example remains technically valid.
