# How to Deploy Confluent Platform on Kubernetes with Schema Registry and ksqlDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Kubernetes, Confluent

Description: Learn how to deploy the full Confluent Platform stack on Kubernetes including Kafka, Schema Registry, ksqlDB, and Control Center for enterprise-grade stream processing with schema management.

---

Confluent Platform extends Apache Kafka with enterprise features including Schema Registry for schema management, ksqlDB for stream processing with SQL, and Control Center for cluster management. Deploying the complete stack on Kubernetes provides a powerful foundation for building event-driven applications with strong data contracts and real-time analytics.

This guide covers deploying Confluent Platform on Kubernetes with production configurations.

## Architecture Overview

The Confluent Platform deployment includes:

- Zookeeper (cluster coordination)
- Kafka brokers (message streaming)
- Schema Registry (schema management and validation)
- ksqlDB (stream processing with SQL)
- Confluent Control Center (monitoring and management)
- Kafka Connect (data integration)

Each component runs as a separate StatefulSet or Deployment, communicating over internal Kubernetes services.

## Deploying Zookeeper Cluster

Start with Zookeeper for Kafka coordination:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
  namespace: confluent
spec:
  clusterIP: None
  ports:
  - port: 2181
    name: client
  - port: 2888
    name: peer
  - port: 3888
    name: leader-election
  selector:
    app: zookeeper
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
  namespace: confluent
spec:
  serviceName: zookeeper
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
      - name: zookeeper
        image: confluentinc/cp-zookeeper:7.5.0
        ports:
        - containerPort: 2181
        - containerPort: 2888
        - containerPort: 3888
        env:
        - name: ZOOKEEPER_SERVER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['zookeeper.server.id']
        - name: ZOOKEEPER_CLIENT_PORT
          value: "2181"
        - name: ZOOKEEPER_TICK_TIME
          value: "2000"
        - name: ZOOKEEPER_INIT_LIMIT
          value: "5"
        - name: ZOOKEEPER_SYNC_LIMIT
          value: "2"
        - name: ZOOKEEPER_SERVERS
          value: "zookeeper-0.zookeeper:2888:3888;zookeeper-1.zookeeper:2888:3888;zookeeper-2.zookeeper:2888:3888"
        volumeMounts:
        - name: data
          mountPath: /var/lib/zookeeper
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

## Deploying Kafka Brokers

Deploy Kafka brokers connected to Zookeeper:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka
  namespace: confluent
spec:
  clusterIP: None
  ports:
  - port: 9092
    name: internal
  - port: 9093
    name: external
  selector:
    app: kafka
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: confluent
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
        - containerPort: 9093
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper-0.zookeeper:2181,zookeeper-1.zookeeper:2181,zookeeper-2.zookeeper:2181"
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "INTERNAL://:9092,EXTERNAL://:9093"
        - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
          value: "INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT"
        - name: KAFKA_INTER_BROKER_LISTENER_NAME
          value: "INTERNAL"
        - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_TRANSACTION_STATE_LOG_MIN_ISR
          value: "2"
        - name: KAFKA_DEFAULT_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_MIN_INSYNC_REPLICAS
          value: "2"
        - name: KAFKA_LOG_RETENTION_HOURS
          value: "168"
        - name: KAFKA_LOG_SEGMENT_BYTES
          value: "1073741824"
        - name: KAFKA_COMPRESSION_TYPE
          value: "snappy"
        volumeMounts:
        - name: data
          mountPath: /var/lib/kafka
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "6Gi"
            cpu: "4000m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

## Deploying Schema Registry

Deploy Schema Registry for managing Avro, Protobuf, and JSON schemas:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: schema-registry
  namespace: confluent
