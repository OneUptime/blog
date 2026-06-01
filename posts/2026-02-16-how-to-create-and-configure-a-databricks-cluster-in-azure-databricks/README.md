# How to Create and Configure a Databricks Cluster in Azure Databricks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Databricks, Cluster Configuration, Apache Spark, Cloud Computing, Azure, Data Engineering

Description: A practical guide to creating and configuring clusters in Azure Databricks with the right settings for development, production, and cost optimization.

---

Compute is the backbone of Azure Databricks. Notebooks, jobs, and queries run on compute resources such as all-purpose compute, jobs compute, serverless compute, or SQL warehouses. Choosing the right classic compute configuration directly impacts performance, cost, and reliability. Get it wrong and you will either burn through your budget with oversized clusters or waste hours waiting for undersized ones to finish processing.

In this post, I will walk through creating and configuring clusters in Azure Databricks, explain the key settings and what they mean, and share configurations that work well for different workload types.

## Cluster Types

For classic Spark compute, Azure Databricks offers two common cluster types:

- **All-purpose compute** - interactive clusters for development, exploration, and collaboration. Multiple users can attach notebooks to the same cluster. They stay running until you manually terminate them or they auto-terminate after an idle period.

- **Jobs compute** - created automatically when a job runs and terminated when the job completes. They are ephemeral and cost-effective for scheduled production workloads.

For development work, you will often use all-purpose compute. For production pipelines that need classic Spark clusters, use jobs compute rather than all-purpose compute.

## Step 1: Create All-Purpose Compute

1. In the Azure Databricks workspace, click **Compute** in the left sidebar
2. Click **Create compute**
3. Give your cluster a descriptive name (e.g., `dev-analytics-team`)

Now configure the settings.

### Databricks Runtime Version

The runtime version determines which version of Apache Spark, Delta Lake, and other libraries are installed. Choose based on your needs:

- **Standard Runtime** - base Spark + Delta Lake
- **ML Runtime** - adds machine learning libraries (PyTorch, TensorFlow, scikit-learn, MLflow)
- **Photon** - a vectorized query engine that accelerates Spark SQL and DataFrame operations. For all-purpose and jobs compute, enable it with the **Use Photon Acceleration** checkbox or the `runtime_engine` API field.

For general data engineering, use the latest LTS (Long Term Support) standard runtime. For ML workloads, use the ML runtime. For SQL-heavy workloads, consider Photon.

### Node Type (Worker and Driver)

The node type determines the VM size for your cluster nodes. The right choice depends on your workload.

| Workload Type | Recommended VM Family | Why |
|---------------|----------------------|-----|
| General ETL | Standard_DS3_v2 or Standard_D4s_v3 | Balanced compute and memory |
| Memory-intensive (large joins, caching) | Standard_E8s_v3 or Standard_E16s_v3 | High memory-to-core ratio |
| Compute-intensive (ML training) | Standard_F8s_v2 or Standard_NC6s_v3 (GPU) | High CPU or GPU |
| Development/testing | Standard_DS3_v2 | Cost-effective for small datasets |

The driver node runs the Spark driver process and coordinates work across workers. For most workloads, use the same node type for both driver and workers. For workloads that collect large results to the driver, use a larger driver node.

### Autoscaling

Enable autoscaling to let Databricks add or remove worker nodes based on the current workload.

- **Min workers** - the minimum number of workers (set to 1 for dev clusters, higher for production)
- **Max workers** - the maximum number of workers (caps your cost)

```text
Min workers: 2
Max workers: 8
```

Autoscaling works well for interactive clusters where workload varies. For job clusters with predictable workloads, you might prefer a fixed size to avoid the overhead of scaling.

### Auto-Termination

Set auto-termination to avoid paying for idle clusters. The cluster will shut down after the specified period of inactivity.

- **Development clusters** - 30-60 minutes
- **Shared team clusters** - 120 minutes
- **Job clusters** - not applicable (they terminate after the job)

## Step 2: Configure Advanced Settings

Click "Advanced Options" to access additional configuration.

### Spark Configuration

Add Spark configuration properties to tune the Spark engine for your workload.

```properties
# Enable adaptive query execution for better join and aggregation performance

spark.sql.adaptive.enabled true

# Set the shuffle partition count (default 200 is often too high for small datasets)
spark.sql.shuffle.partitions 100

# Enable Delta Lake optimized writes
spark.databricks.delta.optimizeWrite.enabled true

# Auto-compact small files in Delta tables
spark.databricks.delta.autoCompact.enabled true

# Set timezone for consistent timestamp handling
spark.sql.session.timeZone UTC
```

### Environment Variables

Set environment variables that your notebooks and applications can access.

```text
APP_ENV=development
LOG_LEVEL=INFO
DATA_LAKE_PATH=abfss://raw@mystorageaccount.dfs.core.windows.net
```

