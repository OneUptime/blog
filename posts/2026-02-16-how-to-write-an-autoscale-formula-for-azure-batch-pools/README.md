# How to Write an Autoscale Formula for Azure Batch Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Batch, Autoscale, Formula, HPC, Cost Optimization, Pool Management

Description: Learn how to write and test autoscale formulas for Azure Batch pools to dynamically adjust compute nodes based on workload demand and scheduling patterns.

---

A fixed-size Azure Batch pool either wastes money when idle or cannot keep up during peak loads. Autoscaling solves this by dynamically adjusting the number of compute nodes based on pending tasks, time of day, or custom metrics. Azure Batch uses a formula-based autoscale system where you write expressions that the platform evaluates periodically to determine the desired node count. This post explains the formula language and walks through practical examples.

## How Autoscale Works in Azure Batch

When autoscale is enabled on a pool, Azure Batch evaluates your formula at regular intervals (configurable, default is 15 minutes). The formula calculates a target node count, and Batch adjusts the pool accordingly.

The formula has access to several built-in variables that describe the current state of the pool and its workload:

- `$PendingTasks` - number of tasks waiting to run
- `$ActiveTasks` - number of tasks currently running
- `$RunningTasks` - alias for ActiveTasks
- `$SucceededTasks` - tasks that completed successfully
- `$FailedTasks` - tasks that failed
- `$CurrentDedicatedNodes` - current number of dedicated nodes
- `$CurrentLowPriorityNodes` - current number of low-priority nodes
- `$TargetDedicatedNodes` - the output variable for desired dedicated nodes
- `$TargetLowPriorityNodes` - the output variable for desired low-priority nodes

## Step 1: Enable Autoscale on a Pool

You can enable autoscale when creating a pool or on an existing pool.

```bash
# Create a pool with autoscale enabled
az batch pool create \
  --id autoscale-pool \
  --vm-size Standard_D2s_v3 \
  --image "canonical:0001-com-ubuntu-server-jammy:22_04-lts" \
  --node-agent-sku-id "batch.node.ubuntu 22.04" \
  --auto-scale-formula '$TargetDedicatedNodes = max(0, $PendingTasks);' \
  --auto-scale-evaluation-interval "PT5M"
```

The `--auto-scale-evaluation-interval` specifies how often the formula is evaluated. `PT5M` means every 5 minutes. The minimum is 5 minutes.

For an existing pool, enable autoscale like this.

```bash
# Enable autoscale on an existing fixed-size pool
az batch pool autoscale enable \
  --pool-id my-pool \
  --auto-scale-formula '$TargetDedicatedNodes = max(0, $PendingTasks);' \
  --auto-scale-evaluation-interval "PT5M"
```

## Step 2: Write a Basic Task-Based Formula

The simplest formula scales based on pending tasks - one node per pending task.

```
// One dedicated node per pending task, between 0 and 20
$TargetDedicatedNodes = min(20, max(0, $PendingTasks));
```

This is often too aggressive. If you have 1000 pending tasks, you get 20 nodes (capped), but each node might be able to run multiple tasks. A better formula accounts for task slots per node.

```
// Scale based on pending tasks divided by task slots per node
// Assumes 4 task slots per node
$taskSlotsPerNode = 4;
$TargetDedicatedNodes = min(20, max(0, ceil($PendingTasks / $taskSlotsPerNode)));
```

## Step 3: Use Sample-Based Metrics

For more sophisticated scaling, use the `GetSample()` function to look at historical metrics. This provides smoother scaling based on trends rather than instantaneous values.

```
// Use the average pending tasks over the last 10 minutes
$samples = $PendingTasks.GetSamplePercent(TimeInterval_Minute * 10);
$tasks = ($samples < 70) ? max(0, $PendingTasks.GetSample(1)) : max(0, avg($PendingTasks.GetSample(TimeInterval_Minute * 10)));
$taskSlotsPerNode = 4;
$TargetDedicatedNodes = min(50, ceil($tasks / $taskSlotsPerNode));
```

The `GetSamplePercent()` check is important. If there are not enough samples available (less than 70%), the formula falls back to the latest single sample instead of the average. This handles the cold start case when the pool first enables autoscale.

## Step 4: Time-Based Scaling

For workloads with predictable patterns, scale based on time of day.

```
// Scale up during business hours (8 AM - 6 PM UTC), scale down at night
$isBusinessHours = (time().hour >= 8 && time().hour < 18);
$peakNodes = 10;
$offPeakNodes = 2;
$TargetDedicatedNodes = $isBusinessHours ? $peakNodes : $offPeakNodes;
```

You can combine time-based scaling with task-based scaling.

