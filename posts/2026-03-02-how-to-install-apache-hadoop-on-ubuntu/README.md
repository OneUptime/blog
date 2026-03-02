# How to Install Apache Hadoop on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Hadoop, Big Data, HDFS, MapReduce

Description: Install and configure Apache Hadoop on Ubuntu in pseudo-distributed mode and multi-node cluster mode to run distributed data processing workloads.

---

Apache Hadoop is the original foundation of the big data ecosystem. It provides HDFS (Hadoop Distributed File System) for storing large datasets across multiple machines, and YARN (Yet Another Resource Negotiator) for managing cluster resources. MapReduce runs computation jobs on data stored in HDFS. While newer tools like Spark often run on top of Hadoop, understanding how to set up Hadoop is fundamental for any big data infrastructure work.

This guide covers both pseudo-distributed mode (single node for development) and the basics of a multi-node cluster.

## Prerequisites

- Ubuntu 22.04
- Java 8 or 11 (Java 11 recommended for Hadoop 3.x)
- At least 4 GB RAM
- Root or sudo access

## Installing Java

```bash
# Install Java 11
sudo apt update
sudo apt install -y openjdk-11-jdk

# Verify
java -version
# Expected: openjdk version "11.x.x"

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64' | sudo tee /etc/profile.d/java.sh
source /etc/profile.d/java.sh
```

## Creating a Hadoop User

```bash
# Create a dedicated hadoop user
sudo adduser hadoop

# Allow hadoop to sudo (optional, for system administration tasks)
sudo usermod -aG sudo hadoop

# Switch to the hadoop user for remaining setup
sudo su - hadoop
```

## Downloading and Installing Hadoop

```bash
# Download Hadoop (check https://hadoop.apache.org/releases.html for the latest version)
HADOOP_VERSION=3.3.6
wget https://downloads.apache.org/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz

# Verify the download integrity
wget https://downloads.apache.org/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz.sha512
sha512sum -c hadoop-${HADOOP_VERSION}.tar.gz.sha512

# Extract to /opt
sudo tar -xzf hadoop-${HADOOP_VERSION}.tar.gz -C /opt/
sudo ln -s /opt/hadoop-${HADOOP_VERSION} /opt/hadoop
sudo chown -R hadoop:hadoop /opt/hadoop-${HADOOP_VERSION} /opt/hadoop

# Set Hadoop environment variables
cat >> ~/.bashrc <<'EOF'
export HADOOP_HOME=/opt/hadoop
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
EOF

source ~/.bashrc
```

## Configuring Hadoop (Pseudo-Distributed Mode)

Pseudo-distributed mode runs all Hadoop daemons on a single machine, useful for development and testing.

### Set JAVA_HOME in Hadoop Environment

```bash
# Edit the Hadoop environment script
nano $HADOOP_HOME/etc/hadoop/hadoop-env.sh

# Find and update the JAVA_HOME line:
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

### Configure Core Site

```bash
nano $HADOOP_HOME/etc/hadoop/core-site.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="configuration.xsl"?>
<configuration>
    <!-- NameNode URI - where HDFS metadata is stored -->
    <property>
        <name>fs.defaultFS</name>
        <value>hdfs://localhost:9000</value>
    </property>

    <!-- Temporary storage directory -->
    <property>
        <name>hadoop.tmp.dir</name>
        <value>/opt/hadoop/tmp</value>
    </property>
</configuration>
```

### Configure HDFS

```bash
nano $HADOOP_HOME/etc/hadoop/hdfs-site.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- Number of data replicas (1 for pseudo-distributed) -->
    <property>
        <name>dfs.replication</name>
        <value>1</value>
    </property>

    <!-- NameNode storage location -->
    <property>
        <name>dfs.namenode.name.dir</name>
        <value>/opt/hadoop/data/namenode</value>
    </property>

    <!-- DataNode storage location -->
    <property>
        <name>dfs.datanode.data.dir</name>
        <value>/opt/hadoop/data/datanode</value>
    </property>
</configuration>
```

### Configure YARN

```bash
nano $HADOOP_HOME/etc/hadoop/yarn-site.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- Use MapReduce shuffle service -->
    <property>
        <name>yarn.nodemanager.aux-services</name>
        <value>mapreduce_shuffle</value>
    </property>

    <!-- ResourceManager hostname -->
    <property>
        <name>yarn.resourcemanager.hostname</name>
        <value>localhost</value>
    </property>
</configuration>
```

### Configure MapReduce

```bash
cp $HADOOP_HOME/etc/hadoop/mapred-site.xml.template \
   $HADOOP_HOME/etc/hadoop/mapred-site.xml 2>/dev/null || \
