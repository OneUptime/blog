# How to Use ClickPipes for Data Ingestion in ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, ClickPipes, Data Ingestion, Kafka, S3, Pipeline

Description: Learn how to use ClickPipes in ClickHouse Cloud to set up managed data pipelines from Kafka, S3, and other sources without writing custom ingestion code.

---

ClickPipes is the managed data ingestion service built into ClickHouse Cloud. It provides a no-code interface to connect to sources like Apache Kafka, Amazon S3, Google Cloud Storage, and more - eliminating the need to build and maintain custom ingestion infrastructure.

## Supported Sources

- Apache Kafka (and MSK, Confluent Cloud, Redpanda, Azure Event Hubs, WarpStream)
- Amazon S3 and S3-compatible stores (including DigitalOcean Spaces)
- Google Cloud Storage
- Azure Blob Storage
- Amazon Kinesis
- Postgres and MySQL (CDC)

## Creating a Kafka ClickPipe

### Step 1 - Open ClickPipes in the Console

In your ClickHouse Cloud service, click "Data Sources" - "ClickPipes" - "New Pipe".

### Step 2 - Configure Kafka Connection

```text
Broker: kafka.example.com:9092
Topic: user-events
Consumer group: clickpipes-consumer
Authentication: SASL/PLAIN
```

### Step 3 - Map Schema

ClickPipes auto-detects the schema from your Kafka messages (JSON or Avro). You can override column types and names before confirming.

### Step 4 - Choose Target Table

Select an existing ClickHouse table or let ClickPipes create one automatically based on the inferred schema.

## Creating an S3 ClickPipe

```bash
curl -X POST \
  https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/clickpipes \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "s3-events-pipe",
    "source": {
      "type": "s3",
      "url": "https://my-bucket.s3.amazonaws.com/events/*.parquet",
      "format": "Parquet"
    },
    "destination": {
      "database": "analytics",
      "table": "events"
    }
  }'
```

## Monitoring ClickPipe Status

In the console, each ClickPipe shows:
- Rows ingested per second
- Lag (for streaming sources like Kafka)
- Error rate and last error message

Via SQL inside ClickHouse:

```sql
SELECT *
FROM system.clickpipes_log
ORDER BY event_time DESC
LIMIT 100;
```

## Handling Schema Evolution

When your Kafka schema adds new fields, ClickPipes can be configured to:
- Ignore unknown fields
- Auto-add columns to the target table
- Fail the pipe and alert

## Summary

ClickPipes provides managed, serverless data ingestion directly in ClickHouse Cloud. Set up pipelines from Kafka, S3, and other sources through the console or API without managing consumers, schemas, or error handling infrastructure yourself.
