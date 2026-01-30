# How to Implement Terraform Module Versioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, IaC, DevOps, Modules

Description: Manage Terraform module versions with semantic versioning, version constraints, and registry publishing for reliable infrastructure code.

---

Terraform modules are reusable infrastructure components that teams share across projects. Without proper versioning, a small change to a shared module can break production deployments across your organization. This guide covers everything you need to implement robust module versioning.

## Why Module Versioning Matters

When multiple teams consume the same Terraform module, you need version control to:

- Prevent unexpected changes from breaking existing infrastructure
- Allow gradual rollouts of new module features
- Enable rollback capabilities when issues arise
- Document what changed between releases
- Support multiple versions simultaneously for different environments

## Understanding Semantic Versioning for Terraform Modules

Semantic versioning (SemVer) uses a three-part version number: MAJOR.MINOR.PATCH

| Version Component | When to Increment | Example Changes |
|-------------------|-------------------|-----------------|
| MAJOR | Breaking changes | Removed variables, renamed outputs, changed resource types |
| MINOR | New features (backward compatible) | Added optional variables, new outputs, new resources |
| PATCH | Bug fixes (backward compatible) | Fixed default values, corrected resource configurations |

Here is an example of how versions progress:

```
1.0.0 - Initial stable release
1.0.1 - Fixed incorrect default value for instance_type
1.1.0 - Added support for custom tags variable
1.2.0 - Added CloudWatch alarm outputs
2.0.0 - Renamed vpc_id to network_id (breaking change)
```

## Version Constraints Syntax

Terraform provides several operators for specifying version constraints. Understanding these is critical for managing module dependencies.

### Basic Version Constraints

The simplest constraint pins to an exact version:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"
}
```

### Comparison Operators

Use comparison operators when you need flexibility:

```hcl
# Greater than or equal to version 5.0.0
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = ">= 5.0.0"

  name = "staging-vpc"
  cidr = "10.1.0.0/16"
}

# Greater than 4.0.0 but less than 6.0.0
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "> 4.0.0, < 6.0.0"

  name = "dev-vpc"
  cidr = "10.2.0.0/16"
}
```

### Pessimistic Constraint Operator

The pessimistic constraint operator (~>) is particularly useful for allowing patch updates while preventing major or minor version changes:

```hcl
# Allows 5.1.x but not 5.2.0 or higher
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"
}

# Allows 5.x.x but not 6.0.0 or higher
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "staging-vpc"
  cidr = "10.1.0.0/16"
}
```

### Version Constraint Reference Table

| Constraint | Meaning | Allowed Versions (if current is 5.1.2) |
|------------|---------|----------------------------------------|
| `= 5.1.2` | Exact version | 5.1.2 only |
| `!= 5.1.2` | Not this version | Any except 5.1.2 |
| `> 5.1.2` | Greater than | 5.1.3, 5.2.0, 6.0.0, etc. |
| `>= 5.1.2` | Greater than or equal | 5.1.2, 5.1.3, 5.2.0, etc. |
| `< 5.1.2` | Less than | 5.1.1, 5.1.0, 5.0.0, etc. |
| `<= 5.1.2` | Less than or equal | 5.1.2, 5.1.1, 5.0.0, etc. |
| `~> 5.1.2` | Pessimistic (patch) | 5.1.2, 5.1.3, 5.1.99 (not 5.2.0) |
| `~> 5.1` | Pessimistic (minor) | 5.1.0, 5.2.0, 5.99.0 (not 6.0.0) |

## Using Git Tags for Module Versions

For private modules hosted in Git repositories, use Git tags to create versions.

### Creating Version Tags

First, prepare your module repository structure:

```bash
# Your module repository structure
my-terraform-module/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
├── README.md
├── examples/
│   └── complete/
│       ├── main.tf
│       └── outputs.tf
└── CHANGELOG.md
```

Create and push version tags:

```bash
# Create an annotated tag for version 1.0.0
git tag -a v1.0.0 -m "Initial stable release"

# Push the tag to remote
git push origin v1.0.0

# Create a new version after making changes
git add .
git commit -m "Add support for custom instance types"
git tag -a v1.1.0 -m "Add custom instance type support"
git push origin v1.1.0
```

### Referencing Git Tags in Module Source

Reference specific versions using the ref parameter:

```hcl
# Using HTTPS with a specific tag
module "app_server" {
  source = "git::https://github.com/myorg/terraform-aws-app-server.git?ref=v1.1.0"

  instance_type = "t3.medium"
  environment   = "production"
}

# Using SSH with a specific tag
module "app_server" {
  source = "git::ssh://git@github.com/myorg/terraform-aws-app-server.git?ref=v1.1.0"

