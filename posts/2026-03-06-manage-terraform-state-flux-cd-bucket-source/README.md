# How to Manage Terraform State with Flux CD Bucket Source

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Terraform, bucket source, IaC, GitOps, State Management, Kubernetes

Description: Learn how to manage Terraform state files using Flux CD Bucket Source for GitOps-driven infrastructure as code workflows.

---

Managing Terraform state in a GitOps workflow can be challenging. Flux CD's Bucket Source provides a powerful mechanism to pull Terraform state and configurations from object storage backends like AWS S3, Google Cloud Storage, or MinIO. This guide walks you through setting up Flux CD Bucket Source to manage Terraform state effectively.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster (v1.26 or later)
- Flux CD installed on your cluster (v2.x)
- Terraform CLI installed locally
- An S3-compatible object storage bucket (AWS S3, MinIO, or GCS)
- kubectl configured to access your cluster

## Understanding the Architecture

Flux CD Bucket Source allows you to fetch artifacts from S3-compatible storage. When combined with the Terraform Controller, you can create a fully GitOps-driven IaC workflow where Terraform configurations and state are managed through Kubernetes-native resources.

```mermaid
graph LR
    A[Object Storage] -->|Bucket Source| B[Flux CD]
    B -->|Reconcile| C[Terraform Controller]
    C -->|Apply| D[Cloud Resources]
    C -->|Store State| A
```

## Step 1: Set Up the Object Storage Bucket

First, create an S3 bucket to store your Terraform configurations and state. Here is an example using AWS CLI:

```bash
# Create an S3 bucket for Terraform state
aws s3 mb s3://my-terraform-state-bucket --region us-east-1

# Enable versioning for state safety
aws s3api put-bucket-versioning \
  --bucket my-terraform-state-bucket \
  --versioning-configuration Status=Enabled
```

## Step 2: Upload Terraform Configurations to the Bucket

Organize your Terraform configurations and upload them to the bucket:

```bash
# Create a directory structure for your Terraform configs
mkdir -p terraform/environments/production
mkdir -p terraform/modules/vpc

# Upload configurations to S3
aws s3 sync terraform/ s3://my-terraform-state-bucket/terraform/
```

## Step 3: Create Bucket Access Credentials

Create a Kubernetes secret with your bucket access credentials:

```yaml
# bucket-credentials.yaml
# This secret stores the access credentials for the S3 bucket
apiVersion: v1
kind: Secret
metadata:
  name: bucket-credentials
  namespace: flux-system
type: Opaque
stringData:
  # AWS access key for the S3 bucket
  accesskey: "AKIAIOSFODNN7EXAMPLE"
  # AWS secret key for the S3 bucket
  secretkey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

Apply the secret:

```bash
kubectl apply -f bucket-credentials.yaml
```

## Step 4: Create a Flux CD Bucket Source

Define the Bucket Source to pull Terraform configurations from your S3 bucket:

```yaml
# terraform-bucket-source.yaml
# Flux CD Bucket Source that watches the S3 bucket for Terraform configs
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: terraform-state
  namespace: flux-system
spec:
  # How often Flux checks the bucket for changes
  interval: 5m
  # The S3-compatible provider type
  provider: aws
  # The name of the S3 bucket
  bucketName: my-terraform-state-bucket
  # The S3 endpoint (omit for AWS, set for MinIO/GCS)
  endpoint: s3.amazonaws.com
  # The AWS region where the bucket resides
  region: us-east-1
  # Reference to the credentials secret
  secretRef:
    name: bucket-credentials
  # Only watch a specific prefix in the bucket
  prefix: terraform/
```

Apply the Bucket Source:

```bash
kubectl apply -f terraform-bucket-source.yaml
```

## Step 5: Install the Terraform Controller

Install the Terraform Controller for Flux CD using the official Helm chart:

```yaml
# tf-controller-helmrelease.yaml
# HelmRelease to install the Terraform Controller
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tf-controller
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: tf-controller
      # Use the latest stable version
      version: "0.16.x"
      sourceRef:
        kind: HelmRepository
        name: tf-controller
        namespace: flux-system
  values:
    # Enable the runner to manage Terraform state
    runner:
      serviceAccount:
        # Annotations for IRSA (IAM Roles for Service Accounts)
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/tf-controller-role
```

## Step 6: Create a Terraform Resource

Define a Terraform resource that references the Bucket Source:

```yaml
# terraform-vpc.yaml
# Terraform resource that uses the Bucket Source for VPC configuration
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: vpc-production
  namespace: flux-system
