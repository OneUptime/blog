# How to Implement Cost-Optimized ML Training with Vertex AI Preemptible VMs and Spot Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, Cost Optimization, Spot Instances, ML Training, Google Cloud

Description: Learn how to reduce ML training costs by up to 80% using Vertex AI with preemptible VMs and spot instances while maintaining training reliability.

---

ML model training is expensive. A single training run on GPUs can cost hundreds or thousands of dollars, and when you are iterating on hyperparameters or running regular retraining jobs, those costs multiply fast. One of the most effective ways to reduce these costs on GCP is to use preemptible VMs or spot instances, which offer the same hardware at up to 80% less than on-demand pricing.

The catch is that these instances can be terminated at any time. For ML training, that means you need to build checkpointing and fault tolerance into your workflow. In this post, I will show you exactly how to do that with Vertex AI.

## Understanding Preemptible vs Spot VMs

Quick primer on the options:

- **Preemptible VMs** - Up to 80% cheaper than on-demand. Maximum lifetime of 24 hours. GCP can reclaim them with 30 seconds notice. Being phased out in favor of Spot VMs.
- **Spot VMs** - Similar pricing to preemptible VMs but without the 24-hour limit. Still can be reclaimed at any time. This is the recommended option for new workloads.

For ML training, both work well as long as you handle interruptions gracefully.

## Step 1: Configure Vertex AI Custom Training with Spot VMs

Here is how to submit a Vertex AI Custom Training job that uses spot instances.

```python
# training/submit_spot_training.py
from google.cloud import aiplatform

def submit_spot_training_job(
    project_id,
    display_name,
    container_uri,
    model_output_uri,
    machine_type="n1-standard-8",
    accelerator_type="NVIDIA_TESLA_T4",
    accelerator_count=1,
):
    """Submit a training job using spot VMs for cost savings."""
    aiplatform.init(
        project=project_id,
        location="us-central1",
        staging_bucket="gs://my-bucket/staging",
    )

    # Define the worker pool with spot VM scheduling
    worker_pool_spec = {
        "machine_spec": {
            "machine_type": machine_type,
            "accelerator_type": accelerator_type,
            "accelerator_count": accelerator_count,
        },
        "replica_count": 1,
        "container_spec": {
            "image_uri": container_uri,
            "args": [
                "--output-dir", model_output_uri,
                "--checkpoint-dir", f"{model_output_uri}/checkpoints",
                "--epochs", "100",
                "--batch-size", "64",
                "--enable-checkpointing", "true",
                "--checkpoint-interval", "300",  # Checkpoint every 5 minutes
            ],
        },
        "disk_spec": {
            "boot_disk_type": "pd-ssd",
            "boot_disk_size_gb": 100,
        },
    }

    # Create the custom job with spot VM scheduling
    custom_job = aiplatform.CustomJob(
        display_name=display_name,
        worker_pool_specs=[worker_pool_spec],
    )

    # Submit with spot VM scheduling
    custom_job.run(
        service_account=f"ml-training@{project_id}.iam.gserviceaccount.com",
        restart_job_on_worker_restart=True,  # Auto-restart on preemption
        scheduling={
            "strategy": "SPOT",  # Use spot VMs
        },
        timeout=86400,  # 24 hour timeout
    )

    print(f"Spot training job submitted: {custom_job.resource_name}")
    return custom_job
```

## Step 2: Implement Checkpointing in Your Training Code

The most critical piece of using spot instances for training is checkpointing. Your training code must save its state regularly so it can resume from where it left off after a preemption.

