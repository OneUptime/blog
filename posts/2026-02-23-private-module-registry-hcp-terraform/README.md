# How to Use Private Module Registry in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Module Registry, Modules, DevOps

Description: Set up and use the private module registry in HCP Terraform to publish, version, and share reusable Terraform modules across your organization's workspaces.

---

The private module registry in HCP Terraform gives your organization a central place to publish, discover, and consume reusable Terraform modules. Instead of referencing Git URLs with specific commits or tags, your teams use versioned module sources that look like the public Terraform Registry. Module authors publish updates, consumers pick them up by bumping a version number, and everyone works from a shared catalog of approved infrastructure patterns.

This guide covers publishing modules, consuming them, and managing your private registry effectively.

## Why a Private Registry

Without a private registry, sharing modules typically means:

```hcl
# Git source - works but has downsides
module "vpc" {
  source = "git::https://github.com/acme/terraform-modules.git//modules/vpc?ref=v1.2.0"
}
```

This approach has problems:
- No discoverability (you need to know the repo exists)
- No documentation browsing
- No standardized versioning beyond Git tags
- No visibility into which workspaces use which module versions

The private registry solves all of these:

```hcl
# Registry source - clean and versioned
module "vpc" {
  source  = "app.terraform.io/acme-infrastructure/vpc/aws"
  version = "~> 1.2"
}
```

## Publishing a Module

### Publishing from a VCS Repository

The easiest way to publish a module is connecting it to a VCS repository. HCP Terraform watches the repository for new tags and automatically publishes new versions.

**Repository naming convention:** The repository must be named `terraform-<PROVIDER>-<NAME>`. For example:
- `terraform-aws-vpc` for an AWS VPC module
- `terraform-azurerm-network` for an Azure network module
- `terraform-google-gke` for a GCP GKE module

**Repository structure:**

```
terraform-aws-vpc/
  main.tf          # Module resources
  variables.tf     # Input variables
  outputs.tf       # Output values
  versions.tf      # Required providers
  README.md        # Module documentation (rendered in the registry)
  examples/
    basic/
      main.tf
    complete/
      main.tf
  modules/         # Submodules (optional)
    public-subnet/
      main.tf
      variables.tf
      outputs.tf
```

**Publishing steps:**

1. Navigate to your organization's **Registry**
2. Click **Publish** > **Module**
3. Select **GitHub** (or your VCS provider)
4. Choose the repository `terraform-aws-vpc`
5. Click **Publish module**

HCP Terraform reads the repository and creates a module entry. It looks for Git tags following semantic versioning (e.g., `v1.0.0`, `v1.1.0`) and publishes each tag as a module version.

### Publishing via the tfe Provider

```hcl
resource "tfe_registry_module" "vpc" {
  organization = var.organization

  vcs_repo {
    display_identifier = "acme/terraform-aws-vpc"
    identifier         = "acme/terraform-aws-vpc"
    oauth_token_id     = data.tfe_oauth_client.github.oauth_token_id
  }
}
```

