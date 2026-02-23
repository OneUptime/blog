# How to Publish Modules to HCP Terraform Private Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Terraform Modules, Private Registry, Infrastructure as Code

Description: Learn how to publish and manage reusable Terraform modules in the HCP Terraform private registry for your organization.

---

If you have been working with Terraform for any reasonable amount of time, you know that modules are the backbone of reusable infrastructure code. The HCP Terraform private registry gives your organization a centralized place to publish, version, and share modules internally - without exposing them to the public registry.

In this guide, we will walk through the entire process of publishing modules to the HCP Terraform private registry, from preparing your module code to making it available for your team.

## Why Use a Private Registry?

The public Terraform registry is great for community modules, but most organizations need something more controlled. A private registry lets you:

- Share approved, vetted modules across teams
- Enforce organizational standards through module design
- Version modules independently from the consuming configurations
- Restrict access to modules based on team membership
- Avoid exposing internal infrastructure patterns publicly

## Prerequisites

Before you start, make sure you have:

- An HCP Terraform account with at least a Team & Governance plan (or the free tier for limited use)
- A VCS provider connected to your HCP Terraform organization (GitHub, GitLab, Bitbucket, or Azure DevOps)
- A Git repository containing your Terraform module

## Structuring Your Module Repository

HCP Terraform expects a specific repository naming convention for modules:

```
terraform-<PROVIDER>-<NAME>
```

For example, if you are building an AWS VPC module, your repository should be named:

```
terraform-aws-vpc
```

The module repository itself needs to follow the standard module structure:

```
terraform-aws-vpc/
  main.tf          # Primary resource definitions
  variables.tf     # Input variable declarations
  outputs.tf       # Output value declarations
  versions.tf      # Required provider versions
  README.md        # Module documentation
  examples/        # Example configurations
    basic/
      main.tf
    complete/
      main.tf
  modules/         # Nested submodules (optional)
    subnet/
      main.tf
      variables.tf
      outputs.tf
```

Here is a minimal example of what the root module files might look like:

```hcl
# versions.tf - Pin your provider versions
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}
```

```hcl
# variables.tf - Define inputs with descriptions and validation
variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
}

variable "enable_dns_support" {
  description = "Whether to enable DNS support in the VPC"
  type        = bool
  default     = true
}
```

```hcl
# main.tf - Define your resources
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = var.enable_dns_support
  enable_dns_hostnames = var.enable_dns_support

  tags = {
    Name        = "vpc-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

```hcl
# outputs.tf - Expose useful values
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}
```

## Versioning with Git Tags

HCP Terraform uses Git tags to determine module versions. You need to tag your releases using semantic versioning:

```bash
# Tag your first release
git tag v1.0.0
git push origin v1.0.0

# For subsequent releases
git tag v1.1.0
git push origin v1.1.0
```

Each tag becomes a selectable version in the private registry. Follow semantic versioning conventions:

- **Major** (v2.0.0): Breaking changes
- **Minor** (v1.1.0): New features, backward compatible
- **Patch** (v1.0.1): Bug fixes, backward compatible

## Publishing the Module

### Step 1: Connect Your VCS Provider

If you have not already connected a VCS provider, go to your HCP Terraform organization settings:

1. Navigate to **Settings** > **Providers**
2. Click **Add a VCS Provider**
3. Follow the OAuth setup flow for your provider (GitHub, GitLab, etc.)
4. Authorize the connection

### Step 2: Add the Module to the Registry

1. In HCP Terraform, go to **Registry** in the top navigation
2. Click **Publish** > **Module**
3. Select your connected VCS provider
4. Choose the repository (it should follow the `terraform-<PROVIDER>-<NAME>` naming)
5. Click **Publish Module**

HCP Terraform will automatically detect the Git tags and list them as available versions.

### Step 3: Publishing via the API

You can also publish modules programmatically using the HCP Terraform API:

```bash
# Publish a module from a VCS repository
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "registry-modules",
      "attributes": {
        "vcs-repo": {
          "identifier": "your-org/terraform-aws-vpc",
          "oauth-token-id": "ot-xxxxxxxxxxxxxxxx",
          "display_identifier": "your-org/terraform-aws-vpc"
        }
      }
    }
  }' \
  https://app.terraform.io/api/v2/organizations/your-org/registry-modules/vcs
```

## Using the Published Module

Once published, team members can reference the module in their configurations:

```hcl
# Reference a module from the private registry
module "vpc" {
  source  = "app.terraform.io/your-org/vpc/aws"
  version = "~> 1.0"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

The `source` format for private registry modules is:

```
app.terraform.io/<ORGANIZATION>/<MODULE_NAME>/<PROVIDER>
```

## Managing Module Versions

You can control which versions are available and set version constraints:

```hcl
# Pin to an exact version
module "vpc" {
  source  = "app.terraform.io/your-org/vpc/aws"
  version = "1.2.3"
}

# Allow patch updates only
module "vpc" {
  source  = "app.terraform.io/your-org/vpc/aws"
  version = "~> 1.2.0"
}

# Allow minor updates
module "vpc" {
  source  = "app.terraform.io/your-org/vpc/aws"
  version = "~> 1.0"
}
```

## Adding Module Documentation

Good documentation makes modules actually usable. HCP Terraform renders the README.md from your repository on the module page. Include:

- A clear description of what the module does
- Required and optional inputs with their types and defaults
- Outputs and what they represent
- Usage examples
- Any prerequisites or assumptions

You can also use `terraform-docs` to auto-generate input/output documentation:

```bash
# Install terraform-docs
brew install terraform-docs

# Generate markdown documentation
terraform-docs markdown table . > README.md
```

## Testing Your Modules Before Publishing

Before tagging a release, test your module thoroughly:

```bash
# Initialize and validate
terraform init
terraform validate

# Format check
terraform fmt -check -recursive

# Run a plan with example configuration
cd examples/basic
terraform init
terraform plan
```

Consider adding automated tests using tools like Terratest:

```go
// module_test.go - Basic Terratest example
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
)

func TestVpcModule(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/basic",
    }

    // Clean up after test
    defer terraform.Destroy(t, terraformOptions)

    // Apply the configuration
    terraform.InitAndApply(t, terraformOptions)

    // Validate outputs
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    if vpcId == "" {
        t.Fatal("Expected vpc_id output to be non-empty")
    }
}
```

## Troubleshooting Common Issues

**Module not appearing in registry**: Verify the repository name follows the `terraform-<PROVIDER>-<NAME>` pattern exactly. The provider name must be lowercase.

**Version not showing up**: Make sure you pushed the Git tag to the remote. Tags must follow the `vX.Y.Z` format (the `v` prefix is required).

**Permission errors when consuming the module**: The consuming workspace needs to be in the same organization, and the user needs at least read access to the registry.

**VCS connection issues**: Re-authorize your VCS provider connection if tokens have expired. Check that the repository is accessible with the connected credentials.

## Wrapping Up

The HCP Terraform private registry is a straightforward way to share Terraform modules within your organization. The key things to remember are: follow the naming convention for repositories, use semantic versioning with Git tags, and write solid documentation so your team can actually use the modules you publish.

For related topics, check out our posts on [configuring remote operations in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-remote-operations-in-hcp-terraform/view) and [using workspace tags for organization](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspace-tags-for-organization-in-hcp-terraform/view).
