# How to Build SQL Analytics with ksqlDB and Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, ksqlDB, SQL, Stream Processing, Real-Time Analytics

Description: Use ksqlDB to analyze Kafka streams with SQL, building real-time dashboards, aggregations, and materialized views without writing code.

---

ksqlDB lets you query Kafka topics using SQL. No Java code, no complex stream processing APIs. Write a SQL statement, and ksqlDB creates a continuous query that processes every new message.

## Setting Up ksqlDB

Deploy ksqlDB alongside your Kafka cluster.

```yaml
# docker-compose.yml
version: '3'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    depends_on:
      - kafka
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092

  ksqldb-server:
    image: confluentinc/ksqldb-server:0.29.0
    depends_on:
      - kafka
      - schema-registry
    environment:
      KSQL_BOOTSTRAP_SERVERS: kafka:9092
      KSQL_LISTENERS: http://0.0.0.0:8088
      KSQL_KSQL_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      KSQL_KSQL_LOGGING_PROCESSING_STREAM_AUTO_CREATE: "true"
      KSQL_KSQL_LOGGING_PROCESSING_TOPIC_AUTO_CREATE: "true"

  ksqldb-cli:
    image: confluentinc/ksqldb-cli:0.29.0
    depends_on:
      - ksqldb-server
    entrypoint: /bin/sh
    tty: true
```

```bash
# Start the stack
docker-compose up -d

# Connect to ksqlDB CLI
docker exec -it ksqldb-cli ksql http://ksqldb-server:8088
```

## Creating Streams from Topics

Streams are ksqlDB's representation of Kafka topics.

```sql
-- Create a stream from an existing topic
-- The topic has JSON messages with order data
CREATE STREAM orders (
  order_id VARCHAR KEY,
  customer_id VARCHAR,
  product_id VARCHAR,
  quantity INT,
  price DECIMAL(10,2),
  order_time TIMESTAMP
) WITH (
  KAFKA_TOPIC = 'orders',
  VALUE_FORMAT = 'JSON',
  TIMESTAMP = 'order_time'
);

-- Verify the stream was created
DESCRIBE orders;

-- See data flowing through
SELECT * FROM orders EMIT CHANGES LIMIT 10;
```

## Basic Stream Queries

Filter and transform streams with SQL.

```sql
-- Filter orders over $100
CREATE STREAM high_value_orders AS
SELECT
  order_id,
  customer_id,
  quantity * price AS total_amount
FROM orders
WHERE quantity * price > 100
EMIT CHANGES;

-- Transform data format
CREATE STREAM orders_enriched AS
SELECT
  order_id,
  customer_id,
  product_id,
  quantity,
  price,
  quantity * price AS total,
  TIMESTAMPTOSTRING(order_time, 'yyyy-MM-dd HH:mm:ss') AS order_datetime
FROM orders
EMIT CHANGES;
```

## Aggregations with Tables

Tables store aggregated results and update as new data arrives.

```sql
-- Count orders per customer (running total)
CREATE TABLE orders_per_customer AS
SELECT
  customer_id,
  COUNT(*) AS order_count,
  SUM(quantity * price) AS total_spent
FROM orders
GROUP BY customer_id
EMIT CHANGES;

-- Query the table (point-in-time lookup)
SELECT * FROM orders_per_customer WHERE customer_id = 'cust-123';

-- Windowed aggregation - orders per hour
CREATE TABLE hourly_order_stats AS
SELECT
  product_id,
  WINDOWSTART AS window_start,
  WINDOWEND AS window_end,
  COUNT(*) AS order_count,
  SUM(quantity) AS total_quantity,
  SUM(quantity * price) AS total_revenue
FROM orders
WINDOW TUMBLING (SIZE 1 HOUR)
GROUP BY product_id
EMIT CHANGES;
```

## Joining Streams and Tables

Enrich stream data with lookups.

```sql
-- Create a table from a compacted topic (customer data)
CREATE TABLE customers (
  customer_id VARCHAR PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  tier VARCHAR
) WITH (
  KAFKA_TOPIC = 'customers',
  VALUE_FORMAT = 'JSON'
);

-- Join orders stream with customers table
CREATE STREAM orders_with_customer AS
SELECT
  o.order_id,
  o.customer_id,
  c.name AS customer_name,
  c.tier AS customer_tier,
  o.product_id,
  o.quantity * o.price AS total
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
EMIT CHANGES;

-- Stream-to-stream join (within a time window)
CREATE STREAM orders_raw (
  order_id VARCHAR KEY,
  customer_id VARCHAR,
  amount DECIMAL(10,2)
) WITH (KAFKA_TOPIC='orders-raw', VALUE_FORMAT='JSON');

CREATE STREAM payments (
  payment_id VARCHAR KEY,
  order_id VARCHAR,
  amount DECIMAL(10,2),
  status VARCHAR
) WITH (KAFKA_TOPIC='payments', VALUE_FORMAT='JSON');

-- Match orders with payments within 1 hour
CREATE STREAM orders_with_payments AS
SELECT
  o.order_id,
  o.customer_id,
  o.amount AS order_amount,
  p.payment_id,
  p.amount AS paid_amount,
  p.status AS payment_status
FROM orders_raw o
INNER JOIN payments p
  WITHIN 1 HOUR
  ON o.order_id = p.order_id
EMIT CHANGES;
```

