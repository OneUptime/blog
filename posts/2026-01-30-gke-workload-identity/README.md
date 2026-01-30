# How to Implement GKE Workload Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: GKE, Kubernetes, Google Cloud, Security

Description: Configure GKE Workload Identity to grant Kubernetes pods access to Google Cloud APIs without service account keys.

---

## Introduction

Managing credentials for applications running on Kubernetes has always been a challenge. The traditional approach involves creating Google Cloud service account keys, storing them as Kubernetes secrets, and mounting them into pods. This method works but introduces significant security risks: keys can be leaked, they never expire unless manually rotated, and tracking their usage becomes difficult at scale.

GKE Workload Identity solves this problem by allowing Kubernetes service accounts to act as Google Cloud IAM service accounts. Your pods get automatic, short-lived credentials without any keys to manage. The credentials are automatically rotated, and you get a clear audit trail of which workloads accessed which Google Cloud resources.

This guide walks through the complete implementation of Workload Identity, from cluster setup to production-ready configurations.

## Prerequisites

Before starting, ensure you have:

- A Google Cloud project with billing enabled
- The `gcloud` CLI installed and configured
- `kubectl` installed
- `terraform` installed (version 1.0 or later)
- Owner or Editor role on the Google Cloud project
- Basic familiarity with Kubernetes concepts

## Understanding Workload Identity Architecture

Workload Identity creates a trust relationship between Kubernetes service accounts and Google Cloud IAM service accounts. Here is how the components interact:

| Component | Role | Location |
|-----------|------|----------|
| GKE Metadata Server | Intercepts metadata requests from pods | Runs on each GKE node |
| Kubernetes Service Account (KSA) | Identity within the Kubernetes cluster | Kubernetes namespace |
| Google Cloud Service Account (GSA) | Identity for Google Cloud API access | Google Cloud IAM |
| IAM Policy Binding | Links KSA to GSA | Google Cloud IAM |

The flow works as follows:

1. A pod makes a request to the metadata server for credentials
2. The metadata server checks the pod's Kubernetes service account
3. If the KSA is bound to a GSA, the metadata server returns temporary credentials
4. The pod uses these credentials to call Google Cloud APIs

## Setting Up the Project

First, enable the required APIs and set up your project variables.

This script enables the Container and IAM APIs, which are required for GKE and Workload Identity:

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export CLUSTER_NAME="workload-identity-demo"

# Configure gcloud
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable iamcredentials.googleapis.com
```

## Creating a GKE Cluster with Workload Identity

### Option 1: Using gcloud CLI

The following command creates a GKE Autopilot cluster with Workload Identity enabled by default:

```bash
# Create an Autopilot cluster (Workload Identity enabled by default)
gcloud container clusters create-auto $CLUSTER_NAME \
    --region=$REGION \
    --project=$PROJECT_ID
```

For a Standard cluster, you need to explicitly enable Workload Identity:

```bash
# Create a Standard cluster with Workload Identity
gcloud container clusters create $CLUSTER_NAME \
    --region=$REGION \
    --workload-pool=$PROJECT_ID.svc.id.goog \
    --num-nodes=1 \
    --machine-type=e2-medium \
    --project=$PROJECT_ID
```

The `--workload-pool` flag is the key setting. It specifies the Workload Identity pool, which follows the format `PROJECT_ID.svc.id.goog`.

### Option 2: Using Terraform

For production environments, Terraform provides better reproducibility and state management.

Create a file named `main.tf` with the following content. This configuration creates a VPC, subnet, and GKE cluster with Workload Identity enabled:

```hcl
# main.tf - GKE Cluster with Workload Identity

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables for customization
variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the cluster"
  type        = string
  default     = "us-central1"
}

variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "workload-identity-demo"
}

# Configure the Google Cloud provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Create a VPC for the cluster
resource "google_compute_network" "vpc" {
  name                    = "${var.cluster_name}-vpc"
  auto_create_subnetworks = false
}

# Create a subnet with secondary ranges for pods and services
resource "google_compute_subnetwork" "subnet" {
  name          = "${var.cluster_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id

  # Secondary ranges are required for VPC-native clusters
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}

