# How to Use Dapr with DigitalOcean Managed Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DigitalOcean, PostgreSQL, Redis, Managed Database

Description: Configure Dapr state management and pub/sub components with DigitalOcean Managed Databases including PostgreSQL and Redis, with SSL certificate and connection string setup.

---

## Overview

DigitalOcean Managed Databases offer fully managed PostgreSQL and Redis clusters that integrate well with Dapr on DigitalOcean Kubernetes (DOKS). This guide covers setting up both PostgreSQL for state management and Redis for pub/sub.

## Configuring Dapr with DigitalOcean Managed PostgreSQL

DigitalOcean provides a CA certificate and connection string. Download the CA cert:

```bash
# Get the CA certificate from DigitalOcean dashboard or API
doctl databases get-ca my-pg-cluster --format Certificate --no-header > /tmp/do-ca.pem

# Create a ConfigMap with the certificate
kubectl create configmap do-pg-cert \
  --from-file=ca.pem=/tmp/do-ca.pem
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
      name: do-pg-secret
      key: connectionString
  - name: tableName
    value: dapr_state
```

Create the secret with the DigitalOcean connection string:

```bash
kubectl create secret generic do-pg-secret \
  --from-literal=connectionString="host=my-pg-cluster-do-user-12345-0.db.ondigitalocean.com \
    port=25060 \
    user=doadmin \
    password=mypassword \
    dbname=defaultdb \
    sslmode=verify-full \
    sslrootcert=/certs/ca.pem"
```

Mount the certificate in the Dapr sidecar using the `dapr.io/volume-mounts` annotation:

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/volume-mounts: "do-pg-cert:/certs"
    spec:
      volumes:
      - name: do-pg-cert
        configMap:
          name: do-pg-cert
      containers:
      - name: my-service
        image: myregistry/my-service:latest
```

## Configuring Dapr with DigitalOcean Managed Redis

Get the Redis connection details and configure the Dapr Redis component:

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
    value: my-redis-cluster-do-user-12345-0.db.ondigitalocean.com:25061
  - name: redisPassword
    secretKeyRef:
      name: do-redis-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: consumerID
    value: "{uuid}"
```

```bash
kubectl create secret generic do-redis-secret \
  --from-literal=password="your-do-redis-password"
```

## VPC-Restricted Access

DigitalOcean Managed Databases can restrict access to your DOKS cluster VPC:

```bash
# Get your DOKS cluster UUID
CLUSTER_ID=$(doctl kubernetes cluster get my-cluster --format ID --no-header)

# Add the Kubernetes cluster to the database trusted sources
doctl databases firewalls append my-pg-cluster \
  --rule k8s:$CLUSTER_ID
```

## Testing the Connections

Verify both state store and pub/sub work:

```bash
# Test PostgreSQL state store
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"do-test","value":"hello from DigitalOcean"}]'

curl http://localhost:3500/v1.0/state/statestore/do-test

# Test pub/sub
curl -X POST http://localhost:3500/v1.0/publish/pubsub/test-topic \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

## Summary

DigitalOcean Managed Databases integrate cleanly with Dapr when deployed on DOKS. Use the firewall rules to restrict database access to only your Kubernetes cluster's VPC, mount the CA certificate as a ConfigMap volume for SSL verification, and store connection strings and passwords in Kubernetes secrets. PostgreSQL works as a state store and Redis works for both state and pub/sub workloads.
