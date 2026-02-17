# How to Use Preemptible and Spot VMs to Reduce Compute Engine Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Spot VMs, Preemptible VMs, Compute Engine, Cost Optimization, Google Cloud

Description: Learn how to use Google Cloud Spot and Preemptible VMs to cut compute costs by up to 91% for fault-tolerant and batch workloads.

---

If you are running batch jobs, data processing pipelines, CI/CD builds, or any workload that can handle interruptions, you are probably paying too much for compute. Spot VMs (the successor to Preemptible VMs) offer the same machine types as regular VMs at up to 60-91% discount. The catch is that Google can reclaim them at any time with a 30-second warning. For the right workloads, that trade-off is absolutely worth it.

This guide covers the differences between Spot and Preemptible VMs, how to set them up, and patterns for building resilient systems that take advantage of these discounted instances.

## Spot VMs vs. Preemptible VMs

Preemptible VMs were Google's original discounted instance offering. Spot VMs replaced them with some improvements:

| Feature | Preemptible VMs | Spot VMs |
|---------|----------------|----------|
| Max lifetime | 24 hours | No maximum |
| Preemption notice | 30 seconds | 30 seconds |
| Pricing | 60-91% discount | 60-91% discount |
| Availability | Being deprecated | Current offering |
| Live migration | Not supported | Not supported |

Spot VMs are strictly better than Preemptible VMs. The main improvement is removing the 24-hour maximum lifetime. If Google does not need the capacity back, your Spot VM can run indefinitely.

New workloads should always use Spot VMs. Preemptible VMs are still available but will eventually be retired.

## Creating Spot VMs

### Using the gcloud CLI

```bash
# Create a Spot VM
gcloud compute instances create my-spot-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --image-family=debian-11 \
  --image-project=debian-cloud
```

The `instance-termination-action` flag controls what happens when Google reclaims the VM:
- `STOP`: The VM is stopped (can be restarted later)
- `DELETE`: The VM is deleted

For most use cases, `STOP` is preferred because you can set up automation to restart it.

### Using Terraform

```hcl
# Create a Spot VM with Terraform
resource "google_compute_instance" "spot_worker" {
  name         = "spot-worker"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  # Configure as Spot VM
  scheduling {
    provisioning_model  = "SPOT"
    preemptible         = true
    automatic_restart   = false
    on_host_maintenance = "TERMINATE"
    instance_termination_action = "STOP"
  }

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  labels = {
    type = "spot-worker"
    team = "data"
  }
}
```

## Handling Preemption Gracefully

The key to using Spot VMs successfully is handling preemption gracefully. Google sends a 30-second warning before reclaiming an instance. You can detect this warning and take action.

### Checking the Metadata Server

Spot VMs receive a preemption notice through the metadata server:

```bash
# Script to check for preemption notice
#!/bin/bash
# Run this as a background process on your Spot VM

while true; do
  PREEMPTED=$(curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/preempted)

  if [ "$PREEMPTED" = "TRUE" ]; then
    echo "Preemption detected! Saving state..."
    # Save any in-progress work
    # Checkpoint your process
    # Flush buffers
    # Signal application to shut down gracefully
    kill -SIGTERM $(cat /var/run/my-app.pid)
    break
  fi

  sleep 5
done
```

### Using a Shutdown Script

GCP supports shutdown scripts that run when a VM is being preempted:

```bash
# Create a VM with a shutdown script
gcloud compute instances create my-spot-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --metadata=shutdown-script='#!/bin/bash
    echo "Preemption detected at $(date)" >> /var/log/preemption.log
    # Save checkpoint to Cloud Storage
    gsutil cp /tmp/checkpoint.dat gs://my-bucket/checkpoints/
    # Notify the team
    curl -X POST "https://hooks.slack.com/services/xxx" \
      -d "{\"text\": \"Spot VM preempted at $(date)\"}"
  '
```

## Workload Patterns for Spot VMs

### Pattern 1: Batch Processing with Managed Instance Groups

Use a Managed Instance Group (MIG) with Spot VMs for batch processing. The MIG automatically replaces preempted instances:

```bash
# Create an instance template with Spot VMs
gcloud compute instance-templates create spot-worker-template \
  --machine-type=e2-standard-4 \
  --provisioning-model=SPOT \
  --instance-termination-action=DELETE \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --metadata=startup-script='#!/bin/bash
    # Pull work from a queue and process it
    python3 /opt/worker/process_queue.py
  '

# Create a MIG that maintains a pool of Spot workers
gcloud compute instance-groups managed create spot-workers \
  --template=spot-worker-template \
  --size=10 \
  --zone=us-central1-a
```

### Pattern 2: CI/CD Build Agents

Spot VMs are perfect for CI/CD because builds are short-lived and can be retried:

```bash
# Create a Spot VM for Jenkins/GitLab runners
gcloud compute instances create ci-runner-spot \
  --zone=us-central1-a \
  --machine-type=e2-standard-8 \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --metadata=startup-script='#!/bin/bash
    # Register as a GitLab runner
    gitlab-runner register \
      --non-interactive \
      --url "https://gitlab.example.com" \
      --registration-token "TOKEN" \
      --executor "docker" \
      --docker-image "alpine:latest" \
      --tag-list "spot,linux"
  '
```

### Pattern 3: Data Processing with Checkpointing

For long-running data processing, implement checkpointing so work can resume after preemption:

```python
# Example: Data processing with checkpointing
import json
import os
from google.cloud import storage

class CheckpointedProcessor:
    def __init__(self, bucket_name, checkpoint_path):
        self.storage_client = storage.Client()
        self.bucket = self.storage_client.bucket(bucket_name)
        self.checkpoint_path = checkpoint_path
        self.last_processed_index = self.load_checkpoint()

    def load_checkpoint(self):
        """Load the last checkpoint from Cloud Storage."""
        blob = self.bucket.blob(self.checkpoint_path)
        try:
            data = json.loads(blob.download_as_string())
            print(f"Resuming from index {data['last_index']}")
            return data['last_index']
        except Exception:
            print("No checkpoint found, starting from beginning")
            return 0

    def save_checkpoint(self, index):
        """Save progress to Cloud Storage."""
        blob = self.bucket.blob(self.checkpoint_path)
        blob.upload_from_string(json.dumps({'last_index': index}))

    def process(self, items):
        """Process items with periodic checkpointing."""
        for i, item in enumerate(items[self.last_processed_index:],
                                  start=self.last_processed_index):
            # Do the actual work
            self.process_item(item)

            # Checkpoint every 100 items
            if i % 100 == 0:
                self.save_checkpoint(i)
                print(f"Checkpointed at index {i}")

        # Final checkpoint
        self.save_checkpoint(len(items))

    def process_item(self, item):
        """Process a single item."""
        # Your processing logic here
        pass
```

### Pattern 4: Mixed Spot and On-Demand

For production workloads, use a mix of on-demand VMs for the baseline and Spot VMs for burst capacity:

```bash
# Create an on-demand MIG for baseline capacity
gcloud compute instance-groups managed create baseline-workers \
  --template=ondemand-worker-template \
  --size=3 \
  --zone=us-central1-a

# Create a Spot MIG for burst capacity with autoscaling
gcloud compute instance-groups managed create burst-workers \
  --template=spot-worker-template \
  --size=0 \
  --zone=us-central1-a

gcloud compute instance-groups managed set-autoscaling burst-workers \
  --zone=us-central1-a \
  --min-num-replicas=0 \
  --max-num-replicas=20 \
  --target-cpu-utilization=0.7
```

## Spot VM Availability

Spot VM availability varies by zone, region, and machine type. If you get preempted frequently in one zone, try another:

```bash
# Check Spot VM pricing (which reflects availability)
gcloud compute machine-types list \
  --filter="zone:us-central1-a AND name:e2-standard-4" \
  --format="table(name, zone, guestCpus, memoryMb)"
```

You can also spread your Spot VMs across multiple zones for better availability:

```bash
# Create a regional MIG that spans multiple zones
gcloud compute instance-groups managed create regional-spot-workers \
  --template=spot-worker-template \
  --size=10 \
  --region=us-central1
```

## Cost Comparison

Here is what the savings look like for a typical workload:

| Instance Type | Hourly Cost | Monthly Cost (730h) | Savings |
|--------------|-------------|-------------------|---------|
| e2-standard-4 (on-demand) | $0.134 | $97.82 | - |
| e2-standard-4 (Spot) | $0.040 | $29.20 | 70% |
| n2-standard-8 (on-demand) | $0.389 | $283.97 | - |
| n2-standard-8 (Spot) | $0.097 | $70.81 | 75% |

At scale, this adds up quickly. A fleet of 50 Spot e2-standard-4 instances costs about $1,460/month versus $4,891/month on-demand, saving over $3,400 monthly.

## Best Practices

1. **Design for failure** - Assume any Spot VM can disappear at any moment. Use queues, checkpoints, and idempotent operations.

2. **Spread across zones** - Do not put all your Spot VMs in one zone. Preemption events can affect entire zones.

3. **Use instance termination action STOP** - This lets you restart the VM when capacity becomes available again, preserving local disk data.

4. **Set up monitoring** - Track preemption rates so you know how reliable Spot VMs are for your workloads in your chosen regions.

5. **Combine with MIGs** - Managed Instance Groups automatically replace preempted instances, taking the manual work out of maintaining your fleet.

## Wrapping Up

Spot VMs are one of the most impactful cost optimization levers on Google Cloud. The 60-91% discount is hard to ignore, and with proper architecture - checkpointing, queues, managed instance groups - the preemption risk is manageable. Start with non-critical workloads like CI/CD and batch processing, then expand to other use cases as you build confidence in your resilience patterns.
