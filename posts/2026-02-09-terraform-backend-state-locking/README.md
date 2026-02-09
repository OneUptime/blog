# How to Configure Terraform Backend with State Locking for Team Collaboration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, State Management, Collaboration

Description: Set up Terraform remote backends with state locking to enable safe team collaboration on Kubernetes infrastructure, preventing concurrent modifications and state corruption.

---

Terraform stores infrastructure state in a state file that tracks resource mappings and metadata. When multiple team members work on the same infrastructure, concurrent modifications can corrupt the state file, leading to inconsistent or broken deployments. Remote backends with state locking solve this problem by storing state centrally and preventing simultaneous operations.

## Understanding State Locking

State locking prevents multiple Terraform processes from modifying state simultaneously. When you run terraform apply, Terraform acquires a lock on the state. Other operations wait until the lock releases. This prevents race conditions and state corruption.

## Configuring S3 Backend with DynamoDB Locking

AWS S3 with DynamoDB provides a robust backend for Terraform state:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "kubernetes/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    
    # Optional: use workspaces
    workspace_key_prefix = "workspaces"
  }
}
```

Create the S3 bucket and DynamoDB table:

```hcl
# bootstrap/main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"

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
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

output "s3_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
```

## Migrating from Local to Remote State

To migrate existing local state to a remote backend:

```bash
# 1. Add backend configuration
cat >> backend.tf << 'EOF'
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "kubernetes/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
EOF

# 2. Initialize with migration
terraform init -migrate-state

# 3. Verify state location
terraform state list
```

Terraform copies your local state to S3 and configures locking.

## Using Azure Storage Backend

For Azure environments, use Azure Storage with blob leasing:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "terraformstate"
    container_name       = "tfstate"
    key                  = "kubernetes.terraform.tfstate"
    use_azuread_auth     = true
  }
}
```

Create the storage account:

```bash
az group create --name terraform-state-rg --location eastus

az storage account create \
  --name terraformstate \
  --resource-group terraform-state-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

az storage container create \
  --name tfstate \
  --account-name terraformstate
```

## Google Cloud Storage Backend

For GCP, use Cloud Storage:

```hcl
terraform {
  backend "gcs" {
    bucket  = "my-terraform-state"
    prefix  = "kubernetes/production"
  }
}
```

Create the bucket:

```bash
gsutil mb -l us-central1 gs://my-terraform-state
gsutil versioning set on gs://my-terraform-state
```

## Organizing State with Workspaces

Workspaces let you maintain multiple state files in one backend:

```bash
# List workspaces
terraform workspace list

# Create new workspace
terraform workspace new staging

# Switch workspaces
terraform workspace select production

# Show current workspace
terraform workspace show
```

Use workspaces in configuration:

```hcl
locals {
  environment = terraform.workspace
  replica_count = terraform.workspace == "production" ? 5 : 2
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app"
    namespace = local.environment
  }

  spec {
    replicas = local.replica_count
    # ... rest of configuration
  }
}
```

## Handling State Lock Failures

If a process crashes while holding a lock, you may need to manually unlock:

```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

Check DynamoDB for lock details:

```bash
aws dynamodb scan \
  --table-name terraform-state-lock \
  --region us-east-1
```

## State File Security

Protect state files containing sensitive data:

```hcl
# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
  }
}

# Restrict access with IAM
resource "aws_iam_policy" "terraform_state" {
  name = "terraform-state-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      }
    ]
  })
}
```

## Separating State Files

Use different state files for different environments or components:

```
terraform/
├── infrastructure/
│   ├── backend.tf (key: infra/terraform.tfstate)
│   └── main.tf
├── kubernetes-cluster/
│   ├── backend.tf (key: cluster/terraform.tfstate)
│   └── main.tf
└── applications/
    ├── backend.tf (key: apps/terraform.tfstate)
    └── main.tf
```

Reference state across configurations:

```hcl
data "terraform_remote_state" "cluster" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "cluster/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "kubernetes_deployment" "app" {
  # Use outputs from cluster state
  metadata {
    namespace = data.terraform_remote_state.cluster.outputs.app_namespace
  }
  # ...
}
```

## CI/CD Integration

Configure backend for automation:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:

env:
  AWS_REGION: us-east-1
  TF_VERSION: 1.6.0

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: ${{ env.TF_VERSION }}
      
      - name: Terraform Init
        run: terraform init
      
      - name: Terraform Plan
        run: terraform plan
        if: github.event_name == 'pull_request'
      
      - name: Terraform Apply
        run: terraform apply -auto-approve
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

The backend configuration ensures all CI/CD runs use the same state and respect locks.

## Backup and Recovery

Enable state versioning for recovery:

```bash
# List S3 object versions
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix kubernetes/production/terraform.tfstate

# Restore previous version
aws s3api get-object \
  --bucket my-terraform-state \
  --key kubernetes/production/terraform.tfstate \
  --version-id <version-id> \
  terraform.tfstate.backup

# Replace current state (after backing up)
terraform state push terraform.tfstate.backup
```

Remote backends with state locking are essential for team collaboration on Terraform-managed Kubernetes infrastructure. By configuring proper backends, implementing security controls, and organizing state files thoughtfully, you enable safe concurrent operations while protecting sensitive infrastructure state data.
