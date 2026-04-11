# What Is Maxwell's Daemon for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Maxwells Daemon, Change Data Capture, CDC

Description: Maxwell's Daemon is a lightweight MySQL CDC tool that reads the binary log and publishes row-level change events as JSON to Kafka, Kinesis, RabbitMQ, or stdout.

---

## Overview

Maxwell's Daemon (or simply "Maxwell") is an open-source Change Data Capture application from Zendesk. It reads MySQL binary logs and outputs row-level change events as JSON. It is simpler to deploy than Debezium and supports multiple output targets including Apache Kafka, Amazon Kinesis, RabbitMQ, Redis, and stdout.

Maxwell is well-suited for smaller deployments or cases where you need CDC without the full Kafka Connect ecosystem.

## Maxwell vs Debezium

| Feature | Maxwell | Debezium |
|---------|---------|---------|
| Output targets | Kafka, Kinesis, RabbitMQ, Redis, stdout | Kafka Connect sinks |
| Complexity | Simple JAR | Kafka Connect cluster |
| Schema registry | Not required | Optional |
| Performance | Good | High throughput at scale |

## Prerequisites

- MySQL 5.1+ with binary logging enabled in ROW format
- Java 11+
- An output target (Kafka, etc.)

## MySQL Configuration

```text
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
binlog_row_image = FULL
```

## Creating the Maxwell MySQL User

```sql
CREATE USER 'maxwell'@'%' IDENTIFIED BY 'maxwell_password';
GRANT ALL ON maxwell.* TO 'maxwell'@'%';
GRANT SELECT, REPLICATION CLIENT, REPLICATION SLAVE ON *.* TO 'maxwell'@'%';
FLUSH PRIVILEGES;
```

Maxwell uses a `maxwell` database to store its position and schema state.

## Installing Maxwell

```bash
# Download the latest release
wget https://github.com/zendesk/maxwell/releases/download/v1.44.0/maxwell-1.44.0.tar.gz
tar -xzf maxwell-1.44.0.tar.gz
cd maxwell-1.44.0
```

## Running Maxwell with stdout (Quick Test)

```bash
./bin/maxwell --user=maxwell   --password=maxwell_password   --host=mysql-host   --producer=stdout
```

Output:

```json
{"database":"myapp","table":"orders","type":"insert","ts":1743430800,"data":{"id":42,"customer_id":7,"amount":99.99,"status":"pending"}}
{"database":"myapp","table":"orders","type":"update","ts":1743430801,"data":{"id":42,"customer_id":7,"amount":99.99,"status":"shipped"},"old":{"status":"pending"}}
```

## Running Maxwell with Kafka

```bash
./bin/maxwell --user=maxwell   --password=maxwell_password   --host=mysql-host   --producer=kafka   --kafka.bootstrap.servers=kafka-host:9092   --kafka_topic=maxwell
```

## Running Maxwell with Docker

```bash
docker run -it --rm zendesk/maxwell bin/maxwell   --user=maxwell   --password=maxwell_password   --host=mysql-host   --producer=kafka   --kafka.bootstrap.servers=kafka:9092   --kafka_topic=maxwell_events
```

## Filtering Tables

```bash
# Include only specific tables
./bin/maxwell   --filter='include: myapp.orders, include: myapp.customers'   --producer=stdout

# Exclude tables
./bin/maxwell   --filter='exclude: myapp.audit_log'   --producer=stdout
```

## Maxwell Event Format

Each event contains:

```json
{
  "database": "myapp",
  "table": "customers",
  "type": "update",
  "ts": 1743430800,
  "xid": 1234567,
  "data": {
    "id": 5,
    "name": "Alice Smith",
    "email": "alice@example.com"
  },
  "old": {
    "name": "Alice"
  }
}
```

The `old` field appears only for UPDATE events and contains the changed fields' previous values.

## Resuming from a Specific Position

Maxwell stores its position in the `maxwell.positions` table. To restart from a specific binary log position:

```bash
./bin/maxwell   --init_position=mysql-bin.000042:12345   --producer=stdout
```

## Running as a Service

```bash
# Using systemd
cat > /etc/systemd/system/maxwell.service << 'UNIT'
[Unit]
Description=Maxwell CDC
After=network.target

[Service]
ExecStart=/opt/maxwell/bin/maxwell   --user=maxwell --password=pass   --host=localhost   --producer=kafka   --kafka.bootstrap.servers=kafka:9092
Restart=on-failure
User=maxwell

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl enable maxwell
sudo systemctl start maxwell
```

## Summary

Maxwell's Daemon is a lightweight, easy-to-deploy MySQL CDC tool that requires only a Java runtime and a MySQL connection. It streams binary log events as clean JSON to multiple targets, making it ideal for smaller teams or applications that need CDC without the operational complexity of Kafka Connect. Its simple filter configuration and minimal infrastructure requirements make it a practical first choice for many CDC use cases.
