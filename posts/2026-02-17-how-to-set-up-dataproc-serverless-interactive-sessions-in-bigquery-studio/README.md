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
- BigQuery API, Dataproc API, and Cloud Storage API enabled
- Appropriate IAM roles assigned to your user account
- A network configuration that allows Dataproc Serverless to run (default VPC works fine for getting started)
- A Cloud Storage bucket available in your project

## Step 1: Enable the Required APIs

First, make sure the BigQuery, Dataproc, and Cloud Storage APIs are active in your project. You can do this from the Cloud Shell or your local terminal.

This command enables the Dataproc, BigQuery, and Cloud Storage APIs in one shot:

```bash
# Enable Dataproc, BigQuery, and Cloud Storage APIs for your project

gcloud services enable dataproc.googleapis.com bigquery.googleapis.com storage.googleapis.com
```

## Step 2: Configure IAM Permissions

Your user account (or the service account running the session) needs certain roles. At minimum, you need:

- `roles/dataproc.editor` - to create and manage Dataproc Serverless sessions
- `roles/bigquery.studioUser` - to access BigQuery Studio notebooks
- `roles/iam.serviceAccountUser` - to act as the service account running the session

If you use service account credentials for the notebook session, the session service account also needs `roles/dataproc.worker`.

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
  --role="roles/bigquery.studioUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$USER_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

## Step 3: Set Up Networking

Dataproc Serverless runs on VMs with internal IP addresses in a regional VPC subnetwork. Private Google Access is enabled automatically on the subnet. If you do not specify a subnet, Dataproc Serverless uses the default subnet in the session region.

If you are configuring the subnet yourself, the following command enables Private Google Access on the default subnet in us-central1:

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
gcloud beta dataproc session-templates import my-spark-template \
  --source=template.yaml \
  --location=us-central1
```

And here is a sample `template.yaml` file:

```yaml
# Runtime template for interactive Spark sessions
runtimeConfig:
  version: "2.3"
  properties:
    spark.executor.instances: "4"
    spark.executor.memory: "4g"
    spark.driver.memory: "4g"
environmentConfig:
  executionConfig:
    subnetworkUri: "default"
sparkConnectSession: {}
```

BigQuery Studio notebook sessions require templates to use runtime version 2.3 or later and the Spark Connect session type.

## Step 5: Launch an Interactive Session in BigQuery Studio

Now for the fun part. Open BigQuery Studio in the Google Cloud Console:

1. Navigate to **BigQuery** in the Cloud Console
2. In the editor pane, click the arrow next to the **+** button and select **Notebook**
3. For a template-based session, choose **Query using Spark** under **Start with a template**
4. Enter your project, region, and session template details
5. Run the generated setup cell to start the Spark Connect session

The session takes roughly 30 to 60 seconds to initialize. Once it is ready, you will see a Jupyter-style notebook interface.

## Step 6: Run Your First PySpark Query

With the session running, you can start writing PySpark code right away. Here is a simple example that reads data from BigQuery:

```python
# Read a public BigQuery dataset into a Spark DataFrame
from google.cloud.dataproc_spark_connect import DataprocSparkSession
from google.cloud.dataproc_v1 import Session

session = Session()

spark = (
    DataprocSparkSession.builder
    .appName("shakespeare-example")
    .dataprocSessionConfig(session)
    .getOrCreate()
)

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
from google.cloud.dataproc_spark_connect import DataprocSparkSession
from google.cloud.dataproc_v1 import Session

session = Session()

spark = (
    DataprocSparkSession.builder
    .appName("shakespeare-sql-example")
    .dataprocSessionConfig(session)
    .getOrCreate()
)

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
gcloud beta dataproc sessions create spark my-session \
  --location=us-central1 \
  --max-idle=2h \
  --subnet=default
```

## Monitoring Your Sessions

You can check the status of your active sessions using the gcloud CLI:

```bash
# List all active Dataproc Serverless sessions
gcloud beta dataproc sessions list --location=us-central1

# Get details about a specific session
gcloud beta dataproc sessions describe my-session --location=us-central1
```

## Cost Considerations

Dataproc Serverless charges based on the Data Compute Units (DCUs), shuffle storage, and any attached accelerators consumed during your session. You are billed per second with a one-minute minimum. Scale-to-zero means there is no charge for idle capacity after the session is terminated. This can make it significantly cheaper than running a persistent Dataproc cluster for ad-hoc analysis work.

For teams doing occasional exploration or prototyping, the cost savings compared to keeping a cluster running 24/7 can be substantial.

## Wrapping Up

Dataproc Serverless interactive sessions in BigQuery Studio give you the best of both worlds: the power of Apache Spark with the convenience of a managed notebook environment. You skip the cluster management overhead entirely and focus on actually analyzing your data.

The setup is straightforward - enable APIs, configure IAM, sort out networking, and you are good to go. If your team is already using BigQuery, adding Spark notebooks to the mix is a natural extension of your analytics workflow.
