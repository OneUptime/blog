# Using Private Module Registries in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Private-registry

Description: Learn how to use private module registries in OpenTofu for sharing modules within your organization securely.

Private module registries let organizations share and manage internal modules without exposing them publicly. OpenTofu supports several options for private registries, including Terraform Cloud/Enterprise, Spacelift, Scalr, and self-hosted solutions.

## Terraform Cloud/Enterprise Private Registry

The most common private registry is Terraform Cloud (or Terraform Enterprise for self-hosted):

```hcl
# Configure the registry hostname

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# Reference private registry module
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "~> 2.0"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

## Authentication with Private Registries

```bash
# Create credentials file
mkdir -p ~/.terraform.d
cat > ~/.terraform.d/credentials.tfrc.json << 'EOF'
{
  "credentials": {
    "app.terraform.io": {
      "token": "your-terraform-cloud-token"
    },
    "registry.example.com": {
      "token": "your-private-registry-token"
    }
  }
}
EOF
```

Or use environment variables:

```bash
export TF_TOKEN_app_terraform_io="your-token-here"
export TF_TOKEN_registry_example_com="your-token-here"
```

## CLI Configuration File

```hcl
# ~/.terraformrc or ~/.tofurc
credentials "app.terraform.io" {
  token = "your-token-here"
}

credentials "registry.example.com" {
  token = "your-private-token"
}
```

## Publishing to Terraform Cloud Registry

```bash
# Install the Terraform CLI (or use OpenTofu's `tofu login`)
brew install hashicorp/tap/terraform

# Login to TFC
terraform login

# Or using environment variable
export TF_TOKEN_app_terraform_io="your-token"
```

```hcl
# Module must follow naming: <NAMESPACE>/<MODULE>/<PROVIDER>
# In TFC: myorg/database/aws

module "database" {
  source  = "app.terraform.io/myorg/database/aws"
  version = "1.5.0"

  engine         = "postgres"
  engine_version = "14.6"
  instance_class = "db.t3.medium"
  database_name  = "appdb"
}
```

## Self-Hosted Registry with Gitea

```hcl
# Configure self-hosted registry
terraform {
  # Tell OpenTofu about the private registry
}

# .terraformrc
# credentials "gitea.example.com" {
#   token = "your-gitea-token"
# }

# Reference module from Gitea
module "network" {
  source  = "gitea.example.com/infra-team/network/aws"
  version = ">= 1.0.0"

  cidr_block = "172.16.0.0/12"
}
```

## Using Git as a Private Registry Alternative

For organizations without a formal registry, Git sources work well:

```hcl
module "internal_vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = "prod"
}

# With SSH authentication
module "private_module" {
  source = "git::ssh://git@github.com/myorg/private-modules.git//vpc?ref=v1.0.0"

  cidr_block = "10.0.0.0/16"
}
```

## Organizing Modules in a Monorepo

```text
infrastructure-modules/           # Private GitHub repo
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── rds/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── examples/
    └── full-stack/
        └── main.tf
```

```hcl
# Reference modules from monorepo
module "vpc" {
  source = "git::https://github.com/myorg/infrastructure-modules.git//modules/vpc?ref=v1.2.0"
  cidr   = "10.0.0.0/16"
}

module "eks" {
  source  = "git::https://github.com/myorg/infrastructure-modules.git//modules/eks?ref=v1.2.0"
  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.private_subnets
}
```

## Registry with Version Pinning Strategy

```hcl
# versions.tf - centralize version management
locals {
  module_versions = {
    vpc      = "2.1.0"
    eks      = "1.5.3"
    database = "3.0.1"
  }
}

module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = local.module_versions.vpc

  cidr_block = var.vpc_cidr
}

module "eks" {
  source  = "app.terraform.io/myorg/eks/aws"
  version = local.module_versions.eks

  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.private_subnets
}
```

## Conclusion

Private module registries are essential for enterprise teams who want to share vetted, standardized infrastructure components. Whether using Terraform Cloud, a self-hosted solution, or Git-based distribution, OpenTofu provides flexible authentication and sourcing mechanisms to fit your organization's needs.
