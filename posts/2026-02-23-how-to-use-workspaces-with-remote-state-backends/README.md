# How to Use Workspaces with Remote State Backends

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Remote State, Backend, S3, Azure, GCS

Description: Learn how Terraform workspaces integrate with remote state backends like S3, Azure Blob Storage, GCS, and Consul, including state path conventions and locking behavior.

---

When you use Terraform workspaces with a remote backend, each workspace gets its own state file stored remotely. The way workspaces organize state varies by backend, and understanding the specifics helps you set up proper access controls, backup policies, and state isolation. This post covers how workspaces interact with the most common remote backends.

## How Workspaces and Backends Relate

Without workspaces (or in the `default` workspace), your backend stores a single state file at the path you configure. When you create additional workspaces, the backend needs to store multiple state files. Each backend handles this differently, but the general pattern is the same: the workspace name gets incorporated into the state file path.

```text
Single workspace:
  backend-path/terraform.tfstate

Multiple workspaces:
  backend-path/terraform.tfstate          (default)
  backend-path/env:/dev/terraform.tfstate  (dev)
  backend-path/env:/prod/terraform.tfstate (prod)
```

## S3 Backend

The S3 backend is the most popular remote backend for AWS users. Here is how it works with workspaces.

### Basic Configuration

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "networking/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### State File Paths

The S3 backend uses an `env:` prefix for non-default workspaces:

```text
Workspace "default":
  s3://my-terraform-state/networking/terraform.tfstate

Workspace "dev":
  s3://my-terraform-state/env:/dev/networking/terraform.tfstate

Workspace "staging":
  s3://my-terraform-state/env:/staging/networking/terraform.tfstate

Workspace "prod":
  s3://my-terraform-state/env:/prod/networking/terraform.tfstate
```

### Verifying State Locations

```bash
# List all state files in the bucket
aws s3 ls s3://my-terraform-state/ --recursive

# Output:
# networking/terraform.tfstate
# env:/dev/networking/terraform.tfstate
# env:/staging/networking/terraform.tfstate
# env:/prod/networking/terraform.tfstate
```

### Locking with DynamoDB

Each workspace gets its own lock entry in DynamoDB. The lock key includes the full state path, so workspaces never interfere with each other's locks:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "app/terraform.tfstate"
    region         = "us-east-1"

    # DynamoDB table for state locking
    dynamodb_table = "terraform-locks"

    # All workspaces share the same lock table
    # but each has its own lock entry
    encrypt = true
  }
}
```

The DynamoDB table stores locks with the LockID set to the full S3 path including the workspace prefix. So the "dev" workspace's lock is independent from the "prod" workspace's lock.

### IAM Policies for Workspace Isolation

You can restrict which workspaces users can access using S3 bucket policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDevWorkspace",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111111111111:role/dev-terraform"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-terraform-state/env:/dev/*"
      ]
    },
    {
      "Sid": "AllowProdWorkspace",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111111111111:role/prod-terraform"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-terraform-state/env:/prod/*"
      ]
    }
  ]
}
```

## Azure Blob Storage Backend

### Configuration

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "app.terraform.tfstate"
  }
}
```

### State File Paths

Azure uses a different naming convention. The workspace name becomes part of the blob name:

```text
Workspace "default":
  tfstate/app.terraform.tfstate

Workspace "dev":
  tfstate/app.terraform.tfstateenv:dev

Workspace "prod":
  tfstate/app.terraform.tfstateenv:prod
```

Note that Azure appends `env:<workspace>` to the blob name rather than using a prefix directory.

### Locking

Azure Blob Storage supports native blob leasing, which Terraform uses for state locking. Each workspace's blob has its own lease, so locks are independent.

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "networking.terraform.tfstate"

    # Locking is enabled by default with Azure blobs
    # No additional configuration needed
  }
}
```

## Google Cloud Storage Backend

