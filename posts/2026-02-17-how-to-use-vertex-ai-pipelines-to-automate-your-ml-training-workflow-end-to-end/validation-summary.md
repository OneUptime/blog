# Validation Summary: How to Use Vertex AI Pipelines to Automate Your ML Training Workflow End-to-End

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Pipelines
- Kubeflow Pipelines SDK v2
- Google Cloud AI Platform Python SDK
- Google Cloud BigQuery Python client
- Google Cloud Pipeline Components
- scikit-learn
- Python

## Sources Consulted
- Vertex AI Pipelines introduction: https://cloud.google.com/vertex-ai/docs/pipelines/introduction
- Vertex AI Pipelines build guide: https://cloud.google.com/vertex-ai/docs/pipelines/build-pipeline
- Vertex AI Pipelines run guide: https://cloud.google.com/vertex-ai/docs/pipelines/run-pipeline
- Vertex AI Pipelines scheduling guide: https://cloud.google.com/vertex-ai/docs/pipelines/schedule-pipeline-run
- Vertex AI Pipelines caching guide: https://cloud.google.com/vertex-ai/docs/pipelines/configure-caching
- Vertex AI `PipelineJob` Python API reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.PipelineJob
- Kubeflow Pipelines compiler API reference: https://kubeflow-pipelines.readthedocs.io/en/latest/source/compiler.html
- Kubeflow Pipelines DSL API reference: https://kubeflow-pipelines.readthedocs.io/en/latest/source/dsl.html
- Kubeflow Pipelines local execution API reference: https://kubeflow-pipelines.readthedocs.io/en/stable/source/local.html
- BigQuery Python client query-to-DataFrame sample: https://cloud.google.com/bigquery/docs/samples/bigquery-query-results-dataframe
- scikit-learn `RandomForestClassifier` API reference: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- scikit-learn `f1_score` API reference: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.f1_score.html

## Issues Found
- The opening description implied that a failed step can be rerun by itself. Updated it to state that you rerun the pipeline and Vertex AI Pipelines can skip unchanged successful steps through caching.
- The `components.py` example used a scalar metric in later conditional logic but only logged it to a `Metrics` artifact. Updated `evaluate_model` to return `accuracy` and `f1_score` as primitive outputs while still logging them to the metrics artifact.
- The `pipeline.py` and `run_pipeline.py` snippets omitted imports needed when the examples are saved as separate files. Added imports for the component functions and `ml_pipeline`.
- The conditional example used deprecated `dsl.Condition` and attempted to read `eval_task.outputs['metrics'].metadata['accuracy']`, which does not compile in KFP v2. Updated it to use `dsl.If` with the returned primitive `accuracy` output.
- The conditional example referenced an undefined `deploy_model` task. Added a minimal placeholder component so the conditional-control-flow snippet compiles.
- The local testing note said component functions can be called directly without mentioning KFP local execution. Updated it to specify that local execution must be initialized first.

## Review Notes
- The corrected KFP pipeline and conditional examples were compiled locally with KFP 2.x to verify the DSL syntax and output wiring.
- The deployment step remains a placeholder; a production deployment component should upload the model with an appropriate serving container and deploy it to a Vertex AI endpoint.