# Create the GKE cluster with Workload Identity
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  # Use a dedicated VPC for better isolation
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # Enable VPC-native networking
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Enable Workload Identity - this is the critical configuration
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Remove default node pool and create a custom one
  remove_default_node_pool = true
  initial_node_count       = 1

  # Enable required addons
  addons_config {
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }
}

# Create a node pool with Workload Identity metadata config
resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.cluster_name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 2

  node_config {
    machine_type = "e2-medium"
    disk_size_gb = 50

    # Enable GKE metadata server for Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Use a minimal set of OAuth scopes
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Add labels for organization
    labels = {
      env = "demo"
    }

    # Enable shielded nodes for security
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  # Configure auto-repair and auto-upgrade
  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Output the cluster details
output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "workload_identity_pool" {
  value = "${var.project_id}.svc.id.goog"
}
```

Deploy the cluster using Terraform:

```bash
# Initialize Terraform
terraform init

# Review the execution plan
terraform plan -var="project_id=$PROJECT_ID"

# Apply the configuration
terraform apply -var="project_id=$PROJECT_ID"
```

### Enabling Workload Identity on an Existing Cluster

If you have an existing cluster, you can enable Workload Identity without recreating it.

Update the cluster to enable Workload Identity:

```bash
# Enable Workload Identity on existing cluster
gcloud container clusters update $CLUSTER_NAME \
    --region=$REGION \
    --workload-pool=$PROJECT_ID.svc.id.goog
```

You also need to update existing node pools to use the GKE metadata server:

```bash
# Update node pool to use GKE metadata server
gcloud container node-pools update default-pool \
    --cluster=$CLUSTER_NAME \
    --region=$REGION \
    --workload-metadata=GKE_METADATA
```

Note: Updating the node pool requires a rolling restart of all nodes in that pool.

## Configuring IAM Service Accounts

### Step 1: Create a Google Cloud Service Account

This service account will be used by your Kubernetes workloads to access Google Cloud resources:

```bash
# Set variables
export GSA_NAME="workload-identity-demo-sa"
export NAMESPACE="demo"
export KSA_NAME="demo-ksa"

# Create the Google Cloud service account
gcloud iam service-accounts create $GSA_NAME \
    --display-name="Workload Identity Demo Service Account" \
    --project=$PROJECT_ID
```

### Step 2: Grant Permissions to the Service Account

Grant the service account the permissions it needs. In this example, we grant read access to Cloud Storage:

```bash
# Grant Storage Object Viewer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# For accessing Secret Manager
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# For publishing to Pub/Sub
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/pubsub.publisher"
```

### Step 3: Create the IAM Policy Binding

This binding allows the Kubernetes service account to impersonate the Google Cloud service account:

```bash
# Allow KSA to impersonate GSA
gcloud iam service-accounts add-iam-policy-binding \
    $GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:$PROJECT_ID.svc.id.goog[$NAMESPACE/$KSA_NAME]"
```

The member format is `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]`, which uniquely identifies a Kubernetes service account within the Workload Identity pool.

## Configuring Kubernetes Resources

### Step 1: Get Cluster Credentials

Connect to your cluster:

```bash
gcloud container clusters get-credentials $CLUSTER_NAME \
    --region=$REGION \
    --project=$PROJECT_ID
```

### Step 2: Create the Namespace and Service Account

Create a namespace and Kubernetes service account with the proper annotation:

```yaml
# workload-identity-setup.yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: demo
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: demo-ksa
  namespace: demo
  annotations:
    # This annotation links the KSA to the GSA
    iam.gke.io/gcp-service-account: workload-identity-demo-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Apply the configuration:

```bash
# Replace placeholder with actual project ID
sed -i "s/YOUR_PROJECT_ID/$PROJECT_ID/g" workload-identity-setup.yaml

# Apply the manifest
kubectl apply -f workload-identity-setup.yaml
```

### Terraform Configuration for IAM Bindings

For a complete Infrastructure as Code approach, here is the Terraform configuration for the IAM resources:

```hcl
# iam.tf - IAM configuration for Workload Identity

variable "namespace" {
  description = "Kubernetes namespace for the service account"
  type        = string
  default     = "demo"
}

variable "ksa_name" {
  description = "Kubernetes service account name"
  type        = string
  default     = "demo-ksa"
}

# Create Google Cloud service account
resource "google_service_account" "workload_identity" {
  account_id   = "workload-identity-demo-sa"
  display_name = "Workload Identity Demo Service Account"
  project      = var.project_id
}

# Grant Storage Object Viewer role
resource "google_project_iam_member" "storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

# Grant Secret Manager Accessor role
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

# Allow KSA to impersonate GSA (Workload Identity binding)
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.workload_identity.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/${var.ksa_name}]"

  # Ensure cluster exists before creating binding
  depends_on = [google_container_cluster.primary]
}

# Output the service account email
output "gsa_email" {
  value = google_service_account.workload_identity.email
}

output "ksa_annotation" {
  value = "iam.gke.io/gcp-service-account: ${google_service_account.workload_identity.email}"
}
```

## Testing Workload Identity

### Deploy a Test Pod

Create a test deployment that uses the configured service account:

```yaml
# test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workload-identity-test
  namespace: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: workload-identity-test
  template:
    metadata:
      labels:
        app: workload-identity-test
    spec:
      serviceAccountName: demo-ksa
      containers:
      - name: test
        image: google/cloud-sdk:slim
        command:
        - sleep
        - "infinity"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Apply and test:

```bash
# Deploy the test pod
kubectl apply -f test-deployment.yaml

# Wait for the pod to be ready
kubectl wait --for=condition=ready pod -l app=workload-identity-test -n demo --timeout=120s

# Get the pod name
POD_NAME=$(kubectl get pods -n demo -l app=workload-identity-test -o jsonpath='{.items[0].metadata.name}')

# Verify Workload Identity is working
kubectl exec -it $POD_NAME -n demo -- gcloud auth list
```

The output should show the Google Cloud service account as the active account:

```
                  Credentialed Accounts
ACTIVE  ACCOUNT
*       workload-identity-demo-sa@your-project-id.iam.gserviceaccount.com
```

### Test API Access

Verify that the pod can access Google Cloud APIs:

```bash
# Test access to Cloud Storage (list buckets)
kubectl exec -it $POD_NAME -n demo -- gsutil ls

# Test access to Compute Engine metadata
kubectl exec -it $POD_NAME -n demo -- \
    curl -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
```

### Comprehensive Test Script

Here is a script that performs a complete verification:

```bash
#!/bin/bash
# verify-workload-identity.sh - Test Workload Identity configuration

set -e

NAMESPACE=${1:-demo}
KSA_NAME=${2:-demo-ksa}
GSA_EMAIL=${3:-""}

echo "=== Workload Identity Verification ==="
echo ""

# Check if namespace exists
echo "1. Checking namespace..."
if kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
    echo "   Namespace '$NAMESPACE' exists"
else
    echo "   ERROR: Namespace '$NAMESPACE' not found"
    exit 1
fi

# Check if KSA exists and has annotation
echo ""
echo "2. Checking Kubernetes Service Account..."
KSA_ANNOTATION=$(kubectl get serviceaccount $KSA_NAME -n $NAMESPACE \
    -o jsonpath='{.metadata.annotations.iam\.gke\.io/gcp-service-account}' 2>/dev/null || echo "")

if [ -z "$KSA_ANNOTATION" ]; then
    echo "   ERROR: KSA '$KSA_NAME' missing Workload Identity annotation"
    exit 1
else
    echo "   KSA '$KSA_NAME' is annotated with: $KSA_ANNOTATION"
fi

# Deploy test pod
echo ""
echo "3. Deploying test pod..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: wi-test-pod
  namespace: $NAMESPACE
spec:
  serviceAccountName: $KSA_NAME
  containers:
  - name: test
    image: google/cloud-sdk:slim
    command: ["sleep", "300"]
  restartPolicy: Never
EOF

# Wait for pod to be ready
echo "   Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod/wi-test-pod -n $NAMESPACE --timeout=60s

# Test authentication
echo ""
echo "4. Testing authentication..."
ACTIVE_ACCOUNT=$(kubectl exec wi-test-pod -n $NAMESPACE -- \
    gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)

