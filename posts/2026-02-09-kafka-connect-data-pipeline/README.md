# How to Configure Kafka Connect on Kubernetes for Data Pipeline Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Kubernetes, Data-Engineering

Description: Learn how to deploy and configure Kafka Connect on Kubernetes with distributed mode, custom connectors, and production-ready data pipeline integration.

---

Kafka Connect is a powerful framework for building scalable, reliable data pipelines between Apache Kafka and external systems. Running Kafka Connect on Kubernetes provides additional benefits like automatic scaling, self-healing, and simplified deployment management. This guide covers everything you need to deploy Kafka Connect in distributed mode on Kubernetes with proper configuration for production workloads.

## Understanding Kafka Connect Architecture

Kafka Connect runs in two modes: standalone and distributed. For Kubernetes deployments, distributed mode is the preferred approach because it provides:

- High availability through multiple worker nodes
- Automatic load balancing across workers
- Fault tolerance with automatic task reassignment
- Dynamic connector scaling without downtime
- Centralized configuration management

In distributed mode, Kafka Connect stores connector configurations, task assignments, and offsets in Kafka topics, making the cluster stateless and easier to scale horizontally.

## Prerequisites

Before deploying Kafka Connect, ensure you have:

- A running Kubernetes cluster
- Kafka cluster accessible from Kubernetes
- kubectl configured and connected to your cluster
- Container registry access for custom connector images
- Basic understanding of Kafka topics and consumer groups

## Creating the Kafka Connect Docker Image

Start by creating a custom Docker image with your required connectors. While you can use the base Confluent or Apache Kafka Connect image, production deployments typically need additional connectors.

Create a Dockerfile:

```dockerfile
FROM confluentinc/cp-kafka-connect:7.5.0

# Install additional connectors
RUN confluent-hub install --no-prompt confluentinc/kafka-connect-jdbc:10.7.4
RUN confluent-hub install --no-prompt confluentinc/kafka-connect-elasticsearch:14.0.9
RUN confluent-hub install --no-prompt debezium/debezium-connector-postgresql:2.4.0
RUN confluent-hub install --no-prompt mongodb/kafka-connect-mongodb:1.11.0

# Add custom connectors if needed
COPY custom-connectors/ /usr/share/confluent-hub-components/

# Set proper permissions
USER root
RUN chmod -R a+r /usr/share/confluent-hub-components
USER appuser
```

Build and push the image:

```bash
docker build -t myregistry.io/kafka-connect:v1.0.0 .
docker push myregistry.io/kafka-connect:v1.0.0
```

## Configuring Kubernetes Resources

Create a ConfigMap for Kafka Connect worker configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-connect-config
  namespace: kafka
data:
  connect-distributed.properties: |
    # Bootstrap servers
    bootstrap.servers=kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092

    # Group ID for this cluster
    group.id=kafka-connect-cluster

    # Topic names for storing connector and task configurations
    config.storage.topic=connect-configs
    config.storage.replication.factor=3

    # Topic for storing offsets
    offset.storage.topic=connect-offsets
    offset.storage.replication.factor=3
    offset.storage.partitions=25

    # Topic for storing connector and task status
    status.storage.topic=connect-status
    status.storage.replication.factor=3
    status.storage.partitions=5

    # Converter settings
    key.converter=org.apache.kafka.connect.json.JsonConverter
    value.converter=org.apache.kafka.connect.json.JsonConverter
    key.converter.schemas.enable=true
    value.converter.schemas.enable=true

    # Internal converter settings
    internal.key.converter=org.apache.kafka.connect.json.JsonConverter
    internal.value.converter=org.apache.kafka.connect.json.JsonConverter
    internal.key.converter.schemas.enable=false
    internal.value.converter.schemas.enable=false

    # REST API configuration
    rest.port=8083
    rest.advertised.host.name=kafka-connect
    rest.advertised.port=8083

    # Plugin path
    plugin.path=/usr/share/java,/usr/share/confluent-hub-components

    # Connect worker settings
    offset.flush.interval.ms=10000
    offset.flush.timeout.ms=5000

    # Task settings
    task.shutdown.graceful.timeout.ms=30000

    # Producer and consumer overrides for high throughput
    producer.compression.type=snappy
    producer.max.request.size=1048576
    consumer.max.poll.records=500
