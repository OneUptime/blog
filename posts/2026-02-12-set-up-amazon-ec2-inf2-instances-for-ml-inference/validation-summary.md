# Validation Summary: How to Set Up Amazon EC2 Inf2 Instances for ML Inference

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon EC2 Inf2 instances
- AWS Inferentia2
- AWS Neuron SDK
- PyTorch NeuronX (`torch-neuronx`)
- Neuron compiler (`neuronx-cc`)
- Hugging Face Transformers
- Transformers NeuronX (`transformers-neuronx`)
- FastAPI
- AWS CLI

## Sources Consulted
- AWS EC2 Inf2 instance type documentation: https://aws.amazon.com/ec2/instance-types/inf2/
- Amazon EC2 accelerated computing instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
- AWS Neuron PyTorch DLAMI setup: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/setup/pytorch/dlami.html
- AWS Neuron PyTorch manual installation guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/setup/pytorch/manual.html
- AWS Neuron PyTorch NeuronX tracing API: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuronx/api-reference-guide/inference/api-torch-neuronx-trace.html
- AWS Neuron BERT inference tutorial for Trn1/Inf2: https://awsdocs-neuron.readthedocs-hosted.com/en/v2.26.0/src/examples/pytorch/torch-neuronx/bert-base-cased-finetuned-mrpc-inference-on-trn1-tutorial.html
- AWS Neuron compiler CLI reference: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/compiler/neuronx-cc/api-reference-guide/index.html
- AWS Neuron Transformers NeuronX setup: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/archive/transformers-neuronx/setup/index.html
- AWS Neuron Transformers NeuronX developer guide: https://awsdocs-neuron.readthedocs-hosted.com/en/v2.25.0/libraries/transformers-neuronx/transformers-neuronx-developer-guide.html
- Hugging Face Transformers sequence classification APIs and model usage: https://huggingface.co/docs/transformers/index

## Issues Found
- The opening performance claim incorrectly compared the "up to 4x higher throughput" and "up to 10x" metric to GPU instances. Updated it to AWS's documented comparison against first-generation Inf1 instances.
- The launch command used a fake AMI ID. Replaced it with an AWS CLI `describe-images` lookup for the latest Neuron PyTorch 2.9 Ubuntu 24.04 DLAMI.
- The SSH example used `ec2-user` while the current Neuron PyTorch DLAMI is Ubuntu-based. Updated the example to use `ubuntu` and noted the Amazon Linux username variant.
- The manual install commands used older Amazon Linux/YUM-style setup and omitted current runtime packages. Updated the snippet to the current Ubuntu 24.04 Neuron repository, driver, runtime, tools, Python 3.12 venv, and pip repository setup.
- The PyTorch NeuronX pip install command omitted the AWS Neuron pip index and version constraints. Updated it to use `https://pip.repos.neuron.amazonaws.com` and current `torch-neuronx==2.9.*` / `neuronx-cc==2.*` packages.
- The BERT example loaded `bert-base-uncased` with a randomly initialized classification head, so the Positive/Negative predictions would not be meaningful. Changed it to a fine-tuned BERT sentiment checkpoint.
- The BERT trace and inference examples omitted `token_type_ids`, while AWS's BERT Neuron examples trace BERT with input IDs, attention masks, and token type IDs. Added `token_type_ids` to compile, warmup, inference, and serving calls.
- The compiler flag explanation used an invalid shorthand, `--auto-cast bf16`. Updated it to the actual `--auto-cast all --auto-cast-type bf16` flags and noted the accuracy validation tradeoff.
- Added the missing `transformers-neuronx` installation command before the LLaMA example.
- Softened absolute price-performance and fallback claims so they reflect workload-dependent benchmarking and avoid recommending first-generation Inferentia as a general fallback for Inf2 compilation failures.

## Review Notes
The cost comparison table remains illustrative because throughput varies by model, sequence length, batch size, concurrency, region, and software version. Future updates should benchmark the exact model and serving stack used in production.
