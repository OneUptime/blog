# How to Configure Dataproc Optional Components like Jupyter and Hive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataproc, Jupyter, Hive, Optional Components

Description: Configure Dataproc optional components including Jupyter, Hive, Presto, and Zeppelin to extend cluster functionality with minimal setup effort.

---

A bare Dataproc cluster gives you Hadoop and Spark out of the box. But most teams need more than that. Data scientists want Jupyter notebooks for interactive analysis. SQL users want Hive or Presto for querying. DevOps teams want monitoring tools. Rather than writing initialization scripts for each of these, Dataproc provides optional components that you can enable with a simple flag at cluster creation time.

Optional components are pre-packaged, tested software that Dataproc installs and configures automatically. They are the easiest way to extend your cluster's capabilities.

## Available Optional Components

Dataproc supports a growing list of optional components. Here are the most commonly used ones.

**Jupyter** - Web-based notebook interface for interactive Python and Scala development with Spark.

**Hive** - SQL engine for querying structured data in HDFS and GCS.

**Presto** - Distributed SQL query engine for interactive analytics.

**Zeppelin** - Notebook interface with multi-language support and built-in visualizations.

**Docker** - Container runtime for running Docker containers on cluster nodes.

**Flink** - Stream processing framework alongside Spark.

**Ranger** - Data security and governance framework.

**Solr** - Search platform built on Apache Lucene.

## Enabling Optional Components

Enable components with the `--optional-components` flag when creating a cluster.

```bash
# Create a cluster with Jupyter and Hive enabled
gcloud dataproc clusters create analytics-cluster \
  --region=us-central1 \
  --optional-components=JUPYTER,HIVE_WEBHCAT \
  --num-workers=4 \
  --worker-machine-type=n1-standard-8 \
  --master-machine-type=n1-standard-4 \
  --image-version=2.1-debian11 \
  --enable-component-gateway
```

The `--enable-component-gateway` flag is important. It creates a secure gateway that lets you access web UIs (Jupyter, Hive, YARN) through the Google Cloud console without setting up SSH tunnels or firewall rules.

## Setting Up Jupyter

Jupyter is probably the most popular optional component. It lets data scientists run PySpark code interactively in a browser.

```bash
# Create a cluster optimized for Jupyter notebook work
gcloud dataproc clusters create jupyter-cluster \
  --region=us-central1 \
  --optional-components=JUPYTER \
  --enable-component-gateway \
  --num-workers=4 \
  --worker-machine-type=n1-standard-8 \
  --master-machine-type=n1-standard-4 \
  --master-boot-disk-size=200GB \
  --properties="\
spark.jars.packages=com.google.cloud.spark:spark-bigquery-with-dependencies_2.12:0.32.2,\
spark.executor.memory=4g,\
spark.driver.memory=2g" \
  --metadata='PIP_PACKAGES=pandas numpy scikit-learn matplotlib seaborn'
```

After the cluster is created, access Jupyter through the Component Gateway.

```bash
# Open Jupyter through the Dataproc console
# Navigate to: Dataproc > Clusters > jupyter-cluster > Web Interfaces > Jupyter
# Or construct the URL directly:
echo "https://console.cloud.google.com/dataproc/clusters/jupyter-cluster/web-interfaces?region=us-central1"
```

Notebooks are stored on the master node by default. For persistence across cluster recreations, configure Jupyter to use GCS.

```bash
# Store notebooks in GCS for persistence
gcloud dataproc clusters create jupyter-cluster \
  --region=us-central1 \
  --optional-components=JUPYTER \
  --enable-component-gateway \
  --num-workers=4 \
  --properties="\
jupyter:jupyter_notebook_dir=gs://my-bucket/notebooks" \
  --metadata='PIP_PACKAGES=pandas numpy'
```

## Configuring Hive

Hive provides SQL access to data stored in HDFS and GCS. Enable it to let analysts query data without writing Spark code.

```bash
# Create a cluster with Hive enabled
gcloud dataproc clusters create hive-cluster \
  --region=us-central1 \
  --optional-components=HIVE_WEBHCAT \
  --enable-component-gateway \
  --num-workers=4 \
  --worker-machine-type=n1-standard-8 \
  --master-machine-type=n1-standard-4 \
  --properties="\
hive:hive.metastore.warehouse.dir=gs://my-bucket/hive-warehouse"
```

Once the cluster is running, you can submit Hive queries.

```bash
# Submit a Hive query via the Dataproc API
gcloud dataproc jobs submit hive \
  --cluster=hive-cluster \
  --region=us-central1 \
  --execute="
    CREATE EXTERNAL TABLE IF NOT EXISTS events (
      event_id STRING,
      user_id STRING,
      event_type STRING,
      event_timestamp TIMESTAMP
    )
    ROW FORMAT DELIMITED
    FIELDS TERMINATED BY ','
    STORED AS TEXTFILE
    LOCATION 'gs://my-bucket/data/events/';

    SELECT event_type, COUNT(*) as cnt
    FROM events
    GROUP BY event_type
    ORDER BY cnt DESC
    LIMIT 10;"
```

## Using Cloud SQL as Hive Metastore

By default, Hive uses a local Derby database for its metastore, which is lost when the cluster is deleted. For persistent metadata, use Cloud SQL.

