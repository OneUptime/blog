# How to Install and Use Terraform on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Terraform, Infrastructure as Code, DevOps

Description: Install Terraform on Ubuntu and learn infrastructure as code basics with practical examples for cloud and local provisioning.

---

## Introduction

Terraform is an open-source Infrastructure as Code (IaC) tool developed by HashiCorp that enables you to define, provision, and manage infrastructure across multiple cloud providers and services using a declarative configuration language. Instead of manually clicking through cloud provider consoles or writing imperative scripts, Terraform allows you to describe your desired infrastructure state in configuration files, and it handles the creation, modification, and destruction of resources to match that state.

In this comprehensive guide, you will learn how to install Terraform on Ubuntu, understand its core concepts, write your first configuration, and work with essential features like state management, variables, outputs, and modules.

## Prerequisites

Before proceeding with Terraform installation, ensure you have:

- Ubuntu 20.04, 22.04, or 24.04 (this guide works on all LTS versions)
- A user account with sudo privileges
- Basic familiarity with the Linux command line
- Internet connectivity for downloading packages

## Installing Terraform on Ubuntu

There are several methods to install Terraform on Ubuntu. We will cover the official HashiCorp repository method (recommended), manual binary installation, and using Snap.

### Method 1: Installing via HashiCorp APT Repository (Recommended)

The recommended approach is to use HashiCorp's official APT repository, which ensures you always have access to the latest stable releases.

First, install the required dependencies for adding external repositories:

```bash
# Install prerequisite packages for HTTPS repository access
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common curl
```

Add the HashiCorp GPG key to verify package authenticity:

```bash
# Download and add the HashiCorp GPG signing key
wget -O- https://apt.releases.hashicorp.com/gpg | \
gpg --dearmor | \
sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null
```

Verify the key was added correctly by checking its fingerprint:

```bash
# Verify the GPG key fingerprint matches HashiCorp's official key
gpg --no-default-keyring \
--keyring /usr/share/keyrings/hashicorp-archive-keyring.gpg \
--fingerprint
```

Add the official HashiCorp repository to your system:

```bash
# Add HashiCorp's official APT repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
sudo tee /etc/apt/sources.list.d/hashicorp.list
```

Update the package list and install Terraform:

```bash
# Update package lists and install Terraform
sudo apt-get update && sudo apt-get install terraform
```

### Method 2: Manual Binary Installation

If you prefer to install Terraform manually or need a specific version, you can download the binary directly.

Visit the Terraform downloads page or use curl to fetch the latest version:

```bash
# Set the desired Terraform version
TERRAFORM_VERSION="1.7.0"

# Download the Terraform binary for Linux AMD64
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
```

Unzip and install the binary:

```bash
# Unzip the downloaded archive
unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Move the binary to a directory in your PATH
sudo mv terraform /usr/local/bin/

# Clean up the downloaded archive
rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip
```

### Method 3: Installing via Snap

Ubuntu users can also install Terraform using Snap:

```bash
# Install Terraform using Snap package manager
sudo snap install terraform --classic
```

### Verifying the Installation

Regardless of which installation method you chose, verify that Terraform is installed correctly:

```bash
# Check Terraform version to confirm installation
terraform -version
```

You should see output similar to:

```
Terraform v1.7.0
on linux_amd64
```

Enable shell tab completion for better productivity:

```bash
# Install bash autocompletion for Terraform commands
terraform -install-autocomplete
```

## Understanding Terraform Core Concepts

Before writing your first configuration, it is essential to understand the fundamental concepts that Terraform uses.

### Providers

Providers are plugins that Terraform uses to interact with cloud platforms, SaaS providers, and other APIs. Each provider offers a set of resource types and data sources that Terraform can manage. Popular providers include AWS, Azure, Google Cloud, Kubernetes, and Docker.

### Resources

Resources are the most important element in Terraform configurations. Each resource block describes one or more infrastructure objects, such as virtual machines, networks, DNS records, or database instances.

### State

Terraform state is a JSON file that maps your configuration to the real-world resources it manages. State allows Terraform to know what exists, track metadata, and improve performance for large infrastructures.

### Modules

Modules are containers for multiple resources that are used together. They allow you to organize, encapsulate, and reuse configurations across different projects.

### Variables and Outputs

Variables allow you to parameterize your configurations, making them flexible and reusable. Outputs let you extract and display useful information about your infrastructure.

## Writing Your First Terraform Configuration

Let us create a simple configuration to understand Terraform's workflow. We will use the local provider for demonstration purposes, which allows you to create files on your local system without needing cloud credentials.

Create a new directory for your project:

