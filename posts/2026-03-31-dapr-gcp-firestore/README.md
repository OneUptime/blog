# How to Use Dapr with GCP Firestore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Firestore, State, Database

Description: Use Dapr's state management API with Google Cloud Firestore as the backend to store and retrieve microservice state in a serverless NoSQL database.

---

## Overview

Google Cloud Firestore in Datastore mode is a fully managed NoSQL database. Dapr supports Firestore (Datastore mode) as a state store, giving your microservices a consistent API to save and load state while Firestore handles scalability and replication under the hood.

## Prerequisites

- GCP project with Firestore API enabled (Datastore mode)
- Dapr CLI installed
- GCP authentication configured (Workload Identity or ADC)

## Enable Firestore in Datastore Mode

```bash
gcloud firestore databases create \
  --location=us-east1 \
  --type=datastore-mode
```

## Configure the Dapr State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.gcp.firestore
  version: v1
  metadata:
  - name: project_id
    value: "my-gcp-project"
  - name: entity_kind
    value: "DaprState"
```

## Storing and Retrieving State

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "user-42", "value": {"name": "Alice", "email": "alice@example.com"}}]'

# Retrieve state
curl http://localhost:3500/v1.0/state/statestore/user-42
```

## Using Bulk State Operations

```bash
# Bulk save (the regular state endpoint accepts an array of key-value pairs)
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "user-42", "value": {"name": "Alice"}},
    {"key": "user-43", "value": {"name": "Bob"}}
  ]'

# Bulk get
curl -X POST http://localhost:3500/v1.0/state/statestore/bulk \
  -H "Content-Type: application/json" \
  -d '{"keys": ["user-42", "user-43"]}'
```

## Summary

Dapr's Firestore state store component lets microservices persist and retrieve state using a unified API backed by Google Cloud Firestore in Datastore mode. CRUD and bulk operations are supported, making Firestore a capable production state backend for Dapr applications.
