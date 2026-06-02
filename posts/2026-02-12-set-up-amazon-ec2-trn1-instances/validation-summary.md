# Validation Summary: How to Set Up Amazon EC2 Trn1 Instances

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon EC2 Trn1 and Trn1n instances
- AWS Trainium and NeuronCores
- AWS Neuron SDK and Neuron DLAMI
- PyTorch NeuronX, torch-xla, and torchrun
- Elastic Fabric Adapter (EFA)
- AWS CLI, Service Quotas, SSM Parameter Store, IAM, S3, CloudWatch Logs
- Linux NVMe storage, mdadm RAID 0, and XFS

## Sources Consulted
- AWS EC2 Trn1 instances product page: https://aws.amazon.com/ec2/instance-types/trn1/
- AWS EC2 accelerated computing instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
- AWS Neuron DLAMI User Guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/deploy/environments/dlami.html
- AWS Neuron PyTorch DLAMI setup guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/setup/pytorch/dlami.html
- AWS Neuron PyTorch support overview: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/about/index.html
- AWS Neuron PyTorch NeuronX programming guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuronx/programming-guide/training/pytorch-neuron-programming-guide.html
- AWS Neuron trn1.32xlarge multi-node setup guide: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuronx/setup-trn1-multi-node-execution.html
- AWS Neuron MLP training tutorial: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/docker-example/training/mlp.html
- AWS EC2 EFA launch documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-efa.html
- AWS EC2 Linux default user documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/managing-users.html
- AWS re:Post Inferentia and Trainium Service Quotas article: https://www.repost.aws/articles/ARgmEMvbR6Re200FQs8rTduA/inferentia-and-trainium-service-quotas

## Issues Found
- The opening cost claim said prices can be 30-50% lower than comparable GPU instances. Updated it to AWS's current phrasing of up to 50% cost-to-train savings.
- The Service Quotas example used quota code `L-6B0D517C`, which refers to Trn Spot requests, while the guide was checking On-Demand capacity. Replaced it with a query for the `Running On-Demand Trn instances` quota code before checking or requesting an increase.
- The AMI lookup used a broad `describe-images` name filter. Replaced it with the official Neuron DLAMI SSM public parameter for the current PyTorch Neuron Ubuntu 24.04 DLAMI.
- The networking text described EFA as needed for multi-chip communication. Corrected it to multi-node communication; intra-instance Trainium communication uses the instance interconnect rather than EFA.
- The `run-instances` example attached only one EFA interface. Updated it to attach the eight EFA devices documented for `trn1.32xlarge`, including `NetworkCardIndex` and `DeviceIndex` values.
- The placement group creation command appeared after the launch command that referenced it. Moved the placement group command before launch.
- The launch flow implied public IPv4 SSH access would be available automatically. Added the documented caveat that multi-interface launches do not automatically assign a public IPv4 address and need an Elastic IP for internet SSH access.
- The SSH user and `/data` ownership used `ec2-user`, but the selected Neuron DLAMI is Ubuntu-based. Updated both to `ubuntu`.
- The Neuron virtual environment path used the older `/opt/aws_neuron_venv_pytorch` path. Updated it to `/opt/aws_neuronx_venv_pytorch_2_9` and added a `torch_neuronx` verification import.
- The `neuron-ls` expected output used older column names. Updated it to use `neuron-ls --topology` and the current Neuron documentation's column style.
- The training loop did not explicitly mark the XLA execution step. Added `xm.mark_step()` after `xm.optimizer_step(optimizer)`.
- The multi-node section created a hostfile that was not consumed by `torchrun`. Removed that unused command and added a note that the torchrun command must be run on each node with the matching `--node_rank`.

## Review Notes
- I could not run AWS CLI command help locally because the `aws` executable is not installed in this workspace. CLI syntax was checked against AWS documentation instead.
- The IAM policy example is intentionally minimal for a sample bucket and CloudWatch Logs. A production role should scope resources and bucket prefixes to the actual training environment.