```python
# training/train_with_checkpointing.py
import os
import signal
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from google.cloud import storage

class CheckpointManager:
    """Manages training checkpoints in Cloud Storage for fault tolerance."""

    def __init__(self, checkpoint_dir, local_dir="/tmp/checkpoints"):
        self.checkpoint_dir = checkpoint_dir
        self.local_dir = local_dir
        os.makedirs(local_dir, exist_ok=True)

        # Parse GCS path
        parts = checkpoint_dir.replace("gs://", "").split("/", 1)
        self.bucket_name = parts[0]
        self.prefix = parts[1] if len(parts) > 1 else ""

        self.storage_client = storage.Client()
        self.bucket = self.storage_client.bucket(self.bucket_name)

    def save_checkpoint(self, model, optimizer, epoch, step, metrics):
        """Save a training checkpoint to Cloud Storage."""
        checkpoint = {
            "epoch": epoch,
            "step": step,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "metrics": metrics,
        }

        # Save locally first
        local_path = os.path.join(self.local_dir, f"checkpoint_epoch{epoch}_step{step}.pt")
        torch.save(checkpoint, local_path)

        # Upload to Cloud Storage
        gcs_path = f"{self.prefix}/checkpoint_epoch{epoch}_step{step}.pt"
        blob = self.bucket.blob(gcs_path)
        blob.upload_from_filename(local_path)

        # Also save as 'latest' for easy resumption
        latest_path = f"{self.prefix}/checkpoint_latest.pt"
        latest_blob = self.bucket.blob(latest_path)
        latest_blob.upload_from_filename(local_path)

        # Save metadata
        meta = {
            "epoch": epoch,
            "step": step,
            "metrics": metrics,
            "checkpoint_path": gcs_path,
        }
        meta_blob = self.bucket.blob(f"{self.prefix}/checkpoint_meta.json")
        meta_blob.upload_from_string(json.dumps(meta))

        print(f"Checkpoint saved: epoch={epoch}, step={step}")

        # Clean up old local files to save disk space
        self._cleanup_local(keep_latest=2)

    def load_latest_checkpoint(self, model, optimizer):
        """Load the most recent checkpoint if one exists."""
        meta_blob = self.bucket.blob(f"{self.prefix}/checkpoint_meta.json")

        if not meta_blob.exists():
            print("No checkpoint found. Starting training from scratch.")
            return 0, 0

        # Download metadata
        meta = json.loads(meta_blob.download_as_string())
        print(f"Found checkpoint: epoch={meta['epoch']}, step={meta['step']}")

        # Download the checkpoint file
        local_path = os.path.join(self.local_dir, "checkpoint_latest.pt")
        latest_blob = self.bucket.blob(f"{self.prefix}/checkpoint_latest.pt")
        latest_blob.download_to_filename(local_path)

        # Load the checkpoint
        checkpoint = torch.load(local_path)
        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])

        print(f"Resumed from epoch {checkpoint['epoch']}, step {checkpoint['step']}")
        return checkpoint["epoch"], checkpoint["step"]

    def _cleanup_local(self, keep_latest=2):
        """Remove old local checkpoint files to save disk space."""
        files = sorted(
            [f for f in os.listdir(self.local_dir) if f.startswith("checkpoint_")],
            key=lambda f: os.path.getmtime(os.path.join(self.local_dir, f)),
        )
        for f in files[:-keep_latest]:
            os.remove(os.path.join(self.local_dir, f))


class SpotTrainer:
    """Training loop with checkpointing and preemption handling."""

    def __init__(self, model, optimizer, checkpoint_manager, checkpoint_interval=300):
        self.model = model
        self.optimizer = optimizer
        self.checkpoint_mgr = checkpoint_manager
        self.checkpoint_interval = checkpoint_interval
        self.preempted = False

        # Register signal handler for preemption notice
        # GCP sends SIGTERM when preempting a VM
        signal.signal(signal.SIGTERM, self._handle_preemption)

    def _handle_preemption(self, signum, frame):
        """Handle preemption signal by saving a checkpoint."""
        print("PREEMPTION DETECTED - Saving emergency checkpoint...")
        self.preempted = True

    def train(self, train_loader, num_epochs, loss_fn):
        """Main training loop with checkpointing and preemption handling."""
        import time

        # Try to resume from a checkpoint
        start_epoch, start_step = self.checkpoint_mgr.load_latest_checkpoint(
            self.model, self.optimizer
        )

        last_checkpoint_time = time.time()
        global_step = start_step

        for epoch in range(start_epoch, num_epochs):
            self.model.train()
            epoch_loss = 0.0

            for batch_idx, (data, target) in enumerate(train_loader):
                # Check if we have been preempted
                if self.preempted:
                    print("Saving final checkpoint before shutdown...")
                    self.checkpoint_mgr.save_checkpoint(
                        self.model, self.optimizer, epoch, global_step,
                        {"loss": epoch_loss / max(batch_idx, 1)},
                    )
                    print("Checkpoint saved. Exiting gracefully.")
                    return

                # Skip batches we already processed (after resume)
                if epoch == start_epoch and batch_idx < start_step % len(train_loader):
                    continue

                # Standard training step
                self.optimizer.zero_grad()
                output = self.model(data)
                loss = loss_fn(output, target)
                loss.backward()
                self.optimizer.step()

                epoch_loss += loss.item()
                global_step += 1

                # Save checkpoint at regular intervals
                current_time = time.time()
                if current_time - last_checkpoint_time > self.checkpoint_interval:
                    self.checkpoint_mgr.save_checkpoint(
                        self.model, self.optimizer, epoch, global_step,
                        {"loss": epoch_loss / (batch_idx + 1)},
                    )
                    last_checkpoint_time = current_time

            # Save checkpoint at end of each epoch
            avg_loss = epoch_loss / len(train_loader)
            print(f"Epoch {epoch}: avg_loss={avg_loss:.4f}")
            self.checkpoint_mgr.save_checkpoint(
                self.model, self.optimizer, epoch + 1, global_step,
                {"loss": avg_loss},
            )
```