  instance_type = "t3.medium"
  environment   = "production"
}

# Using GitHub shorthand syntax
module "app_server" {
  source = "github.com/myorg/terraform-aws-app-server?ref=v1.1.0"

  instance_type = "t3.medium"
  environment   = "production"
}
```

### Git Reference Options

You can reference different Git objects:

```hcl
# Reference a specific tag
module "example" {
  source = "git::https://github.com/myorg/module.git?ref=v1.0.0"
}

# Reference a specific branch (not recommended for production)
module "example" {
  source = "git::https://github.com/myorg/module.git?ref=feature-branch"
}

# Reference a specific commit SHA (most precise)
module "example" {
  source = "git::https://github.com/myorg/module.git?ref=a1b2c3d4e5f6"
}
```

## Publishing to the Terraform Registry

The public Terraform Registry provides version management, documentation generation, and easy discovery for your modules.

### Requirements for Registry Publishing

Your module must meet these requirements:

1. Repository name follows the pattern `terraform-<PROVIDER>-<NAME>`
2. Repository is public on GitHub
3. Contains a valid `README.md` file
4. Has at least one release tag in SemVer format

### Module Structure for Registry

Create a well-structured module for registry publishing:

```hcl
# versions.tf - Specify required Terraform and provider versions
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }
}
```

```hcl
# variables.tf - Define input variables with descriptions
variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring for EC2 instances"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# outputs.tf - Define outputs with descriptions
output "instance_id" {
  description = "ID of the created EC2 instance"
  value       = aws_instance.main.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.main.public_ip
}

output "instance_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = aws_instance.main.private_ip
}

