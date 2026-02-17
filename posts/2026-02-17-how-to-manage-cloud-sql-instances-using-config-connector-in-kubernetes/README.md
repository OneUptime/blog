# How to Manage Cloud SQL Instances Using Config Connector in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Config Connector, Kubernetes, Database

Description: A hands-on guide to creating and managing Cloud SQL instances using Config Connector in Kubernetes, including databases, users, and networking configuration.

---

Running databases on GCP usually means using Cloud SQL. And if you are already managing your infrastructure through Config Connector on GKE, it makes sense to manage your Cloud SQL instances the same way. Instead of clicking through the console or writing gcloud scripts, you define your database instances, databases, and users as Kubernetes resources.

This post covers the full workflow for managing Cloud SQL with Config Connector, from creating instances to configuring networking and users.

## Prerequisites

Before starting, you need:

- A GKE cluster with Config Connector installed and configured
- Workload Identity set up for Config Connector
- The Config Connector service account needs `roles/cloudsql.admin` on your project
- The Cloud SQL Admin API enabled

```bash
# Enable the Cloud SQL Admin API
gcloud services enable sqladmin.googleapis.com --project=my-project-id

# Grant Cloud SQL Admin role to Config Connector service account
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:cnrm-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"
```

## Creating a Cloud SQL Instance

Here is a complete Cloud SQL PostgreSQL instance definition.

```yaml
# sql-instance.yaml
# Creates a Cloud SQL PostgreSQL 15 instance with production-ready settings
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLInstance
metadata:
  name: my-app-db
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
    # Prevent accidental deletion of the database
    cnrm.cloud.google.com/deletion-policy: "abandon"
spec:
  databaseVersion: POSTGRES_15
  region: us-central1
  settings:
    tier: db-custom-2-8192
    # Storage configuration
    diskSize: 20
    diskType: PD_SSD
    diskAutoresize: true
    diskAutoresizeLimit: 100
    # Availability configuration
    availabilityType: REGIONAL
    # Backup configuration
    backupConfiguration:
      enabled: true
      startTime: "03:00"
      pointInTimeRecoveryEnabled: true
      transactionLogRetentionDays: 7
      backupRetentionSettings:
        retainedBackups: 14
    # Maintenance window - Sunday at 4 AM
    maintenanceWindow:
      day: 7
      hour: 4
      updateTrack: stable
    # Database flags for performance tuning
    databaseFlags:
      - name: max_connections
        value: "200"
      - name: log_min_duration_statement
        value: "1000"
    # IP configuration
    ipConfiguration:
      ipv4Enabled: false
      privateNetworkRef:
        name: my-vpc-network
      requireSsl: true
```

Let me break down the important settings. The `tier` field determines the CPU and memory. The format `db-custom-VCPU-MEMORYMB` lets you customize these values. The `availabilityType: REGIONAL` enables high availability with automatic failover. Setting `ipv4Enabled: false` and configuring `privateNetworkRef` means the database is only accessible through your VPC, which is the recommended setup for production.

Apply the instance.

```bash
# Create the Cloud SQL instance (this takes several minutes)
kubectl apply -f sql-instance.yaml

# Watch the status until it becomes ready
kubectl get sqlinstance my-app-db -w
```

Cloud SQL instances take 5 to 10 minutes to provision. The status will show the current state of the reconciliation.

## Creating Databases

Once the instance is ready, create databases on it.

```yaml
# database.yaml
# Creates the application database on the Cloud SQL instance
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLDatabase
metadata:
  name: myapp
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  instanceRef:
    name: my-app-db
  charset: UTF8
  collation: en_US.UTF8
```

```bash
# Create the database
kubectl apply -f database.yaml
```

## Creating Database Users

For database users, Config Connector integrates with Kubernetes secrets to store passwords.

```yaml
# db-user-secret.yaml
# Kubernetes secret holding the database user password
apiVersion: v1
kind: Secret
metadata:
  name: db-user-password
  namespace: default
type: Opaque
stringData:
  password: "your-secure-password-here"
```

