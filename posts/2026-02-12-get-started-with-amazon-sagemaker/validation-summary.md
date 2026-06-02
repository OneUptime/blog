# Validation Summary: How to Get Started with Amazon SageMaker

## Status
validated

## Post Type
Tutorial / beginner guide

## Technologies Covered
- Amazon SageMaker AI
- SageMaker Studio and notebook instances
- SageMaker training jobs and endpoints
- SageMaker Python SDK
- SageMaker built-in XGBoost
- SageMaker Scikit-learn estimator
- SageMaker Serverless Inference
- SageMaker Managed Spot Training
- AWS CLI
- IAM
- Amazon S3
- Python, pandas, scikit-learn, joblib

## Sources Consulted
- Amazon SageMaker AI XGBoost documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost-how-to-use.html
- Amazon SageMaker AI prebuilt container support policy: https://docs.aws.amazon.com/sagemaker/latest/dg/pre-built-containers-support-policy.html
- Amazon SageMaker AI Scikit-learn documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/sklearn.html
- SageMaker Python SDK Model.deploy API documentation: https://sagemaker.readthedocs.io/en/stable/api/inference/model.html
- SageMaker Python SDK Session utilities documentation: https://sagemaker.readthedocs.io/en/stable/api/utility/session.html
- Amazon SageMaker AI Serverless Inference documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html
- Amazon SageMaker AI Managed Spot Training documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html
- AWS CLI create-notebook-instance-lifecycle-config documentation: https://docs.aws.amazon.com/cli/latest/reference/sagemaker/create-notebook-instance-lifecycle-config.html
- AWS samples auto-stop idle lifecycle configuration: https://github.com/aws-samples/amazon-sagemaker-notebook-instance-lifecycle-config-samples/tree/master/scripts/auto-stop-idle

## Issues Found
- The XGBoost image version was `1.7-1`, whose patch support ended on 2025-03-06. Updated the example to `3.0-5`, the current supported XGBoost container version listed by AWS.
- The Scikit-learn estimator used `framework_version='1.2-1'`, whose patch support ended on 2025-03-06. Updated it to `1.4-2`, the current supported Scikit-learn container version listed by AWS.
- The notebook auto-stop lifecycle configuration used empty `Content` values, which would create no useful auto-stop behavior and also did not provide base64-encoded script content as required by the AWS CLI option. Replaced it with a command that downloads AWS's auto-stop-idle sample and passes base64-encoded script content to `--on-start`.
- The serverless inference example called `model.deploy(...)`, but no `model` variable exists in the walkthrough. Changed it to `xgb.deploy(...)`, matching the trained estimator used earlier.
- The notebook pricing statement was too absolute because SageMaker prices vary by region. Reworded it to say the `ml.t3.medium` price is approximate and region-dependent.

## Review Notes
The IAM examples use broad AWS managed policies for a beginner walkthrough. They are valid, but production usage should generally replace them with least-privilege permissions scoped to the relevant S3 buckets and SageMaker actions.
