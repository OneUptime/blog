# How to Run Apache Spark in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Apache Spark, Big Data, Data Engineering, Docker Compose, Distributed Computing

Description: Learn how to set up and run Apache Spark clusters in Docker for local development and testing

---

Apache Spark is the go-to framework for large-scale data processing. It handles batch processing, stream processing, machine learning, and SQL queries across distributed clusters. Setting up a Spark cluster traditionally involves configuring Java, Scala, Hadoop libraries, and networking across multiple machines. Docker simplifies this dramatically. You can spin up a complete Spark cluster on your laptop in minutes, test your jobs locally, and tear everything down when you are done.

This guide covers running Spark in Docker from single-node development setups to multi-worker clusters, including PySpark notebooks and submitting real Spark jobs.

## Single-Node Quick Start

The fastest way to run Spark is with a single container in local mode:

```bash
# Run Spark shell interactively in local mode
docker run -it --rm \
  --name spark-shell \
  -p 4040:4040 \
  apache/spark:3.5.1 \
  /opt/spark/bin/spark-shell --master local[*]
```

Port 4040 gives you access to the Spark UI, where you can inspect job stages, tasks, and execution plans. The `local[*]` master URL tells Spark to use all available CPU cores.

## Running PySpark

For Python users, PySpark is the more common entry point:

```bash
# Start an interactive PySpark session
docker run -it --rm \
  --name pyspark \
  -p 4040:4040 \
  -v $(pwd)/data:/opt/spark/work-dir/data \
  apache/spark-py:3.5.1 \
  /opt/spark/bin/pyspark --master local[*]
```

The volume mount makes your local data directory available inside the container. This is essential for reading input files and writing results.

## Multi-Node Cluster with Docker Compose

A realistic Spark setup includes a master node and one or more worker nodes. Docker Compose makes this straightforward:

```yaml
# docker-compose.yml - Spark cluster with 1 master and 3 workers
version: "3.8"

services:
  spark-master:
    image: apache/spark:3.5.1
    container_name: spark-master
    ports:
      - "8080:8080"   # Spark Master web UI
      - "7077:7077"   # Spark Master port
      - "4040:4040"   # Spark application UI
    environment:
      - SPARK_MODE=master
    command: /opt/spark/bin/spark-class org.apache.spark.deploy.master.Master
    volumes:
      - spark-data:/opt/spark/work-dir

  spark-worker-1:
    image: apache/spark:3.5.1
    container_name: spark-worker-1
    depends_on:
      - spark-master
    environment:
      - SPARK_MODE=worker
      - SPARK_MASTER_URL=spark://spark-master:7077
      - SPARK_WORKER_MEMORY=2g
      - SPARK_WORKER_CORES=2
    command: >
      /opt/spark/bin/spark-class org.apache.spark.deploy.worker.Worker
      spark://spark-master:7077
    volumes:
      - spark-data:/opt/spark/work-dir

  spark-worker-2:
    image: apache/spark:3.5.1
    container_name: spark-worker-2
    depends_on:
      - spark-master
    environment:
      - SPARK_MODE=worker
      - SPARK_MASTER_URL=spark://spark-master:7077
      - SPARK_WORKER_MEMORY=2g
      - SPARK_WORKER_CORES=2
    command: >
      /opt/spark/bin/spark-class org.apache.spark.deploy.worker.Worker
      spark://spark-master:7077
    volumes:
      - spark-data:/opt/spark/work-dir

  spark-worker-3:
    image: apache/spark:3.5.1
    container_name: spark-worker-3
    depends_on:
      - spark-master
    environment:
      - SPARK_MODE=worker
      - SPARK_MASTER_URL=spark://spark-master:7077
      - SPARK_WORKER_MEMORY=2g
      - SPARK_WORKER_CORES=2
    command: >
      /opt/spark/bin/spark-class org.apache.spark.deploy.worker.Worker
      spark://spark-master:7077
    volumes:
      - spark-data:/opt/spark/work-dir

volumes:
  spark-data:
```

Start the cluster:

```bash
# Launch the full Spark cluster
docker compose up -d

# Verify all nodes are running
docker compose ps
```

Open http://localhost:8080 to see the Spark Master UI. You should see three workers registered.

## Submitting a Spark Job

