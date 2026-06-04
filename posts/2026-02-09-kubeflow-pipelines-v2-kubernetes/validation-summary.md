# Validation Summary: How to Build ML Pipelines with Kubeflow Pipelines V2 on Kubernetes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- Kubeflow Pipelines V2
- Kubeflow Pipelines Python SDK
- KFP DSL components, artifacts, metrics, control flow, caching, and recurring runs
- Python
- pandas
- scikit-learn

## Sources Consulted
- Kubeflow Pipelines installation documentation: https://www.kubeflow.org/docs/components/pipelines/operator-guides/installation/
- Kubeflow Pipelines control flow documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/
- Kubeflow Pipelines platform-specific features documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/platform-specific-features/
- Kubeflow Pipelines SDK client reference: https://kubeflow-pipelines.readthedocs.io/en/latest/source/client.html
- Kubeflow Pipelines SDK DSL reference: https://kubeflow-pipelines.readthedocs.io/en/latest/source/dsl.html
- Kubeflow Pipelines GitHub releases: https://github.com/kubeflow/pipelines/releases
- kfp 2.16.1 PyPI package page: https://pypi.org/project/kfp/2.16.1/
- Local verification with `kfp==2.5.0` and `kfp==2.16.1` SDK API inspection and DSL compilation.

## Issues Found
- The post used outdated KFP versions (`PIPELINE_VERSION=2.0.5` and `kfp==2.5.0`). Updated both to `2.16.1`, matching the latest available KFP SDK/release checked during review.
- The install snippet used the older `env/platform-agnostic` manifest as the main install path. Updated it to the current standalone documentation's `env/dev` manifest path.
- The complete pipeline used deprecated `dsl.Condition`. Replaced it with `dsl.If`, which the official KFP control-flow docs recommend.
- The `complete_ml_pipeline` accepted `test_size` but `train_multiple_models` ignored it. Added a `test_size` input to `train_multiple_models` and passed the pipeline parameter through.
- `complete_pipeline.py` referenced `load_data` without defining or importing it. Added `from simple_pipeline import load_data` so the tutorial sequence can compile.
- The conditional pipeline snippet used compile-time Python `if deploy_to_production` and tried to branch on metrics artifact metadata in the pipeline graph. Rewrote it to branch on the output of `evaluate_model` with `dsl.If`, and added minimal deployment components so the snippet is complete.
- The monitoring snippet used v1-style run fields (`run.name`, `run.status`, `run.id`, and `run_detail.run.status`) and called nonexistent `client.get_run_metrics()`. Updated it to KFP v2 fields (`display_name`, `state`, `run_id`) and removed the unsupported metrics call.
- The recurring run snippet used `.id` on KFP v2 experiment and recurring-run models. Updated these to `.experiment_id` and `.recurring_run_id`.
- The caching example called `expensive_preprocessing()` without the required `input_data` argument. Added a `dsl.importer` artifact input before enabling caching.
- The GPU resource example passed an integer to `set_gpu_limit`; updated it to a string value consistent with the SDK signature.

## Review Notes
The main pipeline examples were compiled locally against `kfp==2.16.1` after edits. The Kubernetes deployment commands were checked against official documentation and manifest release tags, but were not executed because no Kubernetes cluster context was available in the review environment.
