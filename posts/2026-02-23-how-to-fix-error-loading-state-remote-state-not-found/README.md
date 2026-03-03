# How to Fix Error Loading State Remote State Not Found

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, State Management, Remote State, DevOps

Description: How to diagnose and fix the Error Loading State Remote State Not Found error in Terraform when your state file is missing or inaccessible.

---

You run `terraform plan` and get:

```text
Error: Failed to load state: Remote state not found

No state was found for the given workspace.
```

Or a similar variant:

```text
Error loading state: BlobNotFound
Error loading state: NoSuchKey: The specified key does not exist.
Error loading state: state not found
```

All of these mean the same thing: Terraform is trying to read your state file from the remote backend, and it is not there. This can happen for several reasons, and the fix depends on which one applies to your situation.

## Why This Happens

There are a few common scenarios:

1. **The state file was never created** - You configured a backend but never ran `terraform apply` to create the initial state.
2. **The state file was deleted** - Someone deleted the state file from S3, Azure Blob Storage, GCS, or wherever it is stored.
3. **Wrong backend configuration** - You are pointing to the wrong bucket, key, container, or path.
4. **Wrong workspace** - You are in a workspace that does not have a corresponding state file.
5. **Permission issues** - Your credentials cannot read the state file location.
6. **State was migrated** - The state was moved to a new location but your configuration was not updated.

## Step 1: Verify Your Backend Configuration

First, check that your backend configuration is correct:

```hcl
# Check the backend block in your configuration
terraform {
  backend "s3" {
    bucket = "my-terraform-state"       # Is this the right bucket?
    key    = "prod/terraform.tfstate"   # Is this the right key?
    region = "us-east-1"               # Is this the right region?
  }
}
```

Common mistakes:

```hcl
# Typo in bucket name
bucket = "my-terrafom-state"  # Missing an 'r'

# Wrong environment path
key = "staging/terraform.tfstate"  # Should be "prod/terraform.tfstate"

# Wrong region
region = "us-west-2"  # State is actually in us-east-1
```

Verify the state file exists at the expected location:

```bash
# For S3
aws s3 ls s3://my-terraform-state/prod/terraform.tfstate

# For Azure Blob Storage
az storage blob list \
  --account-name tfstateaccount \
  --container-name tfstate \
  --prefix prod

# For GCS
gsutil ls gs://my-terraform-state/prod/terraform.tfstate

# For Terraform Cloud
# Check the workspace in the Terraform Cloud UI
```

## Step 2: Check the Workspace

If you are using workspaces, make sure you are in the right one:

```bash
# Check current workspace
terraform workspace list

# The active workspace is marked with an asterisk
#   default
# * prod
#   staging

# If you are in the wrong workspace, switch
terraform workspace select prod
```

For S3 backends with workspace support, the state file path includes the workspace name:

```text
s3://my-terraform-state/env:/prod/terraform.tfstate
```

Make sure the state file exists for your current workspace.

## Step 3: Check Permissions

The state file might exist, but your credentials might not have read access:

```bash
# Verify your AWS identity
aws sts get-caller-identity

# Try to read the state file directly
aws s3 cp s3://my-terraform-state/prod/terraform.tfstate /tmp/test-state.json

# Check the bucket policy
aws s3api get-bucket-policy --bucket my-terraform-state
```

For Azure:

```bash
# Check your current identity
az account show

# Try to download the blob
az storage blob download \
  --account-name tfstateaccount \
  --container-name tfstate \
  --name prod.terraform.tfstate \
  --file /tmp/test-state.json
```

## Step 4: Recover from a Deleted State File

If the state file was genuinely deleted, you have a few recovery options:

### Option A: Restore from Versioned Storage

If your state bucket has versioning enabled (which it should), you can restore a previous version:

```bash
# List versions of the state file
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/terraform.tfstate

# Restore a specific version
aws s3api copy-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --copy-source "my-terraform-state/prod/terraform.tfstate?versionId=VERSION_ID"
```

For Azure with soft delete:

```bash
# List deleted blobs
az storage blob list \
  --account-name tfstateaccount \
  --container-name tfstate \
  --include d  # Include deleted blobs

# Undelete the blob
az storage blob undelete \
  --account-name tfstateaccount \
  --container-name tfstate \
  --name prod.terraform.tfstate
```

### Option B: Use a Local Backup

If you have a local backup of the state file (from a previous `terraform state pull`):

```bash
# Push the backup to the remote backend
terraform state push /path/to/terraform.tfstate.backup
```

### Option C: Reconstruct State with terraform import

If you have no backup and no versioned storage, you need to import your existing resources into a fresh state. This is the most time-consuming option:

```bash
# Start with a fresh init
terraform init

# Import each resource one by one
terraform import aws_vpc.main vpc-0123456789abcdef0
terraform import aws_subnet.private[0] subnet-0123456789abcdef0
terraform import aws_instance.web i-0123456789abcdef0
# ... and so on for every resource
```

To help identify what needs to be imported, check your cloud provider:

```bash
# List resources by tag (if you tagged them)
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=ManagedBy,Values=Terraform

# Or list specific resource types
aws ec2 describe-vpcs --filters "Name=tag:Environment,Values=prod"
aws ec2 describe-instances --filters "Name=tag:Environment,Values=prod"
```

## Step 5: Handle the "First Run" Case

If this is genuinely the first time running Terraform against this backend (no state exists yet), the error might be misleading. Some backends report "state not found" differently:

```bash
# For a brand new project, just run init and apply
terraform init

# The first apply creates the state file
terraform apply
```

If you see the "state not found" error on a fresh project, it usually means the backend configuration is wrong (bucket does not exist, wrong region, etc.) rather than that the state is actually missing.

## Step 6: Fix Remote State Data Source Issues

The error can also come from a `terraform_remote_state` data source:

```hcl
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}
```

If the referenced state file does not exist, you get a "remote state not found" error.

**Fix**: Either create the referenced state first, or make the remote state reference optional:

```hcl
# Make the data source optional with defaults
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "my-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }

  defaults = {
    vpc_id             = ""
    private_subnet_ids = []
  }
}

# Use the values with fallbacks
locals {
  vpc_id = (
    data.terraform_remote_state.networking.outputs.vpc_id != "" ?
    data.terraform_remote_state.networking.outputs.vpc_id :
    var.fallback_vpc_id
  )
}
```

## Preventing State Loss

To avoid this situation in the future:

1. **Enable versioning on your state bucket**:

```bash
aws s3api put-bucket-versioning \
  --bucket my-terraform-state \
  --versioning-configuration Status=Enabled
```

2. **Set up deletion protection**:

```hcl
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"

  # Prevent accidental deletion
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

3. **Monitor your state backend** with a tool like [OneUptime](https://oneuptime.com) to get alerts if the state file is deleted or becomes inaccessible.

4. **Take regular backups**:

```bash
# Cron job to back up state files
terraform state pull > "backup/terraform-$(date +%Y%m%d-%H%M%S).tfstate"
```

The "remote state not found" error is scary because losing state means losing Terraform's knowledge of your infrastructure. But in most cases, it is either a configuration issue (wrong path, wrong permissions) or a recoverable deletion (versioned storage). Check the simple things first before assuming the worst.
