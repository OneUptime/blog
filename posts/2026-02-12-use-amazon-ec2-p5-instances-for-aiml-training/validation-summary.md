# Validation Summary: How to Use Amazon EC2 P5 Instances for AI/ML Training

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EC2 P5 instances
- NVIDIA H100 GPUs
- Elastic Fabric Adapter (EFA)
- EC2 Capacity Blocks
- AWS CLI
- AWS Deep Learning AMIs
- PyTorch DistributedDataParallel and torchrun
- NVIDIA Transformer Engine
- FlashAttention
- Linux mdadm RAID 0
- Amazon S3 CLI

## Sources Consulted
- Amazon EC2 accelerated computing instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
- Amazon EC2 P5 instance type page: https://aws.amazon.com/ec2/instance-types/p5/
- Amazon EC2 instance type quotas: https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-quotas.html
- Amazon EC2 service quotas: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html
- Amazon EC2 Capacity Blocks overview and behavior: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-blocks.html
- Amazon EC2 Capacity Blocks purchase workflow and CLI examples: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-blocks-purchase.html
- Amazon EC2 Capacity Reservations documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-create.html
- Amazon EC2 EFA launch documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-efa.html
- Amazon EC2 multiple network card and EFA guidance for P5: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-acc-inst-types.html
- AWS Deep Learning AMI features: https://docs.aws.amazon.com/dlami/latest/devguide/features.html
- PyTorch DistributedDataParallel documentation: https://docs.pytorch.org/docs/stable/generated/torch.nn.parallel.DistributedDataParallel.html
- PyTorch torchrun documentation: https://docs.pytorch.org/docs/stable/elastic/run.html
- NVIDIA Transformer Engine PyTorch API documentation: https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/api/pytorch.html
- FlashAttention package documentation: https://pypi.org/project/flash-attn/

## Issues Found
- The post described P5 as the most powerful GPU instance family and the current peak of cloud GPU compute. This is outdated because AWS now lists newer P5e, P5en, and P6 instance families. Reworded those claims to position P5 as a high-end GPU option without overstating current AWS offerings.
- The quota increase comment said to request 192 vCPUs for one instance, but the command requested 768 vCPUs. Updated the comment to match four `p5.48xlarge` instances.
- The capacity example used `create-capacity-reservation` with future-dated P5 capacity. AWS documents future-dated Capacity Reservations only for C, G, I, M, R, and T series, while P5 short-term reservations use Capacity Blocks. Replaced the example with `describe-capacity-block-offerings` and `purchase-capacity-block`.
- The original Capacity Block date example was already in the past as of the validation date. Updated the example date range to July 2026.
- The launch command used `--count 4` with one explicit EFA network interface specification. Updated it to launch one instance per command and clarified that users should repeat per node or use a launch template.
- The EFA network interface example omitted `NetworkCardIndex`. Added `NetworkCardIndex: 0`, matching AWS EFA launch guidance.
- The Transformer Engine examples used `fp8_autocast`, which is superseded by the current `autocast` context manager in NVIDIA Transformer Engine documentation. Updated imports and context-manager usage.
- The Transformer Engine block example referenced `torch.nn.Module` without importing `torch`, and combined low-level attention/MLP modules in a way that was less aligned with current Transformer Engine examples. Added the missing import and switched the snippet to `te.TransformerLayer` under `autocast()`.

## Review Notes
The post is now technically consistent with current AWS and NVIDIA/PyTorch documentation. The P5 networking example enables EFA, but production jobs that need the full 3,200 Gbps P5 network bandwidth should follow AWS's detailed multi-network-card EFA-only configuration or use a launch template, AWS Batch, ParallelCluster, or SageMaker-managed configuration.