```
// Minimum nodes during business hours, plus task-based scaling
$isBusinessHours = (time().hour >= 8 && time().hour < 18);
$minNodes = $isBusinessHours ? 5 : 0;
$taskBasedNodes = ceil($PendingTasks / 4);
$TargetDedicatedNodes = min(30, max($minNodes, $taskBasedNodes));
```

## Step 5: Mixed Dedicated and Low-Priority Nodes

Low-priority (spot) nodes are much cheaper but can be preempted. A good strategy uses a base of dedicated nodes with low-priority nodes for burst capacity.

```
// Base dedicated nodes + low-priority for burst
$taskSlotsPerNode = 4;
$totalNeeded = ceil($PendingTasks / $taskSlotsPerNode);

// Always have at least 2 dedicated nodes, up to 10
$TargetDedicatedNodes = min(10, max(2, $totalNeeded));

// Use low-priority nodes for anything above the dedicated cap
$overflow = max(0, $totalNeeded - $TargetDedicatedNodes);
$TargetLowPriorityNodes = min(40, $overflow);
```

## Step 6: Gradual Scale-Down

Abruptly removing nodes can interrupt running tasks. A gradual scale-down formula prevents this.

```
// Scale up quickly but scale down slowly
$taskSlotsPerNode = 4;
$desiredNodes = ceil($PendingTasks / $taskSlotsPerNode);

// Scale up immediately to desired count
// Scale down by at most 2 nodes per evaluation
$scaleDown = max(0, $CurrentDedicatedNodes - 2);
$TargetDedicatedNodes = max($desiredNodes, min($CurrentDedicatedNodes, $scaleDown));
$TargetDedicatedNodes = min(30, max(0, $TargetDedicatedNodes));
```

## Step 7: Test Your Formula

Before applying a formula to a production pool, test it using the evaluate endpoint. This shows you what the formula would calculate without actually changing the pool.

```bash
# Test a formula without applying it
az batch pool autoscale evaluate \
  --pool-id my-pool \
  --auto-scale-formula '$TargetDedicatedNodes = min(20, max(0, ceil($PendingTasks / 4)));'
```

The output shows the calculated values for each variable and the final target node count. This is invaluable for debugging.

## Step 8: Update a Running Formula

You can update the formula on a pool that already has autoscale enabled.

```bash
# Update the autoscale formula
az batch pool autoscale enable \
  --pool-id my-pool \
  --auto-scale-formula '$taskSlotsPerNode = 4; $TargetDedicatedNodes = min(30, max(2, ceil($PendingTasks / $taskSlotsPerNode)));' \
  --auto-scale-evaluation-interval "PT5M"
```

## Formula Language Reference

Here is a quick reference for the formula syntax.

| Feature | Syntax | Example |
|---------|--------|---------|
| Variables | `$name = value;` | `$max = 10;` |
| Min/Max | `min(a, b)` / `max(a, b)` | `min(20, $count)` |
| Ceiling | `ceil(value)` | `ceil(7.2)` = 8 |
| Ternary | `condition ? a : b` | `$x > 5 ? 10 : 2` |
| Time | `time()` | `time().hour` |
| Samples | `$Metric.GetSample(interval)` | `$PendingTasks.GetSample(TimeInterval_Minute * 10)` |
| Average | `avg(samples)` | `avg($PendingTasks.GetSample(...))` |
| Percentage | `$Metric.GetSamplePercent(interval)` | Check sample availability |

## Common Mistakes

**Dividing by zero:** If `$taskSlotsPerNode` is calculated dynamically and could be zero, add a guard.

```
$taskSlotsPerNode = max(1, $configuredSlots);
```

**Not handling sample unavailability:** When a pool first starts or after a period of inactivity, there might not be enough samples. Always check `GetSamplePercent()` before using `GetSample()`.

**Setting evaluation interval too low:** The minimum is 5 minutes. Setting it lower will cause an error. For most workloads, 5-10 minutes is appropriate.

**Forgetting semicolons:** Each statement in the formula must end with a semicolon. Missing semicolons cause cryptic parse errors.

## Monitoring Autoscale Behavior

Check the autoscale evaluation results to see how the formula is performing.

```bash
# View the last autoscale evaluation result
az batch pool show \
  --pool-id my-pool \
  --query "autoScaleRun"
```

The output includes the timestamp, formula result, and any errors from the last evaluation.

## Summary

Azure Batch autoscale formulas give you precise control over how your compute pools respond to workload changes. Start with a simple task-based formula, test it with the evaluate command, and refine based on observed behavior. For production workloads, combine task-based scaling with time-based patterns and use mixed dedicated/low-priority nodes to balance cost and reliability. The formula language is small but expressive enough to handle most scaling scenarios you will encounter.
