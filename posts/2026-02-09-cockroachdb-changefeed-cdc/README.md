# How to Implement CockroachDB Changefeed for Real-Time CDC on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, CDC, Kubernetes, Changefeeds, Streaming

Description: Learn how to implement CockroachDB changefeeds for real-time change data capture on Kubernetes with Kafka integration, filtering strategies, and event processing patterns.

---

Change Data Capture (CDC) enables real-time data integration by streaming database changes to downstream systems. CockroachDB's changefeed feature provides enterprise-grade CDC capabilities with exactly-once delivery guarantees, making it ideal for event-driven architectures, cache invalidation, and data synchronization workflows.

In this guide, we'll implement CockroachDB changefeeds on Kubernetes for real-time CDC. We'll cover changefeed types, Kafka integration, filtering strategies, and monitoring best practices.

## Understanding CockroachDB Changefeeds

CockroachDB offers two types of changefeeds:

**Core Changefeeds**: Free tier, outputs to stdout or webhook. Suitable for development and simple integrations.

**Enterprise Changefeeds**: Supports Kafka, cloud storage sinks, advanced filtering, and guaranteed delivery. Requires enterprise license.

Changefeeds emit row-level changes in JSON format with metadata including transaction timestamps and primary keys.

## Setting Up Prerequisites

Deploy Kafka cluster for changefeed output:

```yaml
# kafka-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka
  namespace: data-streaming
spec:
  ports:
  - port: 9092
    name: kafka
  selector:
    app: kafka
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: data-streaming
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.5.0
        ports:
        - containerPort: 9092
        env:
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper:2181"
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "PLAINTEXT://kafka:9092"
        - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
          value: "3"
```

Enable enterprise license in CockroachDB:

```sql
-- Connect to CockroachDB
cockroach sql --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full"

-- Set organization and license
SET CLUSTER SETTING cluster.organization = 'your-organization';
SET CLUSTER SETTING enterprise.license = 'your-license-key';

-- Verify enterprise features enabled
SHOW CLUSTER SETTING enterprise.license;
```

## Creating Basic Changefeeds

Start with a simple changefeed:

```sql
-- Create table to monitor
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email STRING UNIQUE NOT NULL,
    name STRING,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create core changefeed (stdout)
CREATE CHANGEFEED FOR TABLE users
INTO 'experimental-stdout:///'
WITH updated, resolved='10s';

-- Create enterprise changefeed to Kafka
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka.data-streaming:9092?topic_prefix=crdb_'
WITH updated, resolved='10s', format=json, diff;
```

## Implementing Enterprise Changefeeds with Kafka

Deploy production changefeed with advanced options:

```sql
-- Multi-table changefeed
CREATE CHANGEFEED FOR TABLE users, orders, products
INTO 'kafka://kafka.data-streaming:9092?topic_prefix=production_'
WITH
    updated,                          -- Include updated timestamp
    resolved='30s',                    -- Emit resolved timestamps
    format=json,                      -- Output format
    diff,                             -- Include before/after values
    envelope=wrapped,                 -- Wrap messages with metadata
    confluent_schema_registry='http://schema-registry:8081';

-- Changefeed with filtering
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka.data-streaming:9092?topic_name=premium_users'
WITH
    updated,
    resolved='10s',
    format=json
WHERE premium = true;

-- Changefeed for specific columns
CREATE CHANGEFEED FOR TABLE users (id, email, updated_at)
INTO 'kafka://kafka.data-streaming:9092?topic_name=user_updates'
WITH updated, resolved='10s';
```

## Configuring Changefeed with Cloud Storage

Output to S3 for archival or batch processing:

```sql
-- Create changefeed to S3
CREATE CHANGEFEED FOR TABLE events
INTO 's3://data-lake/changefeeds/events?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx'
WITH
    updated,
    resolved='1m',
    format=json,
    compression=gzip;

-- Create changefeed to Google Cloud Storage
CREATE CHANGEFEED FOR TABLE audit_logs
INTO 'gs://audit-bucket/changefeeds/?CREDENTIALS=base64_encoded_creds'
WITH
    updated,
    resolved='5m',
    format=avro,
    schema_change_events=column_changes;
```

## Managing Changefeeds

View and control changefeed jobs:

```sql
-- List all changefeeds
SHOW CHANGEFEED JOBS;

-- Get specific changefeed details
SHOW CHANGEFEED JOB 123456789;

-- Pause a changefeed
PAUSE JOB 123456789;

-- Resume a changefeed
RESUME JOB 123456789;

-- Cancel a changefeed
CANCEL JOB 123456789;

-- Monitor changefeed progress
SELECT
    job_id,
    description,
    status,
    running_status,
    fraction_completed,
    high_water_timestamp
FROM [SHOW CHANGEFEED JOBS]
WHERE status = 'running';
```

