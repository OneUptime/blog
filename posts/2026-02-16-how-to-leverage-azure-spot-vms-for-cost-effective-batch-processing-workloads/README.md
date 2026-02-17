# How to Leverage Azure Spot VMs for Cost-Effective Batch Processing Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Spot VMs, Batch Processing, Cost Optimization, Compute, Cloud, FinOps

Description: Learn how to use Azure Spot VMs to save up to 90% on compute costs for batch processing and fault-tolerant workloads.

---

Azure Spot VMs let you rent unused Azure compute capacity at up to 90% off the pay-as-you-go price. The catch is that Azure can take the VM away from you at any time when it needs the capacity back. This makes Spot VMs a poor choice for production web servers, but a fantastic choice for batch processing, rendering, CI/CD pipelines, data processing, and any workload that can tolerate interruptions.

In this post, I will walk through how Spot VMs work, the best use cases, how to set them up, and strategies for handling evictions gracefully.

## How Azure Spot VMs Work

Spot VMs use Azure's spare compute capacity. The price fluctuates based on supply and demand - when demand is low, prices drop; when demand is high, prices rise. If Azure needs the capacity for pay-as-you-go or reserved customers, your Spot VM gets evicted.

You set a maximum price you are willing to pay. If the Spot price goes above your maximum, or Azure needs the capacity, your VM gets a 30-second notice before eviction.

There are two eviction policies:

- **Stop/Deallocate**: The VM is stopped and deallocated. You keep the disks and can restart the VM later when capacity is available.
- **Delete**: The VM is deleted entirely. Use this for stateless workloads where you do not need to preserve the VM.

## Step 1: Identify Good Candidates for Spot VMs

Spot VMs work best for workloads that are:

- **Fault-tolerant**: The workload can handle being interrupted and restarted without data loss.
- **Checkpoint-capable**: The workload can save progress and resume from where it left off.
- **Flexible on timing**: You do not have a strict deadline for completion.
- **Parallelizable**: You can split the work across multiple VMs so one eviction does not stop everything.

Good candidates include:

- Video rendering and transcoding
- Machine learning model training (with checkpointing)
- CI/CD build and test pipelines
- Data analysis and ETL jobs
- Financial simulations and Monte Carlo analysis
- Scientific computing
- Dev/test environments

Bad candidates:

- Production web servers
- Databases
- Anything that requires 24/7 uptime

## Step 2: Create a Spot VM

Creating a Spot VM is straightforward - it is the same as creating a regular VM with a few extra parameters:

```bash
# Create a Spot VM with a maximum price and Stop/Deallocate eviction policy
az vm create \
  --resource-group myResourceGroup \
  --name mySpotVM \
  --location eastus \
  --size Standard_D4s_v5 \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --priority Spot \
  --eviction-policy Deallocate \
  --max-price 0.05 \
  --output json
```

The `--max-price` parameter sets the maximum per-hour price you are willing to pay. Set it to `-1` to pay up to the pay-as-you-go price (you will only be evicted for capacity reasons, not price).

```bash
# Create a Spot VM with max-price set to -1
# This means you pay the current Spot price but will not be evicted due to price increases
az vm create \
  --resource-group myResourceGroup \
  --name mySpotVM \
  --location eastus \
  --size Standard_D4s_v5 \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --priority Spot \
  --eviction-policy Delete \
  --max-price -1
```

## Step 3: Check Current Spot Pricing

Before creating Spot VMs, check the current pricing to see how much you will save:

```bash
# Check the current spot price for a VM size in a region
az rest \
  --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/providers/Microsoft.Compute/locations/eastus/spotPriceHistory?api-version=2024-07-01" \
  --query "value[?contains(vmSize, 'Standard_D4s_v5')].{VMSize: vmSize, Price: retailPrice, OS: osType}" \
  --output table
```

You can also view historical Spot pricing in the Azure portal under **Virtual Machines > Pricing > Spot**. This helps you understand the price volatility and set a reasonable max price.

## Step 4: Handle Evictions Gracefully

The key to using Spot VMs successfully is handling evictions without losing work. Azure sends a 30-second warning before evicting a Spot VM. Your application needs to detect this warning and take action.

### Check the Scheduled Events Endpoint

Azure exposes eviction notices through the Metadata Service at `http://169.254.169.254/metadata/scheduledevents`:

```python
#!/usr/bin/env python3
# Spot VM eviction handler
# Polls the Azure Metadata Service for eviction notices
# and performs graceful shutdown actions

import requests
import time
import subprocess
import json

METADATA_URL = "http://169.254.169.254/metadata/scheduledevents"
HEADERS = {"Metadata": "true"}
POLL_INTERVAL = 5  # seconds

def check_for_eviction():
    """Poll the metadata service for scheduled events."""
    try:
        response = requests.get(
            METADATA_URL,
            headers=HEADERS,
            params={"api-version": "2020-07-01"},
            timeout=2
        )
        events = response.json().get("Events", [])

        for event in events:
            if event.get("EventType") == "Preempt":
                print(f"Eviction notice received! EventId: {event['EventId']}")
                return True
    except Exception as e:
        print(f"Error checking metadata: {e}")

    return False

def graceful_shutdown():
    """Save checkpoint and clean up before eviction."""
    print("Performing graceful shutdown...")
    # Save current progress to blob storage or shared file
    subprocess.run(["python3", "save_checkpoint.py"], check=True)
    # Stop any running processing gracefully
    subprocess.run(["systemctl", "stop", "my-batch-worker"], check=True)
    print("Shutdown complete.")

if __name__ == "__main__":
    print("Spot VM eviction monitor started")
    while True:
        if check_for_eviction():
            graceful_shutdown()
            break
        time.sleep(POLL_INTERVAL)
```

