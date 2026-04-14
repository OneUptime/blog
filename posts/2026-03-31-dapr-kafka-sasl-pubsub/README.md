# How to Configure Kafka SASL Authentication for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, SASL, Authentication, Pub/Sub, Security

Description: Configure Dapr Kafka pub/sub with SASL/SCRAM and SASL/PLAIN authentication mechanisms for secure broker connections in production environments.

---

## Overview

Apache Kafka supports SASL authentication to verify client identities before allowing connections. The Dapr Kafka pub/sub component supports SASL/PLAIN, SASL/SCRAM-SHA-256, and SASL/SCRAM-SHA-512. This guide shows how to configure each mechanism.

## SASL/PLAIN Configuration

SASL/PLAIN sends credentials in cleartext - always combine with TLS in production:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-broker-1:9093,kafka-broker-2:9093"
    - name: authType
      value: "password"
    - name: saslUsername
      secretKeyRef:
        name: kafka-secret
        key: username
    - name: saslPassword
      secretKeyRef:
        name: kafka-secret
        key: password
    - name: saslMechanism
      value: "PLAINTEXT"
    - name: disableTls
      value: "false"
```

## SASL/SCRAM-SHA-512 Configuration

SCRAM is preferred over PLAIN as credentials are never sent over the wire:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-broker-1:9093"
    - name: authType
      value: "password"
    - name: saslUsername
      secretKeyRef:
        name: kafka-secret
        key: username
    - name: saslPassword
      secretKeyRef:
        name: kafka-secret
        key: password
    - name: saslMechanism
      value: "SHA-512"
    - name: disableTls
      value: "false"
    - name: skipVerify
      value: "false"
```

## Create the Kubernetes Secret

```bash
kubectl create secret generic kafka-secret \
  --from-literal=username=dapr-service-user \
  --from-literal=password="$(openssl rand -base64 32)"
```

## Kafka Broker Configuration

Ensure your Kafka broker is configured to accept SASL:

```properties
# server.properties
listeners=SASL_SSL://0.0.0.0:9093
advertised.listeners=SASL_SSL://kafka-broker-1:9093
sasl.enabled.mechanisms=SCRAM-SHA-512,PLAIN
security.inter.broker.protocol=SASL_SSL
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512
ssl.keystore.location=/etc/kafka/ssl/kafka.server.keystore.jks
ssl.keystore.password=keystorepassword
```

Create SCRAM credentials for the Dapr user:

```bash
kafka-configs.sh --zookeeper zookeeper:2181 \
  --alter \
  --add-config 'SCRAM-SHA-512=[password=your-password]' \
  --entity-type users \
  --entity-name dapr-service-user
```

## Publishing and Subscribing

Once authentication is configured, pub/sub usage is the same as unauthenticated Kafka:

```python
from dapr.clients import DaprClient
import json

# Publish
with DaprClient() as client:
    client.publish_event(
        pubsub_name="kafka-pubsub",
        topic_name="orders",
        data=json.dumps({"orderId": "123", "amount": 99.99}),
        data_content_type="application/json"
    )

# Subscribe (via subscription manifest)
```

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: kafka-pubsub
  topic: orders
  routes:
    default: /orders
```

## Testing Connectivity

```bash
# Test SASL connection from within the cluster
kubectl run kafka-test --image=confluentinc/cp-kafka \
  --command -- kafka-console-producer.sh \
  --broker-list kafka-broker-1:9093 \
  --topic test \
  --producer.config /etc/kafka/client.properties
```

## Summary

Configuring SASL authentication for Dapr Kafka pub/sub requires setting `authType: password`, providing username/password from Kubernetes secrets, and specifying the mechanism (`PLAINTEXT` or `SHA-512`). SCRAM-SHA-512 is recommended for production as it uses a challenge-response protocol that never sends the password directly. Always pair SASL with TLS (`disableTls: "false"`) to prevent credential interception.
