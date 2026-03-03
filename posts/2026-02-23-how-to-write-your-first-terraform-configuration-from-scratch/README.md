# How to Write Your First Terraform Configuration from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Getting Started, Tutorial, Infrastructure as Code, AWS, DevOps

Description: A beginner-friendly guide to writing your first Terraform configuration file from scratch including providers, resources, variables, and outputs.

---

If you have Terraform installed and want to write your first real configuration, this post is for you. We will start from an empty directory and build up a working Terraform configuration that creates actual cloud resources. By the end, you will understand the structure of a Terraform project, how the key building blocks work, and how to go from code to infrastructure.

I will use AWS for the examples since it is the most widely used cloud provider with Terraform, but the concepts apply to any provider.

## Project Setup

Create a new directory for your Terraform project:

```bash
# Create a project directory
mkdir my-first-terraform && cd my-first-terraform
```

Terraform configurations are plain text files with the `.tf` extension. You can put everything in a single file, but it is better to organize from the start.

## Step 1 - Define the Terraform Block

Create a file called `main.tf`. This is where the core configuration lives:

```hcl
# main.tf

# The terraform block configures Terraform itself
terraform {
  # Specify the minimum Terraform version required
  required_version = ">= 1.0"

  # Declare the providers this configuration uses
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

The `terraform` block does two things:

1. Sets the minimum Terraform version with `required_version`
2. Declares which providers you need and where to find them

The `~> 5.0` version constraint means "any 5.x version". This gives you patch updates without unexpected major version changes.

## Step 2 - Configure the Provider

Next, configure the AWS provider. This tells Terraform which region to create resources in and how to authenticate:

```hcl
# Configure the AWS provider
provider "aws" {
  region = "us-east-1"

  # Credentials are read from environment variables or ~/.aws/credentials
  # Do NOT put access keys directly in this file
}
```

Never put credentials in `.tf` files. Instead, set them via environment variables:

```bash
# Set AWS credentials (if not using ~/.aws/credentials)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
```

## Step 3 - Define a Resource

Resources are the most important element in Terraform. A resource block declares a piece of infrastructure you want to create:

```hcl
# Create an S3 bucket
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-first-terraform-bucket-2026"

  tags = {
    Name        = "My First Terraform Bucket"
    Environment = "learning"
    ManagedBy   = "terraform"
  }
}