### Init Scripts

Init scripts run when a cluster starts, before any user code. They are useful for installing system packages, setting up authentication, or configuring the environment.

```bash
#!/bin/bash
# init_script.sh - Install additional Python packages and system tools

# Install Python packages not included in the runtime
/databricks/python/bin/pip install great-expectations pyarrow==14.0.0

# Install system packages
apt-get update && apt-get install -y jq
```

Store init scripts in Unity Catalog volumes, workspace files, or a cloud storage location and reference them in the cluster configuration. Avoid storing init scripts in the DBFS root, which is deprecated.

### Cluster Policies

Cluster policies let administrators define constraints on cluster configurations. This prevents users from creating overly expensive clusters.

Cluster policy example - limit max workers and node types:

```json
{
  "spark_version": {
    "type": "regex",
    "pattern": "17\\..*",
    "defaultValue": "17.3.x-scala2.13"
  },
  "node_type_id": {
    "type": "allowlist",
    "values": ["Standard_DS3_v2", "Standard_DS4_v2", "Standard_E4s_v3"],
    "defaultValue": "Standard_DS3_v2"
  },
  "autoscale.max_workers": {
    "type": "range",
    "maxValue": 10,
    "defaultValue": 4
  },
  "autotermination_minutes": {
    "type": "range",
    "minValue": 10,
    "maxValue": 120,
    "defaultValue": 60
  }
}
```

## Step 3: Create a Job Cluster for Production

Job clusters are defined as part of a job configuration, not created separately. Here is what the configuration looks like.

Job cluster configuration for a production ETL job:

```json
{
  "new_cluster": {
    "spark_version": "17.3.x-scala2.13",
    "node_type_id": "Standard_DS4_v2",
    "num_workers": 4,
    "runtime_engine": "PHOTON",
    "spark_conf": {
      "spark.sql.adaptive.enabled": "true",
      "spark.sql.shuffle.partitions": "200",
      "spark.databricks.delta.optimizeWrite.enabled": "true"
    },
    "azure_attributes": {
      "first_on_demand": 1,
      "availability": "SPOT_WITH_FALLBACK_AZURE",
      "spot_bid_max_price": -1
    },
    "policy_id": "<cluster-policy-id>"
  }
}
```

### Spot Instances

For non-critical workloads, use spot instances (preemptible VMs) to save up to 80% on compute costs. Spot instances can be reclaimed by Azure, so they work best for fault-tolerant batch jobs.

Configure spot instances in the cluster settings:

- **First on demand** - the number of nodes guaranteed to be on-demand (always set the driver to on-demand)
- **Spot bid max price** - set to -1 for the default (pay up to the on-demand price)

```text
First on demand: 1 (ensures driver is always on-demand)
Spot instances: Workers 2-8 use spot
Fallback to on-demand: Yes (if spot is unavailable)
```

## Cluster Configuration for Common Workloads

Here are some configurations I have used in production.

### Small Development Cluster

```text
Runtime: 17.3.x LTS
Driver: Standard_DS3_v2 (14 GB, 4 cores)
Workers: 1-2, Standard_DS3_v2
Auto-terminate: 30 minutes
Spot instances: All workers
```

### Medium ETL Cluster

```text
Runtime: 17.3.x LTS with Photon
Driver: Standard_DS4_v2 (28 GB, 8 cores)
Workers: 2-8, Standard_DS4_v2
Auto-terminate: 60 minutes (if interactive)
Spot instances: Workers only
```

### Large ML Training Cluster

```text
Runtime: 17.3.x ML
Driver: Standard_E8s_v3 (64 GB, 8 cores)
Workers: 4-16, Standard_E8s_v3
Auto-terminate: 120 minutes
Spot instances: Workers only (training can tolerate restarts with checkpointing)
```

## Monitoring Cluster Usage

Track cluster costs and utilization to optimize your spending.

1. **Compute metrics** - in the Databricks workspace, click on a running compute resource and open the **Metrics** tab to see CPU, memory, disk, Spark, and GPU metrics where available
2. **System tables** - use compute system tables such as `system.compute.clusters` and `system.compute.node_timeline` for account-level usage and utilization analysis
3. **Azure Cost Management** - track Databricks spending at the subscription level
4. **Cluster tags** - add tags like `team`, `project`, and `environment` to clusters for cost allocation

## Wrapping Up

Cluster configuration in Azure Databricks is about matching compute resources to your workload requirements while keeping costs under control. Use all-purpose compute with autoscaling and auto-termination for development. Use jobs compute with spot instances for production workloads that need classic Spark clusters. Apply cluster policies to enforce guardrails across your team. And monitor utilization to continuously right-size your clusters. Getting this right from the start saves both time and money as your Databricks usage grows.
