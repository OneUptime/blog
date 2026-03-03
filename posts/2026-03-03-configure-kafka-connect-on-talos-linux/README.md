# How to Configure Kafka Connect on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kafka Connect, Apache Kafka, Data Integration, ETL, DevOps

Description: Set up Kafka Connect on Talos Linux for streaming data integration between Kafka topics and external systems like databases and cloud services.

---

Kafka Connect is the data integration framework within the Apache Kafka ecosystem. It enables you to stream data between Kafka and external systems without writing custom code. Source connectors pull data from databases, APIs, and file systems into Kafka topics. Sink connectors push data from Kafka topics into data warehouses, search engines, and other destinations. Running Kafka Connect on Talos Linux gives you a reliable data pipeline infrastructure on a secure, immutable OS.

This guide covers deploying Kafka Connect on Talos Linux, configuring connectors, and building production-grade data pipelines.

## How Kafka Connect Works

Kafka Connect runs as a cluster of worker processes. Each worker can run multiple connector tasks that handle the actual data movement. Connectors come in two types:

- **Source Connectors**: Read data from external systems and produce it to Kafka topics. Examples include JDBC source connector for databases and Debezium for change data capture.
- **Sink Connectors**: Read data from Kafka topics and write it to external systems. Examples include Elasticsearch sink, S3 sink, and JDBC sink connectors.

Workers coordinate through Kafka itself, using internal topics to store connector configuration, offsets, and status.

## Prerequisites

- Talos Linux cluster with a running Kafka deployment (see our Kafka or Strimzi guide)
- `kubectl` configured
- At least 2GB RAM per Kafka Connect worker

## Step 1: Build a Custom Connect Image

Kafka Connect needs connector plugins installed. Create a custom Docker image with the connectors you need:

```dockerfile
# Dockerfile.kafka-connect
FROM confluentinc/cp-kafka-connect:7.6.0

# Install connectors from Confluent Hub
RUN confluent-hub install --no-prompt debezium/debezium-connector-postgresql:2.5.0
RUN confluent-hub install --no-prompt confluentinc/kafka-connect-elasticsearch:14.0.0
RUN confluent-hub install --no-prompt confluentinc/kafka-connect-jdbc:10.7.0
RUN confluent-hub install --no-prompt confluentinc/kafka-connect-s3:10.5.0
```

```bash
# Build and push the image
docker build -t your-registry/kafka-connect-custom:1.0 -f Dockerfile.kafka-connect .
docker push your-registry/kafka-connect-custom:1.0
```

## Step 2: Deploy Kafka Connect Cluster

```yaml
# kafka-connect-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kafka-connect
---
# kafka-connect-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-connect-config
  namespace: kafka-connect
data:
  connect-distributed.properties: |
    # Bootstrap servers pointing to your Kafka cluster
    bootstrap.servers=kafka-bootstrap.kafka.svc.cluster.local:9092

    # Connect cluster settings
    group.id=connect-cluster
    key.converter=org.apache.kafka.connect.json.JsonConverter
    value.converter=org.apache.kafka.connect.json.JsonConverter
    key.converter.schemas.enable=false
    value.converter.schemas.enable=false

    # Internal topic settings
    config.storage.topic=connect-configs
    config.storage.replication.factor=3
    offset.storage.topic=connect-offsets
    offset.storage.replication.factor=3
    offset.storage.partitions=25
    status.storage.topic=connect-status
    status.storage.replication.factor=3
    status.storage.partitions=5

    # REST API settings
    rest.port=8083
    rest.advertised.host.name=${HOSTNAME}

    # Plugin path
    plugin.path=/usr/share/confluent-hub-components,/usr/share/java

    # Producer and consumer settings
    producer.acks=all
    producer.retries=10
    consumer.auto.offset.reset=earliest
```

## Step 3: Deploy as a Kubernetes Deployment

```yaml
# kafka-connect-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-connect
  namespace: kafka-connect
spec:
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
          image: your-registry/kafka-connect-custom:1.0
          ports:
            - containerPort: 8083
              name: rest-api
          env:
            - name: HOSTNAME
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
            - name: CONNECT_BOOTSTRAP_SERVERS
              value: "kafka-bootstrap.kafka.svc.cluster.local:9092"
            - name: CONNECT_GROUP_ID
              value: "connect-cluster"
            - name: CONNECT_CONFIG_STORAGE_TOPIC
              value: "connect-configs"
            - name: CONNECT_OFFSET_STORAGE_TOPIC
              value: "connect-offsets"
            - name: CONNECT_STATUS_STORAGE_TOPIC
              value: "connect-status"
            - name: CONNECT_KEY_CONVERTER
              value: "org.apache.kafka.connect.json.JsonConverter"
            - name: CONNECT_VALUE_CONVERTER
              value: "org.apache.kafka.connect.json.JsonConverter"
            - name: CONNECT_KEY_CONVERTER_SCHEMAS_ENABLE
              value: "false"
            - name: CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE
              value: "false"
            - name: CONNECT_REST_PORT
              value: "8083"
            - name: CONNECT_PLUGIN_PATH
              value: "/usr/share/confluent-hub-components,/usr/share/java"
            - name: CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR
              value: "3"
            - name: CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR
              value: "3"
            - name: CONNECT_STATUS_STORAGE_REPLICATION_FACTOR
              value: "3"
          resources:
            requests:
              memory: "2Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /connectors
              port: 8083
            initialDelaySeconds: 60
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /connectors
              port: 8083
            initialDelaySeconds: 90
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-connect
  namespace: kafka-connect
spec:
  selector:
    app: kafka-connect
  ports:
    - port: 8083
      targetPort: 8083
  type: ClusterIP
```