```bash
# First, create a Cloud SQL instance for the Hive Metastore
gcloud sql instances create hive-metastore \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-1 \
  --region=us-central1

# Create the metastore database
gcloud sql databases create hive_metastore --instance=hive-metastore

# Create a user for Hive
gcloud sql users create hive \
  --instance=hive-metastore \
  --password=YOUR_SECURE_PASSWORD

# Create the cluster with Cloud SQL-backed Hive Metastore
gcloud dataproc clusters create hive-with-cloudsql \
  --region=us-central1 \
  --optional-components=HIVE_WEBHCAT \
  --enable-component-gateway \
  --num-workers=4 \
  --scopes=sql-admin \
  --properties="\
hive:javax.jdo.option.ConnectionURL=jdbc:mysql:///hive_metastore?cloudSqlInstance=PROJECT:us-central1:hive-metastore&socketFactory=com.google.cloud.sql.mysql.SocketFactory,\
hive:javax.jdo.option.ConnectionDriverName=com.mysql.cj.jdbc.Driver,\
hive:javax.jdo.option.ConnectionUserName=hive,\
hive:javax.jdo.option.ConnectionPassword=YOUR_SECURE_PASSWORD"
```

Now table definitions persist even when the cluster is deleted. New clusters connecting to the same Cloud SQL instance see all previously created tables.

## Setting Up Presto for Interactive SQL

Presto is faster than Hive for interactive queries on smaller datasets. It is a good choice when analysts need sub-minute query response times.

```bash
# Create a cluster with Presto
gcloud dataproc clusters create presto-cluster \
  --region=us-central1 \
  --optional-components=PRESTO \
  --enable-component-gateway \
  --num-workers=4 \
  --worker-machine-type=n1-highmem-8 \
  --master-machine-type=n1-highmem-4 \
  --properties="\
presto:query.max-memory=50GB,\
presto:query.max-memory-per-node=10GB"
```

Access Presto through the CLI.

```bash
# Connect to Presto from the master node
gcloud compute ssh presto-cluster-m -- \
  "presto --catalog hive --schema default"
```

## Configuring Zeppelin

Zeppelin is an alternative to Jupyter with built-in charting and multi-language support.

```bash
# Create a cluster with Zeppelin
gcloud dataproc clusters create zeppelin-cluster \
  --region=us-central1 \
  --optional-components=ZEPPELIN \
  --enable-component-gateway \
  --num-workers=4 \
  --master-machine-type=n1-standard-4
```

Zeppelin supports multiple interpreters out of the box: Spark (Scala and Python), SQL, Shell, and Markdown. This makes it great for creating data analysis notebooks that combine code, SQL, and documentation.

## Combining Multiple Components

You can enable several components on the same cluster.

```bash
# Full-featured analytics cluster with multiple components
gcloud dataproc clusters create full-analytics \
  --region=us-central1 \
  --optional-components=JUPYTER,HIVE_WEBHCAT,PRESTO \
  --enable-component-gateway \
  --num-workers=6 \
  --worker-machine-type=n1-standard-8 \
  --master-machine-type=n1-standard-8 \
  --master-boot-disk-size=200GB \
  --properties="\
spark.jars.packages=com.google.cloud.spark:spark-bigquery-with-dependencies_2.12:0.32.2,\
hive:hive.metastore.warehouse.dir=gs://my-bucket/hive-warehouse" \
  --metadata='PIP_PACKAGES=pandas numpy scikit-learn'
```

Be mindful of master node resources when enabling multiple components. Each component consumes memory and CPU on the master. Size your master accordingly.

## Component Gateway Configuration

The component gateway provides secure HTTPS access to web interfaces without exposing cluster ports directly.

```bash
# Access web interfaces through the Component Gateway
# Jupyter: https://GATEWAY_URL/jupyter/
# Hive WebHCat: https://GATEWAY_URL/templeton/v1/
# Presto Web UI: https://GATEWAY_URL/presto/
# YARN RM: https://GATEWAY_URL/yarn/
# Spark History: https://GATEWAY_URL/sparkhistory/

# List available web interfaces
gcloud dataproc clusters describe full-analytics \
  --region=us-central1 \
  --format="value(config.endpointConfig.httpPorts)"
```

The gateway handles authentication through Google Cloud IAM. Users need the `dataproc.clusters.use` permission to access web interfaces.

## Customizing Component Properties

Each component accepts configuration properties that you can set at cluster creation time.

```bash
# Customized Jupyter with specific kernel and extension settings
gcloud dataproc clusters create custom-jupyter \
  --region=us-central1 \
  --optional-components=JUPYTER \
  --enable-component-gateway \
  --num-workers=4 \
  --properties="\
jupyter:jupyter_port=8124,\
spark.executor.instances=4,\
spark.executor.cores=2,\
spark.executor.memory=6g,\
spark.driver.memory=4g"
```

The property prefix tells Dataproc which component to apply the setting to. `jupyter:` properties configure Jupyter, `hive:` configures Hive, `spark:` configures Spark, and so on.

Optional components make Dataproc clusters flexible enough to serve different team needs from a single platform. Data scientists get Jupyter, analysts get Hive and Presto, and engineers get Spark - all configured with a few flags at cluster creation time.
