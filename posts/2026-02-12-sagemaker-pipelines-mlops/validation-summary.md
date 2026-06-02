# Validation Summary: How to Use SageMaker Pipelines for MLOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker Pipelines
- Amazon SageMaker Python SDK
- SageMaker Processing, Training, Condition, and Model steps
- SageMaker Model Registry
- SageMaker XGBoost built-in algorithm container
- SageMaker scikit-learn processing container
- Boto3 SageMaker client
- Amazon S3
- EventBridge and Lambda pipeline triggering

## Sources Consulted
- Amazon SageMaker Pipelines overview: https://docs.aws.amazon.com/en_us/sagemaker/latest/dg/pipelines-overview.html
- Amazon SageMaker Pipelines actions: https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-build.html
- Amazon SageMaker Developer Guide, define a pipeline: https://docs.aws.amazon.com/sagemaker/latest/dg/define-pipeline.html
- Amazon SageMaker Developer Guide, pass data between steps with property files: https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-propertyfile.html
- Amazon SageMaker Developer Guide, caching pipeline steps: https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-caching.html
- Amazon SageMaker Developer Guide, turn on step caching: https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-caching-enabling.html
- Amazon SageMaker prebuilt image support policy: https://docs.aws.amazon.com/sagemaker/latest/dg/pre-built-containers-support-policy.html
- Amazon SageMaker scikit-learn resources and supported versions: https://docs.aws.amazon.com/sagemaker/latest/dg/sklearn.html
- Amazon SageMaker API Reference, StartPipelineExecution: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_StartPipelineExecution.html
- SageMaker Python SDK ModelStep documentation: https://sagemaker.readthedocs.io/en/v2.140.0/amazon_sagemaker_model_building_pipeline.html#model-step
- SageMaker Python SDK Model.register documentation: https://sagemaker.readthedocs.io/en/v2.211.0/api/inference/model.html
- SageMaker Python SDK PipelineSession documentation: https://sagemaker.readthedocs.io/en/v2.112.1/workflows/pipelines/sagemaker.workflow.pipelines.html

## Issues Found
- The post used `RegisterModel` from `sagemaker.workflow.step_collections`. AWS documentation states that `RegisterModel` continues to work in previous SDK versions but is no longer actively supported, and recommends `ModelStep` for model registration as of SageMaker Python SDK v2.90.0. Updated the example to create a `Model`, call `model.register()`, and wrap the result in `ModelStep`.
- The setup code used a regular `sagemaker.Session()` for pipeline construction. Official SageMaker Python SDK documentation recommends `PipelineSession` when composing model-building pipelines. Updated the session initialization and import accordingly.
- The examples used XGBoost `1.7-1` and Scikit-learn `1.2-1` containers. AWS's prebuilt image support policy lists both as past their end-of-patch dates and lists XGBoost `3.0-5` and Scikit-learn `1.4-2` as current supported versions, so the container versions were updated.
- The diagram showed a failed quality check stopping the pipeline and then showed a deploy step, but the code's `ConditionStep` has an empty `else_steps` list and the tutorial does not define a deployment step. Updated the diagram so the failed condition skips registration, matching the implementation.
- Removed the unused `ParameterInteger` import from the setup snippet.

## Review Notes
The local environment did not have the SageMaker Python SDK installed, so Python import validation could not be run locally. Review was performed against current official AWS documentation and SageMaker Python SDK documentation. The examples still assume that `scripts/preprocess.py` writes the named train, validation, and test outputs and that `scripts/evaluate.py` writes `/opt/ml/processing/evaluation/evaluation.json` with the JSON path `classification_metrics.auc_roc.value`.
