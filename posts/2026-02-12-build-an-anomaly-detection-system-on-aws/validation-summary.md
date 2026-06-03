# Validation Summary: How to Build an Anomaly Detection System on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS CloudWatch Anomaly Detection
- Amazon SageMaker Random Cut Forest
- Amazon SageMaker real-time endpoints
- AWS Lambda
- Amazon Kinesis Data Streams
- Amazon SNS
- Amazon DynamoDB
- Python, boto3, SageMaker Python SDK

## Sources Consulted
- Amazon CloudWatch `PutAnomalyDetector` boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_anomaly_detector.html
- Amazon CloudWatch `PutMetricAlarm` API documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- Amazon SageMaker Random Cut Forest documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/randomcutforest.html
- Amazon SageMaker RCF response formats: https://docs.aws.amazon.com/sagemaker/latest/dg/rcf-in-formats.html
- SageMaker Python SDK RandomCutForest documentation: https://sagemaker.readthedocs.io/en/v2.207.0/algorithms/unsupervised/randomcutforest.html
- Amazon SageMaker Runtime `InvokeEndpoint` boto3/botocore documentation: https://docs.aws.amazon.com/botocore/latest/reference/services/sagemaker-runtime/client/invoke_endpoint.html
- AWS Lambda with Kinesis Data Streams documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda Kinesis Python example: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-example.html
- Amazon CloudWatch `PutMetricData` boto3 documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/put_metric_data.html
- Amazon SNS `Publish` boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/publish.html
- AWS announcement for transitioning off Amazon Lookout for Metrics: https://aws.amazon.com/blogs/machine-learning/transitioning-off-amazon-lookout-for-metrics/

## Issues Found
- The post listed Amazon Lookout for Metrics as an available managed option. AWS ended support for Lookout for Metrics on October 10, 2025, so this was outdated for a 2026 post. Replaced that bullet with Amazon OpenSearch Service anomaly detection.
- The CloudWatch alarm example used a 9-digit placeholder account ID in an SNS topic ARN. AWS account IDs are 12 digits, so the placeholder was changed to `123456789012`.
- The Lambda SageMaker Runtime example parsed the inference response as JSON without explicitly requesting JSON output. RCF supports JSON responses when `Accept` is `application/json`, so the `invoke_endpoint` call now sets `Accept='application/json'` and sends the CSV body as UTF-8 bytes.

## Review Notes
The SageMaker examples are syntactically valid but assume they are run from a SageMaker environment where `sagemaker.get_execution_role()` is available. For local execution, readers would need to provide an IAM role ARN explicitly.