### Configuration

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "terraform/state"
  }
}
```

### State File Paths

GCS stores workspace state files under the configured prefix:

```text
Workspace "default":
  gs://my-terraform-state/terraform/state/default.tfstate

Workspace "dev":
  gs://my-terraform-state/terraform/state/dev.tfstate

Workspace "prod":
  gs://my-terraform-state/terraform/state/prod.tfstate
```

GCS uses the workspace name directly in the filename, which is cleaner than the S3 convention.

### Locking

GCS uses object-level locking through `.tflock` files:

```text
gs://my-terraform-state/terraform/state/dev.tflock
```

## Consul Backend

### Configuration

```hcl
terraform {
  backend "consul" {
    address = "consul.example.com:8500"
    scheme  = "https"
    path    = "terraform/app"
  }
}
```

### State Storage

Consul stores each workspace's state as a separate key-value entry:

```text
Workspace "default":
  terraform/app

Workspace "dev":
  terraform/app-env:dev

Workspace "prod":
  terraform/app-env:prod
```

### Locking

Consul provides native locking through its session and lock mechanisms. Each workspace gets its own lock.

## PostgreSQL Backend

### Configuration

```hcl
terraform {
  backend "pg" {
    conn_str    = "postgres://user:password@db.example.com/terraform"
    schema_name = "terraform_remote_state"
  }
}
```

### State Storage

The PostgreSQL backend stores each workspace as a row in the `states` table with the workspace name as part of the key.

## Cross-Backend Workspace Migration

If you need to move workspaces from one backend to another:

```bash
#!/bin/bash
# migrate-backend.sh - Migrate all workspaces to a new backend

# List current workspaces
WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//')
CURRENT=$(terraform workspace show)

echo "Workspaces to migrate: $WORKSPACES"

# Pull state for each workspace
for WS in $WORKSPACES; do
  terraform workspace select "$WS"
  terraform state pull > "state-backup-${WS}.json"
  echo "Backed up state for workspace: $WS"
done

# Update the backend configuration in your .tf files
# (Do this manually or with sed)
# Then reinitialize

terraform init -migrate-state

# Verify each workspace
for WS in $WORKSPACES; do
  terraform workspace select "$WS"
  echo "Workspace $WS resource count: $(terraform state list | wc -l)"
done

# Return to original workspace
terraform workspace select "$CURRENT"
```

## Shared Backend, Multiple Configurations

When multiple Terraform configurations share a backend (for example, networking and compute each have their own directory but use the same S3 bucket), use different `key` values to keep their states separate:

```hcl
# networking/backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# compute/backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "compute/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Each configuration's workspaces are independent:

```text
networking "dev" workspace:
  s3://bucket/env:/dev/networking/terraform.tfstate

compute "dev" workspace:
  s3://bucket/env:/dev/compute/terraform.tfstate
```

## State Backup Strategies

With remote backends, you should still have backup strategies per workspace:

```hcl
# S3 backend with versioning for state history
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rule to keep versions for 90 days
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "state-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

## Troubleshooting

**"Error loading state" after creating a workspace.** Make sure your backend credentials have write access to the workspace state path. The `env:` prefix in S3 is a real path component that needs to be accessible.

**State locking conflicts between workspaces.** This should not happen because each workspace has its own lock. If it does, check that your lock table or mechanism is configured correctly.

**Workspace list is empty with remote backend.** Run `terraform init` to sync with the remote backend. Workspace discovery requires a working backend connection.

## Conclusion

Remote backends and workspaces work together to give you isolated, lockable, version-controlled state for each environment. The key thing to remember is how each backend organizes workspace state files - S3 uses `env:` prefixes, GCS uses separate files per workspace, and Azure appends the workspace to the blob name. Understanding these patterns lets you set up proper access controls and backup policies per workspace. For a deeper dive into S3-specific workspace patterns, see our post on [S3 backend key prefixes with workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspaces-with-s3-backend-key-prefixes/view).
