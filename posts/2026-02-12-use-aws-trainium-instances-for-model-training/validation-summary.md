# Validation Summary: How to Use AWS Trainium Instances for Model Training

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Trainium
- Amazon EC2 Trn1 and Trn1n instances
- AWS Neuron SDK
- Neuron Deep Learning AMIs
- PyTorch NeuronX / torch-neuronx
- PyTorch XLA
- Hugging Face Optimum Neuron
- AWS CLI
- EFA-based distributed training

## Sources Consulted
- AWS EC2 accelerated computing instance specifications: https://aws.amazon.com/ec2/instance-types/accelerated-computing/
- AWS Neuron Trainium architecture documentation: https://awsdocs-neuron.readthedocs-hosted.com/en/v2.28.0/about-neuron/arch/neuron-hardware/trainium.html
- AWS Neuron PyTorch DLAMI installation guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/setup/pytorch/dlami.html
- AWS Neuron framework support documentation: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/index.html
- AWS Neuron announcements for PyTorch/XLA training support changes: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/about-neuron/announcements/index.html
- AWS Neuron BERT training tutorial using torchrun and neuron_parallel_compile: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuronx/tutorials/training/bert.html
- AWS Neuron compiler CLI reference for NEURON_CC_FLAGS and auto-cast flags: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/compiler/neuronx-cc/api-reference-guide/index.html
- AWS Neuron Monitor user guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/tools/neuron-sys-tools/neuron-monitor-user-guide.html
- PyTorch/XLA API documentation: https://docs.pytorch.org/xla/release/r2.5/index.html
- Hugging Face Optimum Neuron trainer API documentation: https://huggingface.co/docs/optimum-neuron/training_api/trainer
- Hugging Face Optimum Neuron quickstart: https://huggingface.co/docs/optimum-neuron/quickstart

## Issues Found
- The launch command used a fake AMI ID. Replaced it with an AWS CLI lookup for the latest Neuron PyTorch 2.9 Ubuntu 24.04 DLAMI in the active Region.
- The block device mapping used a hard-coded root device and a 500 GB root volume. Updated the example to query the AMI root device name and use a 512 GB volume, matching AWS Neuron setup guidance.
- The SSH username and virtualenv path were outdated for the current Ubuntu Neuron DLAMI. Updated them to `ubuntu` and `/opt/aws_neuronx_venv_pytorch_2_9/bin/activate`.
- The setup verification did not check `torch_neuronx`. Added an import and version print to verify the Neuron PyTorch package.
- The main PyTorch training example referenced undefined `load_training_data()` and `num_epochs`. Added a small tokenizer-backed dataset and an environment-controlled epoch count so the snippet is syntactically complete.
- The training code used deprecated PyTorch/XLA rank helpers. Replaced `xm.xrt_world_size()` and `xm.get_ordinal()` with `torch_xla.runtime.world_size()` and `torch_xla.runtime.global_ordinal()`.
- The script always called `xmp.spawn(nprocs=32)`, which would conflict with `torchrun`. Added a `LOCAL_RANK` branch so the same script can run under either launcher.
- The examples used `XLA_USE_BF16`; AWS Neuron training examples now commonly use `XLA_DOWNCAST_BF16`. Updated the run commands.
- The Hugging Face Neuron command used `neuron_parallel_compile python3 train_hf.py`, which would not launch one worker per NeuronCore. Updated it to precompile and then run with `torchrun --nproc_per_node=32`.
- The `neuron-monitor` grep pattern used field names that do not match current JSON output. Updated it to `memory_used|neuroncore_utilization`.
- The post did not mention the May 2026 Neuron 2.30 support change for PyTorch/XLA training. Added a version caveat and pinned the XLA examples to Neuron 2.29 / PyTorch 2.9.
- The cost table presented changing prices as fixed. Renamed the column to "Example Hourly Cost" to avoid implying permanent pricing.

## Review Notes
The Trn1 and Trn1n hardware specifications were consistent with AWS EC2 and Neuron documentation. Pricing remains Region- and date-sensitive, so future reviews should re-check the cost table against AWS pricing. For new Trainium training projects after Neuron 2.30, the article should eventually be rewritten around AWS's current recommended training path instead of PyTorch/XLA.
