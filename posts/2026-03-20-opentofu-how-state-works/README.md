# How State Works in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, State

Description: Understand how OpenTofu state works, what it stores, why it's critical, and how to manage it safely.

OpenTofu state is the mechanism that maps your configuration to real-world infrastructure. Without state, OpenTofu cannot know what resources already exist, what needs to be created, or what needs to be destroyed.

## What Is State?

State is a JSON file that records:
- Every resource in your configuration
- The ID of each real-world resource it maps to
- The current attribute values of each resource
- Metadata like resource dependencies and provider configurations

```json
{
  "version": 4,
  "terraform_version": "1.7.0",
  "resources": [
    {
      "mode": "managed",
      "type": "aws_instance",
      "name": "web",
      "provider": "provider[\"registry.opentofu.org/hashicorp/aws\"]",
      "instances": [
        {
          "schema_version": 1,
          "attributes": {
            "id": "i-0123456789abcdef0",
            "ami": "ami-0c55b159cbfafe1f0",
            "instance_type": "t3.medium",
            "private_ip": "10.0.1.45",
            "public_ip": "54.123.45.67"
          }
        }
      ]
    }
  ]
}
```

## Why State Is Critical

```hcl
Without state:
1. tofu plan runs
2. OpenTofu calls AWS API: "does this instance exist?"
3. For 1000 resources = 1000 API calls on every plan
4. AND: Can't determine what needs to change vs what's new

With state:
1. tofu plan runs
2. OpenTofu reads local state: "instance i-0abc exists with type t3.medium"
3. Compares desired configuration to known state
4. Only calls API for resources where refresh is needed
5. Plans changes precisely
```

## The State Lifecycle

```bash
# 1. No state exists - all resources are "new"

tofu plan
# Plan: 5 to add, 0 to change, 0 to destroy

# 2. Apply creates resources and writes state
tofu apply
# aws_instance.web: Creating...
# aws_instance.web: Creation complete after 30s [id=i-0123456789]

# 3. State now records the instance
cat terraform.tfstate  # Contains i-0123456789

# 4. Next plan compares config to state
tofu plan
# No changes. Infrastructure is up-to-date.

# 5. Change config - plan shows diff
# (change instance_type = "t3.large")
tofu plan
# aws_instance.web will be updated in-place
# ~ instance_type = "t3.medium" -> "t3.large"
```

## State Storage Backends

```hcl
# Local state (default) - stored in terraform.tfstate
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Remote state - S3 with DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/main.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

# Azure Storage
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstateaccount"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}

# GCS
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "terraform/state"
  }
}
```

## State and Concurrency

Remote backends provide state locking to prevent simultaneous runs:

```bash
tofu apply
# Acquiring state lock. This may take a few moments...
# (if another apply is running, this waits or fails)

# If a run fails and leaves a lock:
tofu force-unlock LOCK_ID
```

## State File Security

The state file contains sensitive information:

```bash
# NEVER commit tfstate to git
# Add to .gitignore:
echo "*.tfstate" >> .gitignore
echo "*.tfstate.backup" >> .gitignore
echo ".terraform/" >> .gitignore

# Use encryption at rest for remote backends
terraform {
  backend "s3" {
    encrypt = true  # Encrypt the state file in S3
    kms_key_id = "arn:aws:kms:us-east-1:123456:key/abc123"
  }
}
```

## Refreshing State

```bash
# Sync state with real infrastructure (detect drift)
tofu refresh

# Or with plan (plan -refresh-only shows drift)
tofu plan -refresh-only

# Apply refresh-only to update state without changing infrastructure
tofu apply -refresh-only
```

## State Workspaces

```bash
# Create separate state per environment
tofu workspace new dev
tofu workspace new staging  
tofu workspace new prod

# Switch between workspaces
tofu workspace select prod

# List workspaces
tofu workspace list
# * prod
#   staging
#   dev
```

## Conclusion

State is the heart of OpenTofu's operation. It enables incremental changes, drift detection, and efficient API usage. Always store state remotely for team projects, enable encryption, use locking to prevent corruption, and never commit state files to version control. Understanding state is fundamental to operating OpenTofu safely at scale.