spec:
  # Path within the bucket artifact to the Terraform configuration
  path: ./environments/production
  # How often to reconcile the Terraform configuration
  interval: 10m
  # Reference to the Bucket Source
  sourceRef:
    kind: Bucket
    name: terraform-state
  # Automatically approve and apply changes
  approvePlan: auto
  # Configure the backend to store state in the same bucket
  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket         = "my-terraform-state-bucket"
        key            = "state/vpc-production/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        dynamodb_table = "terraform-locks"
      }
  # Pass variables to Terraform
  vars:
    - name: environment
      value: production
    - name: vpc_cidr
      value: "10.0.0.0/16"
  # Write output values to a Kubernetes secret
  writeOutputsToSecret:
    name: vpc-production-outputs
```

## Step 7: Configure State Locking

Set up DynamoDB for Terraform state locking to prevent concurrent modifications:

```yaml
# state-lock-table.yaml
# Terraform resource to create the DynamoDB lock table
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: state-lock-table
  namespace: flux-system
spec:
  path: ./modules/state-lock
  interval: 30m
  sourceRef:
    kind: Bucket
    name: terraform-state
  approvePlan: auto
  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket = "my-terraform-state-bucket"
        key    = "state/lock-table/terraform.tfstate"
        region = "us-east-1"
      }
```

## Step 8: Set Up Notifications for State Changes

Configure Flux CD alerts to notify you when Terraform state changes:

```yaml
# terraform-alerts.yaml
# Alert provider for Slack notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: terraform-alerts
  secretRef:
    name: slack-webhook-url
---
# Alert that triggers on Terraform resource events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: terraform-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Watch for events on Terraform resources
  eventSources:
    - kind: Terraform
      name: "*"
      namespace: flux-system
  # Filter on severity levels
  eventSeverity: info
```

## Step 9: Using MinIO as an Alternative Backend

If you prefer a self-hosted solution, configure MinIO as the bucket backend:

```yaml
# minio-bucket-source.yaml
# Bucket Source configured for MinIO instead of AWS S3
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: terraform-state-minio
  namespace: flux-system
spec:
  interval: 5m
  # Use the generic provider for MinIO
  provider: generic
  bucketName: terraform-state
  # Point to your MinIO endpoint
  endpoint: minio.minio-system.svc.cluster.local:9000
  # Disable TLS if MinIO is not configured with it
  insecure: true
  secretRef:
    name: minio-credentials
```

## Step 10: Verify the Setup

Check that everything is working correctly:

```bash
# Verify the Bucket Source is ready
kubectl get bucket -n flux-system

# Check the Terraform resource status
kubectl get terraform -n flux-system

# View the latest reconciliation events
kubectl describe terraform vpc-production -n flux-system

# Check if the state file exists in the bucket
aws s3 ls s3://my-terraform-state-bucket/state/vpc-production/
```

## Handling State Drift

Configure drift detection to automatically identify and correct state drift:

```yaml
# drift-detection.yaml
# Terraform resource with drift detection enabled
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: vpc-production
  namespace: flux-system
spec:
  path: ./environments/production
  interval: 10m
  sourceRef:
    kind: Bucket
    name: terraform-state
  approvePlan: auto
  # Enable drift detection
  enableDriftDetection: true
  # How often to check for drift (separate from reconciliation)
  driftDetectionPeriod: 1h
  # Force re-plan on drift detection
  forceReplan: true
```

## Best Practices

1. **Enable bucket versioning** to protect against accidental state corruption
2. **Use state locking** with DynamoDB or equivalent to prevent concurrent modifications
3. **Set appropriate reconciliation intervals** -- shorter for critical resources, longer for stable ones
4. **Use separate state files** for each environment and component
5. **Encrypt state files** at rest and in transit
6. **Monitor Terraform resource events** using Flux CD notifications
7. **Use IRSA or workload identity** instead of static credentials when possible

## Troubleshooting

Common issues and solutions:

```bash
# Check if Flux can access the bucket
flux get sources bucket -n flux-system

# View detailed logs for the Terraform controller
kubectl logs -n flux-system deployment/tf-controller -f

# Force a reconciliation of the Bucket Source
flux reconcile source bucket terraform-state -n flux-system

# Check for authentication issues
kubectl describe bucket terraform-state -n flux-system | grep -A5 "Status"
```

## Conclusion

By combining Flux CD Bucket Source with the Terraform Controller, you achieve a fully GitOps-driven infrastructure management workflow. Terraform configurations are pulled from object storage, applied automatically, and state is managed securely. This approach provides auditability, consistency, and automation for your infrastructure as code pipelines. The Bucket Source mechanism gives you flexibility to use any S3-compatible storage backend, whether it is AWS S3, Google Cloud Storage, or a self-hosted MinIO instance.
