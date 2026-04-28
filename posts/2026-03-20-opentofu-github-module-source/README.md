# Using GitHub as a Module Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, GitHub

Description: Learn how to use GitHub repositories as OpenTofu module sources with the github.com shorthand syntax.

OpenTofu supports a shorthand `github.com` prefix for referencing modules stored in GitHub repositories, without needing to type the full `git::https://` URL.

## GitHub Shorthand Syntax

```hcl
module "vpc" {
  source = "github.com/myorg/terraform-aws-vpc"
}

# With subdirectory

module "vpc" {
  source = "github.com/myorg/terraform-modules//modules/vpc"
}

# With version reference
module "vpc" {
  source = "github.com/myorg/terraform-modules//modules/vpc?ref=v2.1.0"
}
```

## Authentication for Private Repos

```bash
# Using HTTPS with token
export GITHUB_TOKEN="ghp_your_token_here"
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"

# Using SSH
# The github.com/ shorthand always clones over HTTPS.
# To use SSH, use the explicit form instead:
# source = "git@github.com:myorg/repo.git"
```

## Practical Example

```hcl
# Public registry module vs GitHub source
module "vpc_registry" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
}

# Same module from GitHub directly
module "vpc_github" {
  source = "github.com/terraform-aws-modules/terraform-aws-vpc?ref=v5.5.0"
}

# Your org's private modules on GitHub
module "internal_vpc" {
  source = "github.com/mycompany/terraform-modules//networking/vpc?ref=v1.2.0"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

## Conclusion

The `github.com/` shorthand makes it convenient to reference public and private GitHub repositories without the full `git::https://` prefix. Always include a `?ref=` tag reference for production use to ensure reproducible deployments.
