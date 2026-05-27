# Validation Summary: How to Track ML Metadata and Lineage with Vertex AI ML Metadata

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vertex AI ML Metadata
- Vertex AI Experiments
- Vertex AI Pipelines
- Google Cloud Vertex AI Python SDK
- Kubeflow Pipelines SDK
- Python

## Sources Consulted
- Google Cloud Vertex AI ML Metadata data model: https://docs.cloud.google.com/vertex-ai/docs/ml-metadata/data-model
- Google Cloud Vertex AI ML Metadata management guide: https://docs.cloud.google.com/vertex-ai/docs/ml-metadata/managing-metadata
- Google Cloud Vertex AI ML Metadata analysis guide: https://docs.cloud.google.com/vertex-ai/docs/ml-metadata/analyzing
- Google Cloud Vertex AI ML Metadata system schemas: https://docs.cloud.google.com/vertex-ai/docs/ml-metadata/system-schemas
- Google Cloud Vertex AI Experiments manual logging guide: https://docs.cloud.google.com/vertex-ai/docs/experiments/log-data
- Google Cloud Vertex AI Experiments artifact and execution tracking guide: https://docs.cloud.google.com/vertex-ai/docs/experiments/track-executions-artifacts
- Google Cloud Vertex AI Python SDK `Artifact` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Artifact
- Google Cloud Vertex AI Python SDK `ExperimentRun` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.ExperimentRun
- Google Cloud Vertex AI Python SDK `MetadataServiceClient` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.services.metadata_service.MetadataServiceClient
- Google Cloud Vertex AI Pipelines interfaces guide: https://cloud.google.com/vertex-ai/docs/pipelines/interfaces
- Kubeflow Pipelines SDK DSL reference: https://kubeflow-pipelines.readthedocs.io/en/sdk-2.14.1/source/dsl.html

## Issues Found
- The post stated that Vertex ML Metadata concepts map to the W3C PROV standard. Google Cloud's Vertex ML Metadata docs describe the artifact, execution, event, and context graph model, but do not document Vertex ML Metadata as a W3C PROV mapping. Reworded the sentence to describe the documented lineage graph instead.
- The setup snippet used `aiplatform.MetadataStore("default")`, which is not the documented high-level Python SDK API for retrieving the metadata store. Replaced it with `aiplatform_v1.MetadataServiceClient.get_metadata_store()` using the regional API endpoint.
- The training and preprocessing snippets used `run.log_input()` and `run.log_output()`, but `ExperimentRun` does not provide those methods in the documented SDK. Replaced them with `aiplatform.start_execution()` plus `execution.assign_input_artifacts()` and `execution.assign_output_artifacts()`, and associated the execution with the experiment run.
- The preprocessing snippet used `datetime.datetime.now()` without importing `datetime`. Added the missing import.
- The lineage query snippet used `aiplatform.Artifact.get_with_lineage_subgraph()`, which is not a documented `Artifact` class method. Replaced it with `MetadataServiceClient.query_artifact_lineage_subgraph()`.
- The experiment comparison snippet looked up runs in the `"default"` experiment while the corrected examples log to `"metadata-lineage"`. Updated the lookup to use the same experiment name.
- The hyperparameter experiment snippet called `train_and_evaluate(config)` without defining it. Added a minimal placeholder function so the example is syntactically complete.
- The Vertex AI Pipelines component used the older `kfp.v2` import path. Updated it to the current KFP SDK v2 import style, `from kfp import dsl` and `from kfp.dsl import ...`.

## Review Notes
- All Python snippets were checked with `ast.parse` and are syntactically valid.
- The local environment does not have the `google` Python packages installed, so runtime import validation against an installed SDK was not possible.
- Time series metric logging in Vertex AI Experiments requires a backing Vertex AI TensorBoard resource. The post logs scalar summary metrics with `log_metrics()`, which is valid for final or summary metrics.
