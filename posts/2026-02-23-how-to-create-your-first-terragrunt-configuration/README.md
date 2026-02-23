# How to Create Your First Terragrunt Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Tutorial, Getting Started

Description: Step-by-step guide to creating your first Terragrunt configuration from scratch including installation, project structure, and a working example.

---

Getting started with Terragrunt can feel overwhelming if you have only worked with plain Terraform before. But the initial setup is actually quite simple. This guide walks you through creating your first Terragrunt configuration from scratch, with a working example you can run on AWS.

## Prerequisites

Before you begin, make sure you have:

- Terraform installed (version 1.0 or later)
- An AWS account with credentials configured
- Basic familiarity with Terraform concepts (providers, resources, modules)

## Installing Terragrunt

Terragrunt is a standalone binary. Install it based on your operating system.

On macOS using Homebrew:

```bash
# Install Terragrunt via Homebrew
brew install terragrunt
```

On Linux:

```bash
# Download the latest release for Linux
curl -L -o terragrunt https://github.com/gruntwork-io/terragrunt/releases/latest/download/terragrunt_linux_amd64

# Make it executable
chmod +x terragrunt

# Move it to your PATH
sudo mv terragrunt /usr/local/bin/
```

Verify the installation:

```bash
# Check that both tools are available
terraform --version
terragrunt --version
```

## Project Structure

A typical Terragrunt project separates reusable Terraform modules from environment-specific configurations. Here is the structure we will build:

```
my-project/
  modules/
    s3-bucket/
      main.tf
      variables.tf
      outputs.tf
  live/
    terragrunt.hcl          # root configuration
    dev/
      s3-bucket/
        terragrunt.hcl      # environment-specific config
    prod/
      s3-bucket/
        terragrunt.hcl
```

The `modules/` directory contains reusable Terraform code. The `live/` directory contains Terragrunt configurations that call those modules with environment-specific values.

## Step 1: Create the Terraform Module

First, write a simple Terraform module that creates an S3 bucket.

```hcl
# modules/s3-bucket/main.tf

# Configure the AWS provider
provider "aws" {
  region = var.aws_region
}

# Create the S3 bucket
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Enable versioning on the bucket
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}
```

```hcl
# modules/s3-bucket/variables.tf

variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region to create resources in"
  type        = string
  default     = "us-east-1"
}

variable "enable_versioning" {
  description = "Whether to enable bucket versioning"
  type        = bool
  default     = false
}
```

```hcl
# modules/s3-bucket/outputs.tf

output "bucket_arn" {
  description = "ARN of the created S3 bucket"
  value       = aws_s3_bucket.this.arn
}

output "bucket_name" {
  description = "Name of the created S3 bucket"
  value       = aws_s3_bucket.this.id
}
```

This is a standard Terraform module. Nothing Terragrunt-specific here.

## Step 2: Create the Root Terragrunt Configuration

The root `terragrunt.hcl` file defines settings shared across all environments. This is where Terragrunt starts adding value.

```hcl
# live/terragrunt.hcl

# Configure remote state storage
# Every child module inherits this configuration
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-project-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

# Generate a provider configuration for all child modules
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "us-east-1"
}
EOF
}
```

Let me explain what this does:

- **remote_state**: Configures where Terraform state is stored. The `path_relative_to_include()` function automatically generates a unique state key based on the child module's directory path. So `dev/s3-bucket` gets the key `dev/s3-bucket/terraform.tfstate`.
- **generate**: Creates a `provider.tf` file in each child module's working directory so you do not need to define providers in every module.

## Step 3: Create Environment Configurations

Now create the Terragrunt configuration for the dev environment:

```hcl
# live/dev/s3-bucket/terragrunt.hcl

# Include the root terragrunt.hcl configuration
include "root" {
  path = find_in_parent_folders()
}

# Point to the Terraform module source
terraform {
  source = "../../../modules/s3-bucket"
}

# Pass input variables to the Terraform module
inputs = {
  bucket_name       = "my-project-dev-data"
  environment       = "dev"
  aws_region        = "us-east-1"
  enable_versioning = false
}
```

And the production configuration:

```hcl
# live/prod/s3-bucket/terragrunt.hcl

# Include the root terragrunt.hcl configuration
include "root" {
  path = find_in_parent_folders()
}

# Point to the same Terraform module
terraform {
  source = "../../../modules/s3-bucket"
}

# Production gets different values
inputs = {
  bucket_name       = "my-project-prod-data"
  environment       = "prod"
  aws_region        = "us-east-1"
  enable_versioning = true  # versioning enabled in production
}
```

Notice how both environments point to the same Terraform module but pass different input values. The backend configuration is inherited from the root - no duplication.

## Step 4: Run Terragrunt

Navigate to a specific environment directory and run Terragrunt commands. Terragrunt commands mirror Terraform commands:

```bash
# Change to the dev s3-bucket directory
cd live/dev/s3-bucket

# Initialize and review the plan
terragrunt init
terragrunt plan
```

You should see output similar to Terraform's plan output, showing that an S3 bucket will be created. The state will be stored in the S3 backend automatically.

```bash
# Apply the configuration
terragrunt apply
```

Terragrunt downloads the Terraform module, generates the backend and provider files, and then runs `terraform apply` under the hood.

## Step 5: Verify What Happened

After running `terragrunt apply`, look at the working directory. Terragrunt creates a `.terragrunt-cache` directory where it copies the Terraform module and generates files:

```bash
# See the generated files
ls .terragrunt-cache/*/

# You will find:
# - backend.tf    (generated by remote_state block)
# - provider.tf   (generated by generate block)
# - main.tf       (copied from the module)
# - variables.tf  (copied from the module)
# - outputs.tf    (copied from the module)
```

The `.terragrunt-cache` directory should be added to your `.gitignore`:

```
# .gitignore
.terragrunt-cache
.terraform
*.tfstate
*.tfstate.backup
```

## Understanding the Workflow

Here is what happens when you run `terragrunt apply`:

1. Terragrunt reads `terragrunt.hcl` in the current directory
2. It finds the `include` block and reads the root `terragrunt.hcl`
3. It copies the Terraform module source into `.terragrunt-cache`
4. It generates `backend.tf` and `provider.tf` in the cache directory
5. It runs `terraform init` to initialize the backend
6. It passes the `inputs` as Terraform variables
7. It runs `terraform apply`

You get all the benefits of Terraform with automatic state management and configuration inheritance.

## Adding a Second Module

To see the real power, add a second module. Say you want a DynamoDB table in each environment:

```hcl
# modules/dynamodb/main.tf

resource "aws_dynamodb_table" "this" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

```hcl
# live/dev/dynamodb/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/dynamodb"
}

inputs = {
  table_name  = "my-project-dev-table"
  environment = "dev"
}
```

Now you can apply all modules in the dev environment at once:

```bash
# From the live/dev directory, apply everything
cd live/dev
terragrunt run-all apply
```

Terragrunt finds all `terragrunt.hcl` files in child directories and applies them, respecting any dependency ordering you define.

## Common First-Time Issues

**State bucket does not exist**: Terragrunt can auto-create the S3 bucket and DynamoDB table for state. Add this to your root configuration:

```hcl
# live/terragrunt.hcl - add this to remote_state
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-project-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"

    # Terragrunt will create these if they do not exist
    skip_bucket_creation = false
  }
}
```

**Provider conflicts**: If your Terraform module already defines a provider, the generated `provider.tf` will conflict. Either remove the provider from your module or do not use the `generate` block for providers.

**Path issues**: The `source` path in the `terraform` block is relative to the `terragrunt.hcl` file, not the project root. Double-check your relative paths.

## Next Steps

From here, you can explore more Terragrunt features:

- Use the [dependency block](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-dependency-block-in-terragrunt/view) to pass outputs between modules
- Learn about [Terragrunt functions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-functions/view) for dynamic configurations
- Set up [multi-environment project organization](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-terragrunt-for-multi-environment-projects/view)

You now have a working Terragrunt setup. The key insight is that Terragrunt does not replace Terraform - it provides a better way to organize and run your existing Terraform modules across multiple environments.
