# Validation Summary: How to Use SageMaker Ground Truth for Data Labeling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SageMaker Ground Truth
- AWS SDK for Python (Boto3)
- Amazon S3 input and output manifests
- Ground Truth private workforces and work teams
- Ground Truth worker task templates and Crowd HTML Elements
- Ground Truth automated data labeling

## Sources Consulted
- Amazon SageMaker API Reference: CreateLabelingJob: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateLabelingJob.html
- Boto3 SageMaker create_labeling_job reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/create_labeling_job.html
- Amazon SageMaker API Reference: HumanTaskConfig: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HumanTaskConfig.html
- Amazon SageMaker API Reference: AnnotationConsolidationConfig: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AnnotationConsolidationConfig.html
- Amazon SageMaker API Reference: LabelingJobAlgorithmsConfig: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_LabelingJobAlgorithmsConfig.html
- Amazon SageMaker Developer Guide: Automate data labeling: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-automated-labeling.html
- Amazon SageMaker Developer Guide: Input manifest files: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-input-data-input-manifest.html
- Amazon SageMaker Developer Guide: Labeling job output data: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-data-output.html
- Amazon SageMaker Developer Guide: Create an image classification job: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-image-classification.html
- Amazon SageMaker Crowd HTML Elements reference: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-ui-template-crowd-card.html
- Boto3 SageMaker create_workforce reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/create_workforce.html
- Boto3 SageMaker create_workteam reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/create_workteam.html

## Issues Found
- The built-in image classification `PreHumanTaskLambdaArn` and `AnnotationConsolidationLambdaArn` examples used the caller account ID. Updated them to the documented Ground Truth-owned us-east-1 Lambda account ID `432418664414`.
- The image classification worker template used `task.input.source-ref`, but the documented built-in Ground Truth image-classification template receives the object as `task.input.taskObject` and labels as `task.input.labels`. Updated the template to use those variables.
- The custom template hard-coded labels that did not match the earlier label category config. Updated it to use the label list supplied by Ground Truth and aligned the instructions with the configured categories.
- The output manifest parsing example treated `record['product-category']` as the human-readable label. Ground Truth classification output stores the label value as an index and the readable category in `product-category-metadata.class-name`; updated the parsing example accordingly.
- The automated labeling explanation implied that automated labeling labels the dataset without human involvement from the start. Updated the wording to reflect the documented active learning flow: Ground Truth first sends a sample to humans, trains and validates a model, then machine-labels high-confidence data while routing uncertain items to workers.
- The labeling job examples referenced a `my-team` work team while the private workforce example creates `image-labelers`. Updated the examples to use the same work team name.

## Review Notes
The examples use placeholder bucket names, IAM role ARNs, Cognito IDs, and S3 object paths, so they still require account-specific setup before execution. Automated data labeling is supported only for selected built-in task types and is recommended by AWS for large datasets because model training and inference require enough data to be useful.
