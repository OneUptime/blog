# How to Use Preemptible VMs with GPUs for Cost-Effective Machine Learning Training

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Preemptible VMs, GPU, Machine Learning

Description: Learn how to use preemptible VMs with GPUs on GCP for cost-effective machine learning training, including checkpointing strategies and fault-tolerant training setups.

---

GPU instances are expensive. An A100 GPU on GCP costs several dollars per hour on demand. If you are running training jobs that take hours or days, the costs add up fast. Preemptible (Spot) VMs with GPUs offer the same hardware at 60-91% less, making them a game-changer for ML training workloads - if you design your training pipeline to handle interruptions.

In this post, I will show you how to set up preemptible GPU instances, implement checkpointing so you do not lose progress when a VM is preempted, and build a fault-tolerant training loop that automatically resumes after interruption.

## Cost Savings with Preemptible GPUs

The savings are substantial. Here is a comparison for common GPU types (approximate pricing, us-central1):

| GPU Type | On-Demand (per hour) | Preemptible (per hour) | Savings |
|----------|---------------------|----------------------|---------|
| NVIDIA T4 | $0.35 | $0.11 | 69% |
| NVIDIA V100 | $2.48 | $0.74 | 70% |
| NVIDIA A100 40GB | $3.67 | $1.10 | 70% |
| NVIDIA A100 80GB | $5.07 | $1.52 | 70% |

These are just the GPU costs - you also save on the underlying VM instance. For a training job that runs for 100 GPU-hours, you could save thousands of dollars.

## Creating a Preemptible GPU Instance

```bash
# Create a preemptible VM with a T4 GPU
gcloud compute instances create ml-trainer \
    --zone=us-central1-a \
    --machine-type=n1-standard-8 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --image-family=pytorch-latest-gpu-debian-11 \
    --image-project=deeplearning-platform-release \
    --boot-disk-size=200GB \
    --boot-disk-type=pd-ssd \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --maintenance-policy=TERMINATE \
    --scopes=cloud-platform \
    --metadata=install-nvidia-driver=True
```

Key flags:
- **--provisioning-model=SPOT**: Makes this a preemptible (Spot) instance
- **--instance-termination-action=STOP**: Stop instead of delete when preempted (so the disk is preserved)
- **--maintenance-policy=TERMINATE**: Required for GPU instances
- **--scopes=cloud-platform**: Allows writing checkpoints to Cloud Storage

## Instance Template for Training Workers

For repeatable setups, create an instance template:

```bash
# Create an instance template for preemptible GPU training
gcloud compute instance-templates create ml-training-preemptible \
    --machine-type=n1-standard-8 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --image-family=pytorch-latest-gpu-debian-11 \
    --image-project=deeplearning-platform-release \
    --boot-disk-size=200GB \
    --boot-disk-type=pd-ssd \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --maintenance-policy=TERMINATE \
    --scopes=cloud-platform \
    --metadata-from-file=startup-script=training-startup.sh,shutdown-script=training-shutdown.sh
```

## Implementing Checkpointing in PyTorch

The most critical part of running ML training on preemptible VMs is checkpointing. Here is a PyTorch training script with proper checkpoint support:

```python
# train.py - Fault-tolerant PyTorch training with checkpointing
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import os
import signal
import sys
from google.cloud import storage

# Configuration
CHECKPOINT_DIR = "/tmp/checkpoints"
GCS_BUCKET = "my-training-checkpoints"
CHECKPOINT_EVERY = 500  # Save checkpoint every 500 steps
MODEL_NAME = "my-model"

os.makedirs(CHECKPOINT_DIR, exist_ok=True)


class CheckpointManager:
    """Manages saving and loading training checkpoints to GCS."""

    def __init__(self, bucket_name, model_name):
        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)
        self.model_name = model_name
        self.local_path = os.path.join(CHECKPOINT_DIR, f"{model_name}_latest.pt")

    def save(self, model, optimizer, epoch, step, loss):
        """Save a checkpoint locally and upload to GCS."""
        checkpoint = {
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "epoch": epoch,
            "step": step,
            "loss": loss,
        }

        # Save locally first (fast)
        torch.save(checkpoint, self.local_path)

        # Upload to GCS (survives preemption)
        blob = self.bucket.blob(f"checkpoints/{self.model_name}/latest.pt")
        blob.upload_from_filename(self.local_path)

        print(f"Checkpoint saved: epoch={epoch}, step={step}, loss={loss:.4f}")

    def load(self, model, optimizer):
        """Load the latest checkpoint from GCS."""
        blob = self.bucket.blob(f"checkpoints/{self.model_name}/latest.pt")

        if not blob.exists():
            print("No checkpoint found, starting from scratch")
            return 0, 0

        blob.download_to_filename(self.local_path)
        checkpoint = torch.load(self.local_path)

        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])

        epoch = checkpoint["epoch"]
        step = checkpoint["step"]
        print(f"Resumed from checkpoint: epoch={epoch}, step={step}")
        return epoch, step


def train(model, optimizer, dataloader, checkpoint_mgr, start_epoch, start_step, num_epochs):
    """Training loop with periodic checkpointing."""
    criterion = nn.CrossEntropyLoss()
    global_step = start_step

    for epoch in range(start_epoch, num_epochs):
        model.train()

        for batch_idx, (data, target) in enumerate(dataloader):
            # Skip batches we already processed (after checkpoint resume)
            if epoch == start_epoch and batch_idx < start_step % len(dataloader):
                continue

            data, target = data.cuda(), target.cuda()

            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

            global_step += 1

            if global_step % 100 == 0:
                print(f"Epoch {epoch}, Step {global_step}, Loss: {loss.item():.4f}")

            # Save checkpoint periodically
            if global_step % CHECKPOINT_EVERY == 0:
                checkpoint_mgr.save(model, optimizer, epoch, global_step, loss.item())

        # Save at end of each epoch
        checkpoint_mgr.save(model, optimizer, epoch + 1, global_step, loss.item())

    print("Training complete!")


# Set up signal handler for graceful shutdown
checkpoint_mgr = None
model = None
optimizer = None
current_epoch = 0
current_step = 0


def handle_shutdown(signum, frame):
    """Save a checkpoint when the VM is being preempted."""
    print(f"Received signal {signum}, saving emergency checkpoint...")
    if checkpoint_mgr and model and optimizer:
        checkpoint_mgr.save(model, optimizer, current_epoch, current_step, 0.0)
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_shutdown)


if __name__ == "__main__":
    # Initialize model and optimizer
    model = MyModel().cuda()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Set up checkpoint manager
    checkpoint_mgr = CheckpointManager(GCS_BUCKET, MODEL_NAME)

    # Load from checkpoint if one exists
    start_epoch, start_step = checkpoint_mgr.load(model, optimizer)

    # Create data loader
    dataset = MyDataset()
    dataloader = DataLoader(dataset, batch_size=64, shuffle=True, num_workers=4)

    # Train
    train(model, optimizer, dataloader, checkpoint_mgr, start_epoch, start_step, num_epochs=100)
```

## Startup Script for Auto-Resume

The startup script should automatically resume training when the VM restarts:

```bash
#!/bin/bash
# training-startup.sh - Automatically resume training after preemption
set -e

exec > /var/log/training-startup.log 2>&1
echo "=== Training startup at $(date) ==="

# Wait for GPU to be available
echo "Waiting for GPU..."
for i in $(seq 1 30); do
    if nvidia-smi &> /dev/null; then
        echo "GPU available"
        nvidia-smi
        break
    fi
    sleep 10
done

# Activate the conda environment (on Deep Learning VM images)
source /opt/conda/etc/profile.d/conda.sh
conda activate base

# Pull the latest training code from GCS
gsutil -m rsync -r gs://my-training-bucket/code/ /opt/training/

# Start training (will auto-resume from last checkpoint)
cd /opt/training
python train.py \
    --batch-size 64 \
    --learning-rate 0.001 \
    --epochs 100 \
    --checkpoint-bucket my-training-checkpoints \
    2>&1 | tee /var/log/training.log

echo "=== Training completed or interrupted at $(date) ==="
```

## Shutdown Script for Emergency Checkpointing

```bash
#!/bin/bash
# training-shutdown.sh - Save checkpoint before preemption
echo "=== Shutdown signal received at $(date) ===" >> /var/log/training-shutdown.log

# Send SIGTERM to the training process so it saves a checkpoint
TRAINING_PID=$(pgrep -f "python train.py")
if [ -n "$TRAINING_PID" ]; then
    kill -TERM "$TRAINING_PID"
    # Wait for the checkpoint to be saved (up to 25 seconds)
    for i in $(seq 1 25); do
        if ! kill -0 "$TRAINING_PID" 2>/dev/null; then
            echo "Training process exited cleanly" >> /var/log/training-shutdown.log
            break
        fi
        sleep 1
    done
fi

echo "=== Shutdown complete at $(date) ===" >> /var/log/training-shutdown.log
```

## Auto-Restart After Preemption

Create a simple orchestrator that watches for preempted instances and restarts them:

```bash
#!/bin/bash
# monitor-training.sh - Watch for preempted training VMs and restart them
INSTANCE_NAME="ml-trainer"
ZONE="us-central1-a"
CHECK_INTERVAL=60

while true; do
    STATUS=$(gcloud compute instances describe "$INSTANCE_NAME" \
        --zone="$ZONE" \
        --format="value(status)" 2>/dev/null)

    if [ "$STATUS" = "TERMINATED" ] || [ "$STATUS" = "STOPPED" ]; then
        echo "$(date): Instance is $STATUS, attempting restart..."
        gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE" 2>/dev/null

        if [ $? -ne 0 ]; then
            echo "$(date): Failed to restart in $ZONE, trying other zones..."
            for ALT_ZONE in us-central1-b us-central1-c us-central1-f; do
                # Recreate in a different zone if capacity is not available
                echo "Trying $ALT_ZONE..."
                # (migration logic here)
            done
        fi
    elif [ "$STATUS" = "RUNNING" ]; then
        # Check if training is still active
        TRAINING_ACTIVE=$(gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" \
            --command="pgrep -f 'python train.py' > /dev/null && echo yes || echo no" 2>/dev/null)

        if [ "$TRAINING_ACTIVE" = "no" ]; then
            echo "$(date): Training completed. Stopping instance to save costs."
            gcloud compute instances stop "$INSTANCE_NAME" --zone="$ZONE"
            break
        fi
    fi

    sleep "$CHECK_INTERVAL"
done
```

## Terraform Configuration

```hcl
# Preemptible GPU instance for ML training
resource "google_compute_instance" "ml_trainer" {
  name         = "ml-trainer"
  machine_type = "n1-standard-8"
  zone         = "us-central1-a"

  guest_accelerator {
    type  = "nvidia-tesla-t4"
    count = 1
  }

  scheduling {
    provisioning_model          = "SPOT"
    instance_termination_action = "STOP"
    on_host_maintenance         = "TERMINATE"
    automatic_restart           = false
  }

  boot_disk {
    initialize_params {
      image = "deeplearning-platform-release/pytorch-latest-gpu-debian-11"
      size  = 200
      type  = "pd-ssd"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  service_account {
    scopes = ["cloud-platform"]
  }

  metadata = {
    install-nvidia-driver = "True"
    shutdown-script       = file("${path.module}/scripts/training-shutdown.sh")
  }

  metadata_startup_script = file("${path.module}/scripts/training-startup.sh")
}
```

## Multi-GPU Preemptible Training

For large models that need multiple GPUs:

```bash
# Create a preemptible VM with 4 T4 GPUs
gcloud compute instances create ml-multi-gpu \
    --zone=us-central1-a \
    --machine-type=n1-standard-32 \
    --accelerator=type=nvidia-tesla-t4,count=4 \
    --image-family=pytorch-latest-gpu-debian-11 \
    --image-project=deeplearning-platform-release \
    --boot-disk-size=500GB \
    --boot-disk-type=pd-ssd \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --maintenance-policy=TERMINATE \
    --scopes=cloud-platform
```

For distributed training across multiple preemptible VMs, use PyTorch's elastic training (torchrun):

```bash
# Start distributed training with elastic scaling
torchrun \
    --nnodes=1:4 \
    --nproc_per_node=1 \
    --rdzv_backend=c10d \
    --rdzv_endpoint=coordinator:29400 \
    train.py --batch-size 256
```

Elastic training handles nodes joining and leaving the training job gracefully - exactly what you need when preemptible VMs can disappear at any time.

## Tips for Maximizing Preemptible GPU Availability

1. **Diversify across zones**: Preemption rates vary by zone. Spread training jobs across multiple zones.
2. **Use off-peak hours**: Preemption rates tend to be lower during nights and weekends.
3. **Try different GPU types**: If T4 capacity is tight, V100 or A100 might be available (and vice versa).
4. **Checkpoint frequently**: The more often you save, the less work you lose. Every 5-10 minutes is a good target.
5. **Use local SSD for data staging**: Loading training data from local SSD is faster and reduces the impact of preemption on data pipelines.
6. **Monitor your costs**: Set up budget alerts so preemptible instances do not run longer than intended.

## Best Practices

- Always implement checkpointing before using preemptible GPUs. Without it, you risk losing hours of training progress.
- Save checkpoints to Cloud Storage, not local disk. Local checkpoints are lost if the VM is deleted.
- Use the SIGTERM signal handler to save a final checkpoint when preemption is detected.
- For long training jobs (days), consider mixing preemptible and on-demand GPUs. Use on-demand for a baseline and preemptible for extra capacity.
- Test your checkpoint and resume logic thoroughly before starting a long training run.

## Wrapping Up

Preemptible GPUs make ML training accessible at a fraction of the on-demand cost. The key is designing your training pipeline to be resilient to interruption. With proper checkpointing, automatic restart, and elastic training frameworks, preemption becomes a minor inconvenience rather than a showstopper. Start with a single preemptible GPU for experimentation, verify your checkpointing works, and then scale up to multi-GPU or multi-node setups once you are confident in your fault tolerance.