## Step 3: Implement Retry Logic for Spot Preemptions

For Vertex AI Custom Jobs, you can configure automatic restarts. But for additional resilience, wrap your training submission in retry logic.

```python
# training/resilient_training.py
from google.cloud import aiplatform
import time

def submit_resilient_spot_training(
    project_id,
    container_uri,
    output_uri,
    max_retries=5,
):
    """Submit a spot training job with retry logic for preemptions."""
    aiplatform.init(project=project_id, location="us-central1")

    for attempt in range(max_retries):
        try:
            print(f"Training attempt {attempt + 1}/{max_retries}")

            job = aiplatform.CustomJob(
                display_name=f"spot-training-attempt-{attempt + 1}",
                worker_pool_specs=[{
                    "machine_spec": {
                        "machine_type": "n1-standard-8",
                        "accelerator_type": "NVIDIA_TESLA_T4",
                        "accelerator_count": 1,
                    },
                    "replica_count": 1,
                    "container_spec": {
                        "image_uri": container_uri,
                        "args": [
                            "--output-dir", output_uri,
                            "--checkpoint-dir", f"{output_uri}/checkpoints",
                            "--enable-checkpointing", "true",
                        ],
                    },
                }],
            )

            job.run(
                restart_job_on_worker_restart=True,
                scheduling={"strategy": "SPOT"},
                timeout=86400,
            )

            # If we get here, training completed successfully
            print(f"Training completed on attempt {attempt + 1}")
            return job

        except Exception as e:
            if "preempted" in str(e).lower() or "spot" in str(e).lower():
                wait_time = min(300 * (2 ** attempt), 3600)  # Exponential backoff
                print(f"Preemption detected. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise  # Non-preemption errors should be raised immediately

    raise RuntimeError(f"Training failed after {max_retries} attempts")
```

## Step 4: Cost Comparison and Optimization

Here is how to calculate the cost savings and optimize further.

```python
# cost/estimate_savings.py

def estimate_training_cost(
    machine_type,
    accelerator_type,
    accelerator_count,
    training_hours,
    use_spot=True,
):
    """Estimate training costs for on-demand vs spot VMs."""

    # Approximate hourly prices (check current GCP pricing for exact values)
    on_demand_prices = {
        "n1-standard-8": 0.38,
        "n1-highmem-8": 0.47,
        "a2-highgpu-1g": 3.67,
    }

    accelerator_on_demand = {
        "NVIDIA_TESLA_T4": 0.35,
        "NVIDIA_TESLA_V100": 2.48,
        "NVIDIA_TESLA_A100": 2.93,
    }

    # Spot prices are typically 60-80% less
    spot_discount = 0.70  # 70% discount

    vm_cost = on_demand_prices.get(machine_type, 0.50)
    gpu_cost = accelerator_on_demand.get(accelerator_type, 1.00) * accelerator_count

    total_on_demand = (vm_cost + gpu_cost) * training_hours
    total_spot = total_on_demand * (1 - spot_discount)

    # Account for preemption overhead (typically 10-20% extra time)
    preemption_overhead = 1.15  # 15% overhead for checkpoint/restart
    total_spot_adjusted = total_spot * preemption_overhead

    print(f"Training cost estimate for {training_hours} hours:")
    print(f"  On-demand:  ${total_on_demand:.2f}")
    print(f"  Spot:       ${total_spot_adjusted:.2f}")
    print(f"  Savings:    ${total_on_demand - total_spot_adjusted:.2f} "
          f"({(1 - total_spot_adjusted/total_on_demand)*100:.0f}%)")

    return {
        "on_demand_cost": total_on_demand,
        "spot_cost": total_spot_adjusted,
        "savings": total_on_demand - total_spot_adjusted,
        "savings_pct": (1 - total_spot_adjusted / total_on_demand) * 100,
    }

# Example: 10-hour training on T4 GPU
estimate_training_cost("n1-standard-8", "NVIDIA_TESLA_T4", 1, 10)
```

