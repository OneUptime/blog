# How to Set Up HBase on Azure HDInsight for NoSQL Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache HBase, Azure HDInsight, NoSQL, Big Data, Column Store, Azure Cloud, Data Storage

Description: Step-by-step instructions for deploying and using Apache HBase on Azure HDInsight for random read/write NoSQL workloads at scale.

---

When you need a NoSQL database that can handle billions of rows with millisecond-level read and write latency, Apache HBase is a solid choice. Built on top of the Hadoop ecosystem, HBase provides a wide-column store that excels at random access patterns over massive datasets. Running HBase on Azure HDInsight gives you the benefits of a managed service - automated provisioning, patching, and monitoring - while keeping the full power of HBase available for your applications.

This post covers provisioning an HBase cluster on HDInsight, creating tables with appropriate schema design, performing CRUD operations, and configuring the cluster for production use.

## When to Use HBase

HBase is not a general-purpose database. It shines in specific scenarios:

- **High-volume random reads and writes**: Millions of operations per second with consistent latency
- **Wide rows with many columns**: Sensor data, user activity logs, time-series data
- **Sparse data**: Not every row needs to have every column populated
- **Key-based access patterns**: Your queries primarily look up data by row key
- **Large datasets**: Billions of rows across terabytes or petabytes of storage

If your workload is primarily analytical (scanning large ranges for aggregations), Hive or Spark SQL would be better choices. HBase is for operational workloads where you need fast point lookups and writes.

## Creating an HBase Cluster

Provision an HBase cluster using the Azure CLI:

```bash
# Create an HDInsight HBase cluster
# Region servers run on worker nodes, so size them according to your workload
az hdinsight create \
  --name my-hbase-cluster \
  --resource-group my-resource-group \
  --type HBase \
  --component-version HBase=2.4 \
  --http-user admin \
  --http-password "YourStr0ngP@ssword!" \
  --ssh-user sshuser \
  --ssh-password "YourSSHP@ssword!" \
  --workernode-count 4 \
  --workernode-size Standard_D13_V2 \
  --headnode-size Standard_D13_V2 \
  --storage-account mystorageaccount \
  --storage-account-key "your-storage-key" \
  --storage-default-container hbase-data \
  --location eastus
```

Each worker node runs an HBase Region Server, which is responsible for serving reads and writes for a subset of the table's regions. Four worker nodes give you four Region Servers, and HBase will automatically balance regions across them.

## Connecting to the HBase Shell

SSH into the cluster and launch the HBase shell:

```bash
# SSH into the head node
ssh sshuser@my-hbase-cluster-ssh.azurehdinsight.net

# Launch the HBase shell
hbase shell
```

The HBase shell is a JRuby-based interactive console where you can create tables, insert data, and run scans.

## Creating Tables

HBase tables are organized into column families. Each column family is a group of related columns that are stored together on disk. Choosing the right column families is one of the most important design decisions you will make.

```ruby
# Create a table for user activity tracking
# Two column families: 'info' for user metadata, 'activity' for event data
create 'user_activity',
  {NAME => 'info', VERSIONS => 1, COMPRESSION => 'SNAPPY', BLOOMFILTER => 'ROW'},
  {NAME => 'activity', VERSIONS => 3, COMPRESSION => 'SNAPPY', BLOOMFILTER => 'ROW', TTL => 7776000}
```

Let us break down the options:

- **VERSIONS**: How many versions of each cell to keep. For metadata, 1 is usually enough. For activity data, keeping 3 versions lets you see recent history.
- **COMPRESSION**: SNAPPY provides a good balance of compression ratio and CPU overhead.
- **BLOOMFILTER**: ROW-level bloom filters speed up point lookups by avoiding unnecessary disk reads.
- **TTL**: Time-to-live in seconds. 7776000 seconds is 90 days, after which old activity data is automatically purged.

## Row Key Design

The row key is the single most important design decision in HBase. It determines how data is distributed across Region Servers and how efficiently you can access it.

Here are the key principles:

**Avoid monotonically increasing keys**: Using timestamps or auto-incrementing IDs as row keys creates "hot spotting" where all writes go to a single Region Server. Instead, prefix keys with a hash or reverse the timestamp.

```ruby
# Bad: Sequential keys cause hot spotting
# put 'user_activity', '20260216120000_user123', ...

# Good: Hash prefix distributes writes across regions
# The hash is derived from the user ID to ensure consistent distribution
# put 'user_activity', 'a7f3_user123_20260216120000', ...
```

**Design for your primary access pattern**: If you mostly look up data by user ID, put the user ID first in the key. If you scan by time ranges, include the timestamp in a position that supports efficient range scans.

Here is a practical row key design for our user activity table:

```ruby
# Row key format: <user_id_hash>_<user_id>_<reverse_timestamp>
# The hash prefix (first 4 chars of MD5) distributes data evenly
# Reverse timestamp (Long.MAX_VALUE - timestamp) puts newest data first
# This supports both point lookups by user and time-range scans per user
```

## Performing CRUD Operations

### Insert Data (Put)