```bash
# Create a directory for your first Terraform project
mkdir ~/terraform-demo
cd ~/terraform-demo
```

### Creating the Main Configuration File

Create a file named `main.tf` with the following content:

```hcl
# main.tf - Main Terraform configuration file
# This configuration creates a local file to demonstrate Terraform basics

# Specify the required Terraform version and providers
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

# Configure the local provider (no special configuration needed)
provider "local" {}

# Create a local file resource
# This resource creates a file on your local filesystem
resource "local_file" "hello_world" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, Terraform! This file was created by Infrastructure as Code."
}

# Create another file with more complex content
resource "local_file" "config_file" {
  filename        = "${path.module}/config.json"
  content         = jsonencode({
    application = "terraform-demo"
    version     = "1.0.0"
    created_by  = "Terraform"
    timestamp   = timestamp()
  })
  file_permission = "0644"
}
```

### Understanding the Configuration Structure

The configuration above contains several important blocks:

The `terraform` block specifies version constraints for Terraform and declares required providers.

The `provider` block configures the local provider. Different providers have different configuration options (e.g., AWS requires region and credentials).

The `resource` blocks define the infrastructure objects to create. Each resource has a type (`local_file`) and a local name (`hello_world`).

## The Terraform Workflow: Init, Plan, Apply

Terraform follows a consistent workflow for managing infrastructure: initialize, plan, and apply.

### Step 1: Initialize the Working Directory

The `terraform init` command initializes your working directory, downloads required providers, and sets up the backend for state storage:

```bash
# Initialize Terraform working directory
# This downloads providers and sets up the backend
terraform init
```

You will see output indicating that Terraform is initializing the backend and downloading the local provider:

```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/local versions matching "~> 2.4"...
- Installing hashicorp/local v2.4.1...
- Installed hashicorp/local v2.4.1 (signed by HashiCorp)

Terraform has been successfully initialized!
```

### Step 2: Preview Changes with Plan

The `terraform plan` command creates an execution plan, showing what actions Terraform will take without making any changes:

```bash
# Generate and review the execution plan
# This shows what resources will be created, modified, or destroyed
terraform plan
```

Review the output carefully. It shows the resources that will be created:

```
Terraform will perform the following actions:

  # local_file.config_file will be created
  + resource "local_file" "config_file" {
      + content              = jsonencode({...})
      + filename             = "./config.json"
      + file_permission      = "0644"
      ...
    }

  # local_file.hello_world will be created
  + resource "local_file" "hello_world" {
      + content              = "Hello, Terraform! This file was created by Infrastructure as Code."
      + filename             = "./hello.txt"
      ...
    }

Plan: 2 to add, 0 to change, 0 to destroy.
```

### Step 3: Apply the Configuration

The `terraform apply` command executes the planned changes and creates the infrastructure:

```bash
# Apply the configuration to create resources
# Use -auto-approve to skip interactive confirmation (use with caution)
terraform apply
```

Terraform will display the plan again and ask for confirmation. Type `yes` to proceed:

```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

local_file.hello_world: Creating...
local_file.config_file: Creating...
local_file.hello_world: Creation complete after 0s
local_file.config_file: Creation complete after 0s

Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

Verify the files were created:

```bash
# List created files
ls -la hello.txt config.json

# View the content of the hello file
cat hello.txt

# View the JSON configuration file
cat config.json
```

### Additional Useful Commands

View the current state of your infrastructure:

```bash
# Show the current state of all managed resources
terraform show
```

List all resources in the state:

```bash
# List all resources tracked in the state file
terraform state list
```

Format your configuration files to follow the canonical style:

```bash
# Format all .tf files in the current directory
terraform fmt
```

Validate your configuration syntax:

```bash
# Validate configuration files for syntax errors
terraform validate
```

Destroy all managed resources:

```bash
# Destroy all resources managed by this configuration
# This is irreversible - use with caution!
terraform destroy
```

## State Management and Backends

Terraform state is crucial for tracking your infrastructure. By default, state is stored locally in a file named `terraform.tfstate`.

### Understanding State

The state file contains:

- Resource mappings between configuration and real infrastructure
- Metadata including resource dependencies
- Cached attribute values for performance

View your current state:

```bash
# Display the current Terraform state in a readable format
terraform state show local_file.hello_world
```

### Remote State Backends

For team collaboration and production environments, you should store state remotely. This enables:

- Shared access for team members
- State locking to prevent concurrent modifications
- Encryption and backup capabilities

Here is an example configuring an S3 backend for AWS:

```hcl
# backend.tf - Configure remote state storage in AWS S3
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "terraform-demo/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

