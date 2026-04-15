# How to Use Dapr with Aiven Managed Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Aiven, PostgreSQL, Kafka, Redis, Managed Service

Description: Configure Dapr components with Aiven managed PostgreSQL, Redis, and Kafka services, including SSL certificate setup and service URI configuration for multi-cloud deployments.

---

## Overview

Aiven provides fully managed open-source database and messaging services across multiple cloud providers. Dapr integrates with Aiven's PostgreSQL, Redis, and Kafka offerings, making Aiven a versatile choice for Dapr component backends in multi-cloud or cloud-agnostic deployments.

## Aiven PostgreSQL State Store

Get your Aiven PostgreSQL service details:

```bash
# Install avn CLI
pip install aiven-client

avn service get my-pg \
  --project my-project \
  --json | jq '.connection_info.pg[0]'
```

Configure the Dapr PostgreSQL state store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: aiven-pg-secret
      key: connectionString
  - name: tableName
    value: dapr_state
```

Create the secret with the Aiven service URI:

```bash
# Get the service URI from Aiven console or CLI
SERVICE_URI=$(avn service get my-pg --project my-project --json | jq -r '.service_uri')

kubectl create secret generic aiven-pg-secret \
  --from-literal=connectionString="$SERVICE_URI"
```

## Aiven Redis State Store and Pub/Sub

Configure Dapr Redis components with Aiven Redis:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: my-redis.a.aivencloud.com:19531
  - name: redisPassword
    secretKeyRef:
      name: aiven-redis-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: consumerID
    value: "{uuid}"
```

```bash
REDIS_PASSWORD=$(avn service get my-redis --project my-project --json | jq -r '.connection_info.redis_password[0]')
kubectl create secret generic aiven-redis-secret \
  --from-literal=password="$REDIS_PASSWORD"
```

## Aiven Kafka Pub/Sub

Use Aiven Kafka as the Dapr pub/sub backend:

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
    value: my-kafka.a.aivencloud.com:19092
  - name: authType
    value: "mtls"
  - name: caCert
    secretKeyRef:
      name: aiven-kafka-certs
      key: ca.pem
  - name: clientCert
    secretKeyRef:
      name: aiven-kafka-certs
      key: service.cert
  - name: clientKey
    secretKeyRef:
      name: aiven-kafka-certs
      key: service.key
```

Download and store Aiven Kafka certificates:

```bash
avn service user-creds-download my-kafka \
  --project my-project \
  --username avnadmin

kubectl create secret generic aiven-kafka-certs \
  --from-file=ca.pem=ca.pem \
  --from-file=service.cert=service.cert \
  --from-file=service.key=service.key
```

## Verifying Aiven Connectivity

Test all configured components:

```bash
# Check Dapr metadata for loaded components
curl http://localhost:3500/v1.0/metadata | jq '.components[].name'

# Test PostgreSQL state store
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"aiven-test","value":"connected"}]'

# Test Kafka pub/sub
curl -X POST http://localhost:3500/v1.0/publish/kafka-pubsub/test-topic \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'
```

## Summary

Aiven's managed services integrate with Dapr across PostgreSQL, Redis, and Kafka, making it a strong choice for teams wanting consistent managed infrastructure across cloud providers. Store Aiven service URIs and certificates in Kubernetes secrets, enable TLS on all connections, and use Aiven's Kafka certificate authentication for mutual TLS on pub/sub components. Aiven's multi-cloud support means the same Dapr configuration works whether your Kubernetes cluster is on AWS, GCP, or Azure.
