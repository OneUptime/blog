# How to Deploy Redpanda Operator for Kafka-Compatible Streaming on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Kubernetes, Redpanda

Description: Learn how to deploy and manage Redpanda clusters on Kubernetes using the Redpanda Operator for high-performance, Kafka-compatible streaming with simplified operations.

---

Redpanda is a Kafka-compatible streaming platform designed specifically for modern cloud environments. It delivers significantly better performance than traditional Kafka while maintaining API compatibility, making it an attractive alternative for teams running on Kubernetes. The Redpanda Operator simplifies deployment, scaling, and management of Redpanda clusters using Kubernetes-native patterns.

This guide covers deploying Redpanda on Kubernetes using the official operator with production-ready configurations.

## Why Choose Redpanda Over Kafka

Redpanda offers several advantages for Kubernetes deployments:

- No Zookeeper dependency, reducing operational complexity
- Better performance with lower latency and higher throughput
- Smaller resource footprint (runs well on fewer resources)
- Kafka API compatibility for seamless migration
- Built-in schema registry and HTTP proxy
- Thread-per-core architecture for maximum CPU utilization

For teams running on Kubernetes, Redpanda's simplified architecture translates to easier operations and lower costs.

## Installing the Redpanda Operator

Start by installing the Redpanda Operator using Helm:

```bash
# Add the Redpanda Helm repository
helm repo add redpanda https://charts.redpanda.com
helm repo update

# Create namespace for Redpanda
kubectl create namespace redpanda

# Install the Redpanda Operator
helm install redpanda-operator redpanda/operator \
  --namespace redpanda \
  --set image.tag=v2.15.0 \
  --wait
```

Verify the operator installation:

```bash
kubectl get pods -n redpanda
kubectl get crd | grep redpanda
```

You should see the operator pod running and several custom resource definitions (CRDs) registered.

## Creating a Basic Redpanda Cluster

Deploy a simple three-node Redpanda cluster:

```yaml
apiVersion: cluster.redpanda.com/v1alpha1
kind: Redpanda
metadata:
  name: redpanda-cluster
  namespace: redpanda
spec:
  # Number of Redpanda brokers
  replicas: 3

  # Redpanda version
  version: v23.3.5

  # Resource requirements
  resources:
    cpu:
      cores: 2
    memory:
      container:
        max: 4Gi
    redpanda:
      memory: 3Gi

  # Storage configuration
  storage:
    capacity: 100Gi
    storageClassName: fast-ssd

  # Configuration overrides
  configuration:
    # Enable developer mode for testing (disable for production)
    developerMode: false

    # Kafka API
    kafkaApi:
    - port: 9092
      authenticationMethod: sasl

    # Admin API
    adminApi:
    - port: 9644

    # Schema Registry
    schemaRegistry:
      port: 8081

    # HTTP Proxy (Pandaproxy)
    pandaproxyApi:
    - port: 8082

    # TLS configuration
    tls:
      enabled: true
      requireClientAuth: false

  # License key for enterprise features (optional)
  licenseKey:
    secretKeyRef:
      name: redpanda-license
      key: license
```

Apply the configuration:

```bash
kubectl apply -f redpanda-cluster.yaml
```

Watch the cluster creation:

```bash
kubectl get redpanda -n redpanda -w
kubectl get pods -n redpanda -w
```

## Configuring Production Settings

For production deployments, use more robust configurations:

```yaml
apiVersion: cluster.redpanda.com/v1alpha1
kind: Redpanda
metadata:
  name: production-redpanda
  namespace: redpanda
spec:
  replicas: 5

  version: v23.3.5

  # Pod template for custom settings
  podTemplate:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                - redpanda
            topologyKey: kubernetes.io/hostname
      tolerations:
      - key: dedicated
        operator: Equal
        value: redpanda
        effect: NoSchedule

  resources:
    cpu:
      cores: 4
      overprovisioned: false
    memory:
      container:
        max: 8Gi
      redpanda:
        memory: 7Gi
        reserveMemory: 1Gi

  storage:
    capacity: 500Gi
    storageClassName: fast-ssd

  configuration:
    developerMode: false

    # Tuned properties for production
    tunable:
      log_segment_size: 1073741824  # 1GB
      group_topic_partitions: 16
      default_topic_replications: 3
      transaction_coordinator_replication: 3
      id_allocator_replication: 3

    # Kafka API with SASL
    kafkaApi:
    - port: 9092
      authenticationMethod: sasl
      external:
        enabled: true
        type: LoadBalancer
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb

    # Admin API with TLS
    adminApi:
    - port: 9644
      tls:
        enabled: true
        requireClientAuth: true

    # Schema Registry
    schemaRegistry:
      port: 8081
      authenticationMethod: http_basic
      tls:
        enabled: true

    # Pandaproxy for HTTP access
    pandaproxyApi:
    - port: 8082
      authenticationMethod: http_basic
      tls:
        enabled: true

    # TLS configuration
    tls:
      enabled: true
      requireClientAuth: true
      certs:
        default:
          secretRef:
            name: redpanda-tls
```