For local development or testing, you can use a local backend with a custom path:

```hcl
# backend.tf - Configure local backend with custom state file location
terraform {
  backend "local" {
    path = "/var/lib/terraform/demo.tfstate"
  }
}
```

### State Commands

Terraform provides several commands for state management:

```bash
# Move a resource to a different address in state
terraform state mv local_file.hello_world local_file.greeting

# Remove a resource from state without destroying it
terraform state rm local_file.config_file

# Import existing infrastructure into Terraform state
terraform import local_file.imported /path/to/existing/file

# Pull remote state to local for inspection
terraform state pull > state_backup.json

# Push local state to remote backend (use with extreme caution)
terraform state push state_backup.json
```

## Variables and Outputs

Variables make your configurations flexible and reusable. Outputs extract useful information from your infrastructure.

### Defining Input Variables

Create a file named `variables.tf` to define your input variables:

```hcl
# variables.tf - Define input variables for the configuration

# Variable for the application name
variable "app_name" {
  description = "The name of the application"
  type        = string
  default     = "my-terraform-app"
}

# Variable for the environment (dev, staging, prod)
variable "environment" {
  description = "The deployment environment"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

# Variable for configuration settings as an object
variable "config_settings" {
  description = "Application configuration settings"
  type = object({
    debug_mode    = bool
    log_level     = string
    max_retries   = number
  })
  default = {
    debug_mode    = false
    log_level     = "info"
    max_retries   = 3
  }
}

# Variable for a list of allowed users
variable "allowed_users" {
  description = "List of users allowed to access the application"
  type        = list(string)
  default     = ["admin", "developer"]
}

# Sensitive variable for secrets (won't be shown in logs)
variable "api_key" {
  description = "API key for external service"
  type        = string
  sensitive   = true
  default     = ""
}

# Map variable for resource tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    managed_by = "terraform"
    project    = "demo"
  }
}
```

### Using Variables in Configuration

Update your `main.tf` to use these variables:

```hcl
# main.tf - Updated to use variables

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

provider "local" {}

# Use variables in resource configuration
resource "local_file" "app_config" {
  filename = "${path.module}/${var.app_name}-${var.environment}.json"
  content  = jsonencode({
    name        = var.app_name
    environment = var.environment
    settings    = var.config_settings
    users       = var.allowed_users
    metadata    = var.tags
  })
  file_permission = "0644"
}

# Create a file for each allowed user using count
resource "local_file" "user_config" {
  count    = length(var.allowed_users)
  filename = "${path.module}/users/${var.allowed_users[count.index]}.txt"
  content  = "Configuration file for user: ${var.allowed_users[count.index]}\nEnvironment: ${var.environment}"
}

# Conditional resource creation based on debug mode
resource "local_file" "debug_log" {
  count    = var.config_settings.debug_mode ? 1 : 0
  filename = "${path.module}/debug.log"
  content  = "Debug logging enabled for ${var.app_name}"
}
```

### Providing Variable Values

There are multiple ways to provide values for variables:

Using a terraform.tfvars file:

```hcl
# terraform.tfvars - Variable values for this environment
app_name    = "production-app"
environment = "production"

config_settings = {
  debug_mode   = false
  log_level    = "warning"
  max_retries  = 5
}

allowed_users = ["admin", "operator", "auditor"]

tags = {
  managed_by  = "terraform"
  project     = "production-demo"
  cost_center = "engineering"
}
```

Using command-line flags:

```bash
# Pass variable values via command line
terraform apply -var="app_name=cli-app" -var="environment=staging"
```

Using environment variables:

```bash
# Set variable values using environment variables (prefix with TF_VAR_)
export TF_VAR_app_name="env-app"
export TF_VAR_environment="development"
export TF_VAR_api_key="secret-key-12345"
terraform apply
```

Using a custom variable file:

```bash
# Use a specific variable file
terraform apply -var-file="production.tfvars"
```

### Defining Outputs

Create a file named `outputs.tf` to define outputs:

```hcl
# outputs.tf - Define outputs to expose useful information

# Output the generated configuration file path
output "config_file_path" {
  description = "Path to the generated configuration file"
  value       = local_file.app_config.filename
}

# Output a list of all user config file paths
output "user_config_paths" {
  description = "Paths to all user configuration files"
  value       = local_file.user_config[*].filename
}

# Output application metadata
output "app_metadata" {
  description = "Application metadata summary"
  value = {
    name        = var.app_name
    environment = var.environment
    user_count  = length(var.allowed_users)
    debug_mode  = var.config_settings.debug_mode
  }
}

# Sensitive output (will be hidden in console output)
output "api_key_configured" {
  description = "Whether an API key is configured"
  value       = var.api_key != "" ? "API key is set" : "No API key configured"
  sensitive   = true
}

# Output using local values
output "resource_name_prefix" {
  description = "The naming prefix used for resources"
  value       = "${var.app_name}-${var.environment}"
}
```

