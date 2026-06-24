# How to Run Benthos/Bento for Stream Processing in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Benthos, Bento, Stream Processing, Data Pipeline, ETL, DevOps

Description: Set up Benthos (now Bento) in Docker for building stream processing pipelines that transform, filter, and route data between systems.

---

Benthos, now Redpanda Connect after Redpanda's acquisition, is a stream processing tool that connects inputs to outputs with optional processing in between. Bento is the open source fork of Benthos. Think of these tools as Swiss Army knives for data pipelines. They read data from one system, transform it, and write it to another. Everything is defined in a single YAML configuration file with no custom code required.

Redpanda Connect and Bento support over 200 connectors including Kafka, RabbitMQ, Redis, HTTP, databases, cloud storage, and more. Running them in Docker makes deployments consistent and lets you version your pipeline configurations alongside your infrastructure.

## Core Concepts

A Redpanda Connect or Bento pipeline has three parts:

- **Input** - Where data comes from (Kafka topic, HTTP endpoint, file, database, etc.)
- **Pipeline** - Processors that transform, filter, or enrich the data
- **Output** - Where data goes (another Kafka topic, database, HTTP API, etc.)

```mermaid
graph LR
    Input[Input Source] --> Pipeline[Processors]
    Pipeline --> Output[Output Destination]
```

## Quick Start

Run Redpanda Connect with a simple pipeline that reads from stdin and writes to stdout:

```bash
# Run Redpanda Connect with a basic echo pipeline

docker run --rm docker.redpanda.com/redpandadata/connect create > connect.yaml

docker run --rm -it -v $(pwd)/connect.yaml:/connect.yaml \
  docker.redpanda.com/redpandadata/connect run /connect.yaml
```

Type a message and press Enter. Redpanda Connect echoes it back after passing through the (empty) pipeline.

## Docker Compose Setup

For real pipelines, define the configuration in a YAML file:

```yaml
# docker-compose.yml - Bento stream processor
version: "3.8"

services:
  bento:
    image: docker.redpanda.com/redpandadata/connect
    command:
      - run
      - /connect.yaml
    volumes:
      # Mount the pipeline configuration
      - ./config.yaml:/connect.yaml
    restart: unless-stopped
```

## HTTP to Kafka Pipeline

A common use case is receiving webhooks over HTTP and forwarding them to Kafka:

```yaml
# config.yaml - HTTP webhook receiver that writes to Kafka
input:
  http_server:
    # Register this endpoint on the service-wide HTTP server
    path: /webhook
    allowed_verbs:
      - POST
    timeout: 5s

pipeline:
  processors:
    # Parse the incoming JSON body
    - mapping: |
        root = this
        root.received_at = now()
        root.source = "webhook"

    # Validate required fields exist
    - mapping: |
        if this.event_type == null {
          root = deleted()
        }

output:
  kafka:
    addresses:
      - "redpanda:9092"
    topic: "webhook-events"
    client_id: "bento-webhook"
    key: ${! json("event_type") }
    max_in_flight: 10
```

The Docker Compose file with Redpanda included:

```yaml
# docker-compose.yml - Bento with Redpanda backend
version: "3.8"

services:
  bento:
    image: docker.redpanda.com/redpandadata/connect
    command:
      - run
      - /connect.yaml
    ports:
      - "4195:4195"
    volumes:
      - ./config.yaml:/connect.yaml
    depends_on:
      redpanda:
        condition: service_healthy
    restart: unless-stopped

  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:latest
    command:
      - redpanda
      - start
      - --smp 1
      - --memory 256M
      - --overprovisioned
      - --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:19092
      - --advertise-kafka-addr internal://redpanda:9092,external://localhost:19092
    ports:
      - "19092:19092"
    healthcheck:
      test: ["CMD", "rpk", "cluster", "health"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - redpanda_data:/var/lib/redpanda/data

volumes:
  redpanda_data:
```

Test it:

```bash
# Send a webhook event
curl -X POST http://localhost:4195/webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type": "order.created", "order_id": "12345", "amount": 99.99}'
```

## Data Transformation Pipeline

Bloblang is powerful for transforming data. Here is a pipeline that cleans and enriches log data:

```yaml
# config.yaml - Log enrichment pipeline
input:
  kafka:
    addresses:
      - "redpanda:9092"
    topics:
      - "raw-logs"
    consumer_group: "log-enricher"

pipeline:
  processors:
    # Parse the raw log line as JSON
    - mapping: |
        root = this

        # Extract the log level and normalize it to uppercase
        root.level = this.level.uppercase()

        # Parse the timestamp into a standard format
        root.timestamp = this.ts.ts_parse("2006-01-02T15:04:05Z07:00")

        # Add environment metadata
        root.env = env("ENVIRONMENT").or("development")

        # Hash PII fields for privacy
        root.user_email_hash = this.user_email.hash("sha256").encode("hex")
        root.user_email = deleted()

    # Filter out debug logs in production
    - mapping: |
        if this.env == "production" && this.level == "DEBUG" {
          root = deleted()
        }

output:
  elasticsearch_v8:
    urls:
      - "http://elasticsearch:9200"
    index: "logs-${! now().ts_format("2006.01.02") }"
    action: "index"
    id: ${! uuid_v4() }
    batching:
      count: 100
      period: 5s
```

