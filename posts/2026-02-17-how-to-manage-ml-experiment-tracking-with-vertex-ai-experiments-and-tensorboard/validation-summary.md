# Validation Summary: How to Manage ML Experiment Tracking with Vertex AI Experiments and TensorBoard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Experiments
- Vertex AI SDK for Python
- Vertex AI TensorBoard
- Vertex ML Metadata
- Vertex AI CustomJob
- Python

## Sources Consulted
- Google Cloud Vertex AI documentation: Manually log data to an experiment run - https://docs.cloud.google.com/vertex-ai/docs/experiments/log-data
- Google Cloud Vertex AI documentation: Track executions and artifacts - https://docs.cloud.google.com/vertex-ai/docs/experiments/track-executions-artifacts
- Google Cloud Vertex AI documentation: Tracking classes - https://cloud.google.com/vertex-ai/docs/python-sdk/tracking-classes
- Google Cloud Python SDK reference: google.cloud.aiplatform package - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform
- Google Cloud Python SDK reference: Experiment - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Experiment
- Google Cloud Python SDK reference: ExperimentRun - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.ExperimentRun
- Google Cloud Python SDK reference: Tensorboard - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Tensorboard
- Google Cloud Python SDK reference: CustomJob - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomJob
- Google Cloud Vertex AI documentation: System schemas - https://docs.cloud.google.com/vertex-ai/docs/ml-metadata/system-schemas

## Issues Found
- The time series metrics section did not show a backing Vertex AI TensorBoard instance. Updated the explanation and code to initialize `aiplatform` with `experiment_tensorboard`, because `log_time_series_metrics` requires a backing TensorBoard resource.
- The artifact example used `aiplatform.log(model_artifact)`, which is not the supported way to attach an arbitrary artifact to a run. Replaced it with `aiplatform.start_execution(...)` and `execution.assign_output_artifacts([model_artifact])`, matching the Vertex ML Metadata tracking pattern.
- The custom training job example passed `experiment` and `experiment_run` without `service_account`. Added a `service_account` argument because the SDK reference requires a service account when an experiment is provided for `CustomJob.run`.
- The best practices section referred to tagging runs, but the shown APIs do not expose a generic run tagging method. Reworded this to recommend logging consistent run metadata as parameters.

## Review Notes
The remaining code examples use placeholder project IDs, resource IDs, model variables, data loaders, and training functions, so they are illustrative snippets rather than standalone runnable scripts. Google documentation now notes that Vertex AI documentation is moving under the Gemini Enterprise Agent Platform, but the Vertex AI SDK reference and APIs used in the post remain current.
