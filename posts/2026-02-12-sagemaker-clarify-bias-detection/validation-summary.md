# Validation Summary: How to Use SageMaker Clarify for Bias Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker Clarify
- SageMaker Python SDK
- SageMaker Model Monitor
- SageMaker Pipelines
- SHAP explainability
- Python, boto3, pandas

## Sources Consulted
- AWS SageMaker Clarify pre-training bias metrics: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-measure-data-bias.html
- AWS SageMaker Clarify post-training bias metrics: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-measure-post-training-bias.html
- AWS SageMaker Clarify analysis configuration files: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-processing-job-configure-analysis.html
- AWS SageMaker Clarify analysis results schema: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-processing-job-analysis-results.html
- SageMaker Python SDK Clarify processor API: https://sagemaker.readthedocs.io/en/stable/api/training/processing.html
- AWS SageMaker Model Bias Monitor baseline documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-model-monitor-bias-drift-baseline.html
- AWS SageMaker Model Bias Monitor schedule documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-model-monitor-bias-drift-schedule.html
- SageMaker Python SDK Model Monitor API: https://sagemaker.readthedocs.io/en/stable/api/inference/model_monitor.html
- SageMaker Python SDK Pipeline JsonGet / PropertyFile documentation: https://sagemaker.readthedocs.io/en/v2.114.0/amazon_sagemaker_model_building_pipeline.html

## Issues Found
- Clarify bias metric values can be numeric, null, or string values such as infinity. Updated the result parsing examples to avoid formatting non-numeric values with `:.4f`.
- The SHAP interpretation example read `explanations_shap/out.csv` and recomputed global importance from local SHAP values. Updated it to read global SHAP values from the `explanations.kernel_shap` section of `analysis.json`, which matches the Clarify analysis results schema.
- The production monitoring example passed a plain endpoint name and a `BiasConfig` object as `analysis_config`. Updated it to use `EndpointInput`, include monitoring time offsets and probability threshold configuration, pass suggested constraints, and let the monitor reuse the baseline analysis configuration.
- The SageMaker Pipelines example used `ConditionLessThanOrEqualTo` with `DI <= 0.2`, which contradicted the explanation that Disparate Impact should be close to 1.0. Updated it to use `ConditionGreaterThanOrEqualTo` with a common minimum DI threshold of `0.8`, added the missing `JsonGet` import, and clarified that the condition reads a scalar summary value produced by the bias analysis step.
- The reporting example assumed metric values are always numeric. Updated it to guard against non-numeric metric values before applying numeric thresholds.

## Review Notes
The examples still use placeholder model names, endpoint names, pipeline objects, and S3 paths. They are appropriate for a tutorial, but a production implementation would need a concrete model output schema for `ModelPredictedLabelConfig` and a pipeline step that writes the scalar bias summary consumed by `JsonGet`.