### Checkpoint Your Work

For batch processing, implement checkpointing so you can resume from the last saved state after eviction:

```python
# Example: Batch processing with checkpointing to Azure Blob Storage
import json
from azure.storage.blob import BlobServiceClient

def save_checkpoint(blob_client, job_id, progress):
    """Save processing progress to blob storage."""
    checkpoint = {
        "job_id": job_id,
        "last_processed_item": progress,
        "timestamp": time.time()
    }
    # Upload the checkpoint as a JSON blob
    blob_client.upload_blob(
        json.dumps(checkpoint),
        overwrite=True
    )
    print(f"Checkpoint saved: item {progress}")

def load_checkpoint(blob_client, job_id):
    """Load the last checkpoint to resume processing."""
    try:
        data = blob_client.download_blob().readall()
        checkpoint = json.loads(data)
        print(f"Resuming from item {checkpoint['last_processed_item']}")
        return checkpoint["last_processed_item"]
    except Exception:
        print("No checkpoint found, starting from beginning")
        return 0
```

## Step 5: Use Spot VMs with Virtual Machine Scale Sets

For batch processing, running a single Spot VM is fragile. A better approach is to use a Virtual Machine Scale Set (VMSS) with Spot priority. If one VM gets evicted, others continue processing.

```bash
# Create a VMSS with Spot VMs
az vmss create \
  --resource-group myResourceGroup \
  --name mySpotVMSS \
  --location eastus \
  --vm-sku Standard_D4s_v5 \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --instance-count 10 \
  --priority Spot \
  --eviction-policy Delete \
  --max-price -1 \
  --single-placement-group false
```

You can also mix Spot and regular VMs in a VMSS to ensure a minimum baseline capacity:

```bash
# Create a VMSS with a mix of regular and Spot instances
# Use the orchestration mode Flexible for more control
az vmss create \
  --resource-group myResourceGroup \
  --name myMixedVMSS \
  --location eastus \
  --vm-sku Standard_D4s_v5 \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --instance-count 5 \
  --priority Regular \
  --orchestration-mode Flexible

# Add Spot instances to the same VMSS
az vmss update \
  --resource-group myResourceGroup \
  --name myMixedVMSS \
  --set "virtualMachineProfile.priority=Spot"
```

## Step 6: Use Azure Batch for Managed Spot Processing

If you do not want to manage Spot VMs yourself, Azure Batch handles evictions, retries, and job scheduling for you:

```bash
# Create a Batch pool with Spot VMs
az batch pool create \
  --account-name myBatchAccount \
  --id mySpotPool \
  --vm-size Standard_D4s_v5 \
  --image "canonical:0001-com-ubuntu-server-jammy:22_04-lts" \
  --node-agent-sku-id "batch.node.ubuntu 22.04" \
  --target-low-priority-nodes 20 \
  --target-dedicated-nodes 2
```

In Azure Batch terminology, "low-priority nodes" are Spot VMs. The `target-dedicated-nodes` parameter sets a minimum number of regular VMs to guarantee some capacity even during high eviction periods.

## Step 7: Monitor Eviction Rates

Track eviction rates to understand how reliable Spot VMs are for your chosen size and region:

```bash
# Check eviction history for your Spot VMs
az monitor activity-log list \
  --resource-group myResourceGroup \
  --query "[?operationName.value=='Microsoft.Compute/virtualMachines/preempt/action'].{VM: resourceId, Time: eventTimestamp}" \
  --output table
```

Some VM sizes and regions have lower eviction rates than others. Less popular VM sizes in less congested regions tend to have better availability.

## Cost Comparison

Here is what Spot pricing looks like for some common VM sizes (prices are approximate and fluctuate):

| VM Size | Pay-as-you-go | Spot Price | Savings |
|---------|--------------|-----------|---------|
| Standard_D4s_v5 | $0.192/hr | $0.019/hr | 90% |
| Standard_D8s_v5 | $0.384/hr | $0.042/hr | 89% |
| Standard_F4s_v2 | $0.169/hr | $0.034/hr | 80% |
| Standard_E4s_v5 | $0.252/hr | $0.028/hr | 89% |

At 90% savings, a workload that costs $1,000/month on regular VMs would cost $100/month on Spot VMs.

## Summary

Azure Spot VMs are incredibly cost-effective for batch processing and fault-tolerant workloads. The key to success is building eviction handling into your application - detect the 30-second warning, checkpoint your progress, and be ready to resume on a new instance. Use VMSS or Azure Batch to run multiple Spot instances in parallel so one eviction does not halt your entire pipeline. Set your max price to -1 unless you have a strict budget ceiling. And always keep a small number of regular VMs for baseline capacity if you need guaranteed progress.
