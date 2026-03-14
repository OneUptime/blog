# How to Configure Kafka Connect with Strimzi via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kafka, Strimzi, Kafka Connect, Data Integration

Description: Deploy and configure KafkaConnect clusters and connectors using Strimzi and Flux CD for GitOps-managed data integration pipelines.

---

## Introduction

Kafka Connect is a framework for reliably streaming data between Kafka and external systems like databases, S3, Elasticsearch, and HTTP endpoints. Strimzi manages Kafka Connect clusters through `KafkaConnect` CRDs and individual connectors through `KafkaConnector` CRDs. This eliminates the REST API-based connector management that traditionally makes Kafka Connect configuration hard to version-control.

With Flux CD managing your `KafkaConnect` and `KafkaConnector` resources, your entire CDC pipeline or data integration workflow is described in Git. Adding a new Debezium source connector for a database table becomes a pull request reviewed by your data platform team.

## Prerequisites

- Strimzi Kafka cluster deployed via Flux CD
- Flux CD bootstrapped to your repository
- A source or sink system (PostgreSQL, Elasticsearch, S3, etc.)
- `kubectl` and `flux` CLIs installed

## Step 1: Build a Custom Kafka Connect Image

Strimzi's `KafkaConnect` supports loading connector plugins via an init container or by building a custom image. The cleanest approach for GitOps is a custom image with plugins pre-installed:

```dockerfile
# connectors/Dockerfile
FROM quay.io/strimzi/kafka:0.42.0-kafka-3.7.1

USER root

# Download Debezium PostgreSQL connector
RUN mkdir -p /opt/kafka/plugins/debezium-postgres && \
    curl -L https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/2.7.0.Final/debezium-connector-postgres-2.7.0.Final-plugin.tar.gz \
    | tar -xzf - -C /opt/kafka/plugins/debezium-postgres/

# Download Elasticsearch sink connector
RUN mkdir -p /opt/kafka/plugins/kafka-connect-elasticsearch && \
    curl -L https://packages.confluent.io/maven/io/confluent/kafka-connect-elasticsearch/14.0.12/kafka-connect-elasticsearch-14.0.12.jar \
    -o /opt/kafka/plugins/kafka-connect-elasticsearch/kafka-connect-elasticsearch.jar

USER 1001
```

Build and push to your container registry, then reference in the KafkaConnect spec.

## Step 2: Deploy the KafkaConnect Cluster

```yaml
# infrastructure/messaging/connect/kafka-connect.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnect
metadata:
  name: data-pipeline
  namespace: kafka
  annotations:
    # Enable the KafkaConnector CRD support (required)
    strimzi.io/use-connector-resources: "true"
spec:
  version: 3.7.1
  replicas: 2
  # Use custom image with plugins pre-installed
  image: myregistry.example.com/kafka-connect:0.42.0-2.7.0

  bootstrapServers: production-kafka-bootstrap.kafka.svc.cluster.local:9093

  # TLS with the Kafka cluster
  tls:
    trustedCertificates:
      - secretName: production-cluster-ca-cert
        certificate: ca.crt

  # Authentication as the connect user
  authentication:
    type: tls
    certificateAndKey:
      secretName: kafka-connect-user
      certificate: user.crt
      key: user.key

  config:
    group.id: connect-cluster
    offset.storage.topic: connect-cluster-offsets
    config.storage.topic: connect-cluster-configs
    status.storage.topic: connect-cluster-status
    # Replication for internal Connect topics
    config.storage.replication.factor: 3
    offset.storage.replication.factor: 3
    status.storage.replication.factor: 3
    # Converter settings
    key.converter: org.apache.kafka.connect.json.JsonConverter
    value.converter: org.apache.kafka.connect.json.JsonConverter
    key.converter.schemas.enable: "false"
    value.converter.schemas.enable: "false"

  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "2Gi"

  jvmOptions:
    -Xms: 512m
    -Xmx: 1024m

  # Expose REST API for status checks
  externalConfiguration:
    env:
      - name: AWS_ACCESS_KEY_ID
        valueFrom:
          secretKeyRef:
            name: s3-credentials
            key: access-key-id
      - name: AWS_SECRET_ACCESS_KEY
        valueFrom:
          secretKeyRef:
            name: s3-credentials
            key: secret-access-key
```

## Step 3: Create a Debezium PostgreSQL Source Connector

