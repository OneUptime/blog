# How to Use Dapr with Google Cloud SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Google Cloud SQL, PostgreSQL, GKE, State Management

Description: Configure Dapr state management with Google Cloud SQL for PostgreSQL on GKE, using the Cloud SQL Auth Proxy, Workload Identity, and connection pooling for secure access.

---

## Overview

Google Cloud SQL for PostgreSQL is a managed relational database service on GCP. When deploying Dapr on GKE, you can use Cloud SQL as a reliable, managed PostgreSQL state store. The Cloud SQL Auth Proxy handles authentication and encryption without needing to expose the database publicly.

## Setting Up Cloud SQL Auth Proxy as a Sidecar

Deploy the Cloud SQL Auth Proxy alongside your Dapr-enabled pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3000"
    spec:
      serviceAccountName: order-service-sa
      containers:
      - name: order-service
        image: myregistry/order-service:latest
      - name: cloud-sql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2
        args:
        - "--structured-logs"
        - "--port=5432"
        - "my-project:us-central1:dapr-postgres"
        securityContext:
          runAsNonRoot: true
```

## Workload Identity for Authentication

Use GKE Workload Identity to authenticate the proxy without service account keys:

```bash
# Create a Google service account
gcloud iam service-accounts create dapr-cloudsql-sa \
  --display-name="Dapr Cloud SQL SA"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dapr-cloudsql-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Create Kubernetes service account
kubectl create serviceaccount order-service-sa

# Bind them via Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
  dapr-cloudsql-sa@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[default/order-service-sa]"

kubectl annotate serviceaccount order-service-sa \
  iam.gke.io/gcp-service-account=dapr-cloudsql-sa@my-project.iam.gserviceaccount.com
```

## Dapr State Store Component

Configure the Dapr PostgreSQL state store to connect via the proxy:

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
      name: cloudsql-secret
      key: connectionString
  - name: tableName
    value: dapr_state
```

Create the secret pointing to localhost (Cloud SQL Proxy):

```bash
kubectl create secret generic cloudsql-secret \
  --from-literal=connectionString="host=localhost port=5432 user=dapr_user password=mypassword dbname=daprdb sslmode=disable"
```

## Creating the Database and User

Set up the Cloud SQL database and user:

```bash
# Create database
gcloud sql databases create daprdb --instance=dapr-postgres

# Create user
gcloud sql users create dapr_user \
  --instance=dapr-postgres \
  --password=mypassword
```

## Verifying the Setup

Test the state store connection:

```bash
# Port-forward to the service for testing
kubectl port-forward deployment/order-service 3500:3500

curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"gcp-test","value":"connected to Cloud SQL"}]'
```

## Summary

Google Cloud SQL integrates with Dapr on GKE through the Cloud SQL Auth Proxy sidecar, which handles authentication and encrypted connections without requiring database port exposure. Use Workload Identity to avoid managing service account key files, and configure the Dapr PostgreSQL state store to connect to localhost where the proxy listens. This pattern provides a secure, managed database backend that scales with your Dapr workloads.