```ruby
# Insert user info
put 'user_activity', 'a7f3_user123_9223370449035775807', 'info:name', 'Alice Johnson'
put 'user_activity', 'a7f3_user123_9223370449035775807', 'info:email', 'alice@example.com'
put 'user_activity', 'a7f3_user123_9223370449035775807', 'activity:page', '/products/widget-pro'
put 'user_activity', 'a7f3_user123_9223370449035775807', 'activity:action', 'view'
```

### Read Data (Get)

```ruby
# Get a specific row - returns all columns
get 'user_activity', 'a7f3_user123_9223370449035775807'

# Get only specific columns
get 'user_activity', 'a7f3_user123_9223370449035775807', {COLUMN => 'info:name'}
```

### Scan Ranges

```ruby
# Scan all activity for a specific user (prefix scan)
# The ROWPREFIXFILTER efficiently scans only rows matching the prefix
scan 'user_activity', {ROWPREFIXFILTER => 'a7f3_user123'}

# Scan with a limit
scan 'user_activity', {ROWPREFIXFILTER => 'a7f3_user123', LIMIT => 10}
```

### Delete Data

```ruby
# Delete a specific cell
delete 'user_activity', 'a7f3_user123_9223370449035775807', 'info:email'

# Delete an entire row
deleteall 'user_activity', 'a7f3_user123_9223370449035775807'
```

## Using the HBase REST API

For application integration, HBase exposes a REST API (Stargate) that runs on the cluster:

```bash
# Start the REST server if not already running
hbase rest start -p 8080

# Create a scanner to read data via REST
# First, create the scanner
curl -X PUT \
  'http://wn0-myhbas.internal.cloudapp.net:8080/user_activity/scanner' \
  -H 'Content-Type: text/xml' \
  -d '<Scanner batch="10"/>'

# The response Location header contains the scanner URL
# Use it to fetch rows
curl 'http://wn0-myhbas.internal.cloudapp.net:8080/user_activity/scanner/SCANNER_ID' \
  -H 'Accept: application/json'
```

## Java Client Example

For production applications, the HBase Java client provides the best performance:

```java
import org.apache.hadoop.hbase.*;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.util.Bytes;

// Create a connection to HBase
// Configuration is loaded from hbase-site.xml on the classpath
Configuration config = HBaseConfiguration.create();
Connection connection = ConnectionFactory.createConnection(config);
Table table = connection.getTable(TableName.valueOf("user_activity"));

// Put operation - insert a row
Put put = new Put(Bytes.toBytes("a7f3_user456_9223370449035775807"));
put.addColumn(
    Bytes.toBytes("info"),       // column family
    Bytes.toBytes("name"),       // column qualifier
    Bytes.toBytes("Bob Smith")   // value
);
table.put(put);

// Get operation - read a row
Get get = new Get(Bytes.toBytes("a7f3_user456_9223370449035775807"));
Result result = table.get(get);
String name = Bytes.toString(result.getValue(
    Bytes.toBytes("info"),
    Bytes.toBytes("name")
));
System.out.println("Name: " + name);

// Scan operation - read a range of rows
Scan scan = new Scan();
scan.setRowPrefixFilter(Bytes.toBytes("a7f3_user456"));
scan.setLimit(100);
ResultScanner scanner = table.getScanner(scan);
for (Result row : scanner) {
    // Process each row
    System.out.println("Row: " + Bytes.toString(row.getRow()));
}

// Always close resources
scanner.close();
table.close();
connection.close();
```

## Performance Tuning

### Region Sizing

By default, HBase splits regions when they reach about 10GB. For write-heavy workloads, pre-split your table at creation time:

```ruby
# Pre-split the table into 16 regions using hex boundaries
# This distributes initial writes across all Region Servers
create 'user_activity',
  {NAME => 'info', COMPRESSION => 'SNAPPY'},
  {NAME => 'activity', COMPRESSION => 'SNAPPY'},
  SPLITS => ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']
```

### MemStore and Block Cache

Tune the memory allocation between MemStore (write buffer) and Block Cache (read cache) based on your read/write ratio:

- For write-heavy workloads: Increase `hbase.regionserver.global.memstore.size` (default 0.4)
- For read-heavy workloads: Increase `hfile.block.cache.size` (default 0.4)

These settings are available in Ambari under HBase > Configs.

### Compaction

HBase periodically compacts small files into larger ones. For latency-sensitive workloads, schedule major compactions during off-peak hours:

```ruby
# Disable automatic major compaction
# Then schedule it manually via cron
alter 'user_activity', {NAME => 'activity', CONFIGURATION => {'hbase.hregion.majorcompaction' => '0'}}
```

## Scaling the Cluster

Add more Region Servers by scaling the worker node count:

```bash
# Scale from 4 to 8 Region Servers
az hdinsight resize \
  --name my-hbase-cluster \
  --resource-group my-resource-group \
  --workernode-count 8
```

HBase will automatically rebalance regions across the new Region Servers over time, or you can trigger a manual balancer run from the HBase shell:

```ruby
# Trigger region balancing across all Region Servers
balance_switch true
balancer
```

## Summary

HBase on Azure HDInsight is a strong choice for NoSQL workloads that require fast random access to large datasets. The key to success is getting your row key design right, choosing appropriate column families with the right compression and TTL settings, and pre-splitting tables for write-heavy workloads. Start with a cluster sized for your initial data volume, monitor Region Server metrics through Ambari, and scale horizontally by adding worker nodes when you need more throughput.
