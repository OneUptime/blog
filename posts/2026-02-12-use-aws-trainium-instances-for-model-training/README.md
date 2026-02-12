# How to Use AWS Trainium Instances for Model Training

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Trainium, EC2, Machine Learning, Model Training, Neuron SDK, Deep Learning

Description: Learn how to use AWS Trainium-powered EC2 Trn1 instances for cost-effective deep learning model training with the Neuron SDK and popular frameworks.

---

AWS Trainium is a custom ML chip designed by Amazon specifically for training deep learning models. EC2 Trn1 instances powered by Trainium deliver up to 50% cost savings compared to GPU instances for training, while maintaining competitive performance. If your training workloads are eating through your GPU budget, Trainium is worth a serious look.

The Trainium ecosystem has matured significantly, with support for PyTorch, JAX, and most popular model architectures. This guide walks you through setting up Trn1 instances and running your first training job.

## Trn1 Instance Specifications

| Instance | Trainium Chips | vCPUs | Memory | Network | Accelerator Memory |
|---|---|---|---|---|---|
| trn1.2xlarge | 1 | 8 | 32 GB | 12.5 Gbps | 32 GB HBM |
| trn1.32xlarge | 16 | 128 | 512 GB | 800 Gbps EFA | 512 GB HBM |
| trn1n.32xlarge | 16 | 128 | 512 GB | 1600 Gbps EFA | 512 GB HBM |

The trn1n.32xlarge variant doubles the network bandwidth, which is critical for distributed training across multiple nodes. Each Trainium chip has 2 NeuronCores-v2 with dedicated compute, memory, and collective communication hardware.

## Step 1: Launch a Trn1 Instance

```bash
# Launch a Trn1 instance with the Neuron Deep Learning AMI
aws ec2 run-instances \
  --image-id ami-0abc123-neuron-dlami \
  --instance-type trn1.32xlarge \
  --count 1 \
  --key-name my-training-key \
  --subnet-id subnet-0abc123 \
  --security-group-ids sg-0abc123 \
  --iam-instance-profile Name=TrainingInstanceRole \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":500,"VolumeType":"gp3","Iops":10000,"Throughput":500}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=trn1-training}]'
```

The large root volume and high IOPS are important for storing training data and checkpoints locally.

## Step 2: Set Up the Environment

```bash
# SSH into the instance
ssh -i my-training-key.pem ec2-user@<instance-ip>

# Verify Trainium devices
neuron-ls
# Should show 16 Neuron devices for trn1.32xlarge

# Monitor device utilization
neuron-top

# Activate the pre-configured Neuron environment
source /opt/aws_neuron_venv_pytorch/bin/activate

# Verify PyTorch Neuron installation
python3 -c "
import torch
import torch_xla
import torch_xla.core.xla_model as xm

device = xm.xla_device()
print(f'XLA device: {device}')
print(f'Device type: {device.type}')
"
```

## Step 3: Adapt Your Training Script

Trainium uses PyTorch XLA (the same approach used for TPU training). The changes to your training script are minimal.

```python
# train_trainium.py
import os
import torch
import torch_xla
import torch_xla.core.xla_model as xm
import torch_xla.distributed.parallel_loader as pl
import torch_xla.distributed.xla_multiprocessing as xmp
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer

def train_fn(index):
    """Training function that runs on each NeuronCore"""
    # Get the XLA device for this worker
    device = xm.xla_device()

    # Load model
    model_name = os.environ.get('MODEL_NAME', 'gpt2')
    model = AutoModelForCausalLM.from_pretrained(model_name)
    model = model.to(device)

    # Create optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=5e-5)

    # Create data loader
    train_dataset = load_training_data()
    train_sampler = torch.utils.data.distributed.DistributedSampler(
        train_dataset,
        num_replicas=xm.xrt_world_size(),
        rank=xm.get_ordinal(),
        shuffle=True
    )
    train_loader = DataLoader(
        train_dataset,
        batch_size=8,
        sampler=train_sampler,
        num_workers=4
    )

    # Wrap with XLA parallel loader for async data loading
    train_loader = pl.ParallelLoader(train_loader, [device]).per_device_loader(device)

    # Training loop
    model.train()
    for epoch in range(num_epochs):
        for step, batch in enumerate(train_loader):
            input_ids = batch['input_ids']
            attention_mask = batch['attention_mask']
            labels = batch['labels']

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )
            loss = outputs.loss

            loss.backward()

            # XLA requires explicit mark_step() to execute the computation graph
            xm.optimizer_step(optimizer)
            optimizer.zero_grad()

            if step % 100 == 0 and xm.is_master_ordinal():
                print(f"Epoch {epoch}, Step {step}, Loss: {loss.item():.4f}")

        # Save checkpoint from the master process only
        if xm.is_master_ordinal():
            xm.save(model.state_dict(), f"checkpoint_epoch_{epoch}.pt")
            print(f"Checkpoint saved for epoch {epoch}")

        # Synchronize all workers
        xm.rendezvous('epoch_end')


if __name__ == '__main__':
    # Launch training across all NeuronCores
    # For trn1.32xlarge with 16 chips x 2 cores = 32 workers
    xmp.spawn(train_fn, nprocs=32)
```

