# Validation Summary: How to Build a Text Summarization Pipeline with Gemini and Vertex AI Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Pipelines
- Kubeflow Pipelines SDK
- Gemini on Vertex AI
- Google Gen AI SDK for Python
- Google Cloud Storage
- BigQuery
- Python

## Sources Consulted
- Vertex AI Pipelines build pipeline documentation: https://cloud.google.com/vertex-ai/docs/pipelines/build-pipeline
- Vertex AI pipeline schedules documentation: https://cloud.google.com/vertex-ai/docs/pipelines/schedule-pipeline-run
- Google Cloud Python `PipelineJob` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.PipelineJob
- Google Cloud Python `PipelineJobSchedule` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.PipelineJobSchedule
- Vertex AI Gemini model lifecycle documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Vertex AI SDK generative module deprecation notice: https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Gen AI SDK Vertex AI quickstart and samples: https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal
- Google Gen AI SDK for Python reference: https://googleapis.github.io/python-genai/genai.html
- Google Cloud Storage Python `Blob.download_as_text` reference: https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- BigQuery Python `insert_rows_json` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- BigQuery create table with schema sample: https://cloud.google.com/bigquery/docs/samples/bigquery-create-table

## Issues Found
- The post used `vertexai.generative_models.GenerativeModel`, which Google has deprecated for generative AI usage. Updated the summarization component to use the Google Gen AI SDK for Python.
- The post used `gemini-1.5-flash`, which is retired according to the Vertex AI model lifecycle documentation. Updated the example to use `gemini-2.5-flash`.
- The package installation examples did not include `google-genai`, and the component attempted to install a `vertexai` package separately. Updated the install commands and component dependencies.
- The architecture and prerequisites referenced BigQuery input, GCS output, post-processing, and notifications that the tutorial did not implement. Narrowed those references to the implemented GCS-to-BigQuery pipeline.
- The preprocessing component normalized all whitespace before splitting on paragraph boundaries, so paragraph-based chunking would not work as described. Moved whitespace normalization inside the paragraph loop and for the non-chunked path.
- The pipeline submission example printed `job._dashboard_uri()`, a private SDK method not documented as part of the public API. Updated it to print `job.resource_name`.
- The scheduling section said to use Cloud Scheduler, but the sample uses Vertex AI pipeline schedules. Corrected the description.
- The summary claimed orchestration handles retries and failures by default. Updated the wording to say retries and failures can be configured.
- The BigQuery insertion code assumes a target table exists. Added the BigQuery dataset and table as prerequisites.

## Review Notes
The post is now technically valid as a focused tutorial. For production use, it could still be improved with explicit BigQuery schema setup, component retry policies, IAM requirements, batching/concurrency controls for Gemini calls, and token-aware chunking rather than character-count chunking.