## Building Event Consumer Application

Consume changefeed events from Kafka:

```go
// consumer.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    "github.com/segmentio/kafka-go"
)

type ChangeEvent struct {
    After struct {
        ID        string `json:"id"`
        Email     string `json:"email"`
        Name      string `json:"name"`
        UpdatedAt string `json:"updated_at"`
    } `json:"after"`
    Before struct {
        ID        string `json:"id"`
        Email     string `json:"email"`
        Name      string `json:"name"`
        UpdatedAt string `json:"updated_at"`
    } `json:"before,omitempty"`
    Key        []string `json:"key"`
    Updated    string   `json:"updated"`
}

func main() {
    // Create Kafka reader
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"kafka.data-streaming:9092"},
        Topic:   "production_users",
        GroupID: "changefeed-consumer",
    })
    defer reader.Close()

    log.Println("Starting changefeed consumer...")

    for {
        msg, err := reader.ReadMessage(context.Background())
        if err != nil {
            log.Printf("Error reading message: %v", err)
            continue
        }

        var event ChangeEvent
        if err := json.Unmarshal(msg.Value, &event); err != nil {
            log.Printf("Error unmarshaling event: %v", err)
            continue
        }

        // Process the change event
        processChange(event)
    }
}

func processChange(event ChangeEvent) {
    if event.Before.ID == "" {
        // INSERT operation
        fmt.Printf("New user created: %s (%s)\n", event.After.Name, event.After.Email)
    } else if event.After.ID == "" {
        // DELETE operation
        fmt.Printf("User deleted: %s\n", event.Before.ID)
    } else {
        // UPDATE operation
        fmt.Printf("User updated: %s -> %s\n", event.Before.Email, event.After.Email)
    }
}
```

## Implementing Changefeed with Schema Registry

Use Avro format with schema registry:

```sql
-- Create changefeed with Avro format
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka.data-streaming:9092?topic_name=users_avro'
WITH
    updated,
    resolved='10s',
    format=avro,
    confluent_schema_registry='http://schema-registry.data-streaming:8081';
```

Consumer with Avro deserialization:

```go
// avro_consumer.go
package main

import (
    "github.com/linkedin/goavro/v2"
    "github.com/segmentio/kafka-go"
)

func consumeAvroChangefeed() {
    // Get schema from registry
    schemaRegistry := "http://schema-registry.data-streaming:8081"
    // Implementation for Avro deserialization
}
```

## Monitoring Changefeed Performance

Track changefeed health and latency:

```sql
-- Monitor changefeed lag
SELECT
    job_id,
    description,
    high_water_timestamp,
    now() - high_water_timestamp AS lag
FROM [SHOW CHANGEFEED JOBS]
WHERE status = 'running';

-- Check changefeed errors
SELECT job_id, status, error
FROM [SHOW JOBS]
WHERE job_type = 'CHANGEFEED' AND status = 'failed'
ORDER BY created DESC
LIMIT 10;

-- View changefeed metrics
SELECT
    job_id,
    running_status,
    fraction_completed
FROM crdb_internal.jobs
WHERE job_type = 'CHANGEFEED';
```

Create Kubernetes monitoring job:

```yaml
# changefeed-monitor.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: changefeed-monitor
  namespace: cockroachdb
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: monitor
            image: cockroachdb/cockroach:v23.1.0
            command:
              - /bin/bash
              - -c
              - |
                cockroach sql \
                  --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full" \
                  --execute="SELECT job_id, status, running_status, now() - high_water_timestamp AS lag FROM [SHOW CHANGEFEED JOBS];"
          restartPolicy: OnFailure
```

## Handling Schema Changes

Configure changefeed behavior for schema changes:

```sql
-- Stop on schema change (default)
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka.data-streaming:9092'
WITH
    schema_change_policy='stop';

-- Backfill on schema change
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka.data-streaming:9092'
WITH
    schema_change_policy='backfill';

-- Emit schema change events
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka.data-streaming:9092'
WITH
    schema_change_events='column_changes';
```

## Conclusion

CockroachDB changefeeds provide robust change data capture capabilities for building event-driven architectures on Kubernetes. With support for Kafka, cloud storage, and advanced filtering, changefeeds enable real-time data integration patterns while maintaining exactly-once delivery guarantees.

Key takeaways:

- Use enterprise changefeeds for production workloads
- Configure appropriate resolved timestamps for lag monitoring
- Implement consumer error handling and retries
- Monitor changefeed lag and performance
- Handle schema changes gracefully
- Use Avro format with schema registry for type safety

With changefeeds integrated into your CockroachDB deployment, you can build responsive applications that react to data changes in real-time while maintaining data consistency across distributed systems.
