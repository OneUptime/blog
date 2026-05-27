# Validation Summary: How to Set Up a Vertex AI Workbench Instance for Interactive ML Development

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Google Cloud Vertex AI Workbench
- Google Cloud Notebooks API
- Google Cloud CLI (`gcloud workbench instances`)
- JupyterLab
- Google Cloud Storage
- BigQuery
- Vertex AI custom training
- Python client libraries for Google Cloud

## Sources Consulted
- Google Cloud: Create a Vertex AI Workbench instance: https://docs.cloud.google.com/vertex-ai/docs/workbench/instances/create
- Google Cloud: Introduction to Vertex AI Workbench: https://docs.cloud.google.com/vertex-ai/docs/workbench/introduction
- Google Cloud SDK: `gcloud workbench instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/workbench/instances/create
- Google Cloud SDK: `gcloud workbench instances describe`: https://docs.cloud.google.com/sdk/gcloud/reference/workbench/instances/describe
- Google Cloud: Vertex AI Workbench idle shutdown: https://docs.cloud.google.com/vertex-ai/docs/workbench/instances/idle-shutdown
- Google Cloud Python client: `google.cloud.notebooks_v2.services.notebook_service.NotebookServiceClient`: https://docs.cloud.google.com/python/docs/reference/notebooks/latest/google.cloud.notebooks_v2.services.notebook_service.NotebookServiceClient
- Google Cloud Python client: `google.cloud.notebooks_v2.types.Instance`: https://docs.cloud.google.com/python/docs/reference/notebooks/latest/google.cloud.notebooks_v2.types.Instance
- Google Cloud Python client: `google.cloud.notebooks_v2.types.GceSetup`: https://docs.cloud.google.com/python/docs/reference/notebooks/latest/google.cloud.notebooks_v2.types.GceSetup
- Google Cloud Python client: `google.cloud.notebooks_v2.types.AcceleratorConfig`: https://docs.cloud.google.com/python/docs/reference/notebooks/latest/google.cloud.notebooks_v2.types.AcceleratorConfig
- Google Cloud Python client: `google.cloud.notebooks_v2.types.VmImage`: https://docs.cloud.google.com/python/docs/reference/notebooks/latest/google.cloud.notebooks_v2.types.VmImage
- Google Cloud: Vertex AI prebuilt containers for serverless training: https://docs.cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Google Cloud Python client: Vertex AI `CustomTrainingJob`: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomTrainingJob

## Issues Found
- The post described Vertex AI Workbench as offering only managed notebooks and user-managed notebooks. Updated the section to distinguish current Workbench instances from older managed and user-managed notebook resources.
- The Python sample used `aiplatform.NotebookRuntimeTemplate.create(...)`, which is not the correct high-level API for creating a Workbench instance. Replaced it with `google.cloud.notebooks_v2.NotebookServiceClient.create_instance(...)` and the current `Instance` / `GceSetup` types.
- The idle shutdown example used `--idle-shutdown-timeout=60`, which is not a current `gcloud workbench instances create` flag. Replaced it with `--metadata=idle-timeout-seconds=3600`.
- The post-startup script example used `--post-startup-script`, which is not a current `gcloud workbench instances create` flag. Replaced it with `--metadata=post-startup-script=gs://...`.
- The custom service account example used `--service-account`; the current Workbench create flag is `--service-account-email`. Updated the command.
- The private IP example used `--no-public-ip`; the current Workbench create flag is `--disable-public-ip`. Updated the command.
- The Vertex AI training job used the TensorFlow 2.14 GPU prebuilt container, whose listed end of availability is September 26, 2025. Updated the example to the TensorFlow 2.17 GPU Python 3.10 image, which is listed as available through July 11, 2026.

## Review Notes
The local environment did not have `gcloud` or `python` available, so validation was performed against official Google Cloud documentation rather than local command execution. GPU availability still depends on the selected zone and project quota, so the sample GPU commands can fail operationally even though their syntax is valid.
