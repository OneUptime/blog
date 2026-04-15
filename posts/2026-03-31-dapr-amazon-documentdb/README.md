# How to Use Dapr with Amazon DocumentDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Amazon DocumentDB, AWS, MongoDB, State Management

Description: Configure Dapr state management with Amazon DocumentDB using the MongoDB-compatible component, including TLS certificate setup, VPC connectivity, and connection string configuration.

---

## Overview

Amazon DocumentDB is a managed, MongoDB-compatible document database on AWS. Dapr supports DocumentDB through its MongoDB state store component, allowing Dapr services to use DocumentDB as a managed, highly available document store.

## Downloading the TLS Certificate

DocumentDB requires TLS. Download the Amazon root CA certificate:

```bash
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  -O /tmp/rds-combined-ca-bundle.pem

# Create a Kubernetes ConfigMap with the certificate
kubectl create configmap documentdb-cert \
  --from-file=rds-ca.pem=/tmp/rds-combined-ca-bundle.pem
```

## Configuring the Dapr MongoDB State Store

Create a Dapr MongoDB component pointing to your DocumentDB cluster:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.mongodb
  version: v1
  metadata:
  - name: host
    value: my-cluster.cluster-abc123.us-east-1.docdb.amazonaws.com:27017
  - name: username
    secretKeyRef:
      name: documentdb-secret
      key: username
  - name: password
    secretKeyRef:
      name: documentdb-secret
      key: password
  - name: databaseName
    value: daprdb
  - name: collectionName
    value: dapr_state
  - name: params
    value: "?authSource=admin&tls=true&tlsCAFile=/tls/rds-ca.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
```

Create the secret:

```bash
kubectl create secret generic documentdb-secret \
  --from-literal=username=dapr_user \
  --from-literal=password=mypassword
```

## Mounting the TLS Certificate

Mount the certificate ConfigMap into your Dapr-enabled pods:

```yaml
spec:
  template:
    spec:
      volumes:
      - name: docdb-tls
        configMap:
          name: documentdb-cert
      containers:
      - name: my-service
        volumeMounts:
        - name: docdb-tls
          mountPath: /tls
          readOnly: true
```

## VPC and Security Group Configuration

DocumentDB only accepts connections from within its VPC:

```bash
# Add inbound rule to DocumentDB security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-documentdb \
  --protocol tcp \
  --port 27017 \
  --source-group sg-eks-nodes

# Verify connectivity from a test pod
kubectl run mongo-test --image=mongo:6 --rm -it -- \
  mongosh "mongodb://dapr_user:mypassword@my-cluster.cluster-abc123.us-east-1.docdb.amazonaws.com:27017/daprdb?authSource=admin&tls=true&tlsCAFile=/tls/rds-ca.pem&replicaSet=rs0&retryWrites=false"
```

## Testing State Operations

Verify the DocumentDB state store works:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"docdb-test","value":{"message":"hello from DocumentDB","nested":{"field":"value"}}}]'

# Retrieve state
curl http://localhost:3500/v1.0/state/statestore/docdb-test
```

## DocumentDB Limitations vs MongoDB

DocumentDB does not support all MongoDB features. Relevant limitations for Dapr:

```bash
# DocumentDB does not support:
# - Retryable writes (retryWrites=false is required in the connection string)
# - Change streams in older versions (added in DocumentDB 4.0+)
# - Some aggregation pipeline operators

# DocumentDB 4.0+ does support multi-document transactions within a replica set.

# Always set: retryWrites=false in the connection string
```

## Summary

Amazon DocumentDB integrates with Dapr through the MongoDB state store component with some important caveats - you must disable retry writes, use the RDS TLS certificate bundle, and keep connections within the VPC. Mount the CA certificate as a ConfigMap volume in your Dapr pods, store credentials in Kubernetes secrets, and validate behavior against the MongoDB compatibility matrix for your DocumentDB version before production deployment.