## Step 4: Run Training

```bash
# Set environment variables for Neuron
export NEURON_CC_FLAGS="--auto-cast=all --auto-cast-type=bf16 --model-type=transformer"

# For single-instance training across all 32 NeuronCores
python3 train_trainium.py

# Or use torchrun for compatibility
XLA_USE_BF16=1 torchrun --nproc_per_node=32 train_trainium.py
```

## Step 5: Multi-Node Distributed Training

For training across multiple Trn1 instances, use the EFA networking.

```bash
# On the master node (node 0)
XLA_USE_BF16=1 torchrun \
  --nproc_per_node=32 \
  --nnodes=4 \
  --node_rank=0 \
  --master_addr=10.0.1.10 \
  --master_port=29500 \
  train_trainium.py

# On worker nodes (1, 2, 3) - change node_rank accordingly
XLA_USE_BF16=1 torchrun \
  --nproc_per_node=32 \
  --nnodes=4 \
  --node_rank=1 \
  --master_addr=10.0.1.10 \
  --master_port=29500 \
  train_trainium.py
```

This gives you 128 NeuronCores (4 nodes x 32 cores) for training.

## Step 6: Training with Hugging Face Neuron

The `optimum-neuron` library from Hugging Face makes Trainium training even easier.

```python
# train_hf.py
from optimum.neuron import NeuronTrainer, NeuronTrainingArguments
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from datasets import load_dataset

# Load dataset
dataset = load_dataset("imdb")
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=512)

tokenized_datasets = dataset.map(tokenize_function, batched=True)

# Load model
model = AutoModelForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=2)

# Configure Neuron-specific training arguments
training_args = NeuronTrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    learning_rate=5e-5,
    weight_decay=0.01,
    logging_steps=100,
    save_steps=500,
    bf16=True,
    dataloader_num_workers=4,
)

# Create Neuron-aware trainer
trainer = NeuronTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
)

# Train
trainer.train()
trainer.save_model("./final_model")
```

```bash
# Run with Neuron distributed launcher
neuron_parallel_compile python3 train_hf.py
```

## Cost Comparison

| Instance | Hourly Cost | Training Throughput | Cost to Train (relative) |
|---|---|---|---|
| p4d.24xlarge (8x A100) | $32.77 | Baseline | $1.00 |
| trn1.32xlarge (16 Trainium) | $21.50 | ~Similar | $0.66 |
| trn1n.32xlarge | $24.78 | ~10% faster for distributed | $0.70 |

The actual savings depend on model architecture and training configuration, but 30-50% cost reduction is typical for well-supported models.

## Supported Model Architectures

Trainium works well with:

- Transformer-based models (BERT, GPT, LLaMA, T5)
- Vision transformers (ViT, DeiT)
- Convolutional neural networks (ResNet, EfficientNet)
- Standard PyTorch operations

Models with highly custom operators or unusual architectures may need workarounds or may not be supported yet. Always test with a small training run before committing to a full training job.

## Monitoring Training on Trainium

```bash
# Monitor NeuronCore utilization
neuron-top

# Check memory usage across all devices
neuron-monitor | grep -E "mem_used|utilization"

# View compiler logs for optimization insights
ls /tmp/neuron_compile_cache/
```

## Wrapping Up

AWS Trainium offers a compelling alternative to GPUs for deep learning training. The 30-50% cost savings are real, and the software ecosystem (PyTorch XLA, Hugging Face optimum-neuron) has matured to the point where porting most training scripts is straightforward. The main investment is adapting your code to use PyTorch XLA patterns, which is a one-time effort. For organizations running significant training workloads, the cost savings add up fast. Start with a well-supported model architecture, benchmark against your current GPU setup, and scale from there.
