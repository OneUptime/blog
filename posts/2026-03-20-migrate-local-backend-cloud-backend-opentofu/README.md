# How to Migrate from a Local Backend to a Cloud Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, State Management, Remote Backend, S3, Infrastructure as Code

Description: Learn how to safely migrate your OpenTofu state from a local backend to a remote cloud backend like AWS S3 with DynamoDB state locking for team collaboration.

## Introduction

When starting with OpenTofu, state is stored locally in a `terraform.tfstate` file. As teams grow, a remote backend becomes essential for collaboration, state locking, and state backup. This guide covers migrating from a local backend to AWS S3 with DynamoDB locking.

## Why Migrate to a Remote Backend

- **Collaboration**: Multiple team members can work without stepping on each other's state.
- **State locking**: Prevents concurrent applies that could corrupt state.
- **Backup**: Cloud storage provides durability and versioning.
- **CI/CD integration**: Pipelines can access state without local file management.

## Step 1: Create the S3 Bucket and DynamoDB Table

First, provision the backend resources manually or via a bootstrap OpenTofu config:

```hcl
# bootstrap/main.tf

resource "aws_s3_bucket" "tfstate" {
  bucket = "mycompany-opentofu-state"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "tfstate_lock" {
  name         = "opentofu-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

Apply this manually before migrating:

```bash
cd bootstrap/
tofu init
tofu apply
```

## Step 2: Configure the Remote Backend

Add the backend configuration to your existing project:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "mycompany-opentofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "opentofu-state-locks"
  }
}
```

## Step 3: Migrate the State

Run `tofu init` to detect the new backend and trigger migration:

```bash
tofu init -migrate-state
```

OpenTofu will prompt:

```text
Do you want to copy existing state to the new backend?

  Pre-existing state was found while migrating the previous "local" backend
  to the newly configured "s3" backend. No existing state was found in the
  newly configured "s3" backend. Do you want to copy this state to the new
  "s3" backend? Enter "yes" to copy and "no" to start with an empty state.

  Enter a value: yes
```

Type `yes` to proceed. OpenTofu copies the local state to S3.

## Step 4: Verify the Migration

Confirm the state exists in S3:

```bash
aws s3 ls s3://mycompany-opentofu-state/production/
```

Run a plan to verify no unexpected changes:

```bash
tofu plan
```

The plan should show no changes if the migration was successful.

## Step 5: Remove the Local State File

Once confirmed, remove or archive the local state file:

```bash
mv terraform.tfstate terraform.tfstate.backup
mv terraform.tfstate.backup /secure-backup-location/
```

Do not commit the local state file to version control.

## Organizing State with Multiple Keys

For multiple environments or components, use distinct state keys:

```hcl
# production/networking/backend.tf
terraform {
  backend "s3" {
    bucket = "mycompany-opentofu-state"
    key    = "production/networking/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "opentofu-state-locks"
  }
}

# production/compute/backend.tf
terraform {
  backend "s3" {
    bucket = "mycompany-opentofu-state"
    key    = "production/compute/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "opentofu-state-locks"
  }
}
```

## Using the Cloud Backend Integration

OpenTofu also supports the `cloud` block, which connects to TACOS (Terraform Automation and Collaboration Software) that implement the cloud backend protocol - including HCP Terraform (formerly Terraform Cloud) and Scalr:

```hcl
terraform {
  cloud {
    organization = "mycompany"

    workspaces {
      name = "production"
    }
  }
}
```

Other platforms manage state differently: Spacelift injects its own backend configuration into runs automatically, and env0 auto-configures its remote backend when stacks are deployed through env0 - neither requires a `cloud` block in your configuration.

## Best Practices

- Always back up local state before migrating.
- Enable S3 bucket versioning for state history and rollback.
- Use a separate S3 bucket per AWS account/environment.
- Restrict S3 and DynamoDB access with IAM policies scoped to CI/CD roles and team members.
- Never store state files in version control.

## Conclusion

Migrating from a local to a remote backend is a critical step in operationalizing OpenTofu for team use. The migration is safe and straightforward - OpenTofu handles state copying automatically, and the result is a collaborative, locking-enabled workflow ready for production use.