```

## Deploying Kafka Connect as a StatefulSet

Use a StatefulSet for Kafka Connect to maintain stable network identities:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka-connect
  namespace: kafka
spec:
  serviceName: kafka-connect
  replicas: 3
  selector:
    matchLabels:
      app: kafka-connect
  template:
    metadata:
      labels:
        app: kafka-connect
    spec:
      containers:
      - name: kafka-connect
        image: myregistry.io/kafka-connect:v1.0.0
        ports:
        - containerPort: 8083
          name: rest-api
        - containerPort: 9999
          name: jmx
        env:
        - name: KAFKA_HEAP_OPTS
          value: "-Xms2G -Xmx2G"
        - name: KAFKA_JMX_PORT
          value: "9999"
        - name: KAFKA_JMX_HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: CONNECT_REST_ADVERTISED_HOST_NAME
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        volumeMounts:
        - name: config
          mountPath: /etc/kafka-connect
        - name: secrets
          mountPath: /etc/kafka-connect/secrets
          readOnly: true
        command:
        - bash
        - -c
        - |
          export CONNECT_REST_ADVERTISED_HOST_NAME=$(hostname -f)
          /etc/confluent/docker/run
        resources:
          requests:
            memory: "3Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /
            port: 8083
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /connectors
            port: 8083
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
      volumes:
      - name: config
        configMap:
          name: kafka-connect-config
      - name: secrets
        secret:
          secretName: kafka-connect-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-connect
  namespace: kafka
spec:
  clusterIP: None
  selector:
    app: kafka-connect
  ports:
  - name: rest-api
    port: 8083
    targetPort: 8083
  - name: jmx
    port: 9999
    targetPort: 9999
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-connect-api
  namespace: kafka
spec:
  type: ClusterIP
  selector:
    app: kafka-connect
  ports:
  - name: http
    port: 8083
    targetPort: 8083
```

## Creating Connector Configurations

Deploy a JDBC source connector to stream database changes to Kafka:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jdbc-source-connector
  namespace: kafka
data:
  connector.json: |
    {
      "name": "postgres-source-connector",
      "config": {
        "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
        "tasks.max": "3",
        "connection.url": "jdbc:postgresql://postgres-db:5432/production",
        "connection.user": "${file:/etc/kafka-connect/secrets/db-credentials.properties:username}",
        "connection.password": "${file:/etc/kafka-connect/secrets/db-credentials.properties:password}",
        "mode": "incrementing",
        "incrementing.column.name": "id",
        "topic.prefix": "postgres-",
        "table.whitelist": "users,orders,products",
        "poll.interval.ms": "5000",
        "batch.max.rows": "1000",
        "transforms": "createKey,extractInt",
        "transforms.createKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
        "transforms.createKey.fields": "id",
        "transforms.extractInt.type": "org.apache.kafka.connect.transforms.ExtractField$Key",
        "transforms.extractInt.field": "id"
      }
    }
```

Deploy an Elasticsearch sink connector to stream Kafka data to Elasticsearch:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elasticsearch-sink-connector
  namespace: kafka
data:
  connector.json: |
    {
      "name": "elasticsearch-sink-connector",
      "config": {
        "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
        "tasks.max": "3",
        "topics": "postgres-users,postgres-orders,postgres-products",
        "connection.url": "http://elasticsearch:9200",
        "connection.username": "${file:/etc/kafka-connect/secrets/es-credentials.properties:username}",
        "connection.password": "${file:/etc/kafka-connect/secrets/es-credentials.properties:password}",
        "type.name": "_doc",
        "key.ignore": "false",
        "schema.ignore": "true",
        "behavior.on.malformed.documents": "warn",
        "batch.size": "2000",
        "max.in.flight.requests": "5",
        "max.buffered.records": "20000",
        "linger.ms": "1000",
        "flush.timeout.ms": "10000",
        "max.retries": "5",
        "retry.backoff.ms": "1000"
      }
    }
```

## Deploying Connectors with a Job

Create a Kubernetes Job to deploy connectors:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: deploy-kafka-connectors
  namespace: kafka
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: deploy
        image: curlimages/curl:8.4.0
        command:
        - sh
        - -c
        - |
          # Wait for Kafka Connect to be ready
          until curl -f http://kafka-connect-api:8083/connectors; do
            echo "Waiting for Kafka Connect..."
            sleep 5
          done

          # Deploy JDBC source connector
          curl -X POST -H "Content-Type: application/json" \
            --data @/configs/jdbc-source.json \
            http://kafka-connect-api:8083/connectors

          # Deploy Elasticsearch sink connector
          curl -X POST -H "Content-Type: application/json" \
            --data @/configs/elasticsearch-sink.json \
            http://kafka-connect-api:8083/connectors

          echo "Connectors deployed successfully"
        volumeMounts:
        - name: jdbc-config
          mountPath: /configs/jdbc-source.json
          subPath: connector.json
        - name: es-config
          mountPath: /configs/elasticsearch-sink.json
          subPath: connector.json
      volumes:
      - name: jdbc-config
        configMap:
          name: jdbc-source-connector
      - name: es-config
        configMap:
          name: elasticsearch-sink-connector
