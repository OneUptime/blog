# How to Sink Kafka Data to S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Connect, AWS S3, Data Lake, Sink Connector, Data Integration

Description: Learn how to stream Kafka data to Amazon S3 using the S3 Sink Connector, including partitioning strategies, file formats, exactly-once delivery, and best practices for data lake ingestion.

---

The S3 Sink Connector enables efficient data lake ingestion by streaming Kafka messages to Amazon S3 in various formats. This supports analytics, archival, and downstream processing workflows.

## Prerequisites

### AWS Credentials

```bash
# Environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

Or use IAM roles for EKS/EC2.

### Docker Compose Setup

```yaml
version: '3.8'

services:
  kafka:
    image: apache/kafka:3.7.0
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk

  kafka-connect:
    image: confluentinc/cp-kafka-connect:7.5.0
    container_name: kafka-connect
    ports:
      - "8083:8083"
    environment:
      CONNECT_BOOTSTRAP_SERVERS: kafka:9092
      CONNECT_REST_PORT: 8083
      CONNECT_GROUP_ID: connect-cluster
      CONNECT_CONFIG_STORAGE_TOPIC: connect-configs
      CONNECT_OFFSET_STORAGE_TOPIC: connect-offsets
      CONNECT_STATUS_STORAGE_TOPIC: connect-status
      CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_KEY_CONVERTER: org.apache.kafka.connect.storage.StringConverter
      CONNECT_VALUE_CONVERTER: org.apache.kafka.connect.json.JsonConverter
      CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE: "false"
      CONNECT_REST_ADVERTISED_HOST_NAME: kafka-connect
      CONNECT_PLUGIN_PATH: /usr/share/java,/usr/share/confluent-hub-components
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    command:
      - bash
      - -c
      - |
        confluent-hub install --no-prompt confluentinc/kafka-connect-s3:10.5.0
        /etc/confluent/docker/run
    depends_on:
      - kafka

  localstack:
    image: localstack/localstack:latest
    container_name: localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3
      - DEFAULT_REGION=us-east-1
    volumes:
      - localstack-data:/var/lib/localstack

volumes:
  localstack-data:
```

## Basic Configuration

```json
{
  "name": "s3-sink",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "topics": "events",
    "s3.bucket.name": "my-data-lake",
    "s3.region": "us-east-1",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.json.JsonFormat",
    "partitioner.class": "io.confluent.connect.storage.partitioner.DefaultPartitioner",
    "flush.size": "1000",
    "rotate.interval.ms": "60000",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "false"
  }
}
```

## Production Configuration

```json
{
  "name": "s3-sink-production",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "topics": "orders,events,logs",
    "tasks.max": "3",

    "s3.bucket.name": "company-data-lake",
    "s3.region": "us-east-1",
    "topics.dir": "raw",
    "directory.delim": "/",

    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "parquet.codec": "snappy",

    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "partition.duration.ms": "3600000",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    "locale": "en-US",
    "timezone": "UTC",

    "flush.size": "10000",
    "rotate.interval.ms": "600000",
    "rotate.schedule.interval.ms": "3600000",

    "behavior.on.null.values": "ignore",
    "store.kafka.keys": "true",
    "keys.format.class": "io.confluent.connect.s3.format.json.JsonFormat",

    "s3.part.size": "26214400",
    "s3.compression.type": "gzip",
    "s3.compression.level": "6",

    "retry.backoff.ms": "5000",
    "s3.retry.backoff.ms": "1000",

    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",

    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.deadletterqueue.topic.name": "s3-sink-errors",
    "errors.deadletterqueue.topic.replication.factor": "3"
  }
}
```

## File Formats

### JSON Format

```json
{
  "config": {
    "format.class": "io.confluent.connect.s3.format.json.JsonFormat"
  }
}
```

Output: `{"order_id": 1001, "customer_id": "cust-123", "total": 150.00}`

### Avro Format

```json
{
  "config": {
    "format.class": "io.confluent.connect.s3.format.avro.AvroFormat",
    "avro.codec": "snappy",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081"
  }
}
```

### Parquet Format

```json
{
  "config": {
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "parquet.codec": "snappy",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081"
  }
}
```

### Raw Bytes

```json
{
  "config": {
    "format.class": "io.confluent.connect.s3.format.bytearray.ByteArrayFormat",
    "value.converter": "org.apache.kafka.connect.converters.ByteArrayConverter"
  }
}
```

## Partitioning Strategies

### Default Partitioner (Kafka Partition)

```json
{
  "config": {
    "partitioner.class": "io.confluent.connect.storage.partitioner.DefaultPartitioner"
  }
}
```

Path: `topics/orders/partition=0/orders+0+0000000000.json`

### Time-Based Partitioner

```json
{
  "config": {
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "partition.duration.ms": "3600000",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    "locale": "en-US",
    "timezone": "UTC",
    "timestamp.extractor": "RecordField",
    "timestamp.field": "event_time"
  }
}
```

Path: `topics/orders/year=2024/month=01/day=15/hour=10/orders+0+0000000000.json`

### Field Partitioner

```json
{
  "config": {
    "partitioner.class": "io.confluent.connect.storage.partitioner.FieldPartitioner",
    "partition.field.name": "country,city"
  }
}
```

Path: `topics/orders/country=US/city=NYC/orders+0+0000000000.json`

### Daily Partitioner

```json
{
  "config": {
    "partitioner.class": "io.confluent.connect.storage.partitioner.DailyPartitioner",
    "locale": "en-US",
    "timezone": "UTC"
  }
}
```

Path: `topics/orders/2024/01/15/orders+0+0000000000.json`

### Custom Partitioner

```json
{
  "config": {
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "partition.duration.ms": "86400000",
    "path.format": "'dt'=YYYYMMdd",
    "timestamp.extractor": "RecordField",
    "timestamp.field": "created_at"
  }
}
```

## Rotation and Flushing

### Size-Based Rotation

```json
{
  "config": {
    "flush.size": "10000"
  }
}
```

Flush after 10,000 records.

### Time-Based Rotation

```json
{
  "config": {
    "rotate.interval.ms": "600000"
  }
}
```

Rotate every 10 minutes regardless of size.

### Scheduled Rotation

```json
{
  "config": {
    "rotate.schedule.interval.ms": "3600000"
  }
}
```

Rotate on schedule (hourly boundaries).

### Combined Strategy

```json
{
  "config": {
    "flush.size": "10000",
    "rotate.interval.ms": "600000",
    "rotate.schedule.interval.ms": "3600000"
  }
}
```

Rotate when any condition is met.

## Exactly-Once Delivery

```json
{
  "config": {
    "s3.part.size": "5242880",
    "store.url": "true",
    "store.kafka.keys": "true",
    "store.kafka.headers": "true"
  }
}
```

Note: The S3 Sink uses offset tracking to ensure at-least-once delivery. For exactly-once semantics in the consumer, deduplicate using stored Kafka metadata.

## Compression

### GZIP Compression

```json
{
  "config": {
    "s3.compression.type": "gzip",
    "s3.compression.level": "6"
  }
}
```

### Snappy (for Parquet/Avro)

```json
{
  "config": {
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "parquet.codec": "snappy"
  }
}
```

## Schema Evolution

### With Schema Registry

```json
{
  "config": {
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "enhanced.avro.schema.support": "true",
    "connect.meta.data": "false"
  }
}
```

### Schema Handling

```json
{
  "config": {
    "schema.compatibility": "NONE",
    "schema.generator.class": "io.confluent.connect.storage.hive.schema.DefaultSchemaGenerator"
  }
}
```

## S3 Configuration

### Custom Endpoint (LocalStack/MinIO)

```json
{
  "config": {
    "s3.bucket.name": "test-bucket",
    "store.url": "http://localstack:4566",
    "s3.region": "us-east-1",
    "s3.path.style.access.enabled": "true"
  }
}
```

### Server-Side Encryption

```json
{
  "config": {
    "s3.sse.customer.algorithm": "AES256",
    "s3.sse.customer.key": "${secrets:s3-encryption:key}"
  }
}
```

### Cross-Account Access

```json
{
  "config": {
    "s3.bucket.name": "cross-account-bucket",
    "s3.region": "us-east-1",
    "s3.acl.canned": "bucket-owner-full-control"
  }
}
```

## Monitoring

### Connector Status

```bash
# Check status
curl http://localhost:8083/connectors/s3-sink/status | jq

