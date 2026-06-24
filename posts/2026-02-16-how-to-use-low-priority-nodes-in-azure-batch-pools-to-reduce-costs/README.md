# How to Use Low-Priority Nodes in Azure Batch Pools to Reduce Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Batch, Low-Priority, Spot VMs, Cost Optimization, HPC, Cloud Computing

Description: Learn how to use low-priority and spot nodes in Azure Batch pools to reduce compute costs by up to 80% while managing preemption gracefully.

---

Azure Batch compute costs can add up fast, especially for large-scale workloads that need dozens or hundreds of VMs. Spot nodes let you tap into Azure's excess capacity at a steep discount compared with regular pricing. The catch is that Azure can reclaim these nodes at any time when it needs the capacity back. This post shows you how to use Spot nodes effectively, handle preemptions, and design your workloads to tolerate interruptions.

## What Are Spot Nodes?

Spot nodes in Azure Batch use surplus VM capacity in Azure datacenters. Because this capacity is not guaranteed, it is offered at a significant discount. When Azure needs the capacity back, Spot nodes are preempted. Azure Batch low-priority compute nodes were retired on September 30, 2025, but some Azure Batch APIs and CLI options still use "low-priority" in property and flag names for the Spot node target count.

The pricing difference can be substantial. Exact Spot prices vary by region, VM size, and available Azure capacity, so check Azure pricing for current rates before estimating savings.

## When to Use Spot Nodes

Spot nodes are a good fit for:

- **Batch processing** that can tolerate interruptions and resume from checkpoints
- **Rendering** workloads where individual frames can be re-rendered
- **Data processing** pipelines with idempotent tasks
- **Dev/test** environments where uptime is not critical
- **Embarrassingly parallel** workloads where each task is independent

They are not suitable for:

- Long-running tasks that cannot be checkpointed
- Time-sensitive workloads with strict deadlines
- Stateful workloads that lose progress on preemption

## Step 1: Create a Pool with Spot Nodes

You can create a pool that uses only Spot nodes or a mix of dedicated and Spot nodes. Spot nodes require a Batch account that uses user subscription pool allocation mode. In the Azure CLI, the target Spot node count is still set with `--target-low-priority-nodes`.

```bash
# Create a pool with only Spot nodes

az batch pool create \
  --id low-pri-pool \
  --vm-size Standard_D4s_v3 \
  --target-low-priority-nodes 20 \
  --target-dedicated-nodes 0 \
  --image "canonical:0001-com-ubuntu-server-jammy:22_04-lts" \
  --node-agent-sku-id "batch.node.ubuntu 22.04"
```

For a mixed pool with both dedicated and Spot nodes.

```bash
# Create a mixed pool - dedicated for reliability, Spot for cost savings
az batch pool create \
  --id mixed-pool \
  --vm-size Standard_D4s_v3 \
  --target-dedicated-nodes 5 \
  --target-low-priority-nodes 15 \
  --image "canonical:0001-com-ubuntu-server-jammy:22_04-lts" \
  --node-agent-sku-id "batch.node.ubuntu 22.04"
```

This gives you 5 dedicated nodes that will remain available, plus 15 Spot nodes for extra capacity when surplus capacity is available.

## Step 2: Handle Preemption

When a Spot node is preempted, Azure Batch takes the following actions:

1. The node's state changes to "preempted"
2. Any running task on the node is interrupted
3. The task is re-queued and rescheduled on another available node
4. Local data on the VM is lost
5. The pool continues trying to reach the target number of Spot nodes; when replacement capacity is found, the node can be reinitialized

Batch automatically requeues preempted tasks, but you need to make sure your tasks are idempotent - running the same task twice should produce the same result.

Check for preempted nodes.

```bash
# List nodes and check for preemption
az batch node list \
  --pool-id mixed-pool \
  --filter "state eq 'preempted'" \
  --output table

# View preemption events in node history
az batch node show \
  --pool-id mixed-pool \
  --node-id tvm-12345 \
  --query "recentTasks"
```

## Step 3: Design Tasks for Preemption Tolerance

The key to using Spot nodes successfully is making your tasks resilient to interruption.

**Short tasks:** Break large jobs into small tasks. If a task takes 5 minutes and gets preempted at minute 4, you lose 4 minutes of work. If the same work is split into 5 one-minute tasks, a preemption loses at most 1 minute.

**Checkpointing:** For tasks that take longer, implement checkpointing. Save intermediate progress to Azure Storage so the task can resume from the last checkpoint when retried.

Here is a Python example of a task with checkpointing.

```python
import os
import json
from azure.storage.blob import BlobServiceClient

def load_checkpoint(blob_client, task_id):
    """Load the last checkpoint from Azure Storage"""
    try:
        blob = blob_client.get_blob_client("checkpoints", f"{task_id}.json")
        data = blob.download_blob().readall()
        return json.loads(data)
    except Exception:
        # No checkpoint found, start from the beginning
        return {"last_processed_index": 0, "partial_results": []}

def save_checkpoint(blob_client, task_id, state):
    """Save checkpoint to Azure Storage"""
    blob = blob_client.get_blob_client("checkpoints", f"{task_id}.json")
    blob.upload_blob(json.dumps(state), overwrite=True)

def process_data(task_id, data_items):
    blob_client = BlobServiceClient.from_connection_string(os.environ["STORAGE_CONN"])

    # Resume from last checkpoint
    checkpoint = load_checkpoint(blob_client, task_id)
    start_index = checkpoint["last_processed_index"]
    results = checkpoint["partial_results"]

    for i in range(start_index, len(data_items)):
        # Process one item
        result = heavy_computation(data_items[i])
        results.append(result)

        # Save checkpoint every 100 items
        if (i + 1) % 100 == 0:
            save_checkpoint(blob_client, task_id, {
                "last_processed_index": i + 1,
                "partial_results": results
            })

    return results
```

