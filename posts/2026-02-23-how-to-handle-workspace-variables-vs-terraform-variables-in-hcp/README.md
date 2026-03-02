# How to Handle Workspace Variables vs Terraform Variables in HCP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Variables, Workspace, Configuration Management

Description: Understand the difference between workspace variables and Terraform variables in HCP Terraform and when to use each type.

---

Variables in HCP Terraform come in two flavors, and confusing them is one of the most common mistakes people make. There are "Terraform variables" (the ones your code declares with `variable` blocks) and "environment variables" (shell variables available during execution). Both are set in the workspace, but they serve completely different purposes. This post clears up the confusion and shows you how to use each one correctly.

## The Two Variable Categories

When you open a workspace in HCP Terraform and go to the Variables section, you see two tabs: "Terraform Variables" and "Environment Variables." They look similar in the UI but behave very differently.

**Terraform Variables** map directly to `variable` blocks in your code. When HCP Terraform runs your plan or apply, it passes these values to Terraform as if you had used `-var` flags.

**Environment Variables** are set as shell environment variables in the execution environment. They are available to providers, provisioners, and external programs - but not to your Terraform code directly.

## Terraform Variables in Detail

Terraform variables are the values your HCL code consumes. When you declare a variable:

```hcl
# variables.tf
variable "instance_type" {
  type        = string
  description = "EC2 instance type for the application server"
  default     = "t3.micro"
}

variable "environment" {
  type        = string
  description = "Deployment environment name"
}

variable "replicas" {
  type        = number
  description = "Number of application replicas"
  default     = 2
}
```

You set the values in the workspace via the UI or API:

```bash
# Set a Terraform variable via the API
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "instance_type",
        "value": "t3.large",
        "category": "terraform",
        "hcl": false,
        "sensitive": false,
        "description": "Instance type for production"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

Notice the `"category": "terraform"` - this is what makes it a Terraform variable.

### HCL Variables

When your variable expects a complex type (list, map, object), set `hcl` to `true`:

```bash
# Set an HCL variable (complex type)
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "allowed_cidrs",
        "value": "[\"10.0.0.0/8\", \"172.16.0.0/12\"]",
        "category": "terraform",
        "hcl": true,
        "sensitive": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

```hcl
# The variable in your code
variable "allowed_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed to access the application"
}

resource "aws_security_group_rule" "ingress" {
  count             = length(var.allowed_cidrs)
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [var.allowed_cidrs[count.index]]
  security_group_id = aws_security_group.app.id
}
```

## Environment Variables in Detail

Environment variables are shell variables, not Terraform variables. They are used to:

- Configure provider authentication (AWS keys, Azure credentials)
- Set Terraform behavior flags
- Pass values to external scripts or provisioners

```bash
# Set an environment variable via the API
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "AWS_ACCESS_KEY_ID",
        "value": "AKIA...",
        "category": "env",
        "sensitive": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

Notice `"category": "env"` - this makes it an environment variable.

### Common Environment Variables

```bash
# AWS Provider Authentication
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1

# Azure Provider Authentication
ARM_CLIENT_ID=...
ARM_CLIENT_SECRET=...
ARM_SUBSCRIPTION_ID=...
ARM_TENANT_ID=...

# Google Cloud Provider Authentication
GOOGLE_CREDENTIALS=...
GOOGLE_PROJECT=...

# Terraform behavior
TF_LOG=DEBUG
TF_CLI_ARGS_plan=-parallelism=5
```

## The Key Differences

Here is the practical breakdown:

| Aspect | Terraform Variables | Environment Variables |
|--------|--------------------|-----------------------|
| Category | `terraform` | `env` |
| Used by | Your HCL code via `var.name` | Providers, provisioners, shell |
| Declared in | `variable` blocks | Not declared in HCL |
| HCL types | Supports complex types | Always strings |
| Purpose | Application configuration | Authentication, runtime settings |

## A Concrete Example

Consider deploying an AWS Lambda function. You need both types:

```hcl
# variables.tf - Terraform variables (set as workspace Terraform variables)
variable "function_name" {
  type        = string
  description = "Name of the Lambda function"
}

