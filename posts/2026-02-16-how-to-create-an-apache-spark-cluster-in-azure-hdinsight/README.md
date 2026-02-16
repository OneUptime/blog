# How to Create an Apache Spark Cluster in Azure HDInsight

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure HDInsight, Apache Spark, Big Data, Cluster Management, Azure Cloud, Data Engineering, Distributed Computing

Description: Step-by-step guide to provisioning and configuring an Apache Spark cluster on Azure HDInsight for big data processing workloads.

---

Apache Spark has become the go-to engine for large-scale data processing, and Azure HDInsight gives you a managed way to run Spark clusters without worrying about the underlying infrastructure. You get the full power of Spark - batch processing, interactive queries, machine learning, and streaming - on clusters that you can spin up, scale, and tear down as your workloads demand.

In this post, we will walk through creating a Spark cluster on Azure HDInsight from scratch, covering the key configuration decisions you need to make along the way. We will use both the Azure portal and Azure CLI approaches so you can choose what fits your workflow.

## Prerequisites

Before creating your cluster, make sure you have these things in place:

- An Azure subscription with sufficient quota for the VM sizes you plan to use
- An Azure Storage account or Azure Data Lake Storage Gen2 account for the cluster's default storage
- A resource group where the cluster and its resources will live
- The Azure CLI installed if you prefer the command-line approach

## Choosing the Right Cluster Configuration

The first major decision is sizing your cluster. HDInsight Spark clusters have three node types:

**Head nodes**: These run the Spark driver, YARN ResourceManager, and cluster management services. You always get two head nodes for high availability. For most workloads, D12 v2 or D13 v2 VMs work well here.

**Worker nodes**: These run the Spark executors that do the actual data processing. The number and size of worker nodes depend on your data volume and computation requirements. Start with 4 worker nodes and scale from there.

**ZooKeeper nodes**: These handle coordination and leader election. Three ZooKeeper nodes are provisioned by default and you generally do not need to change the size.

## Creating the Cluster via Azure Portal

The portal provides a guided experience for cluster creation. Here are the steps:

1. Navigate to the Azure portal and search for "HDInsight clusters"
2. Click "Create" to start the cluster creation wizard
3. Fill in the basics:
   - **Subscription**: Select your Azure subscription
   - **Resource group**: Choose an existing group or create a new one
   - **Cluster name**: Pick a unique name (this becomes part of the cluster URL)
   - **Region**: Choose a region close to your data sources
   - **Cluster type**: Select "Spark" and choose version 3.1 or later
   - **Cluster login username**: Default is "admin"
   - **Cluster login password**: Set a strong password
   - **SSH username**: Default is "sshuser"

4. Configure storage:
   - **Primary storage type**: Choose Azure Storage or Azure Data Lake Storage Gen2
   - **Selection method**: Pick your existing storage account or create a new one
   - **Container**: The cluster will create a default container if you do not specify one

5. Configure cluster size:
   - Set the number and size of worker nodes
   - Review head node and ZooKeeper node configurations

6. Review the summary and click "Create"

The cluster typically takes 15-20 minutes to provision.

## Creating the Cluster via Azure CLI

For repeatable deployments or automation, the Azure CLI is the better approach. Here is the command to create a Spark cluster:

```bash
# Create an HDInsight Spark cluster with 4 worker nodes
# Uses Azure Storage as the default filesystem
az hdinsight create \
  --name my-spark-cluster \
  --resource-group my-resource-group \
  --type Spark \
  --component-version Spark=3.1 \
  --http-user admin \
  --http-password "YourStr0ngP@ssword!" \
  --ssh-user sshuser \
  --ssh-password "YourSSHP@ssword!" \
  --workernode-count 4 \
  --workernode-size Standard_D13_V2 \
  --headnode-size Standard_D13_V2 \
  --storage-account mystorageaccount \
  --storage-account-key "your-storage-account-key" \
  --storage-default-container spark-data \
  --location eastus
```

If you prefer Data Lake Storage Gen2, the storage configuration changes slightly:

```bash
# Create a Spark cluster with ADLS Gen2 as default storage
# Requires a managed identity with Storage Blob Data Owner role
az hdinsight create \
  --name my-spark-cluster \
  --resource-group my-resource-group \
  --type Spark \
  --component-version Spark=3.1 \
  --http-user admin \
  --http-password "YourStr0ngP@ssword!" \
  --ssh-user sshuser \
  --ssh-password "YourSSHP@ssword!" \
  --workernode-count 4 \
  --workernode-size Standard_D13_V2 \
  --headnode-size Standard_D13_V2 \
  --storage-account mystorageaccount \
  --storage-default-filesystem spark-fs \
  --assign-identity "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity" \
  --location eastus
```

## Connecting to Your Cluster

Once the cluster is provisioned, you have several ways to interact with it.

### Jupyter Notebook

HDInsight comes with Jupyter Notebook pre-installed. Access it at:

```
https://my-spark-cluster.azurehdinsight.net/jupyter
```

Log in with the HTTP credentials you specified during creation. Jupyter provides PySpark and Spark (Scala) kernels that are pre-configured to connect to your cluster.

### SSH Access

For direct command-line access to the cluster head node:

```bash
# SSH into the cluster head node
ssh sshuser@my-spark-cluster-ssh.azurehdinsight.net
```

From the SSH session, you can launch the Spark shell directly:

```bash
# Launch the interactive Spark shell (Scala)
spark-shell

# Or launch PySpark for Python
pyspark
```

### Apache Zeppelin

Zeppelin is another notebook interface available at:

```
https://my-spark-cluster.azurehdinsight.net/zeppelin
```

It offers a slightly different experience from Jupyter, with built-in visualization capabilities and support for multiple interpreters.

## Running Your First Spark Job

Let us verify the cluster is working by running a simple word count job. Create a new Jupyter notebook with the PySpark kernel and run:

```python
# Read a sample text file from the cluster's default storage
# The wasbs:// protocol accesses Azure Blob Storage
text_rdd = sc.textFile("wasbs:///example/data/gutenberg/davinci.txt")

# Split each line into words, count occurrences of each word
word_counts = text_rdd \
    .flatMap(lambda line: line.split()) \
    .map(lambda word: (word.lower(), 1)) \
    .reduceByKey(lambda a, b: a + b) \
    .sortBy(lambda x: x[1], ascending=False)

# Display the top 20 most frequent words
for word, count in word_counts.take(20):
    print(f"{word}: {count}")
```

If this runs successfully and returns word counts, your cluster is properly configured and ready for real workloads.

## Configuring Spark Properties

You often need to tune Spark configuration for your specific workloads. HDInsight lets you do this through Ambari, the cluster management interface:

```
https://my-spark-cluster.azurehdinsight.net
```

Navigate to Spark2 > Configs to adjust settings like:

- `spark.executor.memory` - Memory allocated to each executor
- `spark.executor.cores` - CPU cores per executor
- `spark.driver.memory` - Memory for the driver process
- `spark.dynamicAllocation.enabled` - Whether Spark auto-scales executors

You can also set these per-job in your Spark submit command:

```bash
# Submit a Spark job with custom configuration
# Allocates 8GB per executor and 4 cores per executor
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --executor-memory 8g \
  --executor-cores 4 \
  --num-executors 8 \
  --class com.example.MySparkJob \
  /path/to/my-spark-job.jar
```

## Scaling the Cluster

One of the advantages of HDInsight is the ability to scale your cluster without downtime. You can add or remove worker nodes as your workload changes:

```bash
# Scale up to 8 worker nodes for a heavy processing job
az hdinsight resize \
  --name my-spark-cluster \
  --resource-group my-resource-group \
  --workernode-count 8
```

HDInsight also supports autoscaling based on schedules or load metrics:

```bash
# Enable load-based autoscaling between 4 and 12 worker nodes
az hdinsight autoscale create \
  --resource-group my-resource-group \
  --cluster-name my-spark-cluster \
  --type Load \
  --min-workernode-count 4 \
  --max-workernode-count 12
```

## Cost Management Tips

HDInsight clusters incur costs for every hour they are running, even if no jobs are active. Here are some strategies to manage costs:

- **Use autoscaling** to scale down during off-peak hours
- **Delete clusters** when they are not needed and recreate them from scripts
- **Use spot instances** for worker nodes in non-critical workloads by specifying the `--workernode-size` with spot-eligible VM sizes
- **Right-size your nodes** - start small and increase only when you see resource bottlenecks in Ambari metrics

## Networking and Security

For production deployments, place your HDInsight cluster inside a Virtual Network:

```bash
# Create a cluster inside a VNet for network isolation
az hdinsight create \
  --name my-spark-cluster \
  --resource-group my-resource-group \
  --type Spark \
  --component-version Spark=3.1 \
  --http-user admin \
  --http-password "YourStr0ngP@ssword!" \
  --ssh-user sshuser \
  --ssh-password "YourSSHP@ssword!" \
  --workernode-count 4 \
  --storage-account mystorageaccount \
  --storage-account-key "your-key" \
  --storage-default-container spark-data \
  --vnet-name my-vnet \
  --subnet default \
  --location eastus
```

This enables private connectivity to your data sources and restricts public access to the cluster endpoints. You can combine this with Network Security Groups (NSGs) and Azure Private Link for additional security.

## Summary

Creating an Apache Spark cluster on Azure HDInsight is straightforward once you understand the key decisions around node sizing, storage configuration, and network topology. The managed nature of HDInsight means you do not need to worry about OS patching, Hadoop ecosystem compatibility, or cluster coordination - Azure handles all of that. Start with a small cluster, run your workloads, monitor resource utilization through Ambari, and scale as needed. For production use, invest time in VNet integration, proper sizing, and autoscaling to balance performance and cost.
