# How to Migrate Terraform State Between Accounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Account Migration, Cloud Accounts, Infrastructure as Code

Description: Learn how to migrate Terraform state files between cloud accounts including cross-account S3, Azure subscriptions, and GCP project transitions.

---

Organizations often need to move Terraform state between cloud accounts during mergers, reorganizations, or when splitting monolithic accounts into purpose-specific ones. This migration involves moving both the state file and updating resource references to point to the correct account. This guide covers how to handle state migration across AWS accounts, Azure subscriptions, and GCP projects.

## When State Account Migration Is Needed

Common scenarios include splitting a shared AWS account into separate production and development accounts, moving infrastructure between Azure subscriptions during a reorganization, migrating GCP projects to a different billing account, or consolidating multiple accounts into a shared services model.

## Migrating State Between AWS Accounts

### Step 1: Pull State from the Source Account

```bash
# Authenticate to the source AWS account
export AWS_PROFILE=source-account

# Pull the current state
terraform state pull > state-backup.json

# Verify the state file
cat state-backup.json | jq '.version, .serial, (.resources | length)'
```

### Step 2: Set Up the Backend in the Destination Account

Create the state storage in the destination account first:

```bash
# Switch to destination account
export AWS_PROFILE=destination-account

# Create S3 bucket for state
aws s3api create-bucket \
  --bucket terraform-state-new-account \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket terraform-state-new-account \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Step 3: Update Backend Configuration

```hcl
# Update the backend to point to the new account's S3 bucket
terraform {
  backend "s3" {
    bucket         = "terraform-state-new-account"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
    # If using cross-account access
    role_arn       = "arn:aws:iam::DESTINATION_ACCOUNT_ID:role/TerraformStateAccess"
  }
}
```

### Step 4: Migrate the State

```bash
# Option A: Use terraform init migration
export AWS_PROFILE=destination-account
terraform init -migrate-state

# Option B: Manual push
terraform init -reconfigure
terraform state push state-backup.json

# Verify
terraform state list
terraform plan
```

## Migrating State Between Azure Subscriptions

### Step 1: Set Up Storage in the New Subscription

```bash
# Switch to the new subscription
az account set --subscription "new-subscription-id"

# Create resource group for state storage
az group create --name terraform-state-rg --location eastus

# Create storage account
az storage account create \
  --name tfstatenewsub \
  --resource-group terraform-state-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name tfstatenewsub
```

### Step 2: Pull and Push State

```bash
# Pull state from old subscription
az account set --subscription "old-subscription-id"
terraform state pull > state-backup.json

# Update backend configuration
# Change the storage account and subscription details

# Switch to new subscription and push
az account set --subscription "new-subscription-id"
terraform init -reconfigure
terraform state push state-backup.json
```

### Step 3: Update Provider Configuration

If resources are also moving subscriptions:

```hcl
provider "azurerm" {
  features {}
  subscription_id = "new-subscription-id"
}
```

## Migrating State Between GCP Projects

### Step 1: Set Up State Bucket in New Project

```bash
# Create state bucket in the new project
gsutil mb -p new-project-id -l us-central1 gs://terraform-state-new-project

# Enable versioning
gsutil versioning set on gs://terraform-state-new-project
```

### Step 2: Migrate State

```bash
# Pull state from old project
terraform state pull > state-backup.json

# Update backend configuration
# backend "gcs" {
#   bucket = "terraform-state-new-project"
#   prefix = "prod"
# }

# Push state to new project
terraform init -reconfigure
terraform state push state-backup.json

# Verify
terraform plan
```

## Handling Resources That Move Between Accounts

When resources themselves are moving between accounts (not just the state file), you need additional steps:

### Updating Resource References

```bash
# If resources have moved to a new AWS account
# Update the provider configuration
```

```hcl
provider "aws" {
  region = "us-east-1"
  # Assume role in the new account
  assume_role {
    role_arn = "arn:aws:iam::NEW_ACCOUNT_ID:role/TerraformRole"
  }
}
```

### Removing and Re-importing Resources

If resources cannot be moved and must be recreated:

```bash
# Remove old resources from state
terraform state rm aws_instance.web

# Import the new resources
terraform import aws_instance.web i-new-instance-id
```

## Cross-Account State Access

Sometimes you need Terraform in one account to access state from another:

```hcl
# Cross-account backend access using assume_role
terraform {
  backend "s3" {
    bucket   = "terraform-state"
    key      = "prod/terraform.tfstate"
    region   = "us-east-1"
    role_arn = "arn:aws:iam::STATE_ACCOUNT_ID:role/TerraformStateAccess"
  }
}

# Cross-account remote state data source
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket   = "terraform-state"
    key      = "network/terraform.tfstate"
    region   = "us-east-1"
    role_arn = "arn:aws:iam::NETWORK_ACCOUNT_ID:role/TerraformStateReader"
  }
}
```

Set up the IAM role for cross-account access:

```hcl
# In the state account - create a role for cross-account access
resource "aws_iam_role" "terraform_state_access" {
  name = "TerraformStateAccess"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        AWS = "arn:aws:iam::TERRAFORM_ACCOUNT_ID:root"
      }
    }]
  })
}

resource "aws_iam_role_policy" "terraform_state_access" {
  name = "TerraformStateAccess"
  role = aws_iam_role.terraform_state_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::terraform-state",
          "arn:aws:s3:::terraform-state/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:us-east-1:STATE_ACCOUNT_ID:table/terraform-locks"
      }
    ]
  })
}
```

## Verification Checklist

After migrating state between accounts:

```bash
# 1. Verify state is accessible from the new backend
terraform state list

# 2. Verify plan shows no changes
terraform plan

# 3. Verify state locking works
terraform plan  # Acquires and releases lock

# 4. Verify state pull/push works
terraform state pull | jq '.version'

# 5. Test a non-destructive change
# Add a tag to a resource, plan, and apply
```

## Best Practices

Always back up state before any account migration. Test the migration in a development environment first. Set up the destination backend before starting the migration. Use cross-account IAM roles instead of sharing credentials. Verify with terraform plan after every migration step. Keep the old state as a backup until the migration is fully verified. Update CI/CD pipeline configurations to use the new account credentials and backend.

## Conclusion

Migrating Terraform state between accounts is a combination of backend migration and credential management. The core state migration uses the same pull/push or init migration workflow regardless of the cloud provider. The additional complexity comes from setting up proper cross-account access and updating provider configurations. Take a careful, step-by-step approach, and verify at each stage to ensure a successful migration.

For related topics, see [How to Migrate Terraform State Between Backends](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-terraform-state-between-backends/view) and [How to Handle Cross-Team Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cross-team-terraform-migrations/view).
