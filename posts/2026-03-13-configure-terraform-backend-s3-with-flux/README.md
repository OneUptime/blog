# How to Configure Terraform Backend with S3 and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, S3 Backend, State Management, GitOps, AWS

Description: Configure S3 as the Terraform state backend using the Tofu Controller with Flux CD for durable, shared, and locking-enabled state management.

---

## Introduction

While Kubernetes Secrets work well for simple state storage, production Terraform workloads benefit from a dedicated remote backend. S3 with DynamoDB state locking is the most widely used Terraform backend for AWS environments. It provides state versioning for rollback, cross-team access to shared state, concurrent access protection through DynamoDB locking, and CloudTrail auditability.

The Tofu Controller supports custom backend configurations through the `backendConfig` field. By specifying an S3 backend, the runner pods use S3 for state storage rather than the default Kubernetes Secret backend. This is transparent to the rest of the workflow—Flux still manages the Terraform resource and the controller still handles plan and apply operations.

This guide sets up an S3 backend with DynamoDB locking and configures Terraform resources to use it.

## Prerequisites

- Tofu Controller installed via Flux
- An AWS S3 bucket for Terraform state (with versioning enabled)
- A DynamoDB table for state locking
- AWS credentials with access to the S3 bucket and DynamoDB table
- `kubectl` CLI installed

## Step 1: Create the S3 Bucket and DynamoDB Table for State

You can use Terraform to bootstrap the state backend itself (stored locally for this one-time setup).

```hcl
# bootstrap/backend/main.tf

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-org-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_state_lock" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## Step 2: Create AWS Credentials for State Backend Access

```bash
# Create a Kubernetes Secret with credentials for the S3 backend
# In production, use SOPS to encrypt this before committing
kubectl create secret generic terraform-backend-credentials \
  --namespace flux-system \
  --from-literal=AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
  --from-literal=AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --from-literal=AWS_REGION=us-east-1
```

## Step 3: Configure a Terraform Resource with S3 Backend

```yaml
# infrastructure/terraform/production/vpc.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-vpc
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/vpc
  workspace: production-vpc
  approvePlan: "manual"

  # Configure the S3 backend for state storage
  backendConfig:
    # Inline HCL backend configuration block
    customConfiguration: |
      backend "s3" {
        bucket         = "my-org-terraform-state"
        key            = "production/vpc/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        # DynamoDB table for state locking prevents concurrent applies
        dynamodb_table = "terraform-state-lock"
        # Use a workspace prefix to separate environments
        workspace_key_prefix = "workspaces"
      }

  # Inject AWS credentials as environment variables for the backend
  runnerPodTemplate:
    spec:
      env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: terraform-backend-credentials
              key: AWS_ACCESS_KEY_ID
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: terraform-backend-credentials
              key: AWS_SECRET_ACCESS_KEY
        - name: AWS_REGION
          valueFrom:
            secretKeyRef:
              name: terraform-backend-credentials
              key: AWS_REGION

  vars:
    - name: vpc_cidr
      value: "10.0.0.0/16"
    - name: region
      value: us-east-1
    - name: environment
      value: production

  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
      optional: false
```

## Step 4: Organize State Keys by Environment and Component

Use a consistent S3 key structure for easy navigation and access control.

```
my-org-terraform-state/
├── production/
│   ├── networking/terraform.tfstate
│   ├── databases/terraform.tfstate
│   ├── eks/terraform.tfstate
│   └── iam/terraform.tfstate
├── staging/
│   ├── networking/terraform.tfstate
│   └── databases/terraform.tfstate
└── development/
    └── networking/terraform.tfstate
```

```yaml
# infrastructure/terraform/production/database.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/rds
  workspace: production-database
  approvePlan: "manual"
  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket         = "my-org-terraform-state"
        key            = "production/databases/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        dynamodb_table = "terraform-state-lock"
      }
  vars:
    - name: environment
      value: production
```

## Step 5: Enable S3 State Versioning for Rollback

S3 versioning is already enabled on the bucket. To roll back to a previous state version:

```bash
# List state file versions in S3
aws s3api list-object-versions \
  --bucket my-org-terraform-state \
  --prefix production/vpc/terraform.tfstate

# Download a specific version for inspection
aws s3api get-object \
  --bucket my-org-terraform-state \
  --key production/vpc/terraform.tfstate \
  --version-id VERSION_ID_HERE \
  terraform.tfstate.backup
```

## Best Practices

- Use a separate S3 bucket for Terraform state from the buckets your Terraform manages. Never store state in a bucket that Terraform itself could delete.
- Enable S3 MFA delete on the state bucket to prevent accidental state deletion.
- Grant runner pods access to the S3 backend using IAM roles (IRSA) rather than long-lived access keys when running on EKS.
- Use a consistent key naming convention (`environment/component/terraform.tfstate`) to make state files discoverable and to scope S3 bucket policies by environment.
- Enable DynamoDB TTL on the lock table to automatically clean up stale locks from interrupted operations.

## Conclusion

The Tofu Controller is now configured to use S3 with DynamoDB locking as the Terraform state backend. This provides durable, versioned, and locking-enabled state management suitable for production workloads. Multiple Terraform resources can safely run concurrently without state corruption, and S3 versioning enables state rollback when needed.
