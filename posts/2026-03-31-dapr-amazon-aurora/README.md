# How to Use Dapr with Amazon Aurora

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Amazon Aurora, AWS, PostgreSQL, State Management

Description: Configure Dapr state management and bindings with Amazon Aurora PostgreSQL, including connection pooling, SSL configuration, and reader endpoint usage for read scaling.

---

## Overview

Amazon Aurora is a managed relational database compatible with PostgreSQL and MySQL. Dapr integrates with Aurora through its PostgreSQL state store component, enabling Dapr-enabled microservices to use Aurora as a durable, managed state backend.

## Configuring Dapr State Store with Aurora PostgreSQL

Create a Dapr state store component using the Aurora PostgreSQL endpoint:

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
      name: aurora-secret
      key: connectionString
  - name: tableName
    value: dapr_state
  - name: schema
    value: public
  - name: connectionMaxIdleTime
    value: "0s"
```

Create the Kubernetes secret with the Aurora connection string:

```bash
kubectl create secret generic aurora-secret \
  --from-literal=connectionString="host=my-cluster.cluster-abc123.us-east-1.rds.amazonaws.com \
    port=5432 \
    user=dapr_user \
    password=mypassword \
    dbname=mydb \
    sslmode=require"
```

## Using Aurora Reader Endpoint for Read Scaling

Configure a second state store pointing to the Aurora reader endpoint for read-heavy workloads:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-reader
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    value: "host=my-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com port=5432 user=dapr_user password=mypassword dbname=mydb sslmode=require"
```

Use the reader store for non-critical reads:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Write to primary
await client.state.save('statestore', [{ key: 'user:123', value: JSON.stringify(userData) }]);

// Read from reader replica
const data = await client.state.get('statestore-reader', 'user:123');
```

## Aurora IAM Authentication

Use AWS IAM authentication instead of passwords for enhanced security:

```bash
# Generate IAM auth token
aws rds generate-db-auth-token \
  --hostname my-cluster.cluster-abc123.us-east-1.rds.amazonaws.com \
  --port 5432 \
  --region us-east-1 \
  --username dapr_user
```

Store the token and configure the connection string with it:

```yaml
# In a rotating secret or via init container
# connectionString: "host=... password=<iam-token> sslmode=require"
```

## Aurora as Dapr Actor State Store

Configure Aurora as the state store for Dapr actors:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: actorstore
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: aurora-secret
      key: connectionString
  - name: actorStateStore
    value: "true"
```

## Verifying the State Store

Test Aurora connectivity via Dapr:

```bash
# Save a test state entry
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"test-key","value":"test-value"}]'

# Retrieve it
curl http://localhost:3500/v1.0/state/statestore/test-key
```

## Summary

Amazon Aurora integrates with Dapr through the PostgreSQL state store component, providing a fully managed, highly available relational backend. Use the writer endpoint for state writes and the reader endpoint for read scaling. Enable SSL with `sslmode=require` for all Aurora connections and consider IAM database authentication to eliminate long-lived credentials in your Dapr component configuration.