output "security_group_id" {
  description = "ID of the security group attached to the instance"
  value       = aws_security_group.main.id
}
```

```hcl
# main.tf - Core module logic
locals {
  common_tags = merge(
    {
      Name        = var.name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_security_group" "main" {
  name_prefix = "${var.name}-"
  description = "Security group for ${var.name}"

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_instance" "main" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.main.id]

  monitoring = var.enable_monitoring

  tags = local.common_tags
}
```

### Publishing Process

Follow these steps to publish your module:

```bash
# 1. Create your module repository on GitHub
# Name it: terraform-aws-app-server

# 2. Initialize and push your code
git init
git add .
git commit -m "Initial module implementation"
git remote add origin git@github.com:myorg/terraform-aws-app-server.git
git push -u origin main

# 3. Create a release tag
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# 4. Sign in to registry.terraform.io with your GitHub account
# 5. Click "Publish" and select your repository
# 6. The registry will automatically detect your tags as versions
```

### Using Published Modules

After publishing, reference your module with the registry syntax:

```hcl
module "app_server" {
  source  = "myorg/app-server/aws"
  version = "~> 1.0"

  name        = "web-server"
  environment = "production"

  instance_type     = "t3.medium"
  enable_monitoring = true

  tags = {
    Team    = "platform"
    Project = "api"
  }
}
```

## Setting Up a Private Registry

For organizations that need to keep modules internal, several private registry options exist.

### Terraform Cloud Private Registry

Terraform Cloud includes a private module registry:

```hcl
# Configure Terraform Cloud
terraform {
  cloud {
    organization = "my-organization"

    workspaces {
      name = "production"
    }
  }
}

# Use a private module from Terraform Cloud
module "internal_vpc" {
  source  = "app.terraform.io/my-organization/vpc/aws"
  version = "2.1.0"

  name = "internal-vpc"
  cidr = "10.0.0.0/16"
}
```

### Self-Hosted Registry with Terraform Enterprise

For on-premises installations:

```hcl
# Configure Terraform Enterprise
terraform {
  backend "remote" {
    hostname     = "terraform.mycompany.com"
    organization = "infrastructure"

    workspaces {
      name = "production"
    }
  }
}

# Use modules from your private registry
module "database" {
  source  = "terraform.mycompany.com/infrastructure/database/aws"
  version = "3.0.1"

  name           = "production-db"
  engine         = "postgres"
  engine_version = "14"
  instance_class = "db.r6g.large"
}
```

### Alternative: S3 Backend for Module Storage

For simpler setups, you can host modules in S3:

```hcl
# Reference a module from S3
module "networking" {
  source = "s3::https://s3-us-west-2.amazonaws.com/my-terraform-modules/networking/v1.2.0.zip"

  vpc_cidr = "10.0.0.0/16"
}
```

Create a script to package and upload modules:

```bash
#!/bin/bash
# publish-module.sh - Package and upload module to S3

MODULE_NAME=$1
VERSION=$2
BUCKET="my-terraform-modules"

if [ -z "$MODULE_NAME" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./publish-module.sh <module-name> <version>"
    exit 1
fi

# Create a zip archive of the module
zip -r "${MODULE_NAME}-${VERSION}.zip" . \
    -x "*.git*" \
    -x "*.terraform*" \
    -x "*.tfstate*" \
    -x "examples/*"

# Upload to S3
aws s3 cp "${MODULE_NAME}-${VERSION}.zip" \
    "s3://${BUCKET}/${MODULE_NAME}/${VERSION}.zip"

# Clean up local zip file
rm "${MODULE_NAME}-${VERSION}.zip"

echo "Published ${MODULE_NAME} version ${VERSION} to S3"
```

## Version Pinning Strategies

Different environments and use cases require different version pinning approaches.

### Strategy 1: Exact Pinning (Most Conservative)

Best for production environments where stability is critical:

```hcl
# production/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"  # Exact version pinning

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.15.3"  # Exact version pinning

  cluster_name    = "production-cluster"
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
}
```

### Strategy 2: Pessimistic Pinning (Balanced)

Allows patch updates while preventing breaking changes:

```hcl
# staging/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1.0"  # Allows 5.1.x updates

  name = "staging-vpc"
  cidr = "10.1.0.0/16"

  azs             = ["us-west-2a", "us-west-2b"]
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24"]
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.15"  # Allows 19.15.x updates

  cluster_name    = "staging-cluster"
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
}
```

### Strategy 3: Range Pinning (Flexible)

For development environments where you want to test newer versions:

```hcl
# development/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = ">= 5.0.0, < 6.0.0"  # Any 5.x version

  name = "dev-vpc"
  cidr = "10.2.0.0/16"

  azs             = ["us-west-2a"]
  private_subnets = ["10.2.1.0/24"]
  public_subnets  = ["10.2.101.0/24"]
}
```

### Strategy Comparison Table

| Strategy | Constraint Example | Pros | Cons | Best For |
|----------|-------------------|------|------|----------|
| Exact | `= 5.1.2` | Maximum stability, reproducible builds | Manual updates required | Production |
| Pessimistic Patch | `~> 5.1.0` | Auto bug fixes, stable features | Might miss security patches in newer minors | Staging |
| Pessimistic Minor | `~> 5.0` | Auto features and fixes | Potential for unexpected behavior | Development |
| Range | `>= 5.0, < 6.0` | Maximum flexibility | Inconsistent builds | Testing |

### Centralized Version Management

Create a central versions file for consistent pinning across your organization:

```hcl
# modules/versions.tf - Central version definitions
locals {
  module_versions = {
    vpc = {
      source  = "terraform-aws-modules/vpc/aws"
      version = "5.1.2"
    }
    eks = {
      source  = "terraform-aws-modules/eks/aws"
      version = "19.15.3"
    }
    rds = {
      source  = "terraform-aws-modules/rds/aws"
      version = "6.1.1"
    }
    s3 = {
      source  = "terraform-aws-modules/s3-bucket/aws"
      version = "3.14.1"
    }
  }
}
```

```hcl
# production/main.tf - Use centralized versions
module "versions" {
  source = "../modules/versions.tf"
}

module "vpc" {
  source  = local.module_versions.vpc.source
  version = local.module_versions.vpc.version

  name = "production-vpc"
  cidr = "10.0.0.0/16"
}
```

## Module Upgrade Workflows

Upgrading modules requires careful planning to avoid service disruptions.

### Pre-Upgrade Checklist

Before upgrading any module:

```bash
# 1. Review the changelog for breaking changes
# Visit the module's GitHub releases page or CHANGELOG.md

# 2. Check current state
terraform state list | grep module

# 3. Create a backup of the state file
terraform state pull > terraform.tfstate.backup

# 4. Review what will change with the new version
terraform init -upgrade
terraform plan -out=upgrade.plan
```

### Step-by-Step Upgrade Process

Follow this workflow for safe module upgrades:

```hcl
# Step 1: Update the version in your configuration
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.2.0"  # Updated from 5.1.2

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}
```

```bash
# Step 2: Initialize with the new version
terraform init -upgrade

# Step 3: Review the plan carefully
terraform plan -out=upgrade.plan

# Look for:
# - Resources being destroyed and recreated
# - Unexpected changes to existing resources
# - New resources being added

# Step 4: Apply during a maintenance window
terraform apply upgrade.plan

# Step 5: Verify the deployment
terraform output
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=production-vpc"
```

### Handling Breaking Changes

When a module has breaking changes, you may need to migrate state:

```bash
# Example: Module renamed an output from vpc_id to network_id

# 1. Check current state addresses
terraform state list

# 2. If resources were renamed, use state mv
terraform state mv \
  module.old_vpc.aws_vpc.this \
  module.new_vpc.aws_vpc.this