With the cluster running, submit a job using `spark-submit`:

```bash
# Submit the built-in Pi estimation example to the cluster
docker exec spark-master /opt/spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --class org.apache.spark.examples.SparkPi \
  /opt/spark/examples/jars/spark-examples_2.12-3.5.1.jar \
  100
```

## Submitting a PySpark Job

For Python jobs, create your script and submit it to the cluster:

```python
# wordcount.py - simple PySpark word count job
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("WordCount") \
    .getOrCreate()

# Read a text file and count word frequencies
text_rdd = spark.sparkContext.textFile("/opt/spark/work-dir/data/input.txt")
counts = text_rdd.flatMap(lambda line: line.split(" ")) \
    .map(lambda word: (word.lower(), 1)) \
    .reduceByKey(lambda a, b: a + b) \
    .sortBy(lambda x: x[1], ascending=False)

# Save results
counts.saveAsTextFile("/opt/spark/work-dir/data/output")
spark.stop()
```

Submit the Python job:

```bash
# Copy the script into the master container and submit it
docker cp wordcount.py spark-master:/opt/spark/work-dir/
docker exec spark-master /opt/spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  /opt/spark/work-dir/wordcount.py
```

## Adding Jupyter Notebook Support

Running PySpark with Jupyter makes interactive data exploration much easier:

```yaml
# Add this service to your docker-compose.yml
  jupyter:
    image: jupyter/pyspark-notebook:latest
    container_name: spark-jupyter
    ports:
      - "8888:8888"
    environment:
      - SPARK_MASTER=spark://spark-master:7077
    volumes:
      - ./notebooks:/home/jovyan/work
      - spark-data:/opt/spark/work-dir
    depends_on:
      - spark-master
```

Access Jupyter at http://localhost:8888 and create a new notebook with PySpark connected to your cluster.

## Custom Spark Image with Additional Libraries

When you need additional Python packages or JAR files, build a custom image:

```dockerfile
# Dockerfile - Spark with additional Python libraries and JDBC drivers
FROM apache/spark-py:3.5.1

USER root

# Install Python data science libraries
RUN pip install --no-cache-dir \
    pandas \
    numpy \
    pyarrow \
    delta-spark

# Add PostgreSQL JDBC driver for database connectivity
ADD https://jdbc.postgresql.org/download/postgresql-42.7.1.jar /opt/spark/jars/

USER spark
```

Build and use it:

```bash
# Build custom Spark image
docker build -t spark-custom:3.5.1 .
```

## Resource Configuration

Proper resource allocation prevents Spark from consuming all system resources during local development:

```bash
# Run a worker with constrained resources
docker run -d \
  --name spark-worker \
  --cpus 4 \
  --memory 4g \
  apache/spark:3.5.1 \
  /opt/spark/bin/spark-class org.apache.spark.deploy.worker.Worker \
  spark://spark-master:7077 \
  --memory 3g \
  --cores 4
```

The Docker `--cpus` and `--memory` flags set hard limits at the container level. The Spark `--memory` and `--cores` flags tell Spark how many resources it can allocate to executors within those limits.

## Reading from External Data Sources

Spark can read from databases, cloud storage, and message queues. Here is an example reading from a PostgreSQL database:

```python
# read_postgres.py - read data from PostgreSQL into a Spark DataFrame
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("PostgresReader") \
    .config("spark.jars", "/opt/spark/jars/postgresql-42.7.1.jar") \
    .getOrCreate()

# Read the users table from PostgreSQL
df = spark.read \
    .format("jdbc") \
    .option("url", "jdbc:postgresql://postgres-host:5432/mydb") \
    .option("dbtable", "users") \
    .option("user", "spark_user") \
    .option("password", "spark_pass") \
    .option("driver", "org.postgresql.Driver") \
    .load()

df.show()
df.printSchema()
spark.stop()
```

## Conclusion

Running Apache Spark in Docker lets you develop and test data pipelines without managing a real cluster. The Docker Compose setup with a master and multiple workers closely mirrors production topology, which means your local testing catches configuration issues early. Start with the official Apache Spark images, add custom libraries as needed, and use the Spark UI on port 8080 to understand job execution. When you are ready for production, the same Docker images work with Kubernetes through the Spark Kubernetes scheduler, making the transition smooth.
