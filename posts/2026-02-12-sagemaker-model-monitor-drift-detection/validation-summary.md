# Validation Summary: How to Use SageMaker Model Monitor for Drift Detection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SageMaker Model Monitor
- SageMaker Python SDK
- SageMaker real-time endpoints and data capture
- Model quality monitoring and ground truth labels
- Amazon S3
- Amazon CloudWatch metrics and alarms
- Python and boto3

## Sources Consulted
- AWS SageMaker Developer Guide: Data and model quality monitoring with Amazon SageMaker Model Monitor, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html
- AWS SageMaker Developer Guide: Capture data from real-time endpoint, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-data-capture-endpoint.html
- SageMaker Python SDK Model Monitor API reference, https://sagemaker.readthedocs.io/en/stable/api/inference/model_monitor.html
- AWS SageMaker Developer Guide: Create a model quality baseline, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality-baseline.html
- AWS SageMaker Developer Guide: Schedule data quality monitoring jobs, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-schedule-data-monitor.html
- AWS SageMaker Developer Guide: Schedule model quality monitoring jobs, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality-schedule.html
- AWS SageMaker Developer Guide: Ingest Ground Truth labels and merge them with predictions, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality-merge.html
- AWS SageMaker Developer Guide: Schema for Statistics, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-interpreting-statistics.html
- AWS SageMaker Developer Guide: CloudWatch Metrics for Model Monitor, https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-interpreting-cloudwatch.html
- Boto3 SageMaker update_monitoring_schedule reference, https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/update_monitoring_schedule.html

## Issues Found
- The SageMaker Python SDK `DataCaptureConfig` example used `Input` and `Output` for `capture_options`. The SDK expects `REQUEST` and `RESPONSE`, so the example was corrected.
- The post implied Model Monitor directly catches concept drift. This was narrowed to say model quality monitoring can surface concept drift after ground truth labels are provided.
- The model quality baseline ran asynchronously by default, then the next snippet used generated constraints. Added `wait=True` so the constraints are available before scheduling.
- The model quality schedule omitted practical endpoint attributes, delayed-label offsets, and `enable_cloudwatch_metrics=True`. Added these so the example matches the documented model quality monitoring workflow.
- The ground truth comment said records match by `inference_id`, but the JSON shown used `eventId`. Updated the wording to reflect SageMaker's documented `eventId` or caller-supplied `inferenceId` matching behavior.
- The monitoring execution inspection used non-documented attributes. Updated it to use `execution.job_name` and `execution.describe()['ProcessingJobStatus']`, matching SageMaker SDK examples.
- The CloudWatch alarm used a nonexistent aggregate metric name, the wrong namespace, and wrong dimension names. Replaced it with a feature-level `feature_baseline_drift_transaction_amount` alarm using `/aws/sagemaker/Endpoints/data-metric`, `EndpointName`, and `ScheduleName`.
- The baseline update example passed a `schedule_name` parameter that is not part of `DefaultModelMonitor.update_monitoring_schedule()`. Replaced it with `endpoint_input`, while keeping the updated statistics and constraints arguments.

## Review Notes
The examples remain illustrative and still require real S3 paths, a deployed model artifact, IAM permissions, endpoint outputs that match the chosen inference/probability attributes, and an SNS topic ARN in the correct AWS account and Region.