## Setting Up Authentication

Configure SASL/SCRAM authentication:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: redpanda-superuser
  namespace: redpanda
type: Opaque
stringData:
  username: admin
  password: strongpassword123
---
apiVersion: cluster.redpanda.com/v1alpha1
kind: User
metadata:
  name: admin-user
  namespace: redpanda
spec:
  cluster:
    name: production-redpanda
  authentication:
    type: scram-sha-256
    password:
      valueFrom:
        secretKeyRef:
          name: redpanda-superuser
          key: password
  authorization:
    type: simple
    acls:
    - resource:
        type: cluster
      operations: [all]
    - resource:
        type: topic
        name: "*"
      operations: [all]
    - resource:
        type: group
        name: "*"
      operations: [all]
```

Create additional users with limited permissions:

```yaml
apiVersion: cluster.redpanda.com/v1alpha1
kind: User
metadata:
  name: app-producer
  namespace: redpanda
spec:
  cluster:
    name: production-redpanda
  authentication:
    type: scram-sha-256
    password:
      valueFrom:
        secretKeyRef:
          name: app-producer-secret
          key: password
  authorization:
    type: simple
    acls:
    - resource:
        type: topic
        name: orders
      operations: [write, describe]
    - resource:
        type: topic
        name: products
      operations: [write, describe]
```

## Configuring TLS Certificates

Create TLS certificates for secure communication:

```bash
# Generate CA certificate
openssl req -new -x509 -keyout ca-key.pem -out ca-cert.pem -days 365

# Generate server certificate
openssl req -new -keyout server-key.pem -out server-req.pem
openssl x509 -req -in server-req.pem -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 365

# Create Kubernetes secret
kubectl create secret generic redpanda-tls \
  --from-file=ca.crt=ca-cert.pem \
  --from-file=tls.crt=server-cert.pem \
  --from-file=tls.key=server-key.pem \
  -n redpanda
```

## Creating Topics

Use the Redpanda Topic CRD to create topics:

```yaml
apiVersion: cluster.redpanda.com/v1alpha1
kind: Topic
metadata:
  name: orders-topic
  namespace: redpanda
spec:
  cluster:
    name: production-redpanda
  partitions: 12
  replicationFactor: 3
  config:
    cleanup.policy: delete
    retention.ms: "604800000"  # 7 days
    compression.type: snappy
    min.insync.replicas: "2"
    segment.bytes: "1073741824"  # 1GB
---
apiVersion: cluster.redpanda.com/v1alpha1
kind: Topic
metadata:
  name: events-topic
  namespace: redpanda
spec:
  cluster:
    name: production-redpanda
  partitions: 24
  replicationFactor: 3
  config:
    cleanup.policy: compact
    compression.type: lz4
    min.insync.replicas: "2"
```

## Connecting Applications

Create a client application that connects to Redpanda:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: applications
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: processor
        image: myapp/order-processor:v1.0.0
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "production-redpanda.redpanda.svc.cluster.local:9092"
        - name: KAFKA_SECURITY_PROTOCOL
          value: "SASL_SSL"
        - name: KAFKA_SASL_MECHANISM
          value: "SCRAM-SHA-256"
        - name: KAFKA_SASL_USERNAME
          valueFrom:
            secretKeyRef:
              name: app-producer-secret
              key: username
        - name: KAFKA_SASL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-producer-secret
              key: password
        - name: KAFKA_SSL_CA_LOCATION
          value: "/etc/kafka/certs/ca.crt"
        volumeMounts:
        - name: kafka-certs
          mountPath: /etc/kafka/certs
          readOnly: true
      volumes:
      - name: kafka-certs
        secret:
          secretName: redpanda-tls
```

