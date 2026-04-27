# How to Use Workspaces with Remote Backends in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Workspaces, Backend

Description: Learn how OpenTofu workspaces interact with remote backends like S3, GCS, and Azure Blob Storage, and how state is organized per workspace.

## Introduction

When using remote backends with workspaces, each workspace gets its own state file stored at a distinct path within the backend. Understanding how different backends organize workspace state helps you manage, audit, and back up environment-specific state correctly.

## S3 Backend Workspace Paths

```hcl
terraform {
  backend "s3" {
    bucket = "acme-tofu-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}
```

State file locations per workspace:
```text
s3://acme-tofu-state/
├── infrastructure/terraform.tfstate           ← default workspace
└── env:/
    ├── staging/infrastructure/terraform.tfstate
    └── production/infrastructure/terraform.tfstate
```

## Customizing the Workspace Prefix in S3

```hcl
terraform {
  backend "s3" {
    bucket               = "acme-tofu-state"
    key                  = "infrastructure/terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "workspaces"  # Custom prefix instead of "env:"
  }
}
```

Results in:
```text
s3://acme-tofu-state/
└── workspaces/
    ├── staging/infrastructure/terraform.tfstate
    └── production/infrastructure/terraform.tfstate
```

## GCS Backend Workspace Paths

```hcl
terraform {
  backend "gcs" {
    bucket = "acme-tofu-state"
    prefix = "infrastructure"
  }
}
```

State files in GCS:
```text
gs://acme-tofu-state/
├── infrastructure/default.tfstate            ← default workspace
├── infrastructure/staging.tfstate
└── infrastructure/production.tfstate
```

GCS stores workspace state as separate objects within the same prefix, named by workspace.

## Azure Backend Workspace Paths

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-rg"
    storage_account_name = "acmetofustate"
    container_name       = "tfstate"
    key                  = "infrastructure.tfstate"
  }
}
```

Azure blob names per workspace:
```text
container: tfstate
├── infrastructure.tfstate              ← default workspace
├── infrastructure.tfstateenv:staging
└── infrastructure.tfstateenv:production
```

## PostgreSQL Backend Workspaces

The PostgreSQL backend stores each workspace as a separate row:

```sql
-- Each row represents one workspace
SELECT name, length(data) as state_size
FROM terraform_remote_state.states;
-- default   | 12345
-- staging   | 10234
-- production| 15678
```

## Listing Workspace State in S3

```bash
# List all workspace state files

aws s3 ls --recursive s3://acme-tofu-state/

# Output:
# infrastructure/terraform.tfstate
# env:/staging/infrastructure/terraform.tfstate
# env:/production/infrastructure/terraform.tfstate
```

## Backing Up All Workspace States

```bash
#!/bin/bash
BUCKET="acme-tofu-state"
PREFIX="infrastructure"
BACKUP_DIR="./state-backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup default workspace
aws s3 cp "s3://$BUCKET/$PREFIX/terraform.tfstate" \
  "$BACKUP_DIR/default.tfstate"

# Backup named workspaces
for WS in staging production; do
  aws s3 cp "s3://$BUCKET/env:/$WS/$PREFIX/terraform.tfstate" \
    "$BACKUP_DIR/$WS.tfstate"
done
```

## Workspace Isolation with IAM Conditions

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::acme-tofu-state/env:/staging/infrastructure/*"
}
```

Restrict CI/CD roles to specific workspace paths for stronger isolation.

## Conclusion

Remote backends organize workspace state at predictable paths. S3 prepends `<workspace_key_prefix>/<workspace_name>/` (default `env:/`) at the bucket root, ahead of the entire key; GCS stores separate objects per workspace within the prefix; Azure appends `env:<workspace_name>` directly to the key. Understanding these paths enables targeted backups, granular IAM policies, and direct state inspection without running OpenTofu commands.