# Check tasks
curl http://localhost:8083/connectors/s3-sink/tasks | jq
```

### Key Metrics

```yaml
# JMX metrics
kafka.connect:type=sink-task-metrics,connector=s3-sink
  - sink-record-send-rate
  - sink-record-send-total
  - offset-commit-success-percentage

kafka.connect:type=connector-metrics,connector=s3-sink
  - connector-status

io.confluent.connect.s3:type=s3-sink-connector-metrics
  - s3-part-upload-time-ms
  - s3-part-upload-count
  - records-written
```

### S3 Metrics

```bash
# List objects in bucket
aws s3 ls s3://my-data-lake/topics/orders/ --recursive

# Check file sizes
aws s3 ls s3://my-data-lake/topics/orders/year=2024/month=01/ --human-readable --summarize
```

## Error Handling

### Dead Letter Queue

```json
{
  "config": {
    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.deadletterqueue.topic.name": "s3-sink-errors",
    "errors.deadletterqueue.topic.replication.factor": "3",
    "errors.deadletterqueue.context.headers.enable": "true"
  }
}
```

### Retry Configuration

```json
{
  "config": {
    "retry.backoff.ms": "5000",
    "s3.retry.backoff.ms": "1000"
  }
}
```

## Integration with Data Lake Tools

### AWS Athena Query

```sql
-- Create external table
CREATE EXTERNAL TABLE orders (
  order_id STRING,
  customer_id STRING,
  total DOUBLE,
  status STRING,
  created_at TIMESTAMP
)
PARTITIONED BY (year STRING, month STRING, day STRING)
STORED AS PARQUET
LOCATION 's3://my-data-lake/topics/orders/'
TBLPROPERTIES ('parquet.compression'='SNAPPY');

-- Load partitions
MSCK REPAIR TABLE orders;

-- Query
SELECT * FROM orders WHERE year='2024' AND month='01';
```

### AWS Glue Crawler

```python
# Terraform for Glue Crawler
resource "aws_glue_crawler" "orders_crawler" {
  name          = "orders-crawler"
  database_name = "data_lake"
  role          = aws_iam_role.glue_role.arn

  s3_target {
    path = "s3://my-data-lake/topics/orders/"
  }

  schedule = "cron(0 * * * ? *)"  # Hourly
}
```

## Best Practices

1. **Use Parquet or Avro** - Columnar formats for analytics
2. **Time-based partitioning** - Enables efficient queries
3. **Appropriate flush size** - Balance file size vs latency
4. **Schema Registry** - Handle schema evolution
5. **Monitor lag** - Track consumer offset lag
6. **Use compression** - Reduce storage costs

## Summary

| Configuration | Recommendation |
|--------------|----------------|
| Format | Parquet for analytics, JSON for debugging |
| Partitioner | TimeBasedPartitioner for queries |
| flush.size | 10000-100000 |
| rotate.interval.ms | 600000 (10 min) |
| Compression | Snappy (Parquet) or GZIP (JSON) |

The S3 Sink Connector provides efficient data lake ingestion with flexible partitioning and format options for downstream analytics.