View outputs after applying:

```bash
# Display all outputs
terraform output

# Display a specific output
terraform output config_file_path

# Display output in JSON format
terraform output -json
```

### Local Values

Local values are helpful for simplifying complex expressions:

```hcl
# locals.tf - Define local values for reusable expressions

locals {
  # Combine app name and environment for naming
  name_prefix = "${var.app_name}-${var.environment}"

  # Merge default tags with user-provided tags
  common_tags = merge(var.tags, {
    environment = var.environment
    app_name    = var.app_name
  })

  # Generate a configuration timestamp
  config_timestamp = formatdate("YYYY-MM-DD-hh-mm-ss", timestamp())

  # Calculate derived values
  is_production = var.environment == "production"

  # Create a map of user permissions
  user_permissions = { for user in var.allowed_users : user => {
    username = user
    role     = user == "admin" ? "administrator" : "standard"
  }}
}
```

## Modules Basics

Modules are the primary way to package and reuse Terraform configurations. A module is simply a directory containing Terraform configuration files.

### Module Structure

A typical module has this structure:

```
modules/
  file-creator/
    main.tf       # Main resource definitions
    variables.tf  # Input variable declarations
    outputs.tf    # Output value declarations
    README.md     # Module documentation
```

### Creating a Simple Module

Create a module for creating configured files:

```bash
# Create module directory structure
mkdir -p ~/terraform-demo/modules/file-creator
```

Create the module's main configuration:

```hcl
# modules/file-creator/main.tf
# Module for creating configured local files with consistent settings

terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

# Create the main content file
resource "local_file" "content" {
  filename        = "${var.base_path}/${var.filename}"
  content         = var.content
  file_permission = var.file_permission
}

# Create a metadata file alongside the main file
resource "local_file" "metadata" {
  count           = var.create_metadata ? 1 : 0
  filename        = "${var.base_path}/${var.filename}.meta.json"
  content         = jsonencode({
    original_file = var.filename
    created_at    = timestamp()
    created_by    = "file-creator-module"
    tags          = var.tags
  })
  file_permission = var.file_permission
}
```

Create the module's variables:

```hcl
# modules/file-creator/variables.tf
# Input variables for the file-creator module

variable "base_path" {
  description = "Base directory path for created files"
  type        = string
}

variable "filename" {
  description = "Name of the file to create"
  type        = string
}

variable "content" {
  description = "Content to write to the file"
  type        = string
}

variable "file_permission" {
  description = "File permission mode"
  type        = string
  default     = "0644"
}

variable "create_metadata" {
  description = "Whether to create a metadata file"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to include in metadata"
  type        = map(string)
  default     = {}
}
```

Create the module's outputs:

```hcl
# modules/file-creator/outputs.tf
# Output values for the file-creator module

output "file_path" {
  description = "Full path to the created file"
  value       = local_file.content.filename
}

output "file_id" {
  description = "Unique identifier for the file resource"
  value       = local_file.content.id
}

output "metadata_path" {
  description = "Path to the metadata file (if created)"
  value       = var.create_metadata ? local_file.metadata[0].filename : null
}
```

### Using Modules

Call the module from your root configuration:

```hcl
# main.tf - Using the file-creator module

terraform {
  required_version = ">= 1.0.0"
}

# Create an application configuration file using the module
module "app_config" {
  source = "./modules/file-creator"

  base_path       = path.module
  filename        = "app-config.yaml"
  content         = yamlencode({
    database = {
      host = "localhost"
      port = 5432
    }
    cache = {
      enabled = true
      ttl     = 3600
    }
  })
  create_metadata = true
  tags = {
    purpose = "application-configuration"
  }
}

# Create a logging configuration file using the same module
module "log_config" {
  source = "./modules/file-creator"

  base_path       = path.module
  filename        = "logging.json"
  content         = jsonencode({
    level  = "info"
    format = "json"
    outputs = ["stdout", "file"]
  })
  create_metadata = false
}

# Output the paths from the modules
output "app_config_path" {
  value = module.app_config.file_path
}

output "log_config_path" {
  value = module.log_config.file_path
}
```

### Using Remote Modules

You can also use modules from the Terraform Registry or Git repositories:

```hcl
# Using a module from the Terraform Registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}

# Using a module from a Git repository
module "custom_module" {
  source = "git::https://github.com/example/terraform-modules.git//network?ref=v1.0.0"

  # Module inputs
  network_name = "production"
}

# Using a module from a local path with relative reference
module "shared" {
  source = "../shared-modules/logging"

  log_retention_days = 30
}
```

## Best Practices

Following best practices ensures maintainable, secure, and efficient Terraform configurations.

### File Organization

Organize your configurations logically:

```bash
# Recommended project structure
project/
  main.tf           # Main resources and provider configuration
  variables.tf      # Variable declarations
  outputs.tf        # Output declarations
  locals.tf         # Local value definitions
  versions.tf       # Terraform and provider version constraints
  terraform.tfvars  # Variable values (don't commit sensitive values)
  modules/          # Local module definitions
  environments/     # Environment-specific configurations
    dev/
    staging/
    production/
```

### Version Constraints

Always specify version constraints:

```hcl
# versions.tf - Pin versions for reproducible builds

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}
```

### Resource Naming

Use consistent naming conventions:

```hcl
# Use descriptive, consistent resource names
resource "aws_instance" "web_server_primary" {
  # Resource configuration
}

resource "aws_security_group" "web_server_sg" {
  name = "${var.project}-${var.environment}-web-sg"
  # Configuration
}
```

### Using Workspaces

Workspaces allow you to manage multiple environments with the same configuration:

```bash
# Create a new workspace for production
terraform workspace new production

# List all workspaces
terraform workspace list

# Switch to a different workspace
terraform workspace select development

# Show current workspace
terraform workspace show
```

Reference the current workspace in your configuration:

```hcl
# Use workspace name in resource configurations
locals {
  environment = terraform.workspace
  name_prefix = "myapp-${terraform.workspace}"
}

resource "local_file" "env_config" {
  filename = "${path.module}/${local.name_prefix}-config.txt"
  content  = "Environment: ${local.environment}"
}
```

### Security Considerations

Handle sensitive data properly:

```hcl
# Mark sensitive variables
variable "database_password" {
  type      = string
  sensitive = true
}

# Use environment variables for secrets
# export TF_VAR_database_password="secure-password"

# Never commit terraform.tfvars files with secrets
# Add to .gitignore:
# *.tfvars
# !example.tfvars
```

Create a `.gitignore` file for Terraform projects:

```bash
# .gitignore for Terraform projects

# Local .terraform directories
**/.terraform/*

# Terraform state files
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Variable files containing secrets
*.tfvars
*.tfvars.json
!example.tfvars

# Override files
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# CLI configuration files
.terraformrc
terraform.rc
```

## Troubleshooting Common Issues

Here are solutions to common Terraform issues:

### Provider Plugin Cache

Speed up initialization by caching provider plugins:

```bash
# Create a plugin cache directory
mkdir -p ~/.terraform.d/plugin-cache

# Configure Terraform to use the cache (add to ~/.terraformrc)
cat << 'EOF' > ~/.terraformrc
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
EOF
```

### State Lock Issues

If state becomes locked due to a failed operation:

```bash
# Force unlock the state (use the lock ID from the error message)
terraform force-unlock LOCK_ID
```

### Debug Logging

Enable debug logging for troubleshooting:

```bash
# Enable detailed logging
export TF_LOG=DEBUG
export TF_LOG_PATH="./terraform-debug.log"

# Run Terraform commands with debug output
terraform plan
```

### Refresh State

If your infrastructure has drifted from the state:

```bash
# Refresh state to match actual infrastructure
terraform refresh

# Or use plan with refresh-only mode
terraform plan -refresh-only
```

## Conclusion

You have now learned how to install Terraform on Ubuntu and understand its fundamental concepts. You can write configurations using HCL, manage state effectively, use variables and outputs for flexibility, and create reusable modules.

Key takeaways:

- Install Terraform using the HashiCorp APT repository for easy updates
- Follow the init, plan, apply workflow for safe infrastructure changes
- Store state remotely for team collaboration and safety
- Use variables and modules to create reusable, maintainable configurations
- Always review plans before applying changes to production

As next steps, explore provider-specific resources for your cloud platform, implement CI/CD pipelines for Terraform, and consider using Terraform Cloud or Enterprise for advanced features like policy enforcement and cost estimation.

## Additional Resources

- [Official Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [Terraform Registry](https://registry.terraform.io/) - Find providers and modules
- [HashiCorp Learn](https://developer.hashicorp.com/terraform/tutorials) - Interactive tutorials
- [Terraform Best Practices](https://www.terraform-best-practices.com/) - Community guide
