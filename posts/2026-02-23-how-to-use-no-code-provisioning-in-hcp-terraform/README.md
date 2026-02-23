# How to Use No-Code Provisioning in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, No-Code, Self-Service, Infrastructure Provisioning

Description: Set up and use no-code provisioning in HCP Terraform to let non-technical users deploy infrastructure through a simple web form.

---

Not everyone who needs infrastructure knows how to write Terraform. Product managers need demo environments, QA teams need testing stacks, and sales engineers need customer POC setups. No-code provisioning in HCP Terraform lets you create self-service infrastructure workflows where users fill out a form and get working infrastructure without writing a single line of HCL.

## How No-Code Provisioning Works

The concept is straightforward. A platform team creates a Terraform module, publishes it to the private registry, and enables it for no-code provisioning. End users then visit the HCP Terraform UI, select the module, fill in the required variables through a web form, and click deploy. HCP Terraform creates a workspace, sets the variables, and runs the module.

The end user never sees Terraform code. They interact with a simple form that asks questions like "What region?" and "How many instances?" and the platform team's module handles the rest.

## Prerequisites

No-code provisioning requires:

- HCP Terraform Plus tier (or Terraform Enterprise)
- A module published to your private registry
- The module must be marked as no-code ready
- Users need at least workspace-level permissions

## Step 1: Create the Module

Build a module that is self-contained and well-documented. Good no-code modules have clear variable descriptions, sensible defaults, and validation rules:

```hcl
# modules/web-app/variables.tf

variable "app_name" {
  type        = string
  description = "Name of the application (lowercase, alphanumeric, hyphens only)"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.app_name))
    error_message = "App name must be lowercase alphanumeric with hyphens only."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "staging"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "instance_type" {
  type        = string
  description = "Size of the compute instance"
  default     = "t3.small"

  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium", "t3.large"], var.instance_type)
    error_message = "Instance type must be one of: t3.micro, t3.small, t3.medium, t3.large."
  }
}

variable "enable_database" {
  type        = bool
  description = "Whether to create a database for the application"
  default     = false
}

variable "region" {
  type        = string
  description = "AWS region for deployment"
  default     = "us-east-1"
}
```

```hcl
# modules/web-app/main.tf

provider "aws" {
  region = var.region
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Name        = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform-no-code"
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  owners = ["099720109477"]
}

resource "aws_db_instance" "app" {
  count = var.enable_database ? 1 : 0

  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro"
  allocated_storage = 20
  db_name        = replace(var.app_name, "-", "")
  username       = "appuser"
  password       = random_password.db[0].result

  skip_final_snapshot = var.environment != "production"

  tags = {
    Name        = "${var.app_name}-database"
    Environment = var.environment
  }
}

resource "random_password" "db" {
  count   = var.enable_database ? 1 : 0
  length  = 24
  special = true
}
```

```hcl
# modules/web-app/outputs.tf

output "app_public_ip" {
  value       = aws_instance.app.public_ip
  description = "Public IP address of the application server"
}

output "database_endpoint" {
  value       = var.enable_database ? aws_db_instance.app[0].endpoint : "No database created"
  description = "Database connection endpoint"
}
```

## Step 2: Publish to the Private Registry

Push the module to a VCS repository following the naming convention `terraform-<PROVIDER>-<NAME>`:

```bash
# Repository name: terraform-aws-web-app
# Structure:
# terraform-aws-web-app/
#   main.tf
#   variables.tf
#   outputs.tf
#   README.md
```

Then publish it through the HCP Terraform UI:

1. Go to **Registry** > **Modules** > **Publish**
2. Select your VCS provider and repository
3. Choose the module and click **Publish module**

Or publish via the API:

```bash
# Publish a module from a VCS repository
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "registry-modules",
      "attributes": {
        "vcs-repo": {
          "identifier": "my-org/terraform-aws-web-app",
          "oauth-token-id": "ot-abc123",
          "display_identifier": "my-org/terraform-aws-web-app"
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-company/registry-modules"
```

## Step 3: Enable No-Code Provisioning

After publishing, enable the module for no-code use:

1. In the Registry, find your module
2. Click **Configure no-code provisioning**
3. Set the default variable values and which variables users can override
4. Configure the workspace settings (auto-apply, execution mode)
5. Set up variable sets for credentials (AWS keys, etc.)

The key configuration decisions here are:

- Which variables should users see vs. which should be hidden with defaults
- What workspace naming convention to use
- Whether to auto-apply or require manual confirmation

```bash
# Enable no-code provisioning via API
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "no-code-modules",
      "attributes": {
        "enabled": true,
        "version-pin": "1.2.0"
      },
      "relationships": {
        "registry-module": {
          "data": {
            "type": "registry-modules",
            "id": "mod-abc123"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-company/no-code-modules"
```

## Step 4: Configure Variable Options

For the best user experience, pre-configure variable options so users select from dropdown menus instead of typing free-form text:

```bash
# Set variable options for the no-code module
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "no-code-modules",
      "attributes": {
        "variable-options": [
          {
            "variable-name": "region",
            "variable-type": "string",
            "options": ["us-east-1", "us-west-2", "eu-west-1"]
          },
          {
            "variable-name": "instance_type",
            "variable-type": "string",
            "options": ["t3.micro", "t3.small", "t3.medium"]
          },
          {
            "variable-name": "environment",
            "variable-type": "string",
            "options": ["development", "staging"]
          }
        ]
      }
    }
  }' \
  "https://app.terraform.io/api/v2/no-code-modules/nocode-abc123"
```

## The End User Experience

Once everything is configured, end users see a streamlined workflow:

1. Log into HCP Terraform
2. Click **New** > **No-code workspace**
3. Select the module (e.g., "Web Application")
4. Fill in the form (app name, environment, instance size)
5. Click **Create workspace**
6. The workspace is created and the run starts automatically

The user sees the run progress and eventually gets the outputs (like the public IP address) without touching any code.

## Combining with Auto-Destroy

For temporary environments, combine no-code provisioning with auto-destroy:

```bash
# After a no-code workspace is created, set auto-destroy
WORKSPACE_NAME="web-app-demo-customer-xyz"
DESTROY_AT=$(date -u -d "+48 hours" +%Y-%m-%dT%H:%M:%SZ)

curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"auto-destroy-at\": \"$DESTROY_AT\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/organizations/my-company/workspaces/$WORKSPACE_NAME"
```

This gives you self-service ephemeral environments that clean up automatically.

## Module Design Best Practices

When designing modules for no-code use:

- Use extensive validation rules to prevent user errors
- Provide sensible defaults for everything except the resource name
- Include clear descriptions on every variable
- Limit options to what your organization actually supports
- Include cost tags so finance can track spending
- Test the destroy path - auto-destroy must work cleanly

## Security Considerations

No-code provisioning does not bypass security. All Sentinel policies still apply, and the credentials come from variable sets managed by the platform team. End users never see or manage cloud credentials.

```python
# sentinel-policy.sentinel
# Enforce tags even on no-code provisioned resources
import "tfplan/v2" as tfplan

main = rule {
    all tfplan.resource_changes as _, rc {
        rc.change.after.tags contains "Environment" and
        rc.change.after.tags contains "ManagedBy"
    }
}
```

## Summary

No-code provisioning turns your Terraform modules into self-service infrastructure products. Platform teams maintain the modules and security policies while end users deploy infrastructure through a simple web form. It reduces the barrier to getting infrastructure without sacrificing governance or control. Start with a single, well-tested module and expand your no-code catalog as adoption grows.