## Step 4: Configure Retry Policies

Preempted tasks are automatically requeued by Azure Batch. Retry policies are still useful for application failures, such as a nonzero process exit code.

```json
{
  "id": "resilient-task",
  "commandLine": "/bin/bash -c 'python3 process.py'",
  "constraints": {
    "maxTaskRetryCount": 5,
    "maxWallClockTime": "PT2H"
  },
  "environmentSettings": [
    {
      "name": "STORAGE_CONN",
      "value": "DefaultEndpointsProtocol=https;AccountName=..."
    }
  ]
}
```

Set `maxTaskRetryCount` to a value that accounts for transient application failures. Batch recovery retries caused by node recovery or preemption are independent of this count.

## Step 5: Use Autoscale to Maintain Target Capacity

When Spot nodes are preempted, usable pool capacity drops. An autoscale formula can request replacement nodes.

```text
// Maintain the desired capacity by requesting new Spot nodes
$taskSlotsPerNode = 4;
$neededNodes = ceil($PendingTasks / $taskSlotsPerNode);

// Always try to have at least 3 dedicated nodes for reliability
$TargetDedicatedNodes = min(5, max(3, $neededNodes));

// Use Spot nodes for the rest of the demand
$remainingNeed = max(0, $neededNodes - $TargetDedicatedNodes);
$TargetLowPriorityNodes = min(50, $remainingNeed);
```

This formula ensures that even if all Spot nodes are preempted, the dedicated nodes keep processing tasks. When Spot capacity becomes available again, the pool scales back up.

## Step 6: Monitor Cost Savings

Track how much you are saving with Spot nodes.

```bash
# View pool usage statistics
az batch pool usage-metrics list \
  --start-time "2026-02-01T00:00:00Z" \
  --end-time "2026-02-16T00:00:00Z" \
  --output table
```

You can also estimate savings by comparing the dedicated price against the Spot price for your VM size.

| VM Size | Dedicated Price/hr | Spot Price/hr | Savings |
|---------|-------------------|----------------------|---------|
| Standard_D2s_v3 | Check current Azure pricing | Check current Azure pricing | Varies |
| Standard_D4s_v3 | Check current Azure pricing | Check current Azure pricing | Varies |
| Standard_D8s_v3 | Check current Azure pricing | Check current Azure pricing | Varies |
| Standard_F16s_v2 | Check current Azure pricing | Check current Azure pricing | Varies |

Note: Prices vary by region and change over time. Check Azure pricing for current rates.

## Step 7: Manage Preemption Risk

The preemption rate varies by VM size, region, and time. Some strategies to reduce risk:

**Use less popular VM sizes:** VMs in high demand are preempted more frequently. Consider using a slightly different size that has more available capacity.

**Spread across multiple pools:** Create pools in different regions to reduce the chance that all nodes are preempted simultaneously.

**Set the right mix:** For critical workloads, use a higher ratio of dedicated to Spot nodes. A common starting point is 20% dedicated and 80% Spot.

## Preemption Handling Flow

```mermaid
graph TD
    A[Task Running on Spot Node] --> B{Node Preempted?}
    B -->|No| C[Task Completes Normally]
    B -->|Yes| D[Task Interrupted]
    D --> E[Task Re-queued]
    E --> F{Available Node?}
    F -->|Dedicated Node| G[Task Runs on Dedicated Node]
    F -->|New Spot Node| H[Task Runs on Spot Node]
    F -->|No Nodes| I[Task Waits in Queue]
    G --> C
    H --> B
```

## Common Pitfalls

**Confusing preemption with task failure retries:** Preempted tasks are automatically requeued by Batch. Set a reasonable `maxTaskRetryCount` for transient failures in your application code.

**Large, monolithic tasks:** A task that runs for 8 hours and gets preempted at hour 7 loses all progress. Break it into smaller pieces or implement checkpointing.

**Ignoring preemption in progress tracking:** If you track progress by completed tasks, preempted and retried tasks can cause confusing counts. Track unique task IDs and final states.

**Overcommitting to Spot:** If your workload has a hard deadline, do not rely solely on Spot nodes. Preemption events can cascade and significantly delay completion.

## Summary

Spot nodes in Azure Batch can cut your compute costs significantly, making large-scale batch processing much more affordable. The trade-off is the risk of preemption, but with proper task design - short tasks, checkpointing, retry policies for application failures, and a mix of dedicated and Spot nodes - you can handle interruptions gracefully. Start with a mixed pool, monitor preemption rates for your chosen VM size and region, and adjust the ratio based on your experience.