## Real-Time Dashboards

Query tables for dashboard metrics.

```sql
-- Create metrics for dashboard
CREATE TABLE dashboard_metrics AS
SELECT
  'global' AS metric_key,
  COUNT(*) AS total_orders,
  SUM(quantity * price) AS total_revenue,
  COUNT_DISTINCT(customer_id) AS unique_customers
FROM orders
GROUP BY 'global'
EMIT CHANGES;

-- Pull query for current values (REST API friendly)
SELECT * FROM dashboard_metrics WHERE metric_key = 'global';
```

Access via REST API:

```bash
# Query ksqlDB REST API
curl -X POST http://localhost:8088/query \
  -H "Content-Type: application/vnd.ksql.v1+json" \
  -d '{
    "ksql": "SELECT * FROM dashboard_metrics WHERE metric_key = '\''global'\'';",
    "streamsProperties": {}
  }'
```

## Push and Pull Queries

ksqlDB supports two query types:

```sql
-- Pull query: Point-in-time lookup (like a database SELECT)
-- Returns immediately with current state
SELECT * FROM orders_per_customer WHERE customer_id = 'cust-123';

-- Push query: Continuous stream of updates
-- Connection stays open, results stream as data arrives
SELECT * FROM orders_per_customer EMIT CHANGES;

-- Push query with limit
SELECT * FROM orders EMIT CHANGES LIMIT 100;
```

## User-Defined Functions

Extend ksqlDB with custom logic.

```java
// Custom UDF for calculating distance
@UdfDescription(name = "geo_distance",
                description = "Calculate distance between coordinates")
public class GeoDistanceUdf {

    @Udf(description = "Distance in kilometers")
    public double geoDistance(
            @UdfParameter("lat1") double lat1,
            @UdfParameter("lon1") double lon1,
            @UdfParameter("lat2") double lat2,
            @UdfParameter("lon2") double lon2) {

        // Haversine formula
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(Math.toRadians(lat1)) *
                   Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}
```

```bash
# Package and deploy
mvn package
cp target/ksql-udfs.jar /path/to/ksqldb/ext/
# Restart ksqlDB server
```

```sql
-- Use custom function
SELECT
  order_id,
  geo_distance(store_lat, store_lon, delivery_lat, delivery_lon) AS distance_km
FROM deliveries
EMIT CHANGES;
```

## Handling Late Data

Configure grace periods for windowed aggregations.

```sql
-- Allow late data up to 2 hours after window closes
CREATE TABLE hourly_stats AS
SELECT
  product_id,
  WINDOWSTART AS window_start,
  COUNT(*) AS count,
  SUM(amount) AS total
FROM orders
WINDOW TUMBLING (SIZE 1 HOUR, GRACE PERIOD 2 HOURS)
GROUP BY product_id
EMIT CHANGES;
```

## Production Configuration

Tune ksqlDB for production workloads.

```properties
# ksql-server.properties

# Processing guarantees
ksql.streams.processing.guarantee=exactly_once_v2

# State store configuration
ksql.streams.state.dir=/var/lib/ksqldb/state
ksql.streams.num.standby.replicas=1

# Performance tuning
ksql.streams.num.stream.threads=4
ksql.streams.cache.max.bytes.buffering=104857600

# Query monitoring
ksql.query.persistent.active.limit=50
ksql.suppress.enabled=true
```

## Monitoring Queries

Track query health and performance.

```sql
-- List running queries
SHOW QUERIES;

-- Describe a specific query
EXPLAIN <query_id>;

-- Check query metrics
SELECT * FROM KSQL_PROCESSING_LOG EMIT CHANGES;
```

JMX metrics to monitor:

```yaml
# Key ksqlDB metrics
- ksql.ksql_query_status  # Query state (running, failed, etc.)
- ksql.consumer_messages_per_sec  # Input throughput
- ksql.consumer_total_messages  # Total processed
- ksql.error_rate  # Processing errors
```

---

ksqlDB transforms Kafka from a message broker into a real-time analytics platform. Start with simple stream transformations, then add aggregations and joins as your needs grow. The SQL interface makes stream processing accessible to analysts who do not know Java. For production, configure exactly-once processing and monitor query health closely. When SQL is not enough, custom UDFs extend ksqlDB with any logic you need.
