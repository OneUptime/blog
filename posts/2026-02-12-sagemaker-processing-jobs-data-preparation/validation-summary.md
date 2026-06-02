# Validation Summary: How to Use SageMaker Processing Jobs for Data Preparation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SageMaker Processing Jobs
- SageMaker Python SDK
- SKLearnProcessor and ScriptProcessor
- PySparkProcessor
- Amazon S3
- Amazon EventBridge
- AWS Lambda
- Amazon CloudWatch
- boto3
- Python, pandas, scikit-learn, PySpark

## Sources Consulted
- Amazon SageMaker AI Developer Guide: Data transformation workloads with SageMaker Processing: https://docs.aws.amazon.com/sagemaker/latest/dg/processing-job.html
- Amazon SageMaker AI Developer Guide: Processing input and output container paths: https://docs.aws.amazon.com/sagemaker/latest/dg/byoc-input-and-output.html
- SageMaker Python SDK processing API reference: https://sagemaker.readthedocs.io/en/stable/api/training/processing.html
- SageMaker Python SDK Processing guide: https://sagemaker.readthedocs.io/en/v2.214.3/amazon_sagemaker_processing.html
- Amazon SageMaker AI Developer Guide: Scikit-learn supported versions: https://docs.aws.amazon.com/sagemaker/latest/dg/sklearn.html
- Amazon SageMaker AI prebuilt image support policy: https://docs.aws.amazon.com/sagemaker/latest/dg/pre-built-containers-support-policy.html
- Amazon SageMaker AI Developer Guide: Run a Processing Job with Apache Spark: https://docs.aws.amazon.com/sagemaker/latest/dg/use-spark-processing-container.html
- Amazon SageMaker AI Developer Guide: Managed Spot Training: https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html
- AWS CLI Command Reference: list-processing-jobs: https://docs.aws.amazon.com/cli/latest/reference/sagemaker/list-processing-jobs.html

## Issues Found
- The basic scikit-learn Processing Job used `framework_version='1.2-1'`. AWS still lists it as supported, but the prebuilt image support policy shows its patch support ended on 2025-03-06. Updated the example to `framework_version='1.4-2'`, the current patched Scikit-learn image version listed by AWS.
- The evaluation example passed `model.tar.gz` into `/opt/ml/processing/model` but attempted to load `/opt/ml/processing/model/model.joblib` directly. SageMaker Processing downloads S3 inputs to the processing path; it does not automatically unpack arbitrary model archives. Added `tarfile` extraction before loading `model.joblib`.
- The cost tips claimed SageMaker Pipelines can provide Spot-like savings for Processing Jobs. AWS documents managed Spot for SageMaker Training Jobs, not Processing Jobs, and Pipelines orchestrates underlying jobs rather than changing Processing Job capacity type. Changed the tip to say managed Spot applies to training jobs.

## Review Notes
- The ProcessingInput and ProcessingOutput paths correctly use `/opt/ml/processing/`, which matches SageMaker Processing container requirements.
- The `SKLearnProcessor`, `ScriptProcessor`, `PySparkProcessor.run`, `spark_event_logs_s3_uri`, and `list_processing_jobs` API usage matches the SageMaker Python SDK and AWS CLI/API documentation reviewed.
- The preprocessing example performs imputation and scaling before splitting train, validation, and test data. That is executable, but future revisions could avoid data leakage by fitting preprocessing transforms on the training split and applying them to validation and test splits.
