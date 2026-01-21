# How to Sink Kafka Data to Elasticsearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Connect, Elasticsearch, Search, Sink Connector, Data Integration

Description: Learn how to stream data from Kafka topics to Elasticsearch using the Elasticsearch Sink Connector, including configuration, index management, error handling, and optimization for search indexing.

---

The Elasticsearch Sink Connector enables real-time indexing of Kafka messages into Elasticsearch, powering search functionality, log aggregation, and analytics dashboards.

## Prerequisites

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

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

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
    command:
      - bash
      - -c
      - |
        confluent-hub install --no-prompt confluentinc/kafka-connect-elasticsearch:14.0.0
        /etc/confluent/docker/run
    depends_on:
      - kafka
      - elasticsearch

volumes:
  es-data:
```

## Basic Connector Configuration

```json
{
  "name": "elasticsearch-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "topics": "orders,products",
    "connection.url": "http://elasticsearch:9200",
    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "true",
    "behavior.on.null.values": "delete",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "false"
  }
}
```

## Production Configuration

```json
{
  "name": "elasticsearch-production",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "topics": "orders,order-events,products",
    "connection.url": "http://elasticsearch-1:9200,http://elasticsearch-2:9200,http://elasticsearch-3:9200",
    "connection.username": "elastic",
    "connection.password": "${secrets:es-credentials:password}",

    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "true",

    "write.method": "upsert",
    "behavior.on.null.values": "delete",
    "behavior.on.malformed.documents": "warn",

    "batch.size": "2000",
    "max.in.flight.requests": "5",
    "max.buffered.records": "20000",
    "linger.ms": "1000",
    "flush.timeout.ms": "180000",
    "max.retries": "5",
    "retry.backoff.ms": "1000",

    "read.timeout.ms": "10000",
    "connection.timeout.ms": "5000",

    "tasks.max": "3",

    "transforms": "routeTS",
    "transforms.routeTS.type": "org.apache.kafka.connect.transforms.TimestampRouter",
    "transforms.routeTS.topic.format": "${topic}-${timestamp}",
    "transforms.routeTS.timestamp.format": "yyyy-MM",

    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.deadletterqueue.topic.name": "es-sink-errors",
    "errors.deadletterqueue.topic.replication.factor": "3"
  }
}
```

## Index Mapping and Templates

### Create Index Template

```bash
curl -X PUT "http://localhost:9200/_index_template/orders-template" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["orders*"],
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "refresh_interval": "5s"
      },
      "mappings": {
        "properties": {
          "order_id": { "type": "keyword" },
          "customer_id": { "type": "keyword" },
          "status": { "type": "keyword" },
          "total": { "type": "float" },
          "items": {
            "type": "nested",
            "properties": {
              "product_id": { "type": "keyword" },
              "quantity": { "type": "integer" },
              "price": { "type": "float" }
            }
          },
          "shipping_address": {
            "properties": {
              "street": { "type": "text" },
              "city": { "type": "keyword" },
              "country": { "type": "keyword" },
              "location": { "type": "geo_point" }
            }
          },
          "created_at": { "type": "date" },
          "updated_at": { "type": "date" }
        }
      }
    }
  }'