```yaml
# infrastructure/messaging/connectors/orders-cdc.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnector
metadata:
  name: orders-cdc
  namespace: kafka
  labels:
    strimzi.io/cluster: data-pipeline  # must match KafkaConnect name
spec:
  class: io.debezium.connector.postgresql.PostgresConnector
  tasksMax: 1  # Debezium source is single-threaded per connector

  config:
    # PostgreSQL connection
    database.hostname: app-postgres-rw.databases.svc.cluster.local
    database.port: "5432"
    database.user: debezium
    database.password: "${file:/opt/kafka/external-configuration/db-credentials/password}"
    database.dbname: app
    database.server.name: production-postgres

    # Tables to capture
    table.include.list: "public.orders,public.order_items"

    # Kafka topic naming
    topic.prefix: cdc
    # Output: cdc.public.orders, cdc.public.order_items

    # Snapshot behavior
    snapshot.mode: initial

    # Heartbeat to keep replication slot active
    heartbeat.interval.ms: "5000"

    # PostgreSQL replication slot
    slot.name: debezium_orders

    # Output format
    key.converter: org.apache.kafka.connect.json.JsonConverter
    value.converter: org.apache.kafka.connect.json.JsonConverter
    key.converter.schemas.enable: "false"
    value.converter.schemas.enable: "false"

    # Transforms: add metadata
    transforms: route,addTimestamp
    transforms.route.type: org.apache.kafka.connect.transforms.ReplaceField$Value
    transforms.addTimestamp.type: org.apache.kafka.connect.transforms.InsertField$Value
    transforms.addTimestamp.timestamp.field: _ingested_at
```

## Step 4: Create an Elasticsearch Sink Connector

```yaml
# infrastructure/messaging/connectors/orders-elasticsearch-sink.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnector
metadata:
  name: orders-elasticsearch-sink
  namespace: kafka
  labels:
    strimzi.io/cluster: data-pipeline
spec:
  class: io.confluent.connect.elasticsearch.ElasticsearchSinkConnector
  tasksMax: 3

  config:
    topics: cdc.public.orders
    connection.url: http://elasticsearch-master.logging.svc.cluster.local:9200
    type.name: _doc
    key.ignore: "true"
    schema.ignore: "true"
    behavior.on.malformed.documents: warn
    # Index naming
    index.name: "orders-${source.system}"
    # Flush settings
    flush.timeout.ms: "10000"
    max.retries: "5"
    retry.backoff.ms: "3000"
    # Batch settings
    batch.size: "2000"
    max.in.flight.requests: "5"
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/kafka-connect-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka-connect
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/connect
  prune: true
  dependsOn:
    - name: strimzi-kafka
  healthChecks:
    - apiVersion: kafka.strimzi.io/v1beta2
      kind: KafkaConnect
      name: data-pipeline
      namespace: kafka
```

## Step 6: Verify Connectors

```bash
# Check KafkaConnect cluster
kubectl get kafkaconnect data-pipeline -n kafka

# Check connectors
kubectl get kafkaconnectors -n kafka

# Detailed connector status
kubectl describe kafkaconnector orders-cdc -n kafka

# Check Connect REST API
kubectl exec -n kafka deploy/data-pipeline-connect -- \
  curl -s http://localhost:8083/connectors/orders-cdc/status | jq .

# View connector logs
kubectl logs -n kafka deploy/data-pipeline-connect --tail=30
```

## Best Practices

- Set `strimzi.io/use-connector-resources: "true"` on the KafkaConnect resource - without this annotation, KafkaConnector CRDs are ignored.
- Use `tasksMax: 1` for Debezium CDC connectors (they are inherently single-threaded per database slot).
- Store connector credentials in Kubernetes Secrets and reference them via `externalConfiguration.env` - never embed passwords in KafkaConnector config.
- Monitor connector lag with the Connect REST API (`/connectors/{name}/status`) and set up Prometheus alerts on `status.running` going false.
- Use Single Message Transforms (SMTs) to enrich or route messages without writing custom code.

## Conclusion

Strimzi's `KafkaConnect` and `KafkaConnector` CRDs managed by Flux CD bring full GitOps discipline to data integration pipelines. CDC connectors, sink connectors, and the Connect cluster configuration are all version-controlled and automatically applied. When you need to add a new data source or change a connector configuration, it is a pull request - reviewed, auditable, and automatically applied by Flux without touching the Kafka REST API manually.
