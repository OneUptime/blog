# How to Configure Apache Spark Standalone on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache Spark, Big Data, Distributed Computing, Java

Description: Set up Apache Spark in standalone cluster mode on Ubuntu, configure master and worker nodes, and run your first distributed Spark application.

---

Apache Spark is a distributed processing engine for large-scale data analytics. In standalone mode, Spark uses its own cluster manager rather than YARN or Mesos, which simplifies setup and is suitable for dedicated Spark deployments. This guide walks through installing Spark on Ubuntu, configuring a multi-node standalone cluster, and running a basic application.

## Prerequisites

- Ubuntu 22.04 on all nodes
- Java 11 or 17 installed
- At least 4 GB RAM per node (8 GB recommended)
- Nodes able to reach each other over the network
- Root or sudo access

For this guide:
- `spark-master` (192.168.1.10) - runs the Spark Master
- `spark-worker-01` (192.168.1.11)
- `spark-worker-02` (192.168.1.12)

## Installing Java

Spark requires Java. Install it on all nodes:

```bash
# Install Java 17 (LTS)
sudo apt update
sudo apt install -y openjdk-17-jdk

# Verify installation
java -version
# Expected: openjdk version "17.x.x" ...

# Set JAVA_HOME environment variable
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' | sudo tee -a /etc/profile.d/java.sh
source /etc/profile.d/java.sh
```

## Downloading Apache Spark

Perform the following on all nodes:

```bash
# Download Spark (check https://spark.apache.org/downloads.html for the latest version)
SPARK_VERSION=3.5.1
HADOOP_VERSION=3

wget https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz

# Extract to /opt
sudo tar -xzf spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz -C /opt/
sudo ln -s /opt/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} /opt/spark

# Create a dedicated spark user
sudo useradd -r -s /bin/bash -d /opt/spark spark
sudo chown -R spark:spark /opt/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} /opt/spark

# Add Spark to PATH for all users
sudo tee /etc/profile.d/spark.sh > /dev/null <<'EOF'
export SPARK_HOME=/opt/spark
export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
EOF

source /etc/profile.d/spark.sh
```

## Configuring Environment

Set up Spark environment variables:

```bash
# Copy the template config
cd /opt/spark/conf
sudo cp spark-env.sh.template spark-env.sh
sudo nano spark-env.sh
```

Add the following to `spark-env.sh`:

```bash
# Java home
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Hostname this node advertises to the cluster
export SPARK_LOCAL_IP=$(hostname -I | awk '{print $1}')

# Master host (replace with your master node IP)
export SPARK_MASTER_HOST=192.168.1.10

# Worker configuration
export SPARK_WORKER_CORES=4          # CPU cores per worker
export SPARK_WORKER_MEMORY=4g        # RAM per worker

# Log directory
export SPARK_LOG_DIR=/var/log/spark
```

Create the log directory:

```bash
sudo mkdir -p /var/log/spark
sudo chown spark:spark /var/log/spark
```

## Configuring Worker Nodes

On the master node, list all worker nodes:

```bash
# Edit the workers file (formerly slaves)
sudo nano /opt/spark/conf/workers
```

Add your worker hostnames:

```
spark-worker-01
spark-worker-02
```

Also update `/etc/hosts` on all nodes:

```bash
sudo tee -a /etc/hosts > /dev/null <<'EOF'
192.168.1.10 spark-master
192.168.1.11 spark-worker-01
192.168.1.12 spark-worker-02
EOF
```

## Setting Up Passwordless SSH

The master needs to SSH into workers to start/stop them:

```bash
# On the master, as the spark user
sudo su - spark -s /bin/bash

# Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Authorize on workers
ssh-copy-id spark@spark-worker-01
ssh-copy-id spark@spark-worker-02

# Test
ssh spark@spark-worker-01 hostname
ssh spark@spark-worker-02 hostname
```

## Starting the Cluster

```bash
# On the master node, start master and all workers
sudo -u spark /opt/spark/sbin/start-all.sh

# Or start master and workers separately:
# sudo -u spark /opt/spark/sbin/start-master.sh
# On each worker:
# sudo -u spark /opt/spark/sbin/start-worker.sh spark://spark-master:7077
```

Verify the cluster is running:

```bash
# Check master process
jps | grep -i master
# Expected: 12345 Master

# Check worker process (on worker nodes)
jps | grep -i worker
# Expected: 12345 Worker
```