## Step 5: Hybrid Strategy - Mix Spot and On-Demand

For critical training jobs that must complete by a deadline, use a hybrid approach: start with spot VMs and fall back to on-demand if spot capacity is not available.

```python
# training/hybrid_training.py
from google.cloud import aiplatform
import time

def hybrid_training_job(
    project_id,
    container_uri,
    output_uri,
    deadline_hours=24,
    spot_time_budget_hours=18,
):
    """Start training on spot VMs, fall back to on-demand if needed."""
    aiplatform.init(project=project_id, location="us-central1")

    start_time = time.time()

    # Phase 1: Try spot VMs
    print("Phase 1: Training on spot VMs...")
    try:
        spot_job = aiplatform.CustomJob(
            display_name="hybrid-training-spot-phase",
            worker_pool_specs=[{
                "machine_spec": {
                    "machine_type": "n1-standard-8",
                    "accelerator_type": "NVIDIA_TESLA_T4",
                    "accelerator_count": 1,
                },
                "replica_count": 1,
                "container_spec": {
                    "image_uri": container_uri,
                    "args": [
                        "--output-dir", output_uri,
                        "--checkpoint-dir", f"{output_uri}/checkpoints",
                        "--enable-checkpointing", "true",
                    ],
                },
            }],
        )

        spot_job.run(
            restart_job_on_worker_restart=True,
            scheduling={"strategy": "SPOT"},
            timeout=int(spot_time_budget_hours * 3600),
        )

        print("Training completed on spot VMs!")
        return spot_job

    except Exception as e:
        elapsed_hours = (time.time() - start_time) / 3600
        remaining_hours = deadline_hours - elapsed_hours

        if remaining_hours <= 0:
            raise RuntimeError("Deadline exceeded during spot training")

        print(f"Spot training did not complete. "
              f"Falling back to on-demand with {remaining_hours:.1f} hours remaining.")

    # Phase 2: Fall back to on-demand
    print("Phase 2: Continuing on on-demand VMs...")
    on_demand_job = aiplatform.CustomJob(
        display_name="hybrid-training-ondemand-phase",
        worker_pool_specs=[{
            "machine_spec": {
                "machine_type": "n1-standard-8",
                "accelerator_type": "NVIDIA_TESLA_T4",
                "accelerator_count": 1,
            },
            "replica_count": 1,
            "container_spec": {
                "image_uri": container_uri,
                "args": [
                    "--output-dir", output_uri,
                    "--checkpoint-dir", f"{output_uri}/checkpoints",
                    "--enable-checkpointing", "true",
                ],
            },
        }],
    )

    on_demand_job.run(
        timeout=int(remaining_hours * 3600),
    )

    print("Training completed on on-demand VMs!")
    return on_demand_job
```

## Wrapping Up

Using spot instances for ML training can reduce your compute costs by 60-80%, which is significant when you are training models regularly. The key requirement is robust checkpointing - your training code must save state frequently so it can resume after preemption without losing significant progress. Implement SIGTERM handling for graceful shutdown, use Cloud Storage for durable checkpoints, and configure Vertex AI for automatic restart on preemption. For time-sensitive jobs, use a hybrid strategy that starts with spot and falls back to on-demand. The upfront investment in checkpointing infrastructure pays for itself many times over in reduced training costs.