# 3. If the module restructured resources, you may need multiple moves
terraform state mv \
  'module.vpc.aws_subnet.private[0]' \
  'module.vpc.aws_subnet.private["us-west-2a"]'
```

### Automated Upgrade Testing

Create a CI pipeline to test module upgrades:

```yaml
# .github/workflows/module-upgrade-test.yml
name: Module Upgrade Test

on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  test-upgrade:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Terraform Init
        run: terraform init -upgrade
        working-directory: ./environments/staging

      - name: Terraform Validate
        run: terraform validate
        working-directory: ./environments/staging

      - name: Terraform Plan
        run: terraform plan -detailed-exitcode
        working-directory: ./environments/staging
        continue-on-error: true

      - name: Check for Breaking Changes
        run: |
          if terraform plan -detailed-exitcode 2>&1 | grep -q "must be replaced"; then
            echo "WARNING: This upgrade will destroy and recreate resources"
            exit 1
          fi
        working-directory: ./environments/staging
```

## Lock Files and Reproducible Builds

Terraform uses `.terraform.lock.hcl` to ensure reproducible builds.

### Understanding the Lock File

The lock file records exact versions and checksums:

```hcl
# .terraform.lock.hcl - Auto-generated, do not edit manually
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.17.0"
  constraints = ">= 4.0.0, >= 5.0.0"
  hashes = [
    "h1:8d+3XQeE...",
    "zh:0345784...",
  ]
}
```

### Lock File Best Practices

```bash
# Always commit the lock file to version control
git add .terraform.lock.hcl
git commit -m "Update provider lock file"

# Update providers while respecting constraints
terraform init -upgrade

# Update a specific provider
terraform init -upgrade=hashicorp/aws

# Generate checksums for multiple platforms
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64
```

## Versioning Your Own Modules

When creating modules for your organization, follow these guidelines.

### Version Lifecycle

```bash
# Start with 0.x versions during development
git tag -a v0.1.0 -m "Initial development release"

# Release 1.0.0 when the API is stable
git tag -a v1.0.0 -m "First stable release - API is now stable"

# Increment appropriately based on changes
git tag -a v1.0.1 -m "Fix: Corrected default security group rules"
git tag -a v1.1.0 -m "Feature: Add support for custom IAM roles"
git tag -a v2.0.0 -m "Breaking: Renamed vpc_id variable to network_id"
```

### CHANGELOG Best Practices

Maintain a clear changelog:

```markdown
# Changelog

All notable changes to this module will be documented in this file.

## [2.0.0] - 2024-01-15

### Breaking Changes
- Renamed `vpc_id` variable to `network_id` for consistency
- Removed deprecated `legacy_mode` variable

### Added
- Support for IPv6 CIDR blocks
- New `network_acl_rules` output

### Fixed
- Security group rule ordering issue

## [1.1.0] - 2024-01-10

### Added
- Optional NAT Gateway high availability mode
- Custom route table associations

### Changed
- Default instance tenancy changed from dedicated to default

## [1.0.1] - 2024-01-05

### Fixed
- Incorrect default value for enable_dns_hostnames

## [1.0.0] - 2024-01-01

### Added
- Initial stable release
- VPC creation with public and private subnets
- Internet Gateway and NAT Gateway support
- Configurable CIDR blocks and availability zones
```

### Deprecation Workflow

When deprecating features, provide clear migration paths:

```hcl
# variables.tf - Deprecation with validation
variable "legacy_mode" {
  description = "DEPRECATED: This variable will be removed in v3.0.0. Use 'compatibility_mode' instead."
  type        = bool
  default     = null

  validation {
    condition     = var.legacy_mode == null
    error_message = "The 'legacy_mode' variable is deprecated. Please migrate to 'compatibility_mode'."
  }
}

variable "compatibility_mode" {
  description = "Enable compatibility mode for legacy systems"
  type        = bool
  default     = false
}

# main.tf - Handle deprecation gracefully
locals {
  # Support both old and new variable names during transition
  effective_compatibility_mode = coalesce(var.legacy_mode, var.compatibility_mode, false)
}
```

## Conclusion

Terraform module versioning is essential for maintaining reliable infrastructure at scale. Key takeaways:

1. Use semantic versioning to communicate the impact of changes
2. Pin production modules to exact versions for stability
3. Use pessimistic constraints for staging environments
4. Test upgrades thoroughly before applying to production
5. Maintain clear changelogs and deprecation notices
6. Commit lock files to ensure reproducible builds

Start with exact version pinning in production and gradually adopt more flexible constraints as your team gains confidence in the upgrade process. The goal is balancing stability with the ability to receive important updates.