```

## Managing Connector Lifecycle

Create helper scripts for connector management:

```bash
#!/bin/bash
# manage-connectors.sh

CONNECT_URL="http://kafka-connect-api.kafka.svc.cluster.local:8083"

# List all connectors
list_connectors() {
  curl -s "$CONNECT_URL/connectors" | jq
}

# Get connector status
get_status() {
  connector_name=$1
  curl -s "$CONNECT_URL/connectors/$connector_name/status" | jq
}

# Pause connector
pause_connector() {
  connector_name=$1
  curl -X PUT "$CONNECT_URL/connectors/$connector_name/pause"
  echo "Connector $connector_name paused"
}

# Resume connector
resume_connector() {
  connector_name=$1
  curl -X PUT "$CONNECT_URL/connectors/$connector_name/resume"
  echo "Connector $connector_name resumed"
}

# Restart connector
restart_connector() {
  connector_name=$1
  curl -X POST "$CONNECT_URL/connectors/$connector_name/restart"
  echo "Connector $connector_name restarted"
}

# Delete connector
delete_connector() {
  connector_name=$1
  curl -X DELETE "$CONNECT_URL/connectors/$connector_name"
  echo "Connector $connector_name deleted"
}

# Main menu
case "$1" in
  list)
    list_connectors
    ;;
  status)
    get_status "$2"
    ;;
  pause)
    pause_connector "$2"
    ;;
  resume)
    resume_connector "$2"
    ;;
  restart)
    restart_connector "$2"
    ;;
  delete)
    delete_connector "$2"
    ;;
  *)
    echo "Usage: $0 {list|status|pause|resume|restart|delete} [connector-name]"
    exit 1
    ;;
esac
```

## Monitoring Kafka Connect

Deploy Prometheus monitoring for Kafka Connect:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jmx-exporter-config
  namespace: kafka
data:
  jmx-exporter.yml: |
    lowercaseOutputName: true
    lowercaseOutputLabelNames: true
    whitelistObjectNames:
    - kafka.connect:type=connect-worker-metrics
    - kafka.connect:type=connect-worker-rebalance-metrics
    - kafka.connect:type=connector-metrics,connector=*
    - kafka.connect:type=connector-task-metrics,connector=*,task=*
    - kafka.connect:type=task-error-metrics,connector=*,task=*
```

Add JMX exporter as a sidecar:

```yaml
- name: jmx-exporter
  image: bitnami/jmx-exporter:0.19.0
  ports:
  - containerPort: 5556
    name: metrics
  args:
  - "5556"
  - "/etc/jmx-exporter/jmx-exporter.yml"
  volumeMounts:
  - name: jmx-config
    mountPath: /etc/jmx-exporter
```

## Handling Failures and Recovery

Implement error handling configuration:

```properties
# Dead letter queue for failed records
errors.tolerance=all
errors.deadletterqueue.topic.name=connect-dlq
errors.deadletterqueue.topic.replication.factor=3
errors.deadletterqueue.context.headers.enable=true
errors.log.enable=true
errors.log.include.messages=true
```

Configure connector-specific error handling:

```json
{
  "errors.tolerance": "all",
  "errors.retry.timeout": "300000",
  "errors.retry.delay.max.ms": "60000",
  "errors.deadletterqueue.topic.name": "jdbc-source-dlq"
}
```

## Conclusion

Deploying Kafka Connect on Kubernetes provides a robust, scalable foundation for building data pipelines. The distributed mode architecture ensures high availability, while Kubernetes handles orchestration and scaling automatically. By properly configuring worker settings, monitoring with JMX and Prometheus, and implementing error handling with dead letter queues, you can build production-ready data integration pipelines that reliably move data between Kafka and external systems.

Key best practices include using custom Docker images with required connectors, deploying as StatefulSets for stable identities, configuring proper resource limits, implementing comprehensive monitoring, and using external configuration management for sensitive credentials.
