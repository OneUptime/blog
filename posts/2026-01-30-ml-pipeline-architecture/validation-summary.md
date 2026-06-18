# Validation Summary: How to Build ML Pipeline Architecture

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Kubeflow Pipelines
- Great Expectations
- DVC
- pandas / PyArrow
- scikit-learn
- XGBoost
- Optuna
- MLflow Tracking and Model Registry
- Feast
- KServe InferenceService
- Kubernetes autoscaling concepts
- Fairlearn
- SciPy statistical tests

## Sources Consulted
- Great Expectations dataframe validation docs: https://docs.greatexpectations.io/docs/core/connect_to_data/dataframes/
- Kubeflow Pipelines control flow docs: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/
- Kubeflow Pipelines run docs: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/run-a-pipeline/
- Feast feature view docs: https://docs.feast.dev/getting-started/concepts/feature-view
- MLflow Model Registry workflow docs: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow client API docs: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html
- KServe canary rollout docs: https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary-example
- KServe HPA autoscaling docs: https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/hpa-autoscaler
- pandas parquet docs: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_parquet.html
- DVC dvc.yaml docs: https://doc.dvc.org/user-guide/project-structure/dvcyaml-files

## Issues Found
- The Great Expectations example called `df.expect(...)`, which is not the current GX dataframe validation API. Updated it to create a pandas data source, dataframe asset, whole-dataframe batch definition, and validate `Expectation` objects against a batch.
- Components used `pd.read_parquet()` / `to_parquet()` without installing a parquet engine. Added `pyarrow` to the relevant Kubeflow component package lists.
- The Feast example used older `Feature`, `ValueType`, string entity references, and `features=` style definitions. Updated it to current `Entity(join_keys=...)`, `Field`, Feast types, and `schema=`.
- The XGBoost configuration still included the deprecated `use_label_encoder` parameter. Removed it and kept `eval_metric`.
- The training/evaluation flow evaluated the final model against the full feature dataset instead of the holdout test split. Added an `output_test_data` artifact from training and wired evaluation to that artifact.
- The MLflow model logging and promotion examples used deprecated registry stage APIs. Updated model logging to use `name=` and changed promotion to use registered model aliases.
- The KServe manifest used the old `serving.kubeflow.org` API group and an invalid nested canary shape. Updated it to `serving.kserve.io/v1beta1` and placed `canaryTrafficPercent` under `spec.predictor` as shown in current KServe examples.
- The Kubeflow pipeline used deprecated `dsl.Condition`. Updated both conditional blocks to `dsl.If`.

## Review Notes
- The examples are illustrative and still assume a binary classifier with `predict_proba`, a `target` column, and compatible sensitive-feature columns in the evaluation dataset.
- The KServe canary snippet reflects serverless canary rollout behavior where the previous ready revision receives the remaining traffic.