Example producer code in Go:

```go
package main

import (
    "context"
    "fmt"
    "github.com/segmentio/kafka-go"
    "github.com/segmentio/kafka-go/sasl/scram"
    "crypto/tls"
    "os"
)

func main() {
    mechanism, err := scram.Mechanism(
        scram.SHA256,
        os.Getenv("KAFKA_SASL_USERNAME"),
        os.Getenv("KAFKA_SASL_PASSWORD"),
    )
    if err != nil {
        panic(err)
    }

    dialer := &kafka.Dialer{
        TLS: &tls.Config{},
        SASLMechanism: mechanism,
    }

    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers: []string{os.Getenv("KAFKA_BOOTSTRAP_SERVERS")},
        Topic:   "orders-topic",
        Dialer:  dialer,
    })
    defer writer.Close()

    err = writer.WriteMessages(context.Background(),
        kafka.Message{
            Key:   []byte("order-123"),
            Value: []byte(`{"id":"123","amount":99.99}`),
        },
    )
    if err != nil {
        panic(err)
    }

    fmt.Println("Message sent successfully")
}
```

## Monitoring Redpanda

Deploy Prometheus monitoring:

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: redpanda-metrics
  namespace: redpanda
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: redpanda
  endpoints:
  - port: admin
    path: /metrics
    interval: 30s
  - port: prometheus
    path: /public_metrics
    interval: 30s
```

Access Redpanda Console for cluster management:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redpanda-console
  namespace: redpanda
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redpanda-console
  template:
    metadata:
      labels:
        app: redpanda-console
    spec:
      containers:
      - name: console
        image: redpandadata/console:v2.4.0
        ports:
        - containerPort: 8080
        env:
        - name: KAFKA_BROKERS
          value: "production-redpanda.redpanda.svc.cluster.local:9092"
        - name: KAFKA_SASL_ENABLED
          value: "true"
        - name: KAFKA_SASL_MECHANISM
          value: "SCRAM-SHA-256"
        - name: KAFKA_SASL_USERNAME
          valueFrom:
            secretKeyRef:
              name: redpanda-superuser
              key: username
        - name: KAFKA_SASL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redpanda-superuser
              key: password
        - name: KAFKA_TLS_ENABLED
          value: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: redpanda-console
  namespace: redpanda
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: redpanda-console
```

## Scaling the Cluster

Scale the Redpanda cluster horizontally:

```bash
# Scale up to 7 nodes
kubectl patch redpanda production-redpanda -n redpanda \
  --type merge -p '{"spec":{"replicas":7}}'

# Watch the scaling process
kubectl get pods -n redpanda -w
```

Redpanda will automatically rebalance partitions across the new nodes.

## Backup and Disaster Recovery

Configure periodic backups using Tiered Storage:

```yaml
spec:
  configuration:
    cloudStorage:
      enabled: true
      bucket: redpanda-backups
      region: us-east-1
      accessKey:
        secretKeyRef:
          name: aws-credentials
          key: access-key
      secretKey:
        secretKeyRef:
          name: aws-credentials
          key: secret-key
      reconciliationIntervalMs: 10000
      segmentUploadTimeoutMs: 30000
```

## Troubleshooting

Check cluster status:

```bash
# Get cluster information
kubectl get redpanda -n redpanda

# Check broker logs
kubectl logs -n redpanda production-redpanda-0

# Execute rpk commands
kubectl exec -it production-redpanda-0 -n redpanda -- \
  rpk cluster info

# Check topic status
kubectl exec -it production-redpanda-0 -n redpanda -- \
  rpk topic list
```

## Conclusion

The Redpanda Operator simplifies running Kafka-compatible streaming on Kubernetes with better performance and lower operational overhead. By eliminating Zookeeper, providing built-in features like schema registry, and offering native Kubernetes integration, Redpanda reduces complexity while maintaining full Kafka API compatibility.

Key advantages include simplified deployment with the operator, better resource utilization, built-in security with SASL and TLS, native Kubernetes scaling, and comprehensive monitoring. For teams looking to modernize their streaming infrastructure on Kubernetes, Redpanda offers a compelling alternative to traditional Kafka with significantly reduced operational burden.
