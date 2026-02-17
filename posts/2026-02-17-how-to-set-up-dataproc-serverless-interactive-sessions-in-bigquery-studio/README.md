# How to Set Up Dataproc Serverless Interactive Sessions in BigQuery Studio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, BigQuery, Serverless, Spark

Description: Learn how to configure and use Dataproc Serverless interactive sessions within BigQuery Studio for running Spark workloads without managing clusters.

---

If you have ever dealt with spinning up Dataproc clusters just to run a quick Spark analysis, you know the pain. You wait for provisioning, you pay for idle time, and you tear it all down when you are done. Dataproc Serverless interactive sessions in BigQuery Studio change that equation entirely. You get a notebook-style interface backed by serverless Spark compute, and you only pay for what you actually use.

In this guide, I will walk you through the full setup process, from enabling the right APIs to running your first interactive Spark session directly inside BigQuery Studio.

## What Are Dataproc Serverless Interactive Sessions?

Dataproc Serverless interactive sessions let you write and execute PySpark code in a notebook environment without provisioning or managing any cluster infrastructure. Google handles the compute behind the scenes. When you open a session in BigQuery Studio, a Spark runtime is allocated on demand. When you stop working, resources are released automatically.

This is different from Dataproc Serverless batch jobs, which are fire-and-forget. Interactive sessions are designed for exploration, prototyping, and iterative analysis - the kind of work that notebooks are built for.

## Prerequisites

Before you can start using interactive sessions, you need a few things in place:

- A GCP project with billing enabled
- BigQuery API and Dataproc API enabled
- Appropriate IAM roles assigned to your user account
- A network configuration that allows Dataproc Serverless to run (default VPC works fine for getting started)

## Step 1: Enable the Required APIs

First, make sure both the BigQuery and Dataproc APIs are active in your project. You can do this from the Cloud Shell or your local terminal.

This command enables the Dataproc and BigQuery APIs in one shot:

```bash
# Enable Dataproc and BigQuery APIs for your project
gcloud services enable dataproc.googleapis.com bigquery.googleapis.com
```

You also need the BigQuery Connection API if you plan to connect to external data sources from your sessions:

```bash
# Enable the BigQuery Connection API
gcloud services enable bigqueryconnection.googleapis.com
```

## Step 2: Configure IAM Permissions

Your user account (or the service account running the session) needs certain roles. At minimum, you need:

- `roles/dataproc.editor` - to create and manage Dataproc Serverless sessions
- `roles/bigquery.user` - to access BigQuery Studio
- `roles/iam.serviceAccountUser` - to act as the service account running the session

Here is how to grant these roles to a user:

```bash
# Grant the necessary IAM roles for Dataproc Serverless sessions
PROJECT_ID="your-project-id"
USER_EMAIL="you@example.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$USER_EMAIL" \
  --role="roles/dataproc.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$USER_EMAIL" \
  --role="roles/bigquery.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$USER_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

## Step 3: Set Up Networking

Dataproc Serverless requires a VPC subnetwork with Private Google Access enabled. If you are using the default VPC, you might need to turn this on.

The following command enables Private Google Access on the default subnet in us-central1:

```bash
# Enable Private Google Access on the default subnet
gcloud compute networks subnets update default \
  --region=us-central1 \
  --enable-private-ip-google-access
```

If your organization uses a Shared VPC or has strict firewall rules, work with your network admin to ensure the Dataproc Serverless IP ranges can communicate with Google APIs.

## Step 4: Create a Runtime Template (Optional but Recommended)

Runtime templates let you predefine session configurations like Spark properties, custom container images, and package dependencies. This saves time when you create sessions frequently.

Here is an example of creating a session template using the gcloud CLI:

```bash
# Create a Dataproc Serverless runtime template
gcloud dataproc session-templates import my-spark-template \
  --source=template.yaml \
  --location=us-central1
```

And here is a sample `template.yaml` file:

```yaml
# Runtime template for interactive Spark sessions
runtimeConfig:
  version: "2.1"
  properties:
    spark.executor.instances: "4"
    spark.executor.memory: "4g"
    spark.driver.memory: "4g"
environmentConfig:
  executionConfig:
    subnetworkUri: "default"
```

## Step 5: Launch an Interactive Session in BigQuery Studio

Now for the fun part. Open BigQuery Studio in the Google Cloud Console:

1. Navigate to **BigQuery** in the Cloud Console
2. Click on **BigQuery Studio** in the left navigation panel
3. Click **Create** and select **PySpark notebook**
4. Choose your runtime configuration (or use the template you created)
5. Select the region where you want the session to run
6. Click **Create** to start the session

The session takes roughly 30 to 60 seconds to initialize. Once it is ready, you will see a Jupyter-style notebook interface.

## Step 6: Run Your First PySpark Query

With the session running, you can start writing PySpark code right away. Here is a simple example that reads data from BigQuery:

```python
# Read a public BigQuery dataset into a Spark DataFrame
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

# Load the public Shakespeare dataset from BigQuery
df = spark.read.format("bigquery") \
    .option("table", "bigquery-public-data.samples.shakespeare") \
    .load()

# Show the first 10 rows
df.show(10)

# Count total rows in the dataset
print(f"Total rows: {df.count()}")
```

You can also run SQL queries against BigQuery tables directly:

```python
# Use Spark SQL to query BigQuery data
df = spark.read.format("bigquery") \
    .option("table", "bigquery-public-data.samples.shakespeare") \
    .load()

# Register as a temporary view for SQL queries
df.createOrReplaceTempView("shakespeare")

# Run a SQL query to find the most common words
result = spark.sql("""
    SELECT word, SUM(word_count) as total_count
    FROM shakespeare
    GROUP BY word
    ORDER BY total_count DESC
    LIMIT 20
""")
result.show()
```

## Step 7: Configure Session Timeout and Auto-Shutdown

By default, interactive sessions have an idle timeout. You can adjust this to match your workflow. Longer timeouts mean you do not have to wait for the session to restart, but you will pay for idle compute.

```bash
# Create a session with a 2-hour idle timeout
gcloud dataproc sessions create spark my-session \
  --location=us-central1 \
  --property="spark.dataproc.session.idle.timeout=7200s" \
  --subnet=default
```

## Monitoring Your Sessions

You can check the status of your active sessions using the gcloud CLI:

```bash
# List all active Dataproc Serverless sessions
gcloud dataproc sessions list --location=us-central1

# Get details about a specific session
gcloud dataproc sessions describe my-session --location=us-central1
```

## Cost Considerations

Dataproc Serverless charges based on the Data Compute Units (DCUs) consumed during your session. You are billed per second of compute time. There is no charge when the session is idle (after the idle timeout kicks in and the session is terminated). This makes it significantly cheaper than running a persistent Dataproc cluster for ad-hoc analysis work.

For teams doing occasional exploration or prototyping, the cost savings compared to keeping a cluster running 24/7 can be substantial.

## Wrapping Up

Dataproc Serverless interactive sessions in BigQuery Studio give you the best of both worlds: the power of Apache Spark with the convenience of a managed notebook environment. You skip the cluster management overhead entirely and focus on actually analyzing your data.

The setup is straightforward - enable APIs, configure IAM, sort out networking, and you are good to go. If your team is already using BigQuery, adding Spark notebooks to the mix is a natural extension of your analytics workflow.