```yaml
# db-user.yaml
# Creates a PostgreSQL user with the password from the secret
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLUser
metadata:
  name: app-user
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  instanceRef:
    name: my-app-db
  type: BUILT_IN
  password:
    valueFrom:
      secretKeyRef:
        name: db-user-password
        key: password
```

```bash
# Create the secret and user
kubectl apply -f db-user-secret.yaml
kubectl apply -f db-user.yaml
```

In production, use an external secrets manager like Google Secret Manager with the External Secrets Operator to handle password generation and rotation.

## Configuring Private Service Access

If you configured the instance with private IP only, you need Private Service Access set up in your VPC. Here is how to do that with Config Connector.

```yaml
# private-ip-range.yaml
# Allocate an IP range for Cloud SQL private access
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeGlobalAddress
metadata:
  name: cloudsql-private-ip-range
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  purpose: VPC_PEERING
  addressType: INTERNAL
  prefixLength: 16
  networkRef:
    name: my-vpc-network
```

```yaml
# private-connection.yaml
# Create the private service connection to Google's network
apiVersion: servicenetworking.cnrm.cloud.google.com/v1beta1
kind: ServiceNetworkingConnection
metadata:
  name: cloudsql-private-connection
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  networkRef:
    name: my-vpc-network
  reservedPeeringRanges:
    - name: cloudsql-private-ip-range
  service: servicenetworking.googleapis.com
```

Apply these before the SQL instance so the private networking is ready.

```bash
# Set up private networking first
kubectl apply -f private-ip-range.yaml
kubectl apply -f private-connection.yaml

# Wait for the connection to be established
kubectl wait --for=condition=Ready servicenetworkingconnection/cloudsql-private-connection --timeout=300s
```

## Connecting from GKE Pods

The Cloud SQL Auth Proxy is the recommended way to connect from GKE pods to Cloud SQL. Here is how to add it as a sidecar.

```yaml
# deployment-with-sql-proxy.yaml
# Application deployment with Cloud SQL Auth Proxy sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-ksa
      containers:
        # Application container
        - name: app
          image: my-app-image:latest
          env:
            - name: DB_HOST
              value: "127.0.0.1"
            - name: DB_PORT
              value: "5432"
            - name: DB_NAME
              value: "myapp"
            - name: DB_USER
              value: "app-user"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-user-password
                  key: password
        # Cloud SQL Auth Proxy sidecar
        - name: cloud-sql-proxy
          image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
          args:
            - "--structured-logs"
            - "--port=5432"
            # Connection name format: project:region:instance
            - "my-project-id:us-central1:my-app-db"
          securityContext:
            runAsNonRoot: true
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
```

## Updating Instance Configuration

One of the benefits of declarative management is that updates are just YAML changes. To scale up the instance, edit the tier in your manifest and reapply.

```bash
# After editing the tier from db-custom-2-8192 to db-custom-4-16384
kubectl apply -f sql-instance.yaml

# Monitor the update progress
kubectl describe sqlinstance my-app-db
```

Config Connector will detect the diff and apply the change. Some changes, like machine type changes, will cause a brief downtime as the instance restarts.

## Monitoring Instance Status

Check on your managed instances at any time.

```bash
# List all Cloud SQL instances managed by Config Connector
kubectl get sqlinstances

# Get detailed status including IP addresses and state
kubectl get sqlinstance my-app-db -o jsonpath='{.status}'

# Check the private IP assigned to the instance
kubectl get sqlinstance my-app-db -o jsonpath='{.status.privateIpAddress}'
```

## Summary

Managing Cloud SQL through Config Connector gives you version-controlled, repeatable database infrastructure. You get the benefits of declarative configuration with drift detection, and everything lives alongside your application manifests. Start with the instance and database definitions, layer in users and networking, and connect through the Cloud SQL Auth Proxy for secure access from your GKE workloads.