```

### Dynamic Templates

```json
{
  "mappings": {
    "dynamic_templates": [
      {
        "strings_as_keywords": {
          "match_mapping_type": "string",
          "mapping": {
            "type": "keyword",
            "ignore_above": 256
          }
        }
      },
      {
        "dates": {
          "match": "*_at",
          "mapping": {
            "type": "date"
          }
        }
      }
    ]
  }
}
```

## Document ID Strategies

### Use Kafka Key as Document ID

```json
{
  "config": {
    "key.ignore": "false"
  }
}
```

### Extract ID from Message

```json
{
  "config": {
    "key.ignore": "true",
    "transforms": "extractId",
    "transforms.extractId.type": "org.apache.kafka.connect.transforms.ValueToKey",
    "transforms.extractId.fields": "order_id"
  }
}
```

### Composite Key

```json
{
  "config": {
    "transforms": "compositeKey",
    "transforms.compositeKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
    "transforms.compositeKey.fields": "customer_id,order_id"
  }
}
```

## Index Routing

### Time-Based Indices

```json
{
  "config": {
    "transforms": "routeTS",
    "transforms.routeTS.type": "org.apache.kafka.connect.transforms.TimestampRouter",
    "transforms.routeTS.topic.format": "${topic}-${timestamp}",
    "transforms.routeTS.timestamp.format": "yyyy-MM-dd"
  }
}
```

### Custom Routing

```json
{
  "config": {
    "transforms": "routeByField",
    "transforms.routeByField.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.routeByField.regex": "(.+)",
    "transforms.routeByField.replacement": "events-$1"
  }
}
```

### Route by Message Field

```json
{
  "config": {
    "transforms": "route",
    "transforms.route.type": "io.confluent.connect.transforms.ExtractTopic$Value",
    "transforms.route.field": "event_type"
  }
}
```

## Data Transformation

### Flatten Nested Objects

```json
{
  "config": {
    "transforms": "flatten",
    "transforms.flatten.type": "org.apache.kafka.connect.transforms.Flatten$Value",
    "transforms.flatten.delimiter": "_"
  }
}
```

### Add Fields

```json
{
  "config": {
    "transforms": "addTimestamp,addSource",
    "transforms.addTimestamp.type": "org.apache.kafka.connect.transforms.InsertField$Value",
    "transforms.addTimestamp.timestamp.field": "indexed_at",
    "transforms.addSource.type": "org.apache.kafka.connect.transforms.InsertField$Value",
    "transforms.addSource.static.field": "source",
    "transforms.addSource.static.value": "kafka"
  }
}
```

### Remove Fields

```json
{
  "config": {
    "transforms": "removeFields",
    "transforms.removeFields.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
    "transforms.removeFields.blacklist": "internal_id,temp_field"
  }
}
```

## Write Modes

### Insert (Default)

```json
{
  "config": {
    "write.method": "insert"
  }
}
```

Documents with duplicate IDs will fail.

### Upsert

```json
{
  "config": {
    "write.method": "upsert"
  }
}
```

Creates or updates documents.

### Delete on Null

```json
{
  "config": {
    "behavior.on.null.values": "delete"
  }
}
```

Tombstone messages (null value) delete the document.

## Error Handling

### Dead Letter Queue

```json
{
  "config": {
    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.deadletterqueue.topic.name": "es-sink-errors",
    "errors.deadletterqueue.topic.replication.factor": "3",
    "errors.deadletterqueue.context.headers.enable": "true"
  }
}
```

### Malformed Documents

```json
{
  "config": {
    "behavior.on.malformed.documents": "warn"
  }
}
```

Options: `fail`, `warn`, `ignore`

### Version Conflicts

```json
{
  "config": {
    "behavior.on.version.conflict": "ignore"
  }
}
```

## Performance Tuning

### Batch Settings

```json
{
  "config": {
    "batch.size": "2000",
    "linger.ms": "1000",
    "max.buffered.records": "20000",
    "max.in.flight.requests": "5",
    "flush.timeout.ms": "180000"
  }
}
```

### Parallelism

```json
{
  "config": {
    "tasks.max": "3"
  }
}
```

Match tasks to Kafka partitions for optimal parallelism.

### Elasticsearch Settings

```json
{
  "config": {
    "read.timeout.ms": "10000",
    "connection.timeout.ms": "5000",
    "max.retries": "5",
    "retry.backoff.ms": "1000"
  }
}
```

## Monitoring

### Connector Status

```bash
# Check connector status
curl http://localhost:8083/connectors/elasticsearch-sink/status | jq

# Check task status
curl http://localhost:8083/connectors/elasticsearch-sink/tasks/0/status | jq
```

### Elasticsearch Metrics

```bash
# Index stats
curl http://localhost:9200/orders/_stats | jq

# Check indexing rate
curl http://localhost:9200/_cat/indices?v

# Node stats
curl http://localhost:9200/_nodes/stats/indices | jq
```

### JMX Metrics

```yaml
# Key metrics to monitor
connect_sink_records_lag_max
connect_sink_records_send_rate
elasticsearch_bulk_request_time_ms
elasticsearch_index_request_rate
```

## Full Example with Schema Registry

```json
{
  "name": "elasticsearch-avro-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "topics": "orders",
    "connection.url": "http://elasticsearch:9200",

    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",

    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "false",
    "compact.map.entries": "true",

    "write.method": "upsert",
    "behavior.on.null.values": "delete",

    "batch.size": "2000",
    "max.in.flight.requests": "5",
    "linger.ms": "1000",

    "transforms": "unwrap,routeTS",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "transforms.routeTS.type": "org.apache.kafka.connect.transforms.TimestampRouter",
    "transforms.routeTS.topic.format": "${topic}-${timestamp}",
    "transforms.routeTS.timestamp.format": "yyyy-MM",

    "tasks.max": "3",

    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "es-errors",
    "errors.deadletterqueue.topic.replication.factor": "3"
  }
}
```

## Best Practices

1. **Use index templates** - Define mappings before indexing
2. **Time-based indices** - Use TimestampRouter for log data
3. **Appropriate batch size** - Balance latency vs throughput
4. **Monitor lag** - Track connector consumer lag
5. **Use dead letter queue** - Don't lose failed records
6. **Set refresh interval** - Balance search freshness vs performance

## Summary

| Setting | Recommendation |
|---------|---------------|
| batch.size | 1000-5000 |
| linger.ms | 1000-5000 |
| tasks.max | Match Kafka partitions |
| write.method | upsert for updates |
| errors.tolerance | all with DLQ |

The Elasticsearch Sink Connector provides a reliable pipeline for real-time search indexing from Kafka topics.
