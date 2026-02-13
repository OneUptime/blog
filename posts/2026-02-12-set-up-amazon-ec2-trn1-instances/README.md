# How to Set Up Amazon EC2 Trn1 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Trn1, Trainium, Machine Learning, Deep Learning, Cloud Computing

Description: A practical guide to launching and configuring Amazon EC2 Trn1 instances powered by AWS Trainium chips for deep learning model training.

---

Amazon EC2 Trn1 instances are built on AWS Trainium, a custom chip designed for deep learning training. They offer a cost-effective alternative to GPU-based training instances, with prices that can be 30-50% lower than comparable GPU instances. Setting up Trn1 instances correctly requires some specific steps that differ from the typical GPU instance workflow.

This guide walks through the complete setup process, from instance launch to running your first training workload.

## Trn1 Instance Family

| Instance | Trainium Chips | NeuronCores | vCPUs | Memory | Network | Local Storage |
|---|---|---|---|---|---|---|
| trn1.2xlarge | 1 | 2 | 8 | 32 GB | Up to 12.5 Gbps | 1x 500 GB NVMe |
| trn1.32xlarge | 16 | 32 | 128 | 512 GB | 800 Gbps EFA | 4x 2 TB NVMe |
| trn1n.32xlarge | 16 | 32 | 128 | 512 GB | 1600 Gbps EFA | 4x 2 TB NVMe |

The trn1.2xlarge is good for development, testing, and training smaller models. The trn1.32xlarge and trn1n.32xlarge are for production training workloads where you need all 16 Trainium chips working together.

## Step 1: Check Service Quotas

Trn1 instances require specific service quotas. Check and request increases before trying to launch.

```bash
# Check your Trn1 vCPU quota (quota code for trn1)
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-6B0D517C \
  --query 'Quota.Value'

# If you need more, request an increase
# For one trn1.32xlarge, you need 128 vCPUs
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-6B0D517C \
  --desired-value 512
```

## Step 2: Find the Right AMI

The easiest path is using the AWS Deep Learning AMI with Neuron support, which comes with drivers, the Neuron SDK, and popular frameworks pre-configured.

```bash
# Find the latest Neuron Deep Learning AMI
aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=*Deep Learning AMI*Neuron*" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].{ImageId:ImageId,Name:Name}' \
  --output table
```

## Step 3: Configure Networking

For the trn1.32xlarge, you want EFA networking enabled for multi-chip and multi-node communication.

```bash
# Create a security group that allows all traffic within the group
# This is required for NeuronCore-to-NeuronCore communication
TRN1_SG=$(aws ec2 create-security-group \
  --group-name trn1-training-sg \
  --description "Security group for Trn1 training instances" \
  --vpc-id vpc-0abc123 \
  --query 'GroupId' --output text)

# Allow all intra-group traffic (required for distributed training)
aws ec2 authorize-security-group-ingress \
  --group-id $TRN1_SG \
  --protocol -1 \
  --source-group $TRN1_SG

# Allow SSH access
aws ec2 authorize-security-group-ingress \
  --group-id $TRN1_SG \
  --protocol tcp \
  --port 22 \
  --cidr $(curl -s https://checkip.amazonaws.com)/32
```

## Step 4: Launch the Instance

```bash
# Launch a trn1.32xlarge with EFA
aws ec2 run-instances \
  --image-id ami-0abc123-neuron-dlami \
  --instance-type trn1.32xlarge \
  --count 1 \
  --key-name my-training-key \
  --placement "GroupName=training-cluster-pg" \
  --network-interfaces '[
    {
      "DeviceIndex": 0,
      "SubnetId": "subnet-0abc123",
      "Groups": ["'$TRN1_SG'"],
      "InterfaceType": "efa"
    }
  ]' \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 500,
        "VolumeType": "gp3",
        "Iops": 10000,
        "Throughput": 500
      }
    }
  ]' \
  --iam-instance-profile Name=TrainingInstanceRole \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=trn1-training-node}]'
```

Create the placement group first if you plan to run multi-node training:

```bash
aws ec2 create-placement-group \
  --group-name training-cluster-pg \
  --strategy cluster
```

## Step 5: Initial Instance Setup

```bash
# SSH into the instance
ssh -i my-training-key.pem ec2-user@<instance-ip>

# Verify Trainium devices are present
neuron-ls

# Expected output for trn1.32xlarge:
# +--------+--------+--------+---------------+
# | DEVICE | NC     | MEMORY | ADDRESS       |
# +--------+--------+--------+---------------+
# | 0      | 0,1    | 32 GB  | 0000:10:1c.0  |
# | 1      | 2,3    | 32 GB  | 0000:10:1d.0  |
# | ...    | ...    | ...    | ...           |
# | 15     | 30,31  | 32 GB  | 0000:a0:1d.0  |
# +--------+--------+--------+---------------+

# Check the Neuron runtime
neuron-top
# Shows real-time utilization of all NeuronCores

# Verify EFA is available (for trn1.32xlarge)
fi_info -p efa
```

## Step 6: Set Up the Software Environment