spec:
  type: ClusterIP
  ports:
  - port: 8081
    name: http
  selector:
    app: schema-registry
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: schema-registry
  namespace: confluent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: schema-registry
  template:
    metadata:
      labels:
        app: schema-registry
    spec:
      containers:
      - name: schema-registry
        image: confluentinc/cp-schema-registry:7.5.0
        ports:
        - containerPort: 8081
        env:
        - name: SCHEMA_REGISTRY_HOST_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS
          value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
        - name: SCHEMA_REGISTRY_LISTENERS
          value: "http://0.0.0.0:8081"
        - name: SCHEMA_REGISTRY_KAFKASTORE_TOPIC
          value: "_schemas"
        - name: SCHEMA_REGISTRY_KAFKASTORE_TOPIC_REPLICATION_FACTOR
          value: "3"
        - name: SCHEMA_REGISTRY_SCHEMA_COMPATIBILITY_LEVEL
          value: "backward"
        - name: SCHEMA_REGISTRY_LOG4J_ROOT_LOGLEVEL
          value: "INFO"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /subjects
            port: 8081
          initialDelaySeconds: 20
          periodSeconds: 10
```

## Deploying ksqlDB

Deploy ksqlDB for stream processing:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ksqldb-server
  namespace: confluent
spec:
  clusterIP: None
  ports:
  - port: 8088
    name: http
  selector:
    app: ksqldb-server
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ksqldb-server
  namespace: confluent
spec:
  serviceName: ksqldb-server
  replicas: 2
  selector:
    matchLabels:
      app: ksqldb-server
  template:
    metadata:
      labels:
        app: ksqldb-server
    spec:
      containers:
      - name: ksqldb
        image: confluentinc/cp-ksqldb-server:7.5.0
        ports:
        - containerPort: 8088
        env:
        - name: KSQL_BOOTSTRAP_SERVERS
          value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
        - name: KSQL_LISTENERS
          value: "http://0.0.0.0:8088"
        - name: KSQL_KSQL_SERVICE_ID
          value: "ksqldb-cluster"
        - name: KSQL_KSQL_SCHEMA_REGISTRY_URL
          value: "http://schema-registry:8081"
        - name: KSQL_KSQL_STREAMS_REPLICATION_FACTOR
          value: "3"
        - name: KSQL_KSQL_INTERNAL_TOPIC_REPLICAS
          value: "3"
        - name: KSQL_KSQL_SINK_REPLICAS
          value: "3"
        - name: KSQL_KSQL_STREAMS_STATE_DIR
          value: "/var/lib/ksqldb"
        - name: KSQL_KSQL_LOGGING_PROCESSING_STREAM_AUTO_CREATE
          value: "true"
        - name: KSQL_KSQL_LOGGING_PROCESSING_TOPIC_AUTO_CREATE
          value: "true"
        volumeMounts:
        - name: data
          mountPath: /var/lib/ksqldb
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

## Using Schema Registry

Register an Avro schema:

```python
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka import Producer

# Schema Registry client
sr_client = SchemaRegistryClient({
    'url': 'http://schema-registry.confluent.svc.cluster.local:8081'
})

# Define Avro schema
user_schema = """
{
  "type": "record",
  "name": "User",
  "namespace": "com.example",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": "string"},
    {"name": "created_at", "type": "long"}
  ]
}
"""

# Register schema
avro_serializer = AvroSerializer(sr_client, user_schema)

# Producer configuration
producer_conf = {
    'bootstrap.servers': 'kafka.confluent.svc.cluster.local:9092',
    'value.serializer': avro_serializer
}

producer = Producer(producer_conf)

# Produce message with schema validation
user = {
    'id': 'user123',
    'name': 'John Doe',
    'email': 'john@example.com',
    'created_at': 1706500000000
}

producer.produce(
    topic='users',
    value=user,
    on_delivery=lambda err, msg: print(f'Delivered: {msg}' if not err else f'Failed: {err}')
)

producer.flush()
```

## Creating ksqlDB Queries

Execute SQL queries on Kafka streams:

```sql
-- Create a stream from Kafka topic
CREATE STREAM user_stream (
  id VARCHAR KEY,
  name VARCHAR,
  email VARCHAR,
  created_at BIGINT
) WITH (
  KAFKA_TOPIC='users',
  VALUE_FORMAT='AVRO'
);

