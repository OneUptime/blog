# How to Use Amazon EC2 P5 Instances for AI/ML Training

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, P5, GPU, Machine Learning, Deep Learning, NVIDIA H100, AI Training

Description: A practical guide to using Amazon EC2 P5 instances powered by NVIDIA H100 GPUs for large-scale AI and machine learning model training on AWS.

---

Amazon EC2 P5 instances are one of the highest-performance GPU instance families available on AWS. Each P5 instance packs 8 NVIDIA H100 Tensor Core GPUs with 80GB of HBM3 memory each, connected by NVSwitch for 900 GB/s GPU-to-GPU bandwidth. Add 3200 Gbps of EFA networking for multi-node training, and you have a platform capable of training the largest foundation models.

This guide covers how to get P5 instances running, configure them for training, and make the most of the hardware.

## P5 Instance Specifications

| Specification | p5.48xlarge |
|---|---|
| GPUs | 8x NVIDIA H100 80GB |
| GPU Memory | 640 GB HBM3 total |
| vCPUs | 192 |
| System Memory | 2 TB DDR5 |
| Local Storage | 8x 3.84 TB NVMe SSD |
| Network | 3200 Gbps EFA |
| GPU Interconnect | NVSwitch (900 GB/s) |

For comparison, the previous generation p4d.24xlarge has 8x A100 40GB GPUs. The H100 delivers roughly 3x the training performance of the A100 for transformer models thanks to the new Transformer Engine and FP8 support.

## Step 1: Request Capacity

P5 instances are in high demand. You will likely need to request a service quota increase.

```bash
# Check your current P5 quota

aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-417A185B \
  --query 'Quota.Value'

# Request an increase if needed (request 768 vCPUs for four p5.48xlarge instances)
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-417A185B \
  --desired-value 768
```

For guaranteed short-term access, consider purchasing a Capacity Block.

```bash
# Find available P5 Capacity Block offerings
aws ec2 describe-capacity-block-offerings \
  --instance-type p5.48xlarge \
  --instance-count 4 \
  --start-date-range 2026-07-01T00:00:00Z \
  --end-date-range 2026-07-15T00:00:00Z \
  --capacity-duration-hours 48 \
  --all-availability-zones

# Purchase a Capacity Block using an offering ID from the previous command
aws ec2 purchase-capacity-block \
  --capacity-block-offering-id cb-0123456789abcdefg \
  --instance-platform Linux/UNIX
```

## Step 2: Launch P5 Instances

```bash
# Launch one P5 instance with EFA networking; repeat per node or use a launch template
aws ec2 run-instances \
  --image-id ami-0abc123-deep-learning \
  --instance-type p5.48xlarge \
  --count 1 \
  --key-name my-ml-key \
  --placement "GroupName=ml-training-pg" \
  --network-interfaces '[
    {
      "NetworkCardIndex": 0,
      "DeviceIndex": 0,
      "SubnetId": "subnet-0abc123",
      "Groups": ["sg-0abc123"],
      "InterfaceType": "efa"
    }
  ]' \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/xvda",
      "Ebs": {"VolumeSize": 200, "VolumeType": "gp3"}
    }
  ]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=p5-training-node}]'
```

Use the AWS Deep Learning AMI, which comes with NVIDIA drivers, CUDA, cuDNN, NCCL, EFA drivers, and popular ML frameworks pre-installed.

## Step 3: Verify GPU Setup

SSH into the instance and verify everything is working.

```bash
# Check NVIDIA drivers and GPU status
nvidia-smi

# Expected output shows 8x H100 GPUs with 80GB each
# Check NVLink topology
nvidia-smi topo -m

# Check CUDA version
nvcc --version

# Verify EFA is available
fi_info -p efa

# Run a quick GPU benchmark
python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'GPU count: {torch.cuda.device_count()}')
for i in range(torch.cuda.device_count()):
    print(f'  GPU {i}: {torch.cuda.get_device_name(i)}')
    print(f'    Memory: {torch.cuda.get_device_properties(i).total_mem / 1e9:.1f} GB')
"
```

## Step 4: Configure Multi-GPU Training

For single-node training across 8 H100 GPUs, use PyTorch's DistributedDataParallel or FSDP.

```python
# train_single_node.py
import os
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, DistributedSampler

def setup_distributed():
    """Initialize distributed training on a single node with 8 GPUs"""
    dist.init_process_group(backend='nccl')
    local_rank = int(os.environ['LOCAL_RANK'])
    torch.cuda.set_device(local_rank)
    return local_rank

def main():
    local_rank = setup_distributed()
    device = torch.device(f'cuda:{local_rank}')

    # Create model and move to GPU
    model = create_large_model()
    model = model.to(device)

    # Wrap with DDP for multi-GPU training
    model = DDP(model, device_ids=[local_rank])

    # Use FP8 training for H100 Transformer Engine
    # This leverages the H100's dedicated FP8 hardware
    from transformer_engine.pytorch import autocast

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    train_loader = create_distributed_dataloader()

    for epoch in range(num_epochs):
        for batch in train_loader:
            batch = {k: v.to(device) for k, v in batch.items()}

            with autocast():
                outputs = model(**batch)
                loss = outputs.loss

            loss.backward()
            optimizer.step()
            optimizer.zero_grad()

            if local_rank == 0:
                print(f'Loss: {loss.item():.4f}')

if __name__ == '__main__':
    main()
```