if [ -n "$ACTIVE_ACCOUNT" ]; then
    echo "   Active account: $ACTIVE_ACCOUNT"

    if [ -n "$GSA_EMAIL" ] && [ "$ACTIVE_ACCOUNT" != "$GSA_EMAIL" ]; then
        echo "   WARNING: Expected $GSA_EMAIL but got $ACTIVE_ACCOUNT"
    fi
else
    echo "   ERROR: No active account found"
fi

# Test metadata endpoint
echo ""
echo "5. Testing metadata endpoint..."
METADATA_EMAIL=$(kubectl exec wi-test-pod -n $NAMESPACE -- \
    curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email 2>/dev/null)

echo "   Metadata email: $METADATA_EMAIL"

# Cleanup
echo ""
echo "6. Cleaning up test pod..."
kubectl delete pod wi-test-pod -n $NAMESPACE --wait=false

echo ""
echo "=== Verification Complete ==="
```

Make the script executable and run it:

```bash
chmod +x verify-workload-identity.sh
./verify-workload-identity.sh demo demo-ksa
```

## Real-World Example: Application Accessing Cloud Storage

Here is a complete example of a Python application that reads from Cloud Storage using Workload Identity.

### Application Code

```python
# app.py - Sample application using Workload Identity
from flask import Flask, jsonify
from google.cloud import storage
import os

app = Flask(__name__)

# Initialize Cloud Storage client
# No credentials needed - Workload Identity handles authentication
storage_client = storage.Client()

BUCKET_NAME = os.environ.get('BUCKET_NAME', 'my-bucket')

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/list-objects')
def list_objects():
    """List objects in the configured bucket."""
    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        blobs = list(bucket.list_blobs(max_results=10))

        objects = [{'name': blob.name, 'size': blob.size} for blob in blobs]
        return jsonify({'objects': objects})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/read-object/<path:object_name>')