```bash
kubectl apply -f kafka-connect-namespace.yaml
kubectl apply -f kafka-connect-config.yaml
kubectl apply -f kafka-connect-deployment.yaml
```

## Step 4: Using Strimzi Kafka Connect

If you are using Strimzi, deploy Kafka Connect as a Custom Resource:

```yaml
# strimzi-kafka-connect.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnect
metadata:
  name: data-pipeline
  namespace: kafka
  annotations:
    strimzi.io/use-connector-resources: "true"
spec:
  version: 3.7.0
  replicas: 3
  bootstrapServers: production-cluster-kafka-bootstrap:9093
  tls:
    trustedCertificates:
      - secretName: production-cluster-cluster-ca-cert
        certificate: ca.crt
  config:
    group.id: data-pipeline-connect
    offset.storage.topic: connect-offsets
    config.storage.topic: connect-configs
    status.storage.topic: connect-status
    config.storage.replication.factor: 3
    offset.storage.replication.factor: 3
    status.storage.replication.factor: 3
  build:
    output:
      type: docker
      image: your-registry/kafka-connect-strimzi:latest
    plugins:
      - name: debezium-postgres
        artifacts:
          - type: tgz
            url: https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/2.5.0.Final/debezium-connector-postgres-2.5.0.Final-plugin.tar.gz
      - name: elasticsearch-sink
        artifacts:
          - type: zip
            url: https://d1i4a15mxbxib1.cloudfront.net/api/plugins/confluentinc/kafka-connect-elasticsearch/versions/14.0.0/confluentinc-kafka-connect-elasticsearch-14.0.0.zip
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
    limits:
      memory: 2Gi
```

## Step 5: Configure Connectors

Create connectors through the REST API or Strimzi CRDs:

```yaml
# postgres-source-connector.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnector
metadata:
  name: postgres-source
  namespace: kafka
  labels:
    strimzi.io/cluster: data-pipeline
spec:
  class: io.debezium.connector.postgresql.PostgresConnector
  tasksMax: 1
  config:
    database.hostname: postgresql.postgres.svc.cluster.local
    database.port: "5432"
    database.user: debezium
    database.password: debezium-password
    database.dbname: appdb
    topic.prefix: cdc
    schema.include.list: public
    plugin.name: pgoutput
    slot.name: debezium_slot
    publication.name: dbz_publication
```

```yaml
# elasticsearch-sink-connector.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnector
metadata:
  name: elasticsearch-sink
  namespace: kafka
  labels:
    strimzi.io/cluster: data-pipeline
spec:
  class: io.confluent.connect.elasticsearch.ElasticsearchSinkConnector
  tasksMax: 3
  config:
    connection.url: "http://elasticsearch.elasticsearch.svc.cluster.local:9200"
    topics: "cdc.public.orders,cdc.public.users"
    type.name: "_doc"
    key.ignore: "true"
    schema.ignore: "true"
    behavior.on.null.values: "delete"
```

## Step 6: Managing Connectors via REST API

```bash
# List all connectors
kubectl exec -it deploy/kafka-connect -n kafka-connect -- \
  curl -s http://localhost:8083/connectors | python3 -m json.tool

# Get connector status
kubectl exec -it deploy/kafka-connect -n kafka-connect -- \
  curl -s http://localhost:8083/connectors/postgres-source/status | python3 -m json.tool

# Pause a connector
kubectl exec -it deploy/kafka-connect -n kafka-connect -- \
  curl -X PUT http://localhost:8083/connectors/postgres-source/pause

# Resume a connector
kubectl exec -it deploy/kafka-connect -n kafka-connect -- \
  curl -X PUT http://localhost:8083/connectors/postgres-source/resume

# Restart a failed task
kubectl exec -it deploy/kafka-connect -n kafka-connect -- \
  curl -X POST http://localhost:8083/connectors/postgres-source/tasks/0/restart

# Delete a connector
kubectl exec -it deploy/kafka-connect -n kafka-connect -- \
  curl -X DELETE http://localhost:8083/connectors/postgres-source
```

## Monitoring Kafka Connect

Key things to monitor include connector status (running, paused, failed), task counts and their individual statuses, connector lag (difference between source changes and Kafka writes), and worker JVM metrics.

```bash
# Check worker plugins
kubectl exec -it deploy/kafka-connect -n kafka-connect -- \
  curl -s http://localhost:8083/connector-plugins | python3 -m json.tool
```

## Conclusion

Kafka Connect on Talos Linux provides a robust data integration layer that moves data between your systems without custom code. Whether you use the standalone deployment or Strimzi's operator-managed approach, the key is to plan your connector configuration carefully, monitor task health, and handle schema evolution gracefully. The immutable nature of Talos Linux ensures your Connect workers run on a consistent foundation, which reduces troubleshooting complexity when connector issues arise. Start with simple connectors, validate the data flow end-to-end, and scale up your pipeline as requirements grow.
