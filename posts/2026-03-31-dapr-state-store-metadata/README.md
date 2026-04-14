# How to Configure State Store Metadata in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Configuration, Component, Microservice

Description: Learn how to configure state store metadata in Dapr component YAML files, including connection settings, timeouts, TLS, secrets, and store-specific tuning options.

---

## Introduction

Every Dapr state store component is configured through a YAML file with a `metadata` section. Getting this configuration right affects security, performance, and reliability. This guide covers the metadata fields available across the most common state stores and shows how to manage sensitive values using Kubernetes Secrets.

## Component YAML Structure

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore          # Component name used in API calls
  namespace: default        # Kubernetes namespace
spec:
  type: state.redis         # State store type
  version: v1               # Component version
  metadata:                 # Store-specific configuration
    - name: fieldName
      value: "fieldValue"
    - name: secretField
      secretKeyRef:         # Reference a Kubernetes Secret
        name: my-secret
        key: my-key
  scopes:                   # Optional: restrict to specific app IDs
    - orderservice
    - frontend
```

## Redis Metadata Reference

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
    # Connection
    - name: redisHost
      value: redis-master:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: redis-password

    # TLS
    - name: enableTLS
      value: "true"
    - name: clientCert
      secretKeyRef:
        name: redis-tls
        key: client-cert
    - name: clientKey
      secretKeyRef:
        name: redis-tls
        key: client-key

    # Connection pool
    - name: poolSize
      value: "20"
    - name: minIdleConns
      value: "5"
    - name: maxConnAge
      value: "30m"

    # Timeouts
    - name: dialTimeout
      value: "5s"
    - name: readTimeout
      value: "3s"
    - name: writeTimeout
      value: "3s"

    # Retry
    - name: redisMaxRetries
      value: "3"
    - name: redisMinRetryInterval
      value: "1s"
    - name: redisMaxRetryInterval
      value: "8s"

    # Key management
    - name: keyPrefix
      value: appid          # appid | name | namespace | none
    - name: ttlInSeconds
      value: "86400"        # Default TTL for all keys

    # Actor state store
    - name: actorStateStore
      value: "false"
```

## PostgreSQL Metadata Reference

```yaml
spec:
  type: state.postgresql
  version: v2
  metadata:
    # Connection
    - name: connectionString
      secretKeyRef:
        name: pg-secret
        key: connectionString
      # Format: "host=HOST port=5432 user=USER password=PASS dbname=DB sslmode=require"

    # Table prefix
    - name: tablePrefix
      value: ""

    # Cleanup of expired (TTL) entries
    - name: cleanupInterval
      value: "1h"

    # Connection pool (pgxpool)
    - name: maxConns
      value: "20"
    - name: connectionMaxIdleTime
      value: "5m"

    # Key management
    - name: keyPrefix
      value: appid
```

## Azure Cosmos DB Metadata Reference

```yaml
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
    - name: url
      value: "https://myaccount.documents.azure.com:443/"
    - name: masterKey
      secretKeyRef:
        name: cosmosdb-secret
        key: masterKey
    - name: database
      value: daprdb
    - name: collection
      value: state
```

## Managing Secrets for Metadata

Never put passwords or connection strings as plain values. Always use Kubernetes Secrets:

```bash
# Create a secret for Redis
kubectl create secret generic redis-secret \
  --from-literal=redis-password=mysecretpassword

# Create a secret for PostgreSQL connection string
kubectl create secret generic pg-secret \
  --from-literal=connectionString="host=pg-primary port=5432 user=dapr password=secret dbname=dapr_state sslmode=require"
```

Reference them in the component:

```yaml
metadata:
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: redis-password
```

## Using HashiCorp Vault for Secrets

Configure a Dapr secret store and reference it:

```yaml
# Secret store component
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: http://vault:8200
    - name: vaultToken
      value: "root-token"
---
# State store referencing Vault
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: redisPassword
      secretKeyRef:
        name: redis/config          # Vault path
        key: redis-password
  auth:
    secretStore: vault
```

## Validating Component Configuration

```bash
# Check if component loaded successfully
dapr components -k

# Check component status
kubectl get component statestore -o yaml

# Watch Dapr operator logs for component errors
kubectl logs deployment/dapr-operator -n dapr-system --follow

# Test the component from within a pod
kubectl exec -it deploy/myapp -- \
  curl http://localhost:3500/v1.0/state/statestore/test-key
```

## Common Metadata Mistakes

```yaml
# WRONG: boolean as boolean
- name: enableTLS
  value: true        # Should be string

# CORRECT: boolean as string
- name: enableTLS
  value: "true"

# WRONG: number as number
- name: poolSize
  value: 20          # Should be string

# CORRECT: number as string
- name: poolSize
  value: "20"

# WRONG: password in plaintext
- name: redisPassword
  value: mysecret    # Never do this

# CORRECT: reference a secret
- name: redisPassword
  secretKeyRef:
    name: redis-secret
    key: redis-password
```

## Summary

Dapr state store metadata controls every aspect of the backend connection: host, port, credentials, TLS, connection pool, timeouts, retry behaviour, and key prefix mode. Always store sensitive values in Kubernetes Secrets or a secret store like HashiCorp Vault and reference them via `secretKeyRef`. Use string values for all metadata fields, even booleans and numbers. Validate your configuration with `dapr components -k` and watch the Dapr operator logs for component initialization errors.
