# Validation Summary: How to Use AWS Inferentia Instances for ML Inference

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Inferentia and EC2 Inf1 instances
- AWS Neuron SDK
- PyTorch Neuron (`torch_neuron`)
- Hugging Face Transformers
- FastAPI
- Amazon SageMaker and SageMaker Neo
- AWS CLI

## Sources Consulted
- AWS EC2 Inf1 Instances: https://aws.amazon.com/ec2/instance-types/inf1/
- AWS Neuron PyTorch-Neuron trace Python API: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuron/api-compilation-python-api.html
- AWS Neuron PyTorch-Neuron core placement guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuron/guides/core-placement/torch-core-placement.html
- AWS Neuron Data Parallel Inference on Torch Neuron: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/about-neuron/appnotes/torch-neuron/torch-neuron-dataparallel-app-note.html
- AWS Neuron PyTorch overview: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/about/index.html
- AWS Neuron DLAMI / SSM parameter guidance: https://aws.amazon.com/blogs/machine-learning/get-started-quickly-with-aws-trainium-and-aws-inferentia-using-aws-neuron-dlami-and-aws-neuron-dlc/
- AWS Deep Learning AMI PyTorch-Neuron tutorial: https://docs.aws.amazon.com/dlami/latest/devguide/tutorial-inferentia-pytorch-neuron.html
- Amazon SageMaker Neo deployment hosting docs: https://docs.aws.amazon.com/sagemaker/latest/dg/neo-deployment-hosting-services.html
- Amazon SageMaker SDK deployment for compiled models: https://docs.aws.amazon.com/sagemaker/latest/dg/neo-deployment-hosting-services-sdk.html

## Issues Found
- The launch command used a fake static AMI ID. Changed it to an AWS SSM Parameter Store AMI reference for a Neuron PyTorch DLAMI, which is the documented way to avoid region-specific stale AMI IDs.
- The setup section used an unverified virtualenv path. Changed it to the documented PyTorch-Neuron conda environment activation command for the Inf1 DLAMI tutorial.
- The Hugging Face compile example traced the raw `AutoModelForSequenceClassification`, whose default output object is not a clean TorchScript tensor output for the later examples. Wrapped the model so the traced module returns logits directly.
- The batch inference example used larger batch sizes even though the trace example compiled only a batch-1 shape. Added `dynamic_batch_size=True` to the trace call and updated inference code to consume tensor logits directly.
- The FastAPI multi-core example referenced an undefined `tokenizer` and accepted `text` as a query parameter rather than a JSON body. Added tokenizer initialization and a Pydantic request model.
- The SageMaker section implied a generic PyTorchModel deployment of a local Neuron-compiled artifact. Updated it to describe a SageMaker Neo-compiled artifact, target-family matching, `source_dir`, and inference image URI placeholders, matching SageMaker's compiled-model deployment guidance.
- The post described Inf1 as a generally current choice. Updated the wording to identify Inf1 as a legacy platform and recommend checking current Neuron SDK support for new deployments.

## Review Notes
Inf1 instance sizing and the high-level throughput/cost claims match AWS's Inf1 product documentation. The examples remain illustrative; readers still need to choose region-appropriate DLAMI parameters, framework versions, Neo image URIs, and supported model/operator combinations for their deployment.