cp $HADOOP_HOME/etc/hadoop/mapred-site.xml \
   $HADOOP_HOME/etc/hadoop/mapred-site.xml.bak

nano $HADOOP_HOME/etc/hadoop/mapred-site.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- Use YARN as the resource manager for MapReduce -->
    <property>
        <name>mapreduce.framework.name</name>
        <value>yarn</value>
    </property>

    <!-- Memory settings for MapReduce containers -->
    <property>
        <name>mapreduce.map.memory.mb</name>
        <value>1024</value>
    </property>
    <property>
        <name>mapreduce.reduce.memory.mb</name>
        <value>2048</value>
    </property>
</configuration>
```

## Setting Up SSH for Localhost

Hadoop scripts SSH to localhost to start/stop daemons:

```bash
# As the hadoop user, generate an SSH key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Authorize it for localhost connections
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Test
ssh localhost hostname
```

## Creating Required Directories and Formatting HDFS

```bash
# Create data directories
mkdir -p /opt/hadoop/data/namenode
mkdir -p /opt/hadoop/data/datanode
mkdir -p /opt/hadoop/tmp

# Format the NameNode (only do this once - it erases existing HDFS data)
hdfs namenode -format -force

# Expected output:
# INFO namenode.FSImage: Allocated new BlockPoolId: ...
# INFO common.Storage: Storage directory .../current has been successfully formatted.
```

## Starting Hadoop

```bash
# Start HDFS
start-dfs.sh

# Start YARN
start-yarn.sh

# Verify all daemons are running
jps
# Expected output:
# 12345 NameNode
# 12346 DataNode
# 12347 SecondaryNameNode
# 12348 ResourceManager
# 12349 NodeManager
```

Access the web interfaces:
- HDFS NameNode: `http://localhost:9870`
- YARN ResourceManager: `http://localhost:8088`

## Running a MapReduce Job

Test your installation with the built-in word count example:

```bash
# Create input directory in HDFS
hdfs dfs -mkdir -p /user/hadoop/input

# Create a sample input file
echo "the quick brown fox jumps over the lazy dog
the fox was very quick and the dog was very lazy
hadoop is a distributed computing framework" > /tmp/sample.txt

# Copy to HDFS
hdfs dfs -put /tmp/sample.txt /user/hadoop/input/

# Verify the file is in HDFS
hdfs dfs -ls /user/hadoop/input/
hdfs dfs -cat /user/hadoop/input/sample.txt

# Run the word count MapReduce job
hadoop jar $HADOOP_HOME/share/hadoop/mapreduce/hadoop-mapreduce-examples-*.jar \
  wordcount \
  /user/hadoop/input/sample.txt \
  /user/hadoop/output/wordcount

# View results
hdfs dfs -ls /user/hadoop/output/wordcount/
hdfs dfs -cat /user/hadoop/output/wordcount/part-r-00000
```

## Basic HDFS Commands

```bash
# List files
hdfs dfs -ls /user/hadoop/

# Create directories
hdfs dfs -mkdir /data

# Upload a file
hdfs dfs -put /local/file.txt /data/

# Download a file
hdfs dfs -get /data/file.txt /tmp/

# Delete a directory
hdfs dfs -rm -r /user/hadoop/output/

# Check HDFS health
hdfs dfsadmin -report

# Check space usage
hdfs dfs -df -h /
```

## Stopping Hadoop

```bash
stop-yarn.sh
stop-dfs.sh
```

## Common Issues

### DataNode Fails to Start

```bash
# Check logs
cat $HADOOP_HOME/logs/hadoop-hadoop-datanode-*.log | tail -50

# Often caused by a NameNode re-format creating a new cluster ID
# Solution: delete datanode data and restart
rm -rf /opt/hadoop/data/datanode/*
start-dfs.sh
```

### Port Already in Use

```bash
# Find which process is using a port
ss -tlnp | grep 9000

# Kill conflicting process if needed
sudo kill -9 <PID>
```

### Insufficient Memory for YARN

```bash
# Check YARN logs
cat $HADOOP_HOME/logs/yarn-hadoop-resourcemanager-*.log | tail -50

# Reduce minimum container memory in yarn-site.xml:
# <property>
#   <name>yarn.scheduler.minimum-allocation-mb</name>
#   <value>256</value>
# </property>
```

Hadoop in pseudo-distributed mode is a practical way to learn HDFS and MapReduce without needing a full cluster. Once comfortable with single-node operations, extending to a multi-node cluster involves updating the `workers` file, configuring networking between nodes, and ensuring all nodes have consistent Hadoop installations.
