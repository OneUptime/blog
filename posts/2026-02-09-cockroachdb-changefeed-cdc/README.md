# How to Implement CockroachDB Changefeed for Real-Time CDC on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, CDC, Kubernetes, Changefeeds, Streaming

Description: Learn how to implement CockroachDB changefeeds for real-time change data capture on Kubernetes with Kafka integration, filtering strategies, and event processing patterns.

---

Change Data Capture (CDC) enables real-time data integration by streaming database changes to downstream systems. CockroachDB's changefeed feature provides CDC capabilities with per-key ordering and at-least-once delivery guarantees, making it ideal for event-driven architectures, cache invalidation, and data synchronization workflows.

In this guide, we'll implement CockroachDB changefeeds on Kubernetes for real-time CDC. We'll cover changefeed types, Kafka integration, filtering strategies, and monitoring best practices.

## Understanding CockroachDB Changefeeds

CockroachDB offers two ways to run changefeeds:

**Sinkless Changefeeds**: Stream changes directly to the SQL client. Suitable for development and simple integrations.

**Sink-backed Changefeeds**: Run as jobs and support Kafka, cloud storage, webhook, and other sinks. Self-hosted production clusters require a valid CockroachDB license; CockroachDB Cloud clusters are licensed automatically.

Changefeeds emit row-level changes in configurable formats such as JSON and Avro, with metadata such as updated timestamps and primary keys in the payload or sink message key depending on the sink and options.

## Setting Up Prerequisites

Deploy a Kafka cluster for changefeed output. In production Kubernetes environments, use a Kafka operator or a managed Kafka service. For example, with Strimzi installed:

```yaml
# kafka-deployment.yaml

apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: pool-a
  namespace: data-streaming
  labels:
    strimzi.io/cluster: kafka
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        deleteClaim: false
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: kafka
  namespace: data-streaming
spec:
  kafka:
    version: 4.2.0
    metadataVersion: 4.2
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
  entityOperator:
    topicOperator: {}
    userOperator: {}
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

-- Enable rangefeeds for self-hosted clusters
SET CLUSTER SETTING kv.rangefeed.enabled = true;
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

-- Create sinkless changefeed
CREATE CHANGEFEED FOR TABLE users
WITH updated, resolved='10s';

-- Create sink-backed changefeed to Kafka
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092?topic_prefix=crdb_'
WITH updated, resolved='10s', format=json, diff;
```

## Implementing Sink-Backed Changefeeds with Kafka

Deploy production changefeed with advanced options:

```sql
-- Multi-table changefeed
CREATE CHANGEFEED FOR TABLE users, orders, products
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092?topic_prefix=production_'
WITH
    updated,                          -- Include updated timestamp
    resolved='30s',                    -- Emit resolved timestamps
    format=json,                      -- Output format
    diff,                             -- Include before/after values
    envelope=wrapped;                 -- Wrap messages with metadata

-- Changefeed with filtering
CREATE CHANGEFEED
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092?topic_name=premium_users'
WITH
    updated,
    resolved='10s',
    format=json
AS SELECT *
FROM users
WHERE premium = true;

-- Changefeed for specific columns
CREATE CHANGEFEED
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092?topic_name=user_updates'
WITH updated, resolved='10s'
AS SELECT id, email, updated_at
FROM users;
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
    confluent_schema_registry='http://schema-registry.data-streaming:8081',
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
        Brokers: []string{"kafka-kafka-bootstrap.data-streaming:9092"},
        Topic:   "production_users",
        GroupID: "changefeed-consumer",
    })
    defer reader.Close()

    log.Println("Starting changefeed consumer...")

    for {
        ctx := context.Background()
        msg, err := reader.FetchMessage(ctx)
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

        if err := reader.CommitMessages(ctx, msg); err != nil {
            log.Printf("Error committing message: %v", err)
        }
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
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092?topic_name=users_avro'
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
    "log"

    "github.com/segmentio/kafka-go"
)

func consumeAvroChangefeed() {
    // Get schema from registry
    schemaRegistry := "http://schema-registry.data-streaming:8081"
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"kafka-kafka-bootstrap.data-streaming:9092"},
        Topic:   "users_avro",
        GroupID: "avro-changefeed-consumer",
    })
    defer reader.Close()

    log.Printf("Reading Avro changefeed messages using schemas from %s", schemaRegistry)
    // Implementation for Avro deserialization
}

func main() {
    consumeAvroChangefeed()
}
```

## Monitoring Changefeed Performance

Track changefeed health and latency:

```sql
-- Monitor changefeed lag
SELECT
    job_id,
    description,
    readable_high_water_timestamptz,
    now() - readable_high_water_timestamptz AS lag
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
            image: cockroachdb/cockroach:v26.2.1
            command:
              - /bin/bash
              - -c
              - |
                cockroach sql \
                  --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full" \
                  --execute="SELECT job_id, status, running_status, now() - readable_high_water_timestamptz AS lag FROM [SHOW CHANGEFEED JOBS];"
          restartPolicy: OnFailure
```

## Handling Schema Changes

Configure changefeed behavior for schema changes:

```sql
-- Stop on schema change
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092'
WITH
    schema_change_policy='stop';

-- Backfill on schema change
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092'
WITH
    schema_change_policy='backfill';

-- Emit schema change events
CREATE CHANGEFEED FOR TABLE users
INTO 'kafka://kafka-kafka-bootstrap.data-streaming:9092'
WITH
    schema_change_events='column_changes';
```

## Conclusion

CockroachDB changefeeds provide robust change data capture capabilities for building event-driven architectures on Kubernetes. With support for Kafka, cloud storage, and advanced filtering, changefeeds enable real-time data integration patterns while maintaining at-least-once delivery and per-key ordering guarantees.

Key takeaways:

- Use sink-backed changefeeds for production workloads
- Configure appropriate resolved timestamps for lag monitoring
- Implement consumer error handling and retries
- Monitor changefeed lag and performance
- Handle schema changes gracefully
- Use Avro format with schema registry for type safety

With changefeeds integrated into your CockroachDB deployment, you can build responsive applications that react to data changes in real-time while maintaining data consistency across distributed systems.
