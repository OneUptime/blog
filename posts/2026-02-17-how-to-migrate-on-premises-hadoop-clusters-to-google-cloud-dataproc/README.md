# How to Migrate On-Premises Hadoop Clusters to Google Cloud Dataproc

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Hadoop, Big Data, Migration

Description: Step-by-step instructions for migrating on-premises Hadoop clusters to Google Cloud Dataproc including data transfer and job migration.

---

Hadoop clusters are expensive to run on-premises. The hardware, the networking, the Hadoop administrators who keep everything running - it adds up. Google Cloud Dataproc gives you the same Hadoop, Spark, Hive, and Pig capabilities as a managed service that you can spin up in minutes and tear down when jobs finish. The challenge is getting there from your existing on-premises setup. Here is a practical migration guide.

## Why Dataproc Instead of Self-Managed Hadoop on GCE

Before diving into the migration, it is worth understanding why Dataproc over just running Hadoop on GCE VMs:

- **Ephemeral clusters.** Dataproc clusters start in about 90 seconds. You can create a cluster, run a job, and delete the cluster. You pay only for the time the cluster is running.
- **Separation of storage and compute.** Data lives in Cloud Storage instead of HDFS. Compute clusters are stateless and disposable.
- **Auto-scaling.** Dataproc can add or remove worker nodes based on YARN metrics.
- **Version management.** New Hadoop and Spark versions are available as image versions. No manual upgrades.
- **Integration with GCP services.** Direct connectors to BigQuery, Cloud Storage, Pub/Sub, and Bigtable.

## Step 1 - Inventory Your Hadoop Workloads

Before migrating anything, catalog your current Hadoop environment:

```bash
# List all HDFS data directories and their sizes
hdfs dfs -du -s -h /user/*
hdfs dfs -du -s -h /data/*

# List all Hive databases and tables
hive -e "SHOW DATABASES;"
hive -e "SHOW TABLES IN my_database;"

# Check Hive table locations and formats
hive -e "DESCRIBE FORMATTED my_database.my_table;" | grep -i "location\|inputformat\|serde"

# List scheduled Oozie workflows
oozie jobs -jobtype coordinator -filter status=RUNNING -oozie http://oozie-host:11000/oozie

# Check YARN application history for commonly run jobs
yarn application -list -appStates FINISHED | tail -20
```

Categorize your workloads:

- **Batch ETL jobs** (Spark, MapReduce, Hive) - most common, usually the easiest to migrate
- **Interactive queries** (Hive, Presto) - may benefit from BigQuery instead
- **Streaming jobs** (Spark Streaming, Kafka consumers) - need careful handling
- **Machine learning** (Spark MLlib) - consider Vertex AI as an alternative

## Step 2 - Migrate Data from HDFS to Cloud Storage

The fundamental architectural change is moving from HDFS to Cloud Storage. This is what makes ephemeral clusters possible.

```bash
# Option 1: Use the Hadoop distcp tool to copy directly to Cloud Storage
# Requires the Cloud Storage connector on your Hadoop cluster
hadoop distcp \
  hdfs://namenode:8020/data/warehouse/ \
  gs://my-data-lake/warehouse/

# For large datasets, use multiple map tasks
hadoop distcp \
  -m 100 \
  -bandwidth 500 \
  hdfs://namenode:8020/data/warehouse/ \
  gs://my-data-lake/warehouse/

# Option 2: Transfer via Transfer Service for on-premises data
gcloud transfer jobs create \
  --source-agent-pool=my-agent-pool \
  --source-directory=/hadoop-data/ \
  --destination-bucket=gs://my-data-lake \
  --name=hadoop-migration
```

For Hive tables, you also need to migrate the metastore:

```bash
# Export Hive metastore DDL statements
hive -e "SHOW CREATE TABLE my_database.my_table;" > table_ddl.sql

# Modify the DDL to point to Cloud Storage locations
# Change: LOCATION 'hdfs://namenode:8020/user/hive/warehouse/my_table'
# To:     LOCATION 'gs://my-data-lake/warehouse/my_table'
```

## Step 3 - Set Up Dataproc

Create a Dataproc cluster that matches your workload needs:

```bash
# Create a Dataproc cluster for batch workloads
gcloud dataproc clusters create my-batch-cluster \
  --region us-central1 \
  --zone us-central1-a \
  --master-machine-type n2-standard-8 \
  --master-boot-disk-size 200GB \
  --num-workers 4 \
  --worker-machine-type n2-standard-8 \
  --worker-boot-disk-size 200GB \
  --image-version 2.1-debian11 \
  --optional-components HIVE_WEBHCAT,JUPYTER \
  --enable-component-gateway \
  --properties "hive:hive.metastore.warehouse.dir=gs://my-data-lake/warehouse"

# Create a cluster with autoscaling for variable workloads
gcloud dataproc autoscaling-policies create my-scaling-policy \
  --region us-central1 \
  --min-secondary-workers 0 \
  --max-secondary-workers 20 \
  --scale-up-factor 1.0 \
  --scale-down-factor 0.5 \
  --cooldown-period 120s

gcloud dataproc clusters create my-scaling-cluster \
  --region us-central1 \
  --autoscaling-policy my-scaling-policy \
  --num-workers 2 \
  --num-secondary-workers 0 \
  --worker-machine-type n2-standard-8
```

## Step 4 - Migrate Hive Metastore

For production environments, use Cloud SQL as a persistent Hive metastore instead of the ephemeral metastore that comes with each cluster:

```bash
# Create a Cloud SQL instance for the Hive metastore
gcloud sql instances create hive-metastore \
  --database-version MYSQL_8_0 \
  --tier db-n1-standard-2 \
  --region us-central1

# Create the metastore database
gcloud sql databases create hive_metastore --instance hive-metastore

# Create the Dataproc cluster with external Hive metastore
gcloud dataproc clusters create my-cluster \
  --region us-central1 \
  --properties "\
hive:javax.jdo.option.ConnectionURL=jdbc:mysql:///<hive_metastore>?cloudSqlInstance=my-project:us-central1:hive-metastore&socketFactory=com.google.cloud.sql.mysql.SocketFactory,\
hive:javax.jdo.option.ConnectionDriverName=com.mysql.cj.jdbc.Driver,\
hive:javax.jdo.option.ConnectionUserName=root,\
hive:javax.jdo.option.ConnectionPassword=password"
```

Alternatively, use Dataproc Metastore, a fully managed metastore service:

```bash
# Create a Dataproc Metastore service
gcloud metastore services create my-metastore \
  --location us-central1 \
  --tier DEVELOPER \
  --hive-metastore-version 3.1.2

# Create a cluster that uses the managed metastore
gcloud dataproc clusters create my-cluster \
  --region us-central1 \
  --dataproc-metastore projects/my-project/locations/us-central1/services/my-metastore
```

## Step 5 - Migrate and Test Jobs

Start with your simplest jobs and work up to the complex ones:

```bash
# Submit a Spark job to Dataproc
gcloud dataproc jobs submit spark \
  --cluster my-cluster \
  --region us-central1 \
  --class com.mycompany.etl.DailyAggregation \
  --jars gs://my-data-lake/jars/etl-jobs-1.0.jar \
  -- --input gs://my-data-lake/raw/ --output gs://my-data-lake/processed/

# Submit a Hive job
gcloud dataproc jobs submit hive \
  --cluster my-cluster \
  --region us-central1 \
  --file gs://my-data-lake/scripts/daily_report.hql

# Submit a PySpark job
gcloud dataproc jobs submit pyspark \
  gs://my-data-lake/scripts/transform.py \
  --cluster my-cluster \
  --region us-central1 \
  --py-files gs://my-data-lake/libs/utils.zip
```

Common code changes needed:

```python
# Change HDFS paths to Cloud Storage paths
# Old: hdfs://namenode:8020/data/input/
# New: gs://my-data-lake/data/input/

# Spark session configuration for GCS
spark = SparkSession.builder \
    .appName("Daily ETL") \
    .config("spark.hadoop.fs.gs.impl", "com.google.cloud.hadoop.fs.gcs.GoogleHadoopFileSystem") \
    .getOrCreate()

# Read data from Cloud Storage (same API, different path)
df = spark.read.parquet("gs://my-data-lake/data/input/")

# Write results back to Cloud Storage
df.write.mode("overwrite").parquet("gs://my-data-lake/data/output/")
```

## Step 6 - Migrate Job Scheduling

Replace Oozie with Cloud Composer (managed Airflow) or Cloud Scheduler with Dataproc Workflow Templates:

```bash
# Create a Dataproc Workflow Template for a recurring job
gcloud dataproc workflow-templates create daily-etl --region us-central1

# Add cluster configuration to the template
gcloud dataproc workflow-templates set-managed-cluster daily-etl \
  --region us-central1 \
  --master-machine-type n2-standard-4 \
  --num-workers 4 \
  --worker-machine-type n2-standard-4

# Add a Spark job step
gcloud dataproc workflow-templates add-job spark \
  --workflow-template daily-etl \
  --region us-central1 \
  --step-id daily-aggregation \
  --class com.mycompany.etl.DailyAggregation \
  --jars gs://my-data-lake/jars/etl-jobs-1.0.jar

# Schedule with Cloud Scheduler
gcloud scheduler jobs create http daily-etl-trigger \
  --schedule "0 2 * * *" \
  --uri "https://dataproc.googleapis.com/v1/projects/my-project/regions/us-central1/workflowTemplates/daily-etl:instantiate" \
  --http-method POST \
  --oauth-service-account-email my-sa@my-project.iam.gserviceaccount.com
```

## Cost Optimization Tips

1. **Use ephemeral clusters.** Do not keep clusters running 24/7. Create them for each job and delete them afterward.
2. **Use preemptible/spot workers.** Secondary workers using spot VMs can reduce compute costs by 60-80%.
3. **Right-size your clusters.** Monitor YARN resource usage and adjust machine types and worker counts.
4. **Store data in Cloud Storage, not HDFS.** HDFS on Dataproc costs you persistent disk for every worker node.
5. **Consider BigQuery for interactive queries.** Many Hive queries can be replaced with BigQuery SQL at lower cost.

## Common Pitfalls

- **Assuming the same cluster sizing.** On-premises Hadoop clusters are over-provisioned because they run all the time. Dataproc clusters should be sized for specific workloads.
- **Not updating file paths.** Every HDFS path in your code, Hive DDLs, and configuration files needs to change to gs:// paths.
- **Ignoring the metastore.** Without a persistent metastore, Hive table definitions are lost when the cluster is deleted.
- **Running clusters 24/7.** The biggest waste is treating Dataproc like an on-premises cluster that never shuts down.

The migration from on-premises Hadoop to Dataproc is not just a lift-and-shift. It is a shift in how you think about data processing infrastructure - from always-on to on-demand, from coupled storage and compute to separated. Embrace that shift and you will see both cost savings and operational improvements.