### Publishing via the API

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
          "identifier": "acme/terraform-aws-vpc",
          "oauth-token-id": "ot-abc123",
          "display_identifier": "acme/terraform-aws-vpc"
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/registry-modules"
```

### Publishing Without VCS

You can also publish modules by uploading a tarball directly:

```bash
# Create a module version
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "registry-module-versions",
      "attributes": {
        "version": "1.3.0"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/registry-modules/private/acme-infrastructure/vpc/aws/versions"

# Upload the module source
# The response includes an upload URL
tar -czf module.tar.gz -C ./terraform-aws-vpc .
curl \
  --header "Content-Type: application/octet-stream" \
  --request PUT \
  --data-binary @module.tar.gz \
  "$UPLOAD_URL"
```

## Consuming Private Modules

### In Terraform Configuration

Reference private modules using the registry source format:

```hcl
# Use the private VPC module
module "vpc" {
  source  = "app.terraform.io/acme-infrastructure/vpc/aws"
  version = "~> 1.2"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  environment        = var.environment
}

# Use the private ECS module
module "ecs_cluster" {
  source  = "app.terraform.io/acme-infrastructure/ecs-cluster/aws"
  version = "2.0.0"

  cluster_name = "my-app"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
}
```

The `source` format is: `app.terraform.io/<ORGANIZATION>/<MODULE_NAME>/<PROVIDER>`

### Version Constraints

Use standard Terraform version constraints:

```hcl
# Exact version
module "vpc" {
  source  = "app.terraform.io/acme-infrastructure/vpc/aws"
  version = "1.2.3"
}

# Compatible versions (>= 1.2.0, < 2.0.0)
module "vpc" {
  source  = "app.terraform.io/acme-infrastructure/vpc/aws"
  version = "~> 1.2"
}

# Range
module "vpc" {
  source  = "app.terraform.io/acme-infrastructure/vpc/aws"
  version = ">= 1.2.0, < 1.5.0"
}
```

### Authentication for Private Modules

For CLI-driven and local workflows, authentication happens through `terraform login`:

```bash
terraform login
# Authenticates with app.terraform.io
# Token stored at ~/.terraform.d/credentials.tfrc.json
```

For CI/CD pipelines:

```bash
# Create a credentials file
cat > ~/.terraform.d/credentials.tfrc.json <<EOF
{
  "credentials": {
    "app.terraform.io": {
      "token": "$TFC_TOKEN"
    }
  }
}
EOF
```

For VCS-driven and API-driven workspaces in HCP Terraform, authentication to the private registry is automatic.

## Browsing the Registry

The private registry UI provides:

- **Module listing** - All published modules with descriptions
- **Version history** - Every published version with changelogs
- **Documentation** - Rendered README.md for each module
- **Input variables** - Automatically extracted from `variables.tf`
- **Output values** - Automatically extracted from `outputs.tf`
- **Required providers** - Extracted from `versions.tf`
- **Examples** - Code from the `examples/` directory
- **Dependencies** - Which other modules this module depends on

This documentation is generated automatically from the module's source code. Write good READMEs and variable descriptions, and the registry becomes self-documenting.

## Versioning Best Practices

Follow semantic versioning for module releases:

- **Major version** (1.0.0 -> 2.0.0): Breaking changes (removed variables, changed resource names, changed outputs)
- **Minor version** (1.0.0 -> 1.1.0): New features (new variables, new resources, new outputs) that are backward compatible
- **Patch version** (1.0.0 -> 1.0.1): Bug fixes with no interface changes

```bash
# Tag a new version in your module repository
git tag v1.3.0
git push origin v1.3.0

# HCP Terraform automatically detects the new tag and publishes the version
```

### Release Process

A solid module release process:

1. Develop changes on a feature branch
2. Open a PR with updated README and examples
3. Review and merge the PR
4. Tag the merge commit with the new version
5. HCP Terraform publishes the new version automatically
6. Notify consumers via Slack or email

```bash
# Example release script
VERSION=$1

# Ensure we are on main
git checkout main
git pull

# Create and push the tag
git tag "v${VERSION}"
git push origin "v${VERSION}"

echo "Published module version ${VERSION}"
```

## Managing Module Consumers

### Finding Which Workspaces Use a Module

The registry UI shows module usage statistics. You can also query the API:

```bash
# List all modules in the registry
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/registry-modules"
```

### Deprecating a Module Version

When a version has issues, you can mark it as deprecated. Consumers see a warning but can still use it:

```bash
# Delete a specific version (use with caution)
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --request DELETE \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/registry-modules/private/acme-infrastructure/vpc/aws/1.2.0"
```

## Module Design Guidelines

Modules in the private registry should follow these guidelines for a good consumer experience:

### Clear Variable Descriptions

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC. Must be a /16 or larger. Example: 10.0.0.0/16"
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}
```

### Meaningful Outputs

```hcl
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs, one per availability zone"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs, one per availability zone"
  value       = aws_subnet.public[*].id
}
```

### Working Examples

```hcl
# examples/basic/main.tf

module "vpc" {
  source  = "app.terraform.io/acme-infrastructure/vpc/aws"
  version = "~> 1.0"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
  environment        = "dev"
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
```

## Wrapping Up

The private module registry transforms how your organization shares and consumes Terraform modules. Publish modules from VCS repositories with semantic versioning, consume them with clean registry source references, and leverage the built-in documentation for discoverability. The registry creates a standardized library of approved infrastructure patterns that teams can adopt without reinventing the wheel. Start by publishing your most commonly used modules and gradually build a comprehensive catalog.