# Configure bucket versioning
resource "aws_s3_bucket_versioning" "my_bucket_versioning" {
  bucket = aws_s3_bucket.my_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

Let us break down the resource block syntax:

- `resource` is the keyword
- `"aws_s3_bucket"` is the resource type (provider prefix + resource name)
- `"my_bucket"` is the local name you assign - used to reference this resource elsewhere
- Inside the braces are the resource's arguments

The second resource references the first one with `aws_s3_bucket.my_bucket.id`. This is how Terraform knows about dependencies between resources.

## Step 4 - Add Variables

Variables make your configuration reusable. Create a file called `variables.tf`:

```hcl
# variables.tf

variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket to create"
  default     = "my-first-terraform-bucket-2026"
}

variable "environment" {
  type        = string
  description = "Environment name for tagging"
  default     = "learning"
}

variable "enable_versioning" {
  type        = bool
  description = "Whether to enable bucket versioning"
  default     = true
}
```

Now update `main.tf` to use these variables:

```hcl
# Create an S3 bucket using variables
resource "aws_s3_bucket" "my_bucket" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Conditionally enable versioning
resource "aws_s3_bucket_versioning" "my_bucket_versioning" {
  count  = var.enable_versioning ? 1 : 0
  bucket = aws_s3_bucket.my_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Step 5 - Add Outputs

Outputs let you extract information about your infrastructure after Terraform creates it. Create `outputs.tf`:

```hcl
# outputs.tf

output "bucket_name" {
  value       = aws_s3_bucket.my_bucket.id
  description = "The name of the created S3 bucket"
}

output "bucket_arn" {
  value       = aws_s3_bucket.my_bucket.arn
  description = "The ARN of the created S3 bucket"
}

output "bucket_region" {
  value       = aws_s3_bucket.my_bucket.region
  description = "The region of the created S3 bucket"
}
```

## The Complete Project Structure

Your project should now look like this:

```text
my-first-terraform/
  main.tf           # Provider config and resources
  variables.tf      # Input variables
  outputs.tf        # Output values
```

## Step 6 - Initialize the Project

```bash
# Initialize Terraform - downloads the AWS provider
terraform init
```

You will see output showing Terraform downloading the AWS provider plugin. A `.terraform` directory is created to store the provider binary, and a `.terraform.lock.hcl` file records the exact provider version.

## Step 7 - Preview the Changes

```bash
# Preview what Terraform will create
terraform plan
```

This shows you exactly what Terraform plans to create without actually creating anything. Review the output carefully. You should see that it plans to create an S3 bucket and possibly a versioning configuration.

## Step 8 - Create the Infrastructure

```bash
# Apply the configuration to create real resources
terraform apply
```

Terraform shows the plan again and asks for confirmation. Type `yes` to proceed. After a few seconds, your S3 bucket exists in AWS.

The output values are displayed at the end:

```text
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

bucket_arn = "arn:aws:s3:::my-first-terraform-bucket-2026"
bucket_name = "my-first-terraform-bucket-2026"
bucket_region = "us-east-1"
```

## Step 9 - Inspect the State

Terraform created a `terraform.tfstate` file that tracks the resources it manages:

```bash
# List all resources in the state
terraform state list

# Show details of a specific resource
terraform state show aws_s3_bucket.my_bucket
```

The state file is how Terraform knows what it has already created and what needs to change on the next apply.

## Step 10 - Make a Change

Let us add another tag to the bucket. Update `main.tf`:

```hcl
resource "aws_s3_bucket" "my_bucket" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "learning-terraform"  # New tag
  }
}
```

Run plan and apply again:

```bash
# See what changed
terraform plan

# Apply the change
terraform apply
```

Terraform detects that only the tags changed and updates the bucket in place (no recreation needed).

## Step 11 - Clean Up

When you are done experimenting, destroy the infrastructure:

```bash
# Destroy all resources managed by this configuration
terraform destroy
```

Terraform shows what it will destroy and asks for confirmation. Type `yes` and the bucket is deleted.

## Understanding the File Structure

While you can put everything in a single `main.tf`, splitting into multiple files is a good habit:

| File | Purpose |
|------|---------|
| `main.tf` | Resources and provider configuration |
| `variables.tf` | Input variable declarations |
| `outputs.tf` | Output value declarations |
| `terraform.tfvars` | Variable values (not committed to Git if contains secrets) |
| `versions.tf` | Terraform and provider version constraints (alternative to putting them in main.tf) |

Terraform loads all `.tf` files in a directory, so the file names are for human organization - Terraform does not care what you name them.

## Using a .tfvars File

Instead of relying on default values, you can create a `terraform.tfvars` file:

```hcl
# terraform.tfvars
bucket_name       = "my-custom-bucket-name-2026"
environment       = "development"
enable_versioning = true
```

Terraform automatically loads `terraform.tfvars` and `*.auto.tfvars` files.

## Adding a .gitignore

Before committing to Git, create a `.gitignore`:

```text
# .gitignore for Terraform projects

# Local .terraform directories
.terraform/

# .tfstate files (use remote backend in real projects)
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Variable files with secrets
*.tfvars
!example.tfvars

# Override files
override.tf
override.tf.json
*_override.tf
*_override.tf.json
```

## Next Steps

You have written your first Terraform configuration. From here, I recommend:

- Learning the core workflow in depth (init, plan, apply, destroy)
- Setting up a remote backend (S3 + DynamoDB) for state management in real projects
- Exploring Terraform modules to organize and reuse configurations
- Trying different resource types (EC2 instances, VPCs, databases)

The pattern is always the same: declare what you want in `.tf` files, run `terraform plan` to preview, and run `terraform apply` to create it. The more resources you work with, the more comfortable the workflow becomes.