If you are using the Deep Learning AMI, most things are pre-installed. Activate the right environment:

```bash
# Activate the PyTorch Neuron environment
source /opt/aws_neuron_venv_pytorch/bin/activate

# Verify PyTorch with Neuron support
python3 -c "
import torch
import torch_xla
import torch_xla.core.xla_model as xm

print(f'PyTorch version: {torch.__version__}')
print(f'XLA device: {xm.xla_device()}')
print('Neuron SDK is ready for training!')
"

# Install additional packages as needed
pip install transformers datasets accelerate wandb
```

## Step 7: Configure Local NVMe Storage

The trn1.32xlarge comes with 4x 2TB NVMe SSDs. Set them up for training data staging.

```bash
# List NVMe devices
lsblk | grep nvme

# Create a RAID 0 array for maximum throughput
sudo mdadm --create /dev/md0 --level=0 --raid-devices=4 \
  /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1 /dev/nvme4n1

sudo mkfs.xfs /dev/md0
sudo mkdir /data
sudo mount /dev/md0 /data
sudo chown ec2-user:ec2-user /data

# This gives you ~8 TB of fast local storage
echo "Local storage ready: $(df -h /data | tail -1 | awk '{print $2}')"
```

## Step 8: Run a Simple Training Test

```python
# test_training.py - Verify Trn1 is working correctly
import torch
import torch_xla
import torch_xla.core.xla_model as xm

# Get the XLA device (NeuronCore)
device = xm.xla_device()
print(f"Training on device: {device}")

# Create a simple model
model = torch.nn.Sequential(
    torch.nn.Linear(784, 512),
    torch.nn.ReLU(),
    torch.nn.Linear(512, 256),
    torch.nn.ReLU(),
    torch.nn.Linear(256, 10)
).to(device)

# Create synthetic data
x = torch.randn(64, 784).to(device)
y = torch.randint(0, 10, (64,)).to(device)

# Training step
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = torch.nn.CrossEntropyLoss()

for step in range(100):
    optimizer.zero_grad()
    output = model(x)
    loss = criterion(output, y)
    loss.backward()
    xm.optimizer_step(optimizer)

    if step % 10 == 0:
        print(f"Step {step}, Loss: {loss.item():.4f}")

print("Training test completed successfully!")
```

```bash
# Run the test
python3 test_training.py
```

## Step 9: Set Up for Multi-Node Training

For training across multiple Trn1 instances, you need proper networking and coordination.

```bash
# Create a hostfile listing all nodes
cat > hostfile << EOF
10.0.1.10 slots=32
10.0.1.11 slots=32
10.0.1.12 slots=32
10.0.1.13 slots=32
EOF

# Set environment variables for distributed training
export NEURON_RT_ROOT_COMM_ID=10.0.1.10:29500
export FI_PROVIDER=efa
export FI_EFA_USE_DEVICE_RDMA=1

# Launch training across 4 nodes (128 NeuronCores total)
torchrun \
  --nproc_per_node=32 \
  --nnodes=4 \
  --node_rank=0 \
  --master_addr=10.0.1.10 \
  --master_port=29500 \
  train.py
```

For more on distributed training with Trainium, see our detailed guide on [using AWS Trainium instances for model training](https://oneuptime.com/blog/post/2026-02-12-use-aws-trainium-instances-for-model-training/view).

## IAM Role Configuration

Your Trn1 instance needs an IAM role with permissions to access S3 (for data and checkpoints) and other services.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::my-training-bucket",
                "arn:aws:s3:::my-training-bucket/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```

## Monitoring and Debugging

```bash
# Real-time NeuronCore monitoring
neuron-top

# Detailed metrics
neuron-monitor

# Check Neuron runtime logs
journalctl -u neuron-rtd -f

# Profile a training run
NEURON_FRAMEWORK_DEBUG=1 python3 train.py 2>&1 | tee training_debug.log
```

## Cost Management Tips

- Use trn1.2xlarge for development and debugging, switch to trn1.32xlarge for full training runs
- Stage training data on local NVMe to avoid S3 data transfer costs during training
- Use checkpointing to S3 periodically so you can stop and resume without losing progress
- Consider Spot Instances for fault-tolerant training workloads
- Monitor NeuronCore utilization with neuron-top to ensure you are actually using all the hardware you are paying for

## Shutting Down Cleanly

```bash
# Save any checkpoints before stopping
# Then terminate or stop the instance

# Stop (keeps EBS volume, stops charges for compute)
aws ec2 stop-instances --instance-ids i-0abc123

# Or terminate (destroys everything including NVMe data)
aws ec2 terminate-instances --instance-ids i-0abc123
```

## Wrapping Up

Setting up Trn1 instances is straightforward once you know the specific requirements: use the Neuron Deep Learning AMI, enable EFA networking for distributed training, configure the local NVMe storage for data staging, and use PyTorch XLA for your training code. The hardware is powerful and cost-effective, and the software ecosystem continues to mature. Start with a trn1.2xlarge for development, validate your model compiles and trains correctly, then scale up to the full trn1.32xlarge for production training runs.