Open the Spark Web UI in a browser: `http://spark-master:8080`

You should see the master URL (`spark://spark-master:7077`) and all registered workers.

## Running Your First Spark Application

### Interactive Shell (PySpark)

```bash
# Start a PySpark shell connected to the cluster
sudo -u spark pyspark --master spark://spark-master:7077

# In the PySpark shell:
# Create an RDD and count words
data = ["hello world", "hello spark", "spark is great"]
rdd = sc.parallelize(data)
word_counts = rdd.flatMap(lambda line: line.split()).countByValue()
for word, count in sorted(word_counts.items()):
    print(f"{word}: {count}")
```

### Submitting a Batch Application

Create a word count script:

```python
# /opt/spark/examples/wordcount.py
from pyspark import SparkContext, SparkConf

# Configure the Spark application
conf = SparkConf().setAppName("WordCount").setMaster("spark://spark-master:7077")
sc = SparkContext(conf=conf)

# Read input data (replace with a real file path)
text_rdd = sc.parallelize([
    "the quick brown fox",
    "the fox jumped over the dog",
    "brown dogs and quick cats"
])

# Split into words, count occurrences
word_counts = (text_rdd
    .flatMap(lambda line: line.split())
    .map(lambda word: (word, 1))
    .reduceByKey(lambda a, b: a + b)
    .sortBy(lambda x: x[1], ascending=False))

# Collect and print results
for word, count in word_counts.collect():
    print(f"{word}: {count}")

sc.stop()
```

Submit the job:

```bash
sudo -u spark spark-submit \
  --master spark://spark-master:7077 \
  --executor-memory 2g \
  --total-executor-cores 4 \
  /opt/spark/examples/wordcount.py
```

## Configuring Spark History Server

The history server lets you review completed job details after they finish:

```bash
# Configure log directory for event logging
sudo nano /opt/spark/conf/spark-defaults.conf
```

```
# Enable event logging
spark.eventLog.enabled           true
spark.eventLog.dir               /var/log/spark/events
spark.history.fs.logDirectory    /var/log/spark/events
```

```bash
sudo mkdir -p /var/log/spark/events
sudo chown spark:spark /var/log/spark/events

# Start the history server
sudo -u spark /opt/spark/sbin/start-history-server.sh

# Access at: http://spark-master:18080
```

## Setting Up Systemd Services

For production, manage Spark as a system service:

```bash
# Spark Master service
sudo tee /etc/systemd/system/spark-master.service > /dev/null <<'EOF'
[Unit]
Description=Apache Spark Master
After=network.target

[Service]
Type=forking
User=spark
Group=spark
Environment=SPARK_HOME=/opt/spark
ExecStart=/opt/spark/sbin/start-master.sh
ExecStop=/opt/spark/sbin/stop-master.sh
PIDFile=/opt/spark/spark-master.pid

[Install]
WantedBy=multi-user.target
EOF

# Spark Worker service (on worker nodes)
sudo tee /etc/systemd/system/spark-worker.service > /dev/null <<'EOF'
[Unit]
Description=Apache Spark Worker
After=network.target

[Service]
Type=forking
User=spark
Group=spark
Environment=SPARK_HOME=/opt/spark
ExecStart=/opt/spark/sbin/start-worker.sh spark://spark-master:7077
ExecStop=/opt/spark/sbin/stop-worker.sh

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now spark-master    # on master
sudo systemctl enable --now spark-worker    # on workers
```

## Troubleshooting

### Workers Not Connecting to Master

```bash
# Check if master is listening
ss -tlnp | grep 7077

# Check spark master logs
tail -f /var/log/spark/spark-spark-master-*.out

# Verify network connectivity from worker
nc -zv spark-master 7077
```

### Out of Memory Errors

```bash
# Increase executor memory in spark-defaults.conf
echo "spark.executor.memory 4g" >> /opt/spark/conf/spark-defaults.conf
echo "spark.driver.memory 2g" >> /opt/spark/conf/spark-defaults.conf

# Restart the cluster
sudo -u spark /opt/spark/sbin/stop-all.sh
sudo -u spark /opt/spark/sbin/start-all.sh
```

Spark standalone mode is a practical starting point before moving to more complex resource managers like YARN or Kubernetes. The Web UI at port 8080 gives you job monitoring, and the history server preserves that information after jobs complete.
