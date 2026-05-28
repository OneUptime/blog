# Validation Summary: How to Build Custom Kubeflow Pipeline Components for Vertex AI Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Pipelines
- Kubeflow Pipelines SDK v2
- Kubeflow Pipeline components
- Python
- Docker
- XGBoost
- scikit-learn
- pandas

## Sources Consulted
- Google Cloud Vertex AI Pipelines: Build a pipeline: https://cloud.google.com/vertex-ai/docs/pipelines/build-pipeline
- Google Cloud Vertex AI Pipelines: Interfaces for Vertex AI Pipelines: https://cloud.google.com/vertex-ai/docs/pipelines/interfaces
- Kubeflow Pipelines: Lightweight Python Components: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/lightweight-python-components/
- Kubeflow Pipelines: Container Components: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/container-components/
- Kubeflow Pipelines: Importer Components: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/importer-component/
- Kubeflow Pipelines: Control Flow: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/
- Kubeflow Pipelines: Compile a Pipeline: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/compile-a-pipeline/
- Kubeflow Pipelines: Migrate to Kubeflow Pipelines v2: https://www.kubeflow.org/docs/components/pipelines/user-guides/migration/
- Kubeflow Pipelines: Execute KFP pipelines locally: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/execute-kfp-pipelines-locally/
- scikit-learn `roc_curve` API reference: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.roc_curve.html
- XGBoost Python API documentation: https://xgboost.readthedocs.io/en/latest/python/python_api.html

## Issues Found
- The code examples imported KFP SDK APIs from `kfp.v2`, which is the old v1 SDK v2-namespace style. Updated imports to the current `from kfp import dsl, compiler` and `from kfp.dsl import ...` forms.
- The pipeline example used `dsl.Condition`, which is deprecated in current KFP SDK v2. Replaced it with `dsl.If`.
- The pipeline example passed `dataset_uri` directly to a component input typed as `Input[Dataset]`. KFP artifact inputs should receive an artifact, so the example now imports the external URI with `dsl.importer(..., artifact_class=dsl.Dataset)` and passes `dataset.output`.
- The compile example wrote `training_pipeline.json`; current KFP and Vertex AI documentation show compiling KFP v2 pipelines to YAML. Updated the output path to `training_pipeline.yaml`.
- The XGBoost training snippet used `use_label_encoder=False`, a deprecated/obsolete `XGBClassifier` parameter. Removed it.
- The binary ROC example did not specify `pos_label`. scikit-learn requires `pos_label` when labels are not `{0, 1}` or `{-1, 1}`, so the example now sets it explicitly from the positive class.

## Review Notes
- The local test examples call the wrapped component's Python function directly with mock artifact objects. This is acceptable for unit testing pure function logic, though current KFP documentation also supports `component.execute(...)` and local execution via `kfp.local`.
- The reusable library and pipeline snippets reference example components that are not fully implemented in the post. They are illustrative and technically plausible in context.
