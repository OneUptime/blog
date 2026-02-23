# How to Use CDKTF Remote Backends

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Remote Backend, State Management, Infrastructure as Code

Description: Learn how to configure remote backends in CDKTF for secure, shared state management using S3, Azure Blob Storage, GCS, and HCP Terraform.

---

When you start working with CDKTF, state is stored locally by default. That works fine for learning and personal projects, but the moment you have a team or a CI/CD pipeline, you need a remote backend. Remote backends store your Terraform state in a shared location, enable state locking to prevent concurrent modifications, and keep your state files secure. This guide covers how to configure the most common remote backends in CDKTF.

## Why Remote Backends Matter

Terraform state contains the mapping between your configuration and the real infrastructure. Lose the state file and Terraform loses track of what it manages. Store it only on your laptop and your teammates cannot deploy. Let two people modify it at the same time and you get corrupted state.

Remote backends solve all three problems:
- State is stored durably in cloud storage
- State locking prevents concurrent modifications
- The state is accessible to anyone with the right credentials

## The Default: Local Backend

By default, CDKTF uses the local backend, which stores state in the `cdktf.out` directory:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // Local backend is implicit - state goes to cdktf.out/
  }
}
```

This is fine for getting started but not suitable for production.

## S3 Backend (AWS)

The S3 backend is the most popular choice for AWS users. It stores state in an S3 bucket and uses DynamoDB for state locking.

First, create the backend infrastructure (you only need to do this once):

```bash
# Create the S3 bucket for state storage
aws s3api create-bucket \
  --bucket my-terraform-state-bucket \
  --region us-east-1

# Enable versioning on the bucket
aws s3api put-bucket-versioning \
  --bucket my-terraform-state-bucket \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket my-terraform-state-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]
  }'

# Create the DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Then configure the backend in your CDKTF stack:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the S3 backend
    new S3Backend(this, {
      bucket: "my-terraform-state-bucket",
      key: "production/terraform.tfstate",
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-state-lock",
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Define resources here
  }
}
```

### S3 Backend with Assume Role

If your state bucket is in a different account:

```typescript
new S3Backend(this, {
  bucket: "central-state-bucket",
  key: "team-a/production/terraform.tfstate",
  region: "us-east-1",
  encrypt: true,
  dynamodbTable: "terraform-state-lock",
  roleArn: "arn:aws:iam::111111111111:role/TerraformStateAccess",
});
```

## Azure Storage Backend

For Azure users, state is stored in Azure Blob Storage:

```bash
# Create a resource group for state storage
az group create --name terraform-state-rg --location eastus

# Create a storage account
az storage account create \
  --name tfstateaccount \
  --resource-group terraform-state-rg \
  --location eastus \
  --sku Standard_GRS \
  --encryption-services blob

# Create a container for state files
az storage container create \
  --name tfstate \
  --account-name tfstateaccount
```

Configure the backend in CDKTF:

```typescript
import { AzurermBackend } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the Azure backend
    new AzurermBackend(this, {
      resourceGroupName: "terraform-state-rg",
      storageAccountName: "tfstateaccount",
      containerName: "tfstate",
      key: "production.terraform.tfstate",
    });

    new AzurermProvider(this, "azurerm", {
      features: [{}],
    });
  }
}
```

## GCS Backend (Google Cloud)

For GCP users, state goes into a Google Cloud Storage bucket:

```bash
# Create a GCS bucket for state
gsutil mb -p your-project-id -l us-central1 gs://my-terraform-state-bucket

# Enable versioning
gsutil versioning set on gs://my-terraform-state-bucket
```

Configure in CDKTF:

```typescript
import { GcsBackend } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the GCS backend
    new GcsBackend(this, {
      bucket: "my-terraform-state-bucket",
      prefix: "production",
    });

    new GoogleProvider(this, "google", {
      project: "your-project-id",
      region: "us-central1",
    });
  }
}
```

## HCP Terraform Backend

HCP Terraform (formerly Terraform Cloud) provides a managed backend with built-in state management, locking, and a web UI:

```typescript
import { CloudBackend, NamedCloudWorkspace } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the HCP Terraform backend
    new CloudBackend(this, {
      hostname: "app.terraform.io",
      organization: "my-organization",
      workspaces: new NamedCloudWorkspace("production"),
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });
  }
}
```

## Backend Per Stack

When using multiple stacks, each stack should have its own state file path:

```typescript
class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "my-terraform-state",
      key: "network/terraform.tfstate",
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-state-lock",
    });

    // Network resources
  }
}

class ApplicationStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "my-terraform-state",
      key: "application/terraform.tfstate",
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-state-lock",
    });

    // Application resources
  }
}
```

## Creating a Backend Configuration Helper

To avoid repeating backend configuration, create a helper function:

```typescript
// Helper function to configure S3 backend consistently
function configureBackend(stack: TerraformStack, stateKey: string): void {
  new S3Backend(stack, {
    bucket: "my-terraform-state",
    key: `${stateKey}/terraform.tfstate`,
    region: "us-east-1",
    encrypt: true,
    dynamodbTable: "terraform-state-lock",
  });
}

class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    configureBackend(this, "network");
    // Resources
  }
}

class AppStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    configureBackend(this, "application");
    // Resources
  }
}
```

## Migrating from Local to Remote Backend

When you move from local to remote state, you need to migrate:

```bash
# First, synth with the new backend configuration
cdktf synth

# Navigate to the stack output directory
cd cdktf.out/stacks/my-stack

# Initialize Terraform with migration flag
terraform init -migrate-state

# Verify the state was migrated
terraform state list
```

## Best Practices

1. **Always use remote backends for shared infrastructure**. Local state is only appropriate for learning and experiments.

2. **Enable state locking**. Without locking, two people could modify the state at the same time, causing corruption.

3. **Enable encryption**. State files often contain sensitive data like database passwords and API keys.

4. **Enable versioning**. If state gets corrupted, versioning lets you roll back to a previous version.

5. **Use separate state files per stack**. This keeps state files small and reduces the blast radius of mistakes.

6. **Restrict access to state storage**. Use IAM policies to limit who can read and write state files.

Remote backends are a critical piece of any production CDKTF setup. Get them configured early and you will avoid a lot of pain later. For more on state management strategies, see our post on [CDKTF state management](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cdktf-state-management/view).
