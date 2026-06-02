# Validation Summary: How to Reduce SageMaker Training Costs with Spot Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SageMaker AI managed spot training
- SageMaker Python SDK estimators
- SageMaker built-in XGBoost algorithm
- PyTorch training on SageMaker
- Boto3 SageMaker APIs
- Amazon S3 checkpoint storage
- SageMaker distributed PyTorch training

## Sources Consulted
- Amazon SageMaker AI Developer Guide: Managed Spot Training in Amazon SageMaker AI - https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html
- Amazon SageMaker AI Developer Guide: Checkpoints in Amazon SageMaker AI - https://docs.aws.amazon.com/sagemaker/latest/dg/model-checkpoints.html
- Amazon SageMaker AI Developer Guide: Enable checkpointing - https://docs.aws.amazon.com/sagemaker/latest/dg/model-checkpoints-enable.html
- Boto3 SageMaker API Reference: describe_training_job - https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/describe_training_job.html
- SageMaker Python SDK documentation: Estimators - https://sagemaker.readthedocs.io/en/stable/api/training/estimators.html
- SageMaker Python SDK documentation: PyTorch estimator - https://sagemaker.readthedocs.io/en/stable/frameworks/pytorch/sagemaker.pytorch.html
- Amazon SageMaker AI Developer Guide: PyTorch distributed estimator options - https://docs.aws.amazon.com/sagemaker/latest/dg/data-parallel-framework-estimator.html
- AWS SageMaker AI pricing - https://aws.amazon.com/sagemaker/ai/pricing/

## Issues Found
- The post said `max_wait` must be greater than `max_run`. The SageMaker API documentation states `MaxWaitTimeInSeconds` must be equal to or greater than `MaxRuntimeInSeconds`, so the wording was corrected.
- The custom PyTorch training script called `load_data()` without defining it. Added a minimal CSV loader that reads files from the SageMaker training channel, builds a `TensorDataset`, and returns a `DataLoader`.
- The PyTorch example used a GPU instance but did not move the model or batches to GPU. Added device selection, moved the model and tensors to the device, and used `map_location` when loading checkpoints.
- The cost estimation example multiplied `BillableTimeInSeconds` by a separate spot hourly price. AWS documents `BillableTimeInSeconds` as the field used directly for managed spot savings, so the estimate was changed to apply the on-demand hourly rate to the managed spot billable time.

## Review Notes
The XGBoost example uses a supported SageMaker XGBoost image version and matches the documented built-in algorithm checkpointing support for XGBoost 0.90-1 or later. The PyTorch distributed `torch_distributed` configuration matches current SageMaker documentation. Pricing figures are region-dependent and should remain approximate.