Launch with torchrun:

```bash
# Run on all 8 GPUs on a single node
torchrun --nproc_per_node=8 train_single_node.py
```

## Step 5: Multi-Node Training

For models that need more than 8 GPUs, run across multiple P5 instances.

```python
# train_multi_node.py
import os
import torch
import torch.distributed as dist

def setup_multi_node():
    """Initialize distributed training across multiple nodes"""
    dist.init_process_group(
        backend='nccl',
        init_method='env://'
    )
    local_rank = int(os.environ['LOCAL_RANK'])
    global_rank = int(os.environ['RANK'])
    world_size = int(os.environ['WORLD_SIZE'])

    torch.cuda.set_device(local_rank)

    print(f"Node {global_rank}/{world_size}, Local GPU {local_rank}")
    return local_rank, global_rank, world_size
```

Launch across 4 nodes (32 GPUs total):

```bash
# On node 0 (master)
torchrun \
  --nproc_per_node=8 \
  --nnodes=4 \
  --node_rank=0 \
  --master_addr=10.0.1.10 \
  --master_port=29500 \
  train_multi_node.py

# On node 1
torchrun \
  --nproc_per_node=8 \
  --nnodes=4 \
  --node_rank=1 \
  --master_addr=10.0.1.10 \
  --master_port=29500 \
  train_multi_node.py

# Repeat for nodes 2 and 3 with appropriate node_rank
```

For managing multi-node training, consider using AWS Batch multi-node parallel jobs. See our guide on [setting up AWS Batch multi-node parallel jobs](https://oneuptime.com/blog/post/2026-02-12-set-up-aws-batch-multi-node-parallel-jobs/view).

## Step 6: Optimize for H100

The H100 has hardware features that older GPUs lack. Use them.

### FP8 Training with Transformer Engine

```python
# Install NVIDIA Transformer Engine
# pip install transformer-engine

import torch
import transformer_engine.pytorch as te
from transformer_engine.pytorch import autocast

# Replace standard Linear layers with TE versions
# These automatically use FP8 when enabled
class TransformerBlock(torch.nn.Module):
    def __init__(self, hidden_size, num_heads):
        super().__init__()
        self.layer = te.TransformerLayer(
            hidden_size=hidden_size,
            ffn_hidden_size=hidden_size * 4,
            num_attention_heads=num_heads
        )

    def forward(self, x):
        with autocast():
            return self.layer(x)
```

FP8 training on H100 can provide up to 2x speedup over FP16 with minimal accuracy impact.

### Flash Attention

```python
# Use Flash Attention 2 for efficient attention computation
# pip install flash-attn

from flash_attn import flash_attn_func

# In your attention forward pass
output = flash_attn_func(
    query, key, value,
    dropout_p=0.0 if not training else 0.1,
    causal=True
)
```

## Step 7: Use Local NVMe Storage

P5 instances come with 8x 3.84 TB NVMe SSDs. Use them for training data staging.

```bash
# Set up RAID 0 across all NVMe drives for maximum throughput
sudo mdadm --create /dev/md0 --level=0 --raid-devices=8 \
  /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1 /dev/nvme4n1 \
  /dev/nvme5n1 /dev/nvme6n1 /dev/nvme7n1 /dev/nvme8n1

sudo mkfs.xfs /dev/md0
sudo mkdir /data
sudo mount /dev/md0 /data

# This gives you ~30 TB of fast local storage
# Use it to stage training data from S3
aws s3 sync s3://training-data/dataset/ /data/dataset/ --only-show-errors
```

The RAID 0 array delivers aggregate throughput of ~24 GB/s, which is fast enough to keep the GPUs fed with data.

## Cost Considerations

P5 instances are expensive: around $98/hour for a p5.48xlarge On-Demand. Here are ways to manage costs:

- **Capacity Blocks** - Reserve P5 capacity at a predictable price for defined time periods
- **Spot Instances** - Available for P5 at significant discounts, but capacity is limited. Use checkpointing. See [using Batch with Spot Instances](https://oneuptime.com/blog/post/2026-02-12-use-aws-batch-with-spot-instances-for-cost-savings/view).
- **Use mixed precision** - FP8/BF16 training runs faster, meaning you need fewer GPU-hours
- **Right-size your model** - Not every model needs 32 H100s. Start small and scale up only when needed.

## Wrapping Up

EC2 P5 instances with NVIDIA H100 GPUs represent a high-end cloud GPU compute option. The combination of FP8 hardware, 80GB HBM3 per GPU, NVSwitch interconnect, and 3200 Gbps EFA networking makes them suitable for training even the largest language models and generative AI systems. The key to getting the most out of them is using the H100-specific features: FP8 via Transformer Engine, Flash Attention, and NCCL over EFA for multi-node scaling. Plan your capacity ahead, because these instances are in high demand.