def read_object(object_name):
    """Read a specific object from the bucket."""
    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(object_name)
        content = blob.download_as_text()

        return jsonify({
            'name': object_name,
            'content': content[:1000]  # Return first 1000 chars
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Run as non-root user
RUN useradd -m appuser
USER appuser

EXPOSE 8080

CMD ["python", "app.py"]
```

### Requirements File

```text
# requirements.txt
flask==3.0.0
google-cloud-storage==2.14.0
gunicorn==21.2.0
```

### Kubernetes Deployment

```yaml
# storage-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storage-app
  namespace: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: storage-app
  template:
    metadata:
      labels:
        app: storage-app
    spec:
      serviceAccountName: demo-ksa
      containers:
      - name: app
        image: gcr.io/YOUR_PROJECT_ID/storage-app:latest
        ports:
        - containerPort: 8080
        env:
        - name: BUCKET_NAME
          value: "your-bucket-name"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
---
apiVersion: v1
kind: Service
metadata:
  name: storage-app
  namespace: demo
spec:
  selector:
    app: storage-app
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

Build and deploy:

```bash
# Build and push the container
docker build -t gcr.io/$PROJECT_ID/storage-app:latest .
docker push gcr.io/$PROJECT_ID/storage-app:latest

# Update the manifest with your project ID
sed -i "s/YOUR_PROJECT_ID/$PROJECT_ID/g" storage-app-deployment.yaml

# Deploy
kubectl apply -f storage-app-deployment.yaml

# Verify pods are running
kubectl get pods -n demo -l app=storage-app
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Pod stuck in Pending | Node pool not configured for Workload Identity | Update node pool with `--workload-metadata=GKE_METADATA` |
| "Permission denied" errors | IAM binding missing or incorrect | Verify GSA has required roles and KSA binding exists |
| Metadata endpoint timeout | Workload Identity not enabled on cluster | Check cluster workload-pool configuration |
| Wrong service account | KSA annotation incorrect | Verify annotation format and GSA email |

### Debugging Commands

Check if Workload Identity is enabled on the cluster:

```bash
# Verify cluster configuration
gcloud container clusters describe $CLUSTER_NAME \
    --region=$REGION \
    --format="value(workloadIdentityConfig.workloadPool)"
```

Verify node pool configuration:

```bash
# Check node pool metadata config
gcloud container node-pools describe default-pool \
    --cluster=$CLUSTER_NAME \
    --region=$REGION \
    --format="value(config.workloadMetadataConfig.mode)"
```

Check IAM bindings:

```bash
# List IAM bindings for the GSA
gcloud iam service-accounts get-iam-policy \
    $GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com \
    --format=yaml
```

Verify KSA annotation:

```bash
# Check KSA annotation
kubectl get serviceaccount $KSA_NAME -n $NAMESPACE -o yaml
```

### Checking Pod Authentication

If a pod cannot authenticate, run these diagnostics:

```bash
# Check if metadata server is reachable
kubectl exec -it $POD_NAME -n $NAMESPACE -- \
    curl -s -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/

# Check token endpoint
kubectl exec -it $POD_NAME -n $NAMESPACE -- \
    curl -s -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
    | head -c 100

# Verify identity
kubectl exec -it $POD_NAME -n $NAMESPACE -- \
    gcloud auth print-identity-token --audiences=https://example.com 2>&1 | head -5
```

### Logs and Events

Check for relevant events:

```bash
# Check pod events
kubectl describe pod $POD_NAME -n $NAMESPACE

# Check GKE metadata server logs (on the node)
kubectl logs -n kube-system -l k8s-app=gke-metadata-server
```

## Security Best Practices

### Principle of Least Privilege

Grant only the minimum permissions required:

```bash
# Bad: Granting broad Storage Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Better: Grant specific bucket-level permissions
gsutil iam ch \
    serviceAccount:$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com:objectViewer \
    gs://specific-bucket-name
```

### Use Separate Service Accounts

Create dedicated service accounts for different workloads:

```hcl
# Multiple service accounts for different purposes
resource "google_service_account" "frontend" {
  account_id   = "frontend-sa"
  display_name = "Frontend Service Account"
}

resource "google_service_account" "backend" {
  account_id   = "backend-sa"
  display_name = "Backend Service Account"
}

resource "google_service_account" "worker" {
  account_id   = "worker-sa"
  display_name = "Background Worker Service Account"
}
```

### Namespace Isolation

Use separate namespaces for different environments:

```yaml
# Production namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    env: production
---
# Staging namespace
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    env: staging
```

### Audit Logging

Enable Data Access audit logs to track API usage:

```bash
# Enable Data Access logs via gcloud
gcloud projects get-iam-policy $PROJECT_ID --format=yaml > policy.yaml

# Edit policy.yaml to add audit config
# Then apply:
gcloud projects set-iam-policy $PROJECT_ID policy.yaml
```

Example audit config to add to the policy:

```yaml
auditConfigs:
- auditLogConfigs:
  - logType: ADMIN_READ
  - logType: DATA_READ
  - logType: DATA_WRITE
  service: storage.googleapis.com
- auditLogConfigs:
  - logType: ADMIN_READ
  - logType: DATA_READ
  service: secretmanager.googleapis.com
```

## Multi-Cluster Configuration

For organizations running multiple clusters, you can configure cross-project Workload Identity.

### Same Project, Multiple Clusters

All clusters in the same project share the same Workload Identity pool:

```bash
# Cluster A
gcloud container clusters create cluster-a \
    --region=us-central1 \
    --workload-pool=$PROJECT_ID.svc.id.goog

# Cluster B
gcloud container clusters create cluster-b \
    --region=us-east1 \
    --workload-pool=$PROJECT_ID.svc.id.goog
```

### Cross-Project Access

To allow workloads in one project to access resources in another:

```bash
# In the resource project, grant access to the workload project's KSA
gcloud iam service-accounts add-iam-policy-binding \
    $GSA_NAME@$RESOURCE_PROJECT_ID.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:$WORKLOAD_PROJECT_ID.svc.id.goog[$NAMESPACE/$KSA_NAME]"
```

## Migration from Service Account Keys

If you are migrating from JSON key files, follow these steps:

### Step 1: Identify Workloads Using Keys

Search for mounted secrets or environment variables:

```bash
# Find pods with mounted secrets
kubectl get pods --all-namespaces -o json | \
    jq -r '.items[] | select(.spec.volumes[]?.secret) |
    "\(.metadata.namespace)/\(.metadata.name)"'

# Find pods with credential-related env vars
kubectl get pods --all-namespaces -o json | \
    jq -r '.items[] | select(.spec.containers[].env[]?.name |
    contains("GOOGLE")) | "\(.metadata.namespace)/\(.metadata.name)"'
```

### Step 2: Create Equivalent Workload Identity Bindings

For each workload using keys, create the corresponding IAM binding:

```bash
# Example: Migrate a workload
NAMESPACE="production"
KSA_NAME="app-service-account"
GSA_NAME="app-gsa"

# Create IAM binding
gcloud iam service-accounts add-iam-policy-binding \
    $GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:$PROJECT_ID.svc.id.goog[$NAMESPACE/$KSA_NAME]"

# Annotate KSA
kubectl annotate serviceaccount $KSA_NAME \
    --namespace=$NAMESPACE \
    iam.gke.io/gcp-service-account=$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com
```

### Step 3: Update Deployments

Remove secret mounts and update the service account:

```yaml
# Before (using key file)
spec:
  containers:
  - name: app
    env:
    - name: GOOGLE_APPLICATION_CREDENTIALS
      value: /secrets/key.json
    volumeMounts:
    - name: gcp-key
      mountPath: /secrets
  volumes:
  - name: gcp-key
    secret:
      secretName: gcp-credentials

# After (using Workload Identity)
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    # No env vars or volume mounts needed
```

### Step 4: Rotate and Delete Old Keys

After confirming Workload Identity is working:

```bash
# List existing keys
gcloud iam service-accounts keys list \
    --iam-account=$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com

# Delete old keys (keep system-managed keys)
gcloud iam service-accounts keys delete KEY_ID \
    --iam-account=$GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com
```

## Monitoring and Observability

### Cloud Monitoring Metrics

Key metrics to monitor for Workload Identity:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `kubernetes.io/pod/network/received_bytes_count` | Network traffic to metadata server | Unusual spikes |
| IAM audit logs | Authentication events | Failed authentications |
| `custom.googleapis.com/workload_identity/token_requests` | Token request count | High error rates |

### Sample Alert Policy

Create a Cloud Monitoring alert for failed authentication attempts:

```yaml
# monitoring-alert.yaml
displayName: "Workload Identity Authentication Failures"
combiner: OR
conditions:
- displayName: "High auth failure rate"
  conditionThreshold:
    filter: |
      resource.type="iam_service_account"
      AND metric.type="iam.googleapis.com/service_account/authn_events_count"
      AND metric.labels.result="FAILURE"
    comparison: COMPARISON_GT
    thresholdValue: 10
    duration: 300s
    aggregations:
    - alignmentPeriod: 60s
      perSeriesAligner: ALIGN_RATE
notificationChannels:
- projects/YOUR_PROJECT_ID/notificationChannels/YOUR_CHANNEL_ID
```

## Cleanup

To remove all resources created in this guide:

```bash
# Delete Kubernetes resources
kubectl delete namespace demo

# Delete GKE cluster
gcloud container clusters delete $CLUSTER_NAME \
    --region=$REGION \
    --quiet

# Delete IAM service account
gcloud iam service-accounts delete \
    $GSA_NAME@$PROJECT_ID.iam.gserviceaccount.com \
    --quiet
```

Or with Terraform:

```bash
terraform destroy -var="project_id=$PROJECT_ID"
```

## Summary

GKE Workload Identity eliminates the security risks associated with service account keys while simplifying credential management. The key points to remember:

1. Enable Workload Identity at the cluster level with the `--workload-pool` flag
2. Configure node pools to use `GKE_METADATA` mode
3. Create IAM bindings between Kubernetes and Google Cloud service accounts
4. Annotate Kubernetes service accounts with the target Google Cloud service account
5. Test authentication from pods before deploying production workloads

By following this guide, you now have a secure, maintainable approach to authenticating your GKE workloads with Google Cloud services.
