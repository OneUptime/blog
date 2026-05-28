# Validation Summary: How to Deploy Dataflow Flex Templates from a CI/CD Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataflow Flex Templates
- Google Cloud Build
- Artifact Registry
- Cloud Storage
- GitHub Actions
- Docker
- Python
- BigQuery

## Sources Consulted
- Google Cloud SDK reference for `gcloud dataflow flex-template build`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/build
- Google Cloud SDK reference for `gcloud dataflow flex-template run`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/run
- Google Cloud Dataflow guide for running Flex Templates: https://docs.cloud.google.com/dataflow/docs/guides/templates/run-flex-templates
- Google Cloud SDK reference for `gcloud dataflow jobs list`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/list
- Google Cloud SDK reference for `gcloud dataflow jobs describe`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/describe
- Google Cloud Build configuration schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud SDK reference for `gcloud builds triggers create github`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Artifact Registry image tagging documentation: https://cloud.google.com/artifact-registry/docs/docker/manage-images
- Google Cloud Python Dataflow `FlexTemplatesServiceClient` reference: https://docs.cloud.google.com/python/docs/reference/dataflow/latest/google.cloud.dataflow_v1beta3.services.flex_templates_service.FlexTemplatesServiceClient
- Google Cloud Python Dataflow `LaunchFlexTemplateRequest` reference: https://docs.cloud.google.com/python/docs/reference/dataflow/latest/google.cloud.dataflow_v1beta3.types.LaunchFlexTemplateRequest
- Google Cloud Python Dataflow `LaunchFlexTemplateParameter` reference: https://docs.cloud.google.com/python/docs/reference/dataflow/latest/google.cloud.dataflow_v1beta3.types.LaunchFlexTemplateParameter
- BigQuery partitioned tables documentation: https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- Docker CLI reference for `docker image push --all-tags`: https://docs.docker.com/engine/reference/commandline/image_push/
- GitHub Actions documentation for Python workflows and artifacts: https://docs.github.com/actions/guides/building-and-testing-python and https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts

## Issues Found
- The Cloud Build staging test step submitted a Dataflow job and then immediately allowed promotion to continue, even though the post described stopping the pipeline if the staging job failed. I changed the snippet to look up the submitted Dataflow job ID, poll `gcloud dataflow jobs describe`, and fail the build on failed, cancelled, drained, or updated terminal states.
- The Python integration test called `FlexTemplatesServiceClient.launch_flex_template` with flattened keyword arguments. The current Python client method accepts a `request` object or dictionary, with only `retry`, `timeout`, and `metadata` as direct keyword-only arguments. I changed the sample to pass a request dictionary and added the regional Dataflow API endpoint.
- The BigQuery verification query filtered on `_PARTITIONTIME`, which only exists for ingestion-time partitioned tables. The sample did not define the output table as ingestion-time partitioned, so I removed that filter and kept the count assertion generic.

## Review Notes
- The Cloud Build and GitHub Actions examples assume the Artifact Registry Docker repository and Cloud Storage bucket already exist and that the build or workflow identity has the necessary IAM permissions.
- The integration test still uses a fixed sleep as a compact example. A production test should poll the Dataflow job state and add an explicit timeout before checking outputs.
