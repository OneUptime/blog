# Validation Summary: How to Use SageMaker Real-Time vs Batch vs Async Inference

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon SageMaker AI real-time inference
- Amazon SageMaker AI batch transform
- Amazon SageMaker AI asynchronous inference
- Amazon SageMaker AI serverless inference
- SageMaker Python SDK
- Boto3 SageMaker Runtime and Application Auto Scaling clients
- Amazon S3 and Amazon SNS integration for async inference

## Sources Consulted
- AWS SageMaker AI inference options: https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model-options.html
- AWS SageMaker AI real-time InvokeEndpoint API: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_runtime_InvokeEndpoint.html
- AWS SageMaker AI model hosting FAQs: https://docs.aws.amazon.com/sagemaker/latest/dg/hosting-faqs.html
- AWS SageMaker AI batch transform guide: https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html
- AWS SageMaker AI asynchronous inference guide: https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference.html
- AWS SageMaker AI async endpoint autoscaling guide: https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference-autoscale.html
- AWS SageMaker AI serverless endpoint guide: https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html
- AWS SageMaker AI serverless endpoint invocation guide: https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints-invoke.html
- SageMaker Python SDK Model.deploy API: https://sagemaker.readthedocs.io/en/stable/api/inference/model.html
- SageMaker Python SDK Transformer API: https://sagemaker.readthedocs.io/en/stable/api/inference/transformer.html
- AWS SageMaker XGBoost built-in algorithm guide: https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost-how-to-use.html

## Issues Found
- The comparison table listed real-time inference max payload as 6 MB. AWS documentation now lists real-time payload support up to 25 MB for regular responses, so the table was updated.
- The comparison table and decision flow listed serverless payload support as 6 MB. AWS documentation lists serverless request and response payloads as 4 MB, so both were updated.
- The batch transform row said max payload was unlimited because input is in S3. Batch transform can process GB-scale S3 datasets, but mini-batch payloads are constrained by `MaxPayloadInMB`, which must not exceed 100 MB. The table was updated to reflect both points.
- The serverless cost model was described as per-request. AWS describes serverless inference pricing as pay-per-use based on compute duration and data processed, so the table and serverless section were corrected.
- The batch transform caveat referenced a minimum job duration. AWS documents billing between transform start and end time; the more accurate caveat is startup overhead for very small datasets, so the wording was changed.
- The asynchronous inference explanation said the caller gets a token. The InvokeEndpointAsync response contains an inference ID and output location, so the wording was corrected.
- The cost comparison comment for serverless was clarified to state that the example estimates compute duration only and omits data processing charges.

## Review Notes
The async autoscaling example uses the standard `ApproximateBacklogSizePerInstance` target-tracking metric. AWS also documents an optional `HasBacklogWithoutCapacity` step-scaling policy for faster scale-up from zero when the queue has requests but no instances; that could be added in a future deeper autoscaling article.
