# How to Set Up AWS Glue Interactive Sessions for Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Glue, ETL, Data Engineering

Description: Learn how to use AWS Glue interactive sessions for faster ETL development with Jupyter notebooks, cutting development time and costs compared to full Glue jobs.

---

Developing Glue ETL jobs the traditional way is painful. You write your script, submit a job, wait 3-5 minutes for it to spin up, discover a bug, fix it, resubmit, and wait again. That feedback loop kills productivity. Glue interactive sessions fix this by giving you a live Spark environment that starts in seconds and lets you iterate on your code in a Jupyter notebook.

You get the same Glue runtime, the same DynamicFrame APIs, the same connections - but with the instant feedback of a notebook. When your code works, you can convert it directly into a Glue job without changes.

## How Interactive Sessions Work

An interactive session is a temporary Spark environment managed by Glue. When you start one, Glue provisions compute resources and connects them to your notebook. You pay only for the time the session is active (billed per DPU-second, minimum 1 minute), and the session automatically stops after an idle timeout.

The key advantage over EMR notebooks or local development is that you get the exact same Glue environment, including Glue-specific features like:
- DynamicFrames and the GlueContext
- Glue Data Catalog integration
- Connection types (JDBC, S3, etc.)
- Glue transforms and bookmarks

## Setting Up Your Local Environment

You can use Glue interactive sessions from the AWS Glue console, SageMaker Studio, or your own Jupyter notebook. Let's set up the local option since it gives you the most flexibility.

Install the Glue interactive sessions kernel:

```bash
# Install the Glue interactive sessions kernel for Jupyter
pip install aws-glue-sessions

# Install the kernel spec so Jupyter can find it
install-glue-kernels

# Verify the kernel is available
jupyter kernelspec list
```

You should see `glue_pyspark` and `glue_spark` in the list.

Now configure your AWS credentials. The interactive session needs permissions to create and manage Glue resources:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "glue:CreateSession",
                "glue:DeleteSession",
                "glue:GetSession",
                "glue:StopSession",
                "glue:RunStatement",
                "glue:GetStatement",
                "glue:CancelStatement",
                "glue:ListStatements"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:PassRole"
            ],
            "Resource": "arn:aws:iam::123456789012:role/GlueInteractiveSessionRole",
            "Condition": {
                "StringEquals": {
                    "iam:PassedToService": "glue.amazonaws.com"
                }
            }
        }
    ]
}
```

## Starting a Session

Open a Jupyter notebook with the `Glue PySpark` kernel and configure the session using magic commands:

```python
# Session configuration magic commands
# These must be in the first cell of your notebook

%glue_version 4.0
%worker_type G.1X
%number_of_workers 2
%idle_timeout 30
%region us-east-1
%iam_role arn:aws:iam::123456789012:role/GlueInteractiveSessionRole
```

The worker type and count determine your compute resources:
- `G.1X` - 4 vCPU, 16 GB memory per worker
- `G.2X` - 8 vCPU, 32 GB memory per worker
- `G.025X` - 2 vCPU, 4 GB memory (cheapest option for light development)

Start with `G.025X` and 2 workers for development. That's enough for testing with sample data and keeps costs low.

## Writing Your ETL Code

Once the session starts (usually 20-30 seconds), you can write Glue ETL code just like you would in a Glue job:

```python
# Initialize the Glue context
from awsglue.context import GlueContext
from awsglue.transforms import *
from pyspark.context import SparkContext
from awsglue.dynamicframe import DynamicFrame

sc = SparkContext.getOrCreate()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
```

```python
# Read data from the Glue Data Catalog
# This uses the same catalog your production jobs use
orders_dyf = glueContext.create_dynamic_frame.from_catalog(
    database="sales_db",
    table_name="raw_orders"
)

# Check the schema - this returns instantly since it uses the catalog
orders_dyf.printSchema()

# Look at a sample of the data
orders_dyf.toDF().show(5)
```

```python
# Transform the data
# Apply mappings to rename and recast columns
mapped_orders = ApplyMapping.apply(
    frame=orders_dyf,
    mappings=[
        ("order_id", "string", "order_id", "string"),
        ("customer_id", "string", "customer_id", "long"),
        ("order_date", "string", "order_date", "date"),
        ("total_amount", "string", "total_amount", "decimal(10,2)"),
        ("status", "string", "order_status", "string"),
        ("region", "string", "region", "string")
    ]
)

