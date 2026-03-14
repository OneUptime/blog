# How to Configure Kafka Users with Strimzi CRDs via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kafka, Strimzi, KafkaUser, Authentication, ACL

Description: Manage KafkaUser resources with authentication and ACLs using Strimzi and Flux CD for GitOps-managed Kafka security.

---

## Introduction

Strimzi's User Operator manages `KafkaUser` Kubernetes resources, automatically creating Kafka users with TLS certificates or SCRAM-SHA-512 credentials and configuring Access Control Lists (ACLs). This means your entire Kafka security model - who can produce to which topics, who can consume from which consumer groups - lives in Git as YAML files.

Managing Kafka users through Flux CD ensures that credential rotation, new service onboarding, and ACL changes go through code review. When a new microservice needs to produce to a topic, the team opens a PR adding a `KafkaUser` resource - no manual Kafka shell commands, no undocumented permissions.

## Prerequisites

- Strimzi Kafka cluster with TLS listeners enabled (see Strimzi deployment post)
- Flux CD managing the Strimzi operator
- `kubectl` and `flux` CLIs installed

## Step 1: Understand KafkaUser Authentication Types

Strimzi supports two authentication types for KafkaUsers:

1. **TLS** - The User Operator generates a TLS client certificate and stores it in a Kubernetes Secret. Applications use this certificate to authenticate.
2. **SCRAM-SHA-512** - The User Operator generates a password and stores it in a Kubernetes Secret. Applications use username/password authentication.

## Step 2: Create a TLS-Authenticated Producer User

```yaml
# infrastructure/messaging/users/orders-producer.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: orders-service-producer
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    app: orders-service
    role: producer
spec:
  authentication:
    type: tls  # TLS client certificate authentication

  authorization:
    type: simple  # Kafka ACL-based authorization
    acls:
      # Allow producing to the orders topic
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Write
          - Describe
      # Allow producing to orders dead-letter topic
      - resource:
          type: topic
          name: dead-letter
          patternType: literal
        operations:
          - Write
      # Allow transactional producing
      - resource:
          type: transactionalId
          name: orders-service
          patternType: literal
        operations:
          - Describe
          - Write
```

## Step 3: Create a SCRAM-SHA-512 Consumer User

```yaml
# infrastructure/messaging/users/analytics-consumer.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: analytics-consumer
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    app: analytics-service
    role: consumer
spec:
  authentication:
    type: scram-sha-512  # Username/password authentication

  authorization:
    type: simple
    acls:
      # Read from orders topic
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Read
          - Describe
      # Read from user-events topic
      - resource:
          type: topic
          name: user-events
          patternType: literal
        operations:
          - Read
          - Describe
      # Allow using a specific consumer group
      - resource:
          type: group
          name: analytics-consumer-group
          patternType: literal
        operations:
          - Read
```

## Step 4: Create a Wildcard ACL for Internal Services

```yaml
# infrastructure/messaging/users/platform-admin.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: platform-admin
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    role: admin
spec:
  authentication:
    type: tls

  authorization:
    type: simple
    acls:
      # Full access to all topics (platform team only)
      - resource:
          type: topic
          name: "*"
          patternType: literal
        operations:
          - All
      # Full access to all consumer groups
      - resource:
          type: group
          name: "*"
          patternType: literal
        operations:
          - All
      # Cluster-level operations (describe, alter)
      - resource:
          type: cluster
        operations:
          - Describe
          - Alter
```

## Step 5: Use the Generated Secret in Applications

When the User Operator creates a `KafkaUser`, it generates a Kubernetes Secret containing the credentials:

For TLS users, the Secret contains:
- `user.crt` - client certificate
- `user.key` - private key
- `user.p12` - PKCS12 keystore
- `user.password` - PKCS12 keystore password
- `ca.crt` - CA certificate for verifying the broker

For SCRAM-SHA-512 users, the Secret contains:
- `password` - the SCRAM password
- `saslJaasConfig` - ready-to-use JAAS config string

Mount the Secret in your application:

```yaml
# apps/orders-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-service
  namespace: myapp
spec:
  template:
    spec:
      volumes:
        - name: kafka-certs
          secret:
            secretName: orders-service-producer  # same name as KafkaUser
      containers:
        - name: app
          env:
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: "production-kafka-bootstrap.kafka.svc.cluster.local:9093"
            - name: KAFKA_SECURITY_PROTOCOL
              value: "SSL"
            - name: KAFKA_SSL_KEYSTORE_LOCATION
              value: "/kafka/certs/user.p12"
            - name: KAFKA_SSL_KEYSTORE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: orders-service-producer
                  key: user.password
            - name: KAFKA_SSL_TRUSTSTORE_LOCATION
              value: "/kafka/certs/ca.crt"
          volumeMounts:
            - name: kafka-certs
              mountPath: /kafka/certs
              readOnly: true
```

## Step 6: Organize Users with Flux Kustomization

```yaml
# clusters/production/kafka-users-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka-users
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/users
  prune: true
  dependsOn:
    - name: strimzi-kafka
```

## Step 7: Verify User Credentials

```bash
# Check KafkaUser status
kubectl get kafkausers -n kafka
kubectl describe kafkauser orders-service-producer -n kafka

# Verify the Secret was created
kubectl get secret orders-service-producer -n kafka -o yaml

# Test connectivity with TLS certificate
kubectl exec -n kafka production-kafka-0 -- \
  kafka-console-producer.sh \
  --bootstrap-server production-kafka-bootstrap:9093 \
  --producer.config /tmp/client.properties \
  --topic orders
```

## Best Practices

- Use TLS authentication for production services (stronger than SCRAM) and SCRAM only for services that cannot handle TLS client certificates.
- Assign ACLs with minimum necessary permissions - producers should only `Write` to their specific topics, never `All`.
- Use `patternType: prefix` for ACLs that cover multiple topics (e.g., `orders-` prefix) to avoid duplicating rules.
- Never share `KafkaUser` credentials between services - each service gets its own user so compromised credentials can be revoked individually.
- Rotate TLS certificates by deleting and recreating the `KafkaUser` (the operator generates new certificates automatically).

## Conclusion

Managing Kafka users and ACLs through `KafkaUser` CRDs with Flux CD gives you a declarative, version-controlled Kafka security model. Every credential issuance and permission grant is a Git commit reviewed by your team. Strimzi's User Operator handles the complexity of certificate generation and ACL application, while Flux ensures the declared security policy is always applied to the cluster. The result is a Kafka cluster with a fully auditable access control history.
