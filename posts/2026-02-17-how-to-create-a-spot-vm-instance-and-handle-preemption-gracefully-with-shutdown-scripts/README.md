# How to Create a Spot VM Instance and Handle Preemption Gracefully with Shutdown Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Spot VMs, Preemption, Cost Optimization

Description: Learn how to create Spot VM instances on GCP Compute Engine and handle preemption gracefully using shutdown scripts and checkpointing strategies.

---

Spot VMs (formerly known as preemptible VMs) can save you 60-91% compared to regular on-demand instances. The trade-off is simple: GCP can take them away at any time when it needs the capacity back. For workloads that can tolerate interruption - batch processing, CI/CD pipelines, data analysis, machine learning training - this is an incredible deal.

The key to using Spot VMs successfully is handling preemption gracefully. In this post, I will show you how to create Spot VMs, write shutdown scripts that save your work, and design workloads that recover from preemption automatically.

## Creating a Spot VM

Creating a Spot VM is as simple as adding the `--provisioning-model=SPOT` flag:

```bash
# Create a Spot VM instance
gcloud compute instances create my-spot-vm \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP
```

The `--instance-termination-action` flag controls what happens when the VM is preempted:
- **STOP**: The VM is stopped (can be restarted later, but no guarantee of capacity)
- **DELETE**: The VM is deleted entirely

For most cases, `STOP` is better because you can attempt to restart the VM later.

## Understanding Preemption

When GCP needs your Spot VM's capacity back:

1. The VM receives a preemption notice (30 seconds before termination)
2. An ACPI G2 soft power-off signal is sent to the guest OS
3. Your shutdown scripts run (you have roughly 30 seconds)
4. The VM is stopped or deleted

You can detect the preemption notice from inside the VM:

```bash
# Check for preemption notice from the metadata server
# This returns "TRUE" when preemption has been scheduled
curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/preempted
```

## Writing Shutdown Scripts

Shutdown scripts run when a VM is being stopped or preempted. This is your chance to save state, flush buffers, and clean up.

```bash
# Create a VM with a shutdown script
gcloud compute instances create spot-worker \
    --zone=us-central1-a \
    --machine-type=e2-standard-4 \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --metadata=shutdown-script='#!/bin/bash
# This script runs when the VM is being shut down or preempted
# You have approximately 30 seconds to complete

INSTANCE_NAME=$(curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/name)

echo "$(date): Shutdown script started on $INSTANCE_NAME" >> /var/log/shutdown.log

# Save current work state to Cloud Storage
gsutil cp /tmp/current-progress.json gs://my-bucket/checkpoints/${INSTANCE_NAME}-$(date +%s).json

# Notify the orchestrator that this worker is going down
curl -X POST https://my-api.example.com/workers/preempted \
    -H "Content-Type: application/json" \
    -d "{\"instance\": \"$INSTANCE_NAME\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

echo "$(date): Shutdown script completed" >> /var/log/shutdown.log'
```

## A More Complete Shutdown Script

For a production workload, here is a more robust shutdown script that handles checkpointing:

```bash
#!/bin/bash
# shutdown-handler.sh - Gracefully handle Spot VM preemption
set -e

LOG_FILE="/var/log/shutdown-handler.log"
CHECKPOINT_BUCKET="gs://my-project-checkpoints"
INSTANCE_NAME=$(curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/name)

log() {
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $1" >> "$LOG_FILE"
}

log "Shutdown handler started"

# Step 1: Signal the application to stop accepting new work
if [ -f /var/run/app.pid ]; then
    APP_PID=$(cat /var/run/app.pid)
    kill -SIGTERM "$APP_PID" 2>/dev/null || true
    log "Sent SIGTERM to application (PID: $APP_PID)"

    # Give the app a few seconds to flush its state
    sleep 5
fi

# Step 2: Save checkpoint data to Cloud Storage
if [ -d /tmp/work-in-progress ]; then
    CHECKPOINT_PATH="${CHECKPOINT_BUCKET}/${INSTANCE_NAME}/$(date +%s)"
    gsutil -m cp -r /tmp/work-in-progress/* "$CHECKPOINT_PATH/" 2>/dev/null
    log "Saved checkpoint to $CHECKPOINT_PATH"
fi

# Step 3: Release any distributed locks
if command -v redis-cli &> /dev/null; then
    redis-cli -h redis.internal DEL "lock:${INSTANCE_NAME}" 2>/dev/null || true
    log "Released distributed lock"
fi

# Step 4: Deregister from the task queue
curl -s -X DELETE "https://task-queue.internal/workers/${INSTANCE_NAME}" || true
log "Deregistered from task queue"

log "Shutdown handler completed"
```

## Watching for Preemption in Your Application

Instead of relying solely on shutdown scripts, your application can proactively monitor for preemption notices:

```python
# preemption_watcher.py - Monitor for preemption and gracefully shut down
import requests
import threading
import signal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

METADATA_URL = "http://metadata.google.internal/computeMetadata/v1"
HEADERS = {"Metadata-Flavor": "Google"}


def watch_for_preemption(callback):
    """Watch the metadata server for preemption notice."""
    url = f"{METADATA_URL}/instance/preempted?wait_for_change=true"

    while True:
        try:
            response = requests.get(url, headers=HEADERS, timeout=300)
            if response.text.strip().lower() == "true":
                logger.warning("Preemption notice received!")
                callback()
                return
        except requests.exceptions.Timeout:
            # No preemption, loop and wait again
            continue
        except Exception as e:
            logger.error(f"Error watching for preemption: {e}")
            return


def on_preemption():
    """Called when preemption is detected. Save state and shut down."""
    logger.info("Saving checkpoint...")
    # Save your application state here
    save_checkpoint()

    logger.info("Checkpoint saved, shutting down gracefully")
    signal.raise_signal(signal.SIGTERM)


# Start the watcher in a background thread
watcher = threading.Thread(target=watch_for_preemption, args=(on_preemption,), daemon=True)
watcher.start()
```

## Using Spot VMs in Managed Instance Groups

Managed instance groups work with Spot VMs. If an instance is preempted, the MIG automatically creates a replacement:

```bash
# Create an instance template for Spot VMs
gcloud compute instance-templates create spot-worker-template \
    --machine-type=e2-standard-4 \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --provisioning-model=SPOT \
    --instance-termination-action=DELETE \
    --metadata-from-file=startup-script=startup.sh,shutdown-script=shutdown.sh

# Create a MIG with Spot VM instances
gcloud compute instance-groups managed create spot-worker-mig \
    --template=spot-worker-template \
    --size=10 \
    --zone=us-central1-a
```

When a Spot VM is preempted, the MIG detects the missing instance and creates a new one. Combined with a startup script that resumes from the last checkpoint, you get automatic recovery.

## Terraform Configuration

```hcl
# Spot VM instance template
resource "google_compute_instance_template" "spot_worker" {
  name_prefix  = "spot-worker-"
  machine_type = "e2-standard-4"

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_type    = "pd-ssd"
  }

  network_interface {
    network = "default"
  }

  scheduling {
    preemptible                 = false
    provisioning_model          = "SPOT"
    instance_termination_action = "STOP"
    automatic_restart           = false
  }

  metadata = {
    shutdown-script = file("${path.module}/scripts/shutdown.sh")
  }

  metadata_startup_script = file("${path.module}/scripts/startup.sh")

  lifecycle {
    create_before_destroy = true
  }
}

# MIG with Spot VM workers
resource "google_compute_instance_group_manager" "spot_workers" {
  name               = "spot-worker-mig"
  base_instance_name = "spot-worker"
  zone               = "us-central1-a"
  target_size        = 10

  version {
    instance_template = google_compute_instance_template.spot_worker.id
  }
}
```

## Checkpointing Strategies

The most important aspect of running on Spot VMs is having a good checkpointing strategy. Here are common patterns:

**Periodic checkpoints**: Save state to Cloud Storage every N minutes.

```bash
# Cron job that saves application state every 5 minutes
*/5 * * * * /opt/scripts/save-checkpoint.sh
```

**Workload-aware checkpoints**: Save after completing each unit of work.

```python
# Process items from a queue, checkpoint after each item
for item in task_queue.get_tasks():
    result = process(item)
    save_result(result)
    task_queue.acknowledge(item)  # Only ack after saving
```

**Resumable downloads/uploads**: Use tools that support resumption.

```bash
# gsutil supports resumable transfers by default
gsutil -o GSUtil:resumable_threshold=1M cp large-file.tar.gz gs://my-bucket/
```

## Cost Comparison

Here is a rough comparison for an e2-standard-4 instance in us-central1:

| Pricing Model | Hourly Cost | Monthly Cost (730 hrs) | Savings |
|---------------|-------------|------------------------|---------|
| On-Demand | ~$0.134 | ~$97.82 | - |
| 1-Year CUD | ~$0.089 | ~$64.97 | 34% |
| 3-Year CUD | ~$0.054 | ~$39.42 | 60% |
| Spot | ~$0.040 | ~$29.20 | 70% |

The savings are significant, but remember that Spot VMs can be interrupted at any time. The actual availability varies by zone and machine type.

## Best Practices

1. **Always write shutdown scripts.** Even if you think you do not need them, save at least enough state to know where to resume.
2. **Design for idempotency.** If a task runs twice (before and after preemption), it should produce the same result.
3. **Use task queues.** Distribute work through a queue (Pub/Sub, Cloud Tasks) so preempted workers do not lose their assignments.
4. **Diversify across zones.** Preemption rates vary by zone. Spread your Spot VMs across multiple zones.
5. **Mix Spot and on-demand.** For critical capacity, use on-demand instances as a baseline and Spot VMs for burst capacity.
6. **Monitor preemption rates.** Track how often your Spot VMs are preempted and adjust your strategy accordingly.
7. **Keep shutdown scripts fast.** You only have about 30 seconds. Do not try to upload a 10 GB checkpoint.

## Wrapping Up

Spot VMs are one of the best ways to reduce your GCP bill if your workloads can handle interruption. The key is preparation - write robust shutdown scripts, implement checkpointing, and design your application to resume from where it left off. With managed instance groups handling automatic replacement and startup scripts handling recovery, Spot VMs can be remarkably reliable for batch workloads, despite their ephemeral nature.
