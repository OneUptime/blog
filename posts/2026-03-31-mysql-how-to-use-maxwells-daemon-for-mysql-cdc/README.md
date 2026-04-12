# How to Use Maxwell's Daemon for MySQL CDC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Change Data Capture, Replication, Kafka, Event

Description: Learn how to set up Maxwell's Daemon to capture MySQL change events in real time and stream them to Kafka or stdout for downstream processing.

---

Maxwell's Daemon is an open-source Change Data Capture (CDC) tool that reads MySQL binary logs and produces JSON-encoded row change events. It is lightweight, easy to configure, and integrates directly with Kafka, Kinesis, RabbitMQ, and stdout. Unlike heavier frameworks, Maxwell requires no Zookeeper and runs as a single JVM process.

## Prerequisites

Before installing Maxwell, ensure the following are in place.

MySQL must have binary logging enabled with the row-based format, and the server ID must be set:

```ini
[mysqld]
server-id        = 1
log-bin          = mysql-bin
binlog_format    = ROW
binlog_row_image = FULL
```

Restart MySQL after making these changes, then create a dedicated Maxwell user:

```sql
CREATE USER 'maxwell'@'%' IDENTIFIED BY 'strongpassword';
GRANT SELECT, REPLICATION CLIENT, REPLICATION SLAVE ON *.* TO 'maxwell'@'%';
GRANT ALL ON maxwell.* TO 'maxwell'@'%';
FLUSH PRIVILEGES;
```

## Installing Maxwell

Download the latest Maxwell release and extract it:

```bash
curl -sLO https://github.com/zendesk/maxwell/releases/download/v1.41.2/maxwell-1.41.2.tar.gz
tar -xzf maxwell-1.41.2.tar.gz
cd maxwell-1.41.2
```

Maxwell requires Java 8 or later. Verify your Java version:

```bash
java -version
```

## Running Maxwell to Stdout

The quickest way to verify Maxwell is working is to output events to stdout:

```bash
bin/maxwell --user='maxwell' --password='strongpassword' \
  --host='127.0.0.1' --producer=stdout
```

Insert a row into any table and observe the JSON output:

```json
{
  "database": "myapp",
  "table": "orders",
  "type": "insert",
  "ts": 1711900800,
  "xid": 23456,
  "commit": true,
  "data": {
    "id": 101,
    "customer_id": 42,
    "amount": 99.99,
    "status": "pending"
  }
}
```

## Streaming to Kafka

To forward events to a Kafka topic, use the Kafka producer configuration:

```bash
bin/maxwell --user='maxwell' --password='strongpassword' \
  --host='127.0.0.1' \
  --producer=kafka \
  --kafka.bootstrap.servers=broker1:9092,broker2:9092 \
  --kafka_topic=maxwell_cdc \
  --producer_partition_by=primary_key
```

The `--producer_partition_by=primary_key` option routes all changes for the same primary key to the same partition, preserving ordered delivery for a given row.

## Filtering Specific Tables

To capture only relevant tables and reduce noise, use include filters:

```bash
bin/maxwell --user='maxwell' --password='strongpassword' \
  --host='127.0.0.1' \
  --producer=stdout \
  --filter='exclude: myapp.*, include: myapp.orders, include: myapp.customers'
```

## Persisting Position with a Config File

Maxwell stores its binary log position inside the `maxwell` schema by default. For production use, create a config file to avoid long command lines:

```properties
user=maxwell
password=strongpassword
host=127.0.0.1
producer=kafka
kafka.bootstrap.servers=broker1:9092
kafka_topic=maxwell_cdc
filter=exclude: myapp.*, include: myapp.orders, include: myapp.customers
log_level=info
```

Run Maxwell pointing to this config:

```bash
bin/maxwell --config=/etc/maxwell/config.properties
```

## Monitoring Maxwell

Maxwell exposes metrics via JMX or Prometheus. To enable the Prometheus endpoint, add the following to the config file:

```properties
metrics_type=http
metrics_prefix=maxwell
http_port=8080
```

Then scrape `http://localhost:8080/prometheus` with your Prometheus instance to track lag, event rates, and replication position.

## Summary

Maxwell's Daemon provides a simple path to MySQL CDC by tailing binary logs and emitting structured JSON events. You configure a replication user, enable row-based binary logging, and point Maxwell at your database. Events stream to Kafka, stdout, or other targets with configurable filtering. Its low operational overhead makes it a strong choice for teams that want real-time data synchronization without managing a full Debezium connector infrastructure.
