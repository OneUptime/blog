# How to Make Variables Required Without Defaults in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Configuration, Infrastructure as Code

Description: Learn how to create required Terraform variables by omitting default values, forcing callers to provide explicit values and preventing accidental misconfigurations.

---

In Terraform, a variable without a `default` value is required. The caller must explicitly provide a value, or Terraform will error out. This is one of the simplest but most important patterns in Terraform configuration design - it forces people to make conscious decisions about critical settings instead of silently accepting a default they might not have thought about.

## The Basic Pattern

To make a variable required, simply omit the `default` argument:

```hcl
# Required - no default value
variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
}

# Optional - has a default value
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}
```

If you run `terraform plan` without providing `environment`, Terraform will either prompt you interactively or error out in non-interactive mode (like CI/CD):

```text
$ terraform plan
var.environment
  Deployment environment (dev, staging, production)

  Enter a value:
```

In a CI/CD pipeline with `TF_INPUT=false`:

```text
$ TF_INPUT=false terraform plan
Error: No value for required variable

  on variables.tf line 1:
   1: variable "environment" {

The root module input variable "environment" is not set, and has no default
value. Use a -var or -var-file command line argument or set a TF_VAR_
environment variable to provide a value for this variable.
```

## When to Make Variables Required

### Environment and deployment context

These should always be required because applying to the wrong environment can be catastrophic:

```hcl
variable "environment" {
  description = "Deployment environment. Must be one of: dev, staging, production."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_account_id" {
  description = "AWS account ID where resources will be created. Used as a safety check."
  type        = string

  validation {
    condition     = can(regex("^\\d{12}$", var.aws_account_id))
    error_message = "AWS account ID must be a 12-digit number."
  }
}
```

### Naming and identification

```hcl
variable "project_name" {
  description = "Name of the project. Used as a prefix for all resource names."
  type        = string

  validation {
    condition     = length(var.project_name) >= 3 && length(var.project_name) <= 20
    error_message = "Project name must be between 3 and 20 characters."
  }
}

variable "team" {
  description = "Team responsible for these resources. Used in tagging for cost allocation."
  type        = string
}
```

### Sensitive credentials

Never default credentials. The caller should always provide them explicitly:

```hcl
variable "database_password" {
  description = "Master password for the RDS instance. Minimum 16 characters."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.database_password) >= 16
    error_message = "Database password must be at least 16 characters."
  }
}

variable "api_key" {
  description = "API key for the external monitoring service."
  type        = string
  sensitive   = true
}
```

### Network configuration

CIDR blocks and networking settings should be intentional:

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC (e.g., 10.0.0.0/16). Must not overlap with other VPCs in the account."
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid CIDR block."
  }
}
```

## Required Variables in Modules

When you build a reusable module, deciding which variables are required shapes the module's user experience. Required variables are the module's mandatory interface:

```hcl
# modules/ecs-service/variables.tf

# Required - the module cannot function without these
variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "container_image" {
  description = "Docker image URI (e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the service will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the service tasks"
  type        = list(string)
}

# Optional - sensible defaults provided
variable "cpu" {
  description = "CPU units for the task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MB for the task"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of task instances to run"
  type        = number
  default     = 1
}
```

When someone calls this module, they must provide the required variables:

```hcl
module "api_service" {
  source = "./modules/ecs-service"

  # Required - must be provided
  service_name    = "api"
  container_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/api:v1.2.3"
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids

  # Optional - override defaults as needed
  cpu           = 512
  memory        = 1024
  desired_count = 3
}
```

## Providing Values for Required Variables

There are several ways to supply required variable values:

### Using .tfvars files

```hcl
# production.tfvars
environment      = "production"
project_name     = "webapp"
team             = "platform"
vpc_cidr         = "10.0.0.0/16"
aws_account_id   = "123456789012"
```

```bash
terraform apply -var-file="production.tfvars"
```

### Using environment variables

```bash
export TF_VAR_environment="production"
export TF_VAR_project_name="webapp"
export TF_VAR_database_password="super-secret-password-here"
terraform apply
```

### Using -var flags

```bash
terraform apply \
  -var="environment=production" \
  -var="project_name=webapp"
```

### Using auto.tfvars

Files ending in `.auto.tfvars` are loaded automatically:

```hcl
# prod.auto.tfvars (auto-loaded)
environment    = "production"
project_name   = "webapp"
team           = "platform"
```

## Combining Required Variables with Validation

Required variables pair perfectly with validation rules. Since the caller must provide a value, you can validate it immediately:

```hcl
variable "region" {
  description = "AWS region for deployment"
  type        = string

  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central|northeast|southeast)-[1-3]$", var.region))
    error_message = "Must be a valid AWS region (e.g., us-east-1, eu-west-2)."
  }
}

variable "instance_count" {
  description = "Number of instances to create. Must be between 1 and 10."
  type        = number

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}
```

## The nullable Argument

By default, even required variables can be set to `null`. If you want to prevent that, use `nullable = false`:

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
  nullable    = false  # cannot be set to null
}

# Without nullable = false, this would be accepted:
# environment = null
```

Setting `nullable = false` on a variable without a default means the caller must provide a non-null value.

## Required Variables in Root vs Child Modules

In root modules, required variables prompt the user or come from `.tfvars` files and environment variables.

In child modules, required variables must be explicitly set in the `module` block - there is no prompting:

```hcl
# This will cause an error if service_name is required and not provided
module "api" {
  source = "./modules/ecs-service"

  # If service_name is required and you omit it, terraform validate catches it:
  # Error: Missing required argument
  #   The argument "service_name" is required, but no definition was found.

  service_name    = "api"        # must be provided
  container_image = "myapp:v1"   # must be provided
  vpc_id          = "vpc-123"    # must be provided
  subnet_ids      = ["subnet-1"] # must be provided
}
```

## Documenting Required Variables

Make it obvious in your documentation which variables are required. The `terraform-docs` tool marks variables as "Required" or shows "n/a" for the default when there is none:

```bash
terraform-docs markdown table .
```

Output:

```markdown
| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| environment | Deployment environment | string | n/a | yes |
| project_name | Name of the project | string | n/a | yes |
| instance_type | EC2 instance type | string | "t3.micro" | no |
```

## Wrapping Up

Making variables required by omitting the `default` argument is a deliberate design choice. It forces callers to provide explicit values for settings that should not be left to chance - environment names, credentials, network ranges, and project identifiers. Combined with validation rules and clear descriptions, required variables create a robust interface for your Terraform configurations and modules. The small friction of requiring explicit values prevents the much larger pain of misconfigured infrastructure.

For more on variable design, see [How to Set Variable Default Values in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-variable-default-values/view) and [How to Define Input Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-define-input-variables/view).
