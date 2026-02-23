# How to Use Variables in HCP Terraform Workspaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Variables, Configuration, DevOps

Description: Learn how to configure Terraform variables and environment variables in HCP Terraform workspaces, including variable precedence, HCL values, and management via UI, CLI, and API.

---

Variables in HCP Terraform workspaces control what your Terraform configuration does and how it connects to cloud providers. There are two categories: Terraform variables (the ones your `.tf` files reference with `var.`) and environment variables (available to the execution environment during plans and applies). Getting them right is fundamental to making your workspaces work.

This guide covers how to set, manage, and organize variables in HCP Terraform.

## Two Categories of Variables

### Terraform Variables

These correspond to `variable` blocks in your configuration:

```hcl
# variables.tf
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
```

In HCP Terraform, you set values for these in the workspace variables section. They override any defaults defined in the configuration.

### Environment Variables

These are set in the shell environment during remote execution. They are how you pass cloud provider credentials and other runtime configuration:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_DEFAULT_REGION=us-east-1
TF_LOG=DEBUG
```

Any environment variable prefixed with `TF_VAR_` is automatically mapped to a Terraform variable:

```
TF_VAR_instance_type=t3.large
# This sets var.instance_type to "t3.large"
```

## Setting Variables via the UI

1. Navigate to your workspace in HCP Terraform
2. Click the "Variables" tab
3. Click "Add variable"
4. Choose the category:
   - **Terraform variable** for `var.*` values
   - **Environment variable** for shell environment values
5. Enter the key and value
6. Optionally mark it as sensitive or HCL

For simple string values:

```
Key: environment
Value: production
Category: Terraform variable
HCL: No
Sensitive: No
```

For complex types (maps, lists, objects), enable the HCL checkbox:

```
Key: tags
Value: {
  Environment = "production"
  Team        = "platform"
  ManagedBy   = "terraform"
}
Category: Terraform variable
HCL: Yes
Sensitive: No
```

```
Key: availability_zones
Value: ["us-east-1a", "us-east-1b", "us-east-1c"]
Category: Terraform variable
HCL: Yes
Sensitive: No
```

## Setting Variables via the API

```bash
# Create a Terraform variable
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "instance_type",
        "value": "t3.large",
        "category": "terraform",
        "hcl": false,
        "sensitive": false,
        "description": "EC2 instance type for application servers"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

```bash
# Create an environment variable (sensitive)
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "AWS_SECRET_ACCESS_KEY",
        "value": "wJalr...",
        "category": "env",
        "sensitive": true,
        "description": "AWS secret key for deployments"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

## Setting Variables with the tfe Provider

Manage variables as code:

```hcl
# Terraform variable
resource "tfe_variable" "environment" {
  key          = "environment"
  value        = "production"
  category     = "terraform"
  workspace_id = tfe_workspace.production.id
  description  = "Deployment environment name"
}

# HCL variable (complex type)
resource "tfe_variable" "tags" {
  key      = "tags"
  value    = jsonencode({
    Environment = "production"
    Team        = "platform"
    ManagedBy   = "terraform"
  })
  category     = "terraform"
  hcl          = true
  workspace_id = tfe_workspace.production.id
  description  = "Common resource tags"
}

# Environment variable (sensitive)
resource "tfe_variable" "aws_secret_key" {
  key          = "AWS_SECRET_ACCESS_KEY"
  value        = var.aws_secret_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.production.id
  description  = "AWS secret access key"
}
```

## Variable Precedence

When the same variable is defined in multiple places, HCP Terraform follows this precedence order (highest to lowest):

1. **CLI -var flags** (CLI-driven workflow only)
2. **Workspace-specific variables** set in HCP Terraform
3. **Variable sets** applied to the workspace
4. **terraform.tfvars** or **\*.auto.tfvars** files in the configuration
5. **Variable defaults** defined in the configuration

```hcl
# variables.tf - lowest precedence
variable "instance_type" {
  default = "t3.micro"  # Used only if nothing else sets it
}
```

```hcl
# terraform.auto.tfvars - higher precedence
instance_type = "t3.small"
```

```
# Workspace variable - highest (for non-CLI workflows)
Key: instance_type
Value: t3.large
```

The workspace variable wins. The final value is `t3.large`.

## HCL Variables

For complex data types, enable the HCL toggle. This tells HCP Terraform to parse the value as HCL rather than a plain string:

```
# Without HCL flag:
Key: subnets
Value: ["subnet-abc", "subnet-def"]
# Terraform receives the string: ["subnet-abc", "subnet-def"]
# This causes a type error if the variable expects list(string)

# With HCL flag:
Key: subnets
Value: ["subnet-abc", "subnet-def"]
# Terraform receives an actual list: ["subnet-abc", "subnet-def"]
# This works correctly
```

Common HCL variable examples:

```hcl
# List of strings
["us-east-1a", "us-east-1b", "us-east-1c"]

# Map of strings
{
  Name        = "my-app"
  Environment = "production"
}

# Object
{
  min_size     = 2
  max_size     = 10
  desired_size = 3
}

# List of objects
[
  {
    name     = "web"
    port     = 80
    protocol = "HTTP"
  },
  {
    name     = "api"
    port     = 8080
    protocol = "HTTP"
  }
]
```

## Organizing Variables Across Workspaces

When you have many workspaces, setting the same variables on each one is tedious. Use these strategies:

### Common Variables in tfvars Files

Commit non-sensitive common values in `terraform.auto.tfvars`:

```hcl
# terraform.auto.tfvars (committed to repo)
project_name = "acme-platform"
team         = "infrastructure"
cost_center  = "CC-1234"
```

### Variable Sets for Shared Values

Variable sets (covered in a [dedicated guide](https://oneuptime.com/blog/post/2026-02-23-variable-sets-hcp-terraform/view)) apply variables to multiple workspaces at once. Use them for:
- Cloud provider credentials shared across workspaces
- Organization-wide tags
- Common configuration values

### Workspace-Specific Variables

Keep workspace-specific values in the workspace itself:
- Environment name
- Instance sizes
- Feature flags specific to that environment

## Listing and Updating Variables

### List all variables on a workspace

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars" | jq '.data[] | {key: .attributes.key, value: .attributes.value, category: .attributes.category}'
```

### Update a variable

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "value": "t3.xlarge"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars/var-VARIABLE_ID"
```

### Delete a variable

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --request DELETE \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars/var-VARIABLE_ID"
```

## Wrapping Up

Variables in HCP Terraform workspaces are the main way to customize your infrastructure per environment. Use Terraform variables for configuration that your `.tf` files reference, environment variables for credentials and runtime settings, mark sensitive values appropriately, and enable the HCL flag for complex data types. For variables shared across workspaces, look into [variable sets](https://oneuptime.com/blog/post/2026-02-23-variable-sets-hcp-terraform/view). For handling secrets securely, check out the guide on [sensitive variables](https://oneuptime.com/blog/post/2026-02-23-sensitive-variables-hcp-terraform/view).