# Resolve any choice types (columns with ambiguous types)
resolved = ResolveChoice.apply(
    frame=mapped_orders,
    choice="make_struct"
)

# Drop null fields
cleaned = DropNullFields.apply(frame=resolved)
```

```python
# Aggregate the data to create a summary
orders_df = cleaned.toDF()

from pyspark.sql import functions as F

daily_summary = orders_df.groupBy(
    "region",
    F.date_format("order_date", "yyyy-MM-dd").alias("order_day")
).agg(
    F.count("order_id").alias("total_orders"),
    F.sum("total_amount").alias("total_revenue"),
    F.avg("total_amount").alias("avg_order_value"),
    F.countDistinct("customer_id").alias("unique_customers")
)

daily_summary.show(10)
```

```python
# Write the results back to S3 in Parquet format
summary_dyf = DynamicFrame.fromDF(daily_summary, glueContext, "summary")

glueContext.write_dynamic_frame.from_options(
    frame=summary_dyf,
    connection_type="s3",
    connection_options={
        "path": "s3://my-data-lake/processed/daily-order-summary/",
        "partitionKeys": ["region"]
    },
    format="parquet"
)

print("Write complete!")
```

## Testing with Data Subsets

For faster iteration, work with a subset of your data:

```python
# Read only a portion of the data for development
# Use a pushdown predicate to filter at the source
sample_orders = glueContext.create_dynamic_frame.from_catalog(
    database="sales_db",
    table_name="raw_orders",
    push_down_predicate="(year == '2026' and month == '02')"
)

print(f"Working with {sample_orders.count()} records")
```

Or sample from a larger dataset:

```python
# Take a random 1% sample for testing
sample_df = orders_dyf.toDF().sample(fraction=0.01, seed=42)
sample_dyf = DynamicFrame.fromDF(sample_df, glueContext, "sample")
print(f"Sample size: {sample_dyf.count()} records")
```

## Using Glue Connections

If your ETL needs to read from or write to databases, you can use Glue connections in interactive sessions:

```python
# Read from a JDBC source using a Glue connection
db_data = glueContext.create_dynamic_frame.from_catalog(
    database="rds_catalog",
    table_name="customers",
    additional_options={
        "hashfield": "customer_id",
        "hashpartitions": 4
    }
)

# Or connect directly with JDBC
jdbc_data = glueContext.create_dynamic_frame.from_options(
    connection_type="mysql",
    connection_options={
        "useConnectionProperties": True,
        "connectionName": "my-rds-connection",
        "dbtable": "customers",
        "hashfield": "customer_id"
    }
)
```

## Converting to a Glue Job

When your notebook code is working, convert it to a Glue job. The code needs minimal changes:

```python
# Production Glue job script generated from interactive session
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkContext
from pyspark.sql import functions as F
from awsglue.dynamicframe import DynamicFrame

# Get job parameters
args = getResolvedOptions(sys.argv, ['JOB_NAME', 'output_path'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Your notebook code goes here (unchanged)
orders_dyf = glueContext.create_dynamic_frame.from_catalog(
    database="sales_db",
    table_name="raw_orders"
)

# ... all your transforms ...

glueContext.write_dynamic_frame.from_options(
    frame=summary_dyf,
    connection_type="s3",
    connection_options={
        "path": args['output_path'],
        "partitionKeys": ["region"]
    },
    format="parquet"
)

job.commit()
```

## Session Management

Keep an eye on your active sessions to avoid unnecessary costs:

```bash
# List active interactive sessions
aws glue list-sessions --output table

# Stop a session you are done with
aws glue stop-session --id "session-abc123"

# Delete a session
aws glue delete-session --id "session-abc123"
```

Set the idle timeout appropriately. The default is 480 minutes (8 hours), which is way too long. Set it to 30 minutes for development work - you can always start a new session quickly.

Interactive sessions changed how I develop Glue ETL. What used to take a full day of submit-wait-debug cycles now takes a couple of hours. For reducing the cost of running these jobs in production, check out [Glue Flex execution](https://oneuptime.com/blog/post/aws-glue-flex-execution-cost-savings/view).
