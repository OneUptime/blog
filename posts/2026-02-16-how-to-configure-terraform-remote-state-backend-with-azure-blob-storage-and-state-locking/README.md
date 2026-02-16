# How to Configure Terraform Remote State Backend with Azure Blob Storage and State Locking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Remote State, Blob Storage, State Locking, Infrastructure as Code, DevOps

Description: Learn how to configure Terraform remote state backend with Azure Blob Storage and state locking to safely manage infrastructure state across teams.

---

If you have ever worked on a Terraform project with more than one person, you already know the pain of state file conflicts. Someone runs `terraform apply` on their laptop while you are doing the same thing, and suddenly your infrastructure is in an unpredictable mess. Remote state with locking solves this problem entirely, and Azure Blob Storage is a solid backend for it.

In this guide, I will walk through every step of setting up a remote state backend on Azure Blob Storage with state locking enabled via Azure Storage lease mechanisms. This is a pattern I have used on dozens of production projects, and it is one of the first things I configure on any new Azure Terraform engagement.

## Why Remote State Matters

Terraform stores the mapping between your configuration and real-world resources in a state file. By default, this file lives locally as `terraform.tfstate`. That works fine when you are the only person touching the infrastructure, but it falls apart quickly in a team setting.

Remote state gives you three key benefits. First, it provides a single source of truth for your infrastructure state. Second, it enables collaboration because everyone reads from and writes to the same location. Third, with locking enabled, it prevents concurrent modifications that could corrupt the state.

Azure Blob Storage is a natural fit here because it supports lease-based locking natively, it is inexpensive, and it integrates seamlessly with Azure AD authentication.

## Prerequisites

Before you start, make sure you have the following:

- An Azure subscription with permissions to create storage accounts
- Terraform 1.0 or later installed
- Azure CLI installed and authenticated (`az login`)

## Step 1: Create the Azure Storage Account

You need a storage account and a blob container to hold your state file. I recommend creating these outside of Terraform itself - you do not want the backend infrastructure managed by the same state file it hosts. That creates a chicken-and-egg problem.

Here is a script to create the resources using the Azure CLI:

```bash
# Set variables for the storage account
RESOURCE_GROUP_NAME="rg-terraform-state"
STORAGE_ACCOUNT_NAME="tfstate$(openssl rand -hex 4)"
CONTAINER_NAME="tfstate"
LOCATION="eastus2"

# Create the resource group
az group create \
  --name $RESOURCE_GROUP_NAME \
  --location $LOCATION

# Create the storage account with encryption and HTTPS-only
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Create the blob container for state files
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME \
  --auth-mode login
```

A few things to note here. I am using `Standard_LRS` because state files are small and do not need geo-redundancy - though if you want extra safety, `Standard_GRS` works too. I am also disabling public blob access and enforcing TLS 1.2 because state files can contain sensitive information like passwords and connection strings.

## Step 2: Configure the Terraform Backend

Now configure Terraform to use this storage account as its backend. Add the backend block to your `main.tf` or a dedicated `backend.tf` file:

```hcl
# backend.tf - Configure Azure Blob Storage as the remote state backend
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstateabc12345"  # Replace with your actual storage account name
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"  # Path within the container
  }
}
```

The `key` parameter defines the path to the state file within the container. I use a convention like `{environment}/terraform.tfstate` or `{project}/{environment}/terraform.tfstate` to keep things organized when you have multiple state files in the same container.

## Step 3: Authentication Options

There are several ways to authenticate the backend to Azure. The right choice depends on your environment.

**Using Azure CLI credentials (for local development):**

If you are already logged in with `az login`, Terraform will pick up those credentials automatically. No additional configuration needed.

**Using a Service Principal (for CI/CD):**

For automated pipelines, set these environment variables:

```bash
# Export service principal credentials for Terraform backend authentication
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
```

**Using Managed Identity (for Azure-hosted runners):**

If your CI/CD agent runs on an Azure VM or in Azure Container Instances, you can use managed identity:

```hcl
# backend.tf - Using managed identity for authentication
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstateabc12345"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"
    use_msi              = true  # Enable managed identity authentication
    subscription_id      = "your-subscription-id"
    tenant_id            = "your-tenant-id"
  }
}
```

I strongly prefer managed identity when running in Azure. It eliminates secrets from your pipeline configuration entirely.

## Step 4: Understanding State Locking

State locking is the real hero here. When Terraform acquires a lock, it creates a lease on the blob in Azure Storage. This lease prevents any other Terraform process from writing to the same state file simultaneously.

You do not need to configure anything special to enable locking - it is on by default with the `azurerm` backend. When Terraform runs an operation that modifies state (plan with `-out`, apply, destroy), it acquires a lease on the blob. If another process tries to acquire the same lease, it gets an error telling it to wait.

You can verify that locking works by opening two terminals and running `terraform plan` simultaneously against the same state. The second one will fail with a lock error.

If you ever need to manually break a stuck lock (for example, if a pipeline crashed mid-apply), use:

```bash
# Force unlock a stuck state - use with caution
terraform force-unlock LOCK_ID
```

Only do this if you are certain no other process is actively modifying the state.

## Step 5: Initialize the Backend

With everything in place, initialize Terraform to migrate your state:

```bash
# Initialize Terraform with the new backend configuration
terraform init
```

If you already have a local state file, Terraform will ask if you want to migrate it to the remote backend. Say yes.

If you are starting fresh, this will simply create an empty state file in the blob container.

## Step 6: Add Versioning for Safety

One more thing I always recommend - enable blob versioning on the storage account. This gives you a history of your state file so you can recover from accidental corruption:

```bash
# Enable blob versioning for state file history and recovery
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --enable-versioning true
```

You might also want to add a lifecycle rule to clean up old versions after a certain period:

```bash
# Create a lifecycle policy to delete old state versions after 90 days
az storage account management-policy create \
  --account-name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --policy '{
    "rules": [
      {
        "name": "cleanup-old-versions",
        "type": "Lifecycle",
        "definition": {
          "actions": {
            "version": {
              "delete": {
                "daysAfterCreationGreaterThan": 90
              }
            }
          },
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["tfstate/"]
          }
        }
      }
    ]
  }'
```

## Partial Backend Configuration

In real-world projects, you often do not want to hardcode the storage account name in your Terraform files. Instead, use partial configuration and pass the values at init time:

```hcl
# backend.tf - Partial configuration, values provided at init time
terraform {
  backend "azurerm" {
    key = "prod/terraform.tfstate"
  }
}
```

Then at init time:

```bash
# Initialize with backend values passed as arguments
terraform init \
  -backend-config="resource_group_name=rg-terraform-state" \
  -backend-config="storage_account_name=tfstateabc12345" \
  -backend-config="container_name=tfstate"
```

This is particularly useful when you use the same Terraform code across multiple environments or subscriptions.

## Security Considerations

State files can contain sensitive data. Here are a few things to lock down:

- Enable encryption at rest (on by default with Azure Storage)
- Restrict network access using storage account firewall rules or private endpoints
- Use Azure RBAC instead of storage account keys when possible
- Enable diagnostic logging to track who accessed the state file
- Never commit the `.terraform` directory to version control

## Common Pitfalls

I have seen teams hit a few recurring issues with remote state on Azure:

**Forgetting to initialize after changing backend config.** If you change any backend parameter, you need to run `terraform init -reconfigure`. Otherwise Terraform uses the cached backend settings.

**Using the same state file for everything.** Split your state by logical boundaries - networking, compute, databases. This reduces blast radius and speeds up plan/apply cycles.

**Not restricting who can access the storage account.** Treat the state storage account like a production database. Limit access, audit it, and back it up.

## Wrapping Up

Setting up remote state with Azure Blob Storage is straightforward but incredibly important. It is one of those foundational pieces that saves you from real pain down the road. The combination of centralized state, automatic locking, and blob versioning gives you a reliable foundation for team-based infrastructure management on Azure.

Get this right early in your project, and you will avoid the kind of state corruption incidents that make engineers lose sleep.