## Fan-Out Pattern: One Input, Multiple Outputs

Send data to multiple destinations simultaneously:

```yaml
# config.yaml - Fan-out to multiple outputs
input:
  kafka:
    addresses:
      - "redpanda:9092"
    topics:
      - "orders"
    consumer_group: "order-router"

pipeline:
  processors:
    - mapping: |
        root = this
        root.processed_at = now()

output:
  broker:
    pattern: fan_out
    outputs:
      # Write to PostgreSQL for persistence
      - sql_insert:
          driver: postgres
          dsn: "postgres://user:pass@postgres:5432/orders?sslmode=disable"
          table: orders
          columns:
            - order_id
            - customer_id
            - amount
            - processed_at
          args_mapping: |
            root = [
              this.order_id,
              this.customer_id,
              this.amount,
              this.processed_at
            ]

      # Forward high-value orders to a special topic
      - switch:
          cases:
            - check: this.amount > 1000
              output:
                kafka:
                  addresses: ["redpanda:9092"]
                  topic: "high-value-orders"

      # Send all orders to the analytics pipeline
      - kafka:
          addresses: ["redpanda:9092"]
          topic: "orders-analytics"
```

## Content-Based Routing

Route messages to different outputs based on their content:

```yaml
# config.yaml - Route messages based on event type
input:
  kafka:
    addresses:
      - "redpanda:9092"
    topics:
      - "events"
    consumer_group: "event-router"

output:
  switch:
    cases:
      - check: this.event_type == "user.created"
        output:
          kafka:
            addresses: ["redpanda:9092"]
            topic: "user-events"

      - check: this.event_type == "order.created"
        output:
          kafka:
            addresses: ["redpanda:9092"]
            topic: "order-events"

      - check: this.event_type == "payment.processed"
        output:
          http_client:
            url: "http://payment-service:8080/notify"
            verb: POST

      # Default catch-all for unmatched events
      - output:
          kafka:
            addresses: ["redpanda:9092"]
            topic: "unrouted-events"
```

## Testing Pipelines

Redpanda Connect and Bento have built-in testing frameworks. Create a test file:

```yaml
# config_test.yaml - Unit tests for the pipeline
tests:
  - name: "Should enrich log with timestamp and environment"
    target_processors: "config.yaml#/pipeline/processors"
    environment:
      ENVIRONMENT: "production"
    input_batch:
      - json_content:
          level: "error"
          message: "Connection failed"
          ts: "2024-01-15T10:30:00Z"
          user_email: "test@example.com"
    output_batches:
      - - json_contains:
            level: "ERROR"
            message: "Connection failed"
            env: "production"

  - name: "Should filter debug logs in production"
    target_processors: "config.yaml#/pipeline/processors"
    environment:
      ENVIRONMENT: "production"
    input_batch:
      - json_content:
          level: "debug"
          message: "Verbose output"
          ts: "2024-01-15T10:30:00Z"
          user_email: "debug@example.com"
    output_batches: []
```

Run the tests:

```bash
# Run pipeline unit tests
docker run --rm -v $(pwd):/config docker.redpanda.com/redpandadata/connect \
  test /config/config_test.yaml
```

## Monitoring with Metrics

Redpanda Connect exposes Prometheus metrics by default:

```yaml
# config.yaml - Pipeline with metrics and logging
input:
  kafka:
    addresses: ["redpanda:9092"]
    topics: ["events"]
    consumer_group: "processor"

pipeline:
  processors:
    - mapping: "root = this"

output:
  kafka:
    addresses: ["redpanda:9092"]
    topic: "processed-events"

# Expose Prometheus metrics on port 4195
metrics:
  prometheus: {}

# Configure structured logging
logger:
  level: INFO
  format: json
```

Access metrics at `http://localhost:4195/metrics`.

## Summary

Redpanda Connect and Bento are versatile stream processing tools that replace custom glue code with declarative YAML configurations. Their extensive connector libraries mean you can pipe data between almost any two systems, and Bloblang provides enough transformation power to handle complex data manipulation. The Docker deployment model fits naturally into containerized architectures, and the built-in testing framework lets you validate pipeline logic before deploying. For teams that need to move data between systems without writing and maintaining custom ETL code, these tools are excellent choices.