-- Create a table for aggregations
CREATE TABLE user_count_by_domain AS
  SELECT
    SPLIT(email, '@')[2] AS domain,
    COUNT(*) AS user_count
  FROM user_stream
  GROUP BY SPLIT(email, '@')[2]
  EMIT CHANGES;

-- Create a filtered stream
CREATE STREAM premium_users AS
  SELECT *
  FROM user_stream
  WHERE email LIKE '%@enterprise.com'
  EMIT CHANGES;

-- Join streams
CREATE STREAM enriched_orders AS
  SELECT
    o.order_id,
    o.amount,
    u.name AS customer_name,
    u.email AS customer_email
  FROM order_stream o
  INNER JOIN user_table u
  ON o.user_id = u.id
  EMIT CHANGES;
```

Deploy ksqlDB queries using a job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ksqldb-setup
  namespace: confluent
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: ksql-cli
        image: confluentinc/cp-ksqldb-cli:7.5.0
        command:
        - sh
        - -c
        - |
          until curl -f http://ksqldb-server-0.ksqldb-server:8088/info; do
            echo "Waiting for ksqlDB..."
            sleep 5
          done

          ksql http://ksqldb-server-0.ksqldb-server:8088 <<EOF
          $(cat /queries/init.sql)
          EXIT;
          EOF
        volumeMounts:
        - name: queries
          mountPath: /queries
      volumes:
      - name: queries
        configMap:
          name: ksqldb-queries
```

## Deploying Control Center

Deploy Control Center for cluster management:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: control-center
  namespace: confluent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: control-center
  template:
    metadata:
      labels:
        app: control-center
    spec:
      containers:
      - name: control-center
        image: confluentinc/cp-enterprise-control-center:7.5.0
        ports:
        - containerPort: 9021
        env:
        - name: CONTROL_CENTER_BOOTSTRAP_SERVERS
          value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
        - name: CONTROL_CENTER_ZOOKEEPER_CONNECT
          value: "zookeeper-0.zookeeper:2181,zookeeper-1.zookeeper:2181,zookeeper-2.zookeeper:2181"
        - name: CONTROL_CENTER_SCHEMA_REGISTRY_URL
          value: "http://schema-registry:8081"
        - name: CONTROL_CENTER_KSQL_KSQLDB_URL
          value: "http://ksqldb-server-0.ksqldb-server:8088"
        - name: CONTROL_CENTER_REPLICATION_FACTOR
          value: "3"
        - name: CONTROL_CENTER_INTERNAL_TOPICS_PARTITIONS
          value: "1"
        - name: CONTROL_CENTER_MONITORING_INTERCEPTOR_TOPIC_PARTITIONS
          value: "1"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: control-center
  namespace: confluent
spec:
  type: LoadBalancer
  ports:
  - port: 9021
    targetPort: 9021
  selector:
    app: control-center
```

## Monitoring the Stack

Create comprehensive monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: confluent-platform
  namespace: confluent
spec:
  selector:
    matchLabels:
      monitoring: confluent
  endpoints:
  - port: jmx
    interval: 30s
```

## Best Practices

Follow these practices for production deployments:

1. Use persistent volumes for all stateful components
2. Enable authentication and authorization
3. Configure TLS for all inter-component communication
4. Set appropriate replication factors (3 for production)
5. Monitor Schema Registry compatibility settings
6. Implement backup strategies for Zookeeper and Kafka
7. Use resource quotas and limits
8. Enable JMX metrics for all components
9. Regularly update to latest stable versions
10. Test disaster recovery procedures

## Conclusion

Deploying Confluent Platform on Kubernetes provides enterprise-grade stream processing capabilities with schema management, SQL-based transformations, and comprehensive monitoring. By properly configuring each component with high availability, security, and monitoring, you can build robust event-driven architectures that scale with your business needs.

Key components include Kafka for message streaming, Schema Registry for schema evolution, ksqlDB for real-time stream processing, and Control Center for operational management. With this complete stack, you can build sophisticated data pipelines that maintain data quality through schema validation while providing powerful real-time analytics capabilities.
