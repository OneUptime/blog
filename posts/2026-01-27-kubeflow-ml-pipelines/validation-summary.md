# Validation Summary: How to Build ML Pipelines with Kubeflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubeflow Pipelines
- KFP SDK v2
- Kubernetes
- Docker
- Python
- pandas
- scikit-learn
- ML Metadata
- Kubeflow Pipelines Metrics artifacts

## Sources Consulted
- Kubeflow Pipelines overview: https://kubeflow-pipelines.readthedocs.io/
- Kubeflow Pipelines pipeline concepts: https://www.kubeflow.org/docs/components/pipelines/concepts/pipeline/
- Kubeflow Pipelines container components: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/container-components/
- Kubeflow Pipelines artifact handling: https://www.kubeflow.org/docs/components/pipelines/user-guides/data-handling/artifacts/
- Kubeflow Pipelines parameter handling: https://www.kubeflow.org/docs/components/pipelines/user-guides/data-handling/parameters/
- Kubeflow Pipelines control flow: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/
- Kubeflow Pipelines run submission: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/run-a-pipeline/
- KFP SDK client API reference: https://kubeflow-pipelines.readthedocs.io/en/latest/source/client.html
- KFP SDK v2 migration guide: https://www.kubeflow.org/docs/components/pipelines/user-guides/migration/
- KFP task configuration documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/compose-components-into-pipelines/

## Issues Found
- The preprocessing component accepted `gs://` paths in later examples but did not install `gcsfs`, which pandas needs for GCS access. Added `gcsfs` to the component dependencies.
- The container component accepted dataset input as a plain `str`, which would not type-match an upstream dataset artifact path. Changed it to `dsl.InputPath('Dataset')`.
- The conditional deployment example used deprecated `dsl.Condition`. Updated it to `dsl.If`, which is the current documented KFP control-flow API.
- The run submission example printed `run.run_url`, but current `RunPipelineResult` exposes `run_id` and `run_info`, not `run_url`. Removed the invalid line.
- The recurring run example used a five-field cron expression. Current KFP client documentation specifies six space-separated fields, so it was changed to `0 0 2 * * *` for daily 2 AM execution.
- The run monitoring example used v1-style `run.run.status`. Current KFP v2 run objects expose `state`, so the polling example now checks `run.state`.
- The monitoring section implied metrics and workflow artifacts could be read directly from v1-style run object fields. Replaced those misleading helper snippets with KFP v2 guidance to query metrics and artifacts through ML Metadata.
- The resource example used deprecated GPU configuration and an incorrect node selector call shape. Updated it to `set_accelerator_type` and `set_accelerator_limit`.

## Review Notes
- The post now aligns with current KFP SDK v2 examples and API references. Some examples still use placeholders such as custom serving infrastructure, registry image names, and ML Metadata connection details; those are appropriate for a tutorial but must be adapted to the reader's cluster.
- Local execution was not possible because the workspace does not have the `kfp` package installed. The review used official Kubeflow and KFP SDK documentation as the source of truth.