variable "memory_size" {
  type        = number
  description = "Memory allocation in MB"
  default     = 128
}

variable "environment_vars" {
  type        = map(string)
  description = "Environment variables for the Lambda function"
  default     = {}
}
```

```hcl
# main.tf
# The AWS provider reads AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
# from environment variables automatically - you do NOT need to pass
# them as Terraform variables
provider "aws" {
  region = "us-east-1"
}

resource "aws_lambda_function" "app" {
  function_name = var.function_name  # Terraform variable
  runtime       = "python3.11"
  handler       = "main.handler"
  memory_size   = var.memory_size    # Terraform variable
  role          = aws_iam_role.lambda.arn
  filename      = "function.zip"

  environment {
    variables = var.environment_vars  # Terraform variable (map type)
  }
}
```

In the HCP Terraform workspace, you would set:

- **Terraform Variables:**
  - `function_name` = "my-api-handler"
  - `memory_size` = 256
  - `environment_vars` = `{"LOG_LEVEL": "info", "DB_HOST": "db.example.com"}` (HCL enabled)

- **Environment Variables:**
  - `AWS_ACCESS_KEY_ID` = "AKIA..." (sensitive)
  - `AWS_SECRET_ACCESS_KEY` = "..." (sensitive)

## Variable Precedence

When the same Terraform variable is set in multiple places, HCP Terraform follows this precedence order (highest to lowest):

1. CLI `-var` flags (only for CLI-driven runs)
2. Workspace Terraform variables
3. `*.auto.tfvars` files in the configuration
4. `terraform.tfvars` file
5. Variable `default` values in code

```hcl
# This default is overridden by the workspace variable
variable "instance_type" {
  type    = string
  default = "t3.micro"  # Used only if no workspace variable is set
}
```

## Sensitive Variables

Both variable types support the sensitive flag. When marked sensitive, the value is write-only - you cannot read it back through the UI or API:

```bash
# Set a sensitive Terraform variable
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "database_password",
        "value": "super-secret-password",
        "category": "terraform",
        "sensitive": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

In your code, also mark the variable as sensitive to prevent it from appearing in plan output:

```hcl
variable "database_password" {
  type        = string
  description = "Password for the database"
  sensitive   = true  # Prevents value from showing in plan output
}
```

## Variable Sets for Shared Variables

Variable sets let you define variables once and share them across multiple workspaces. This is perfect for provider credentials:

```bash
# Create a variable set
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "varsets",
      "attributes": {
        "name": "AWS Production Credentials",
        "description": "Shared AWS credentials for production workspaces",
        "global": false
      },
      "relationships": {
        "workspaces": {
          "data": [
            {"type": "workspaces", "id": "ws-abc123"},
            {"type": "workspaces", "id": "ws-def456"}
          ]
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/varsets"
```

Variable sets apply their variables to all assigned workspaces. This means you set AWS credentials once and every production workspace picks them up automatically.

## Common Mistakes

**Mistake 1:** Setting provider credentials as Terraform variables instead of environment variables. The AWS provider does not read `var.aws_access_key_id` - it reads the `AWS_ACCESS_KEY_ID` environment variable.

**Mistake 2:** Forgetting to enable HCL mode for complex types. If you set a list as a plain string, Terraform treats it as a string literal, not a list.

**Mistake 3:** Not marking secrets as sensitive. If you set a password as a non-sensitive variable, anyone with workspace read access can see it.

## Summary

The rule of thumb is simple: if your HCL code references it with `var.something`, it is a Terraform variable. If a provider or external tool needs it in the shell environment, it is an environment variable. Keep authentication credentials as sensitive environment variables, application configuration as Terraform variables, and use variable sets to share common values across workspaces.
