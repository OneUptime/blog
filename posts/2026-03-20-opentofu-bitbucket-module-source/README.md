# Using Bitbucket as a Module Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Bitbucket

Description: Learn how to use Bitbucket repositories as OpenTofu module sources for teams using Atlassian's platform.

OpenTofu supports a `bitbucket.org` shorthand for referencing modules stored in Bitbucket repositories, similar to the GitHub shorthand. Note that this shorthand only works for public repositories, because OpenTofu must call the Bitbucket API to determine whether the repository uses Git or Mercurial. For private repositories, use the full `git::` URL form shown below.

## Bitbucket Shorthand

```hcl
module "vpc" {
  source = "bitbucket.org/myworkspace/terraform-modules//modules/vpc"
}

# With version reference

module "vpc" {
  source = "bitbucket.org/myworkspace/terraform-modules//modules/vpc?ref=v1.0.0"
}
```

## Using Full Git URL for Bitbucket

```hcl
# HTTPS
module "vpc" {
  source = "git::https://bitbucket.org/myworkspace/terraform-modules.git//modules/vpc?ref=v1.0.0"
}

# SSH
module "vpc" {
  source = "git::ssh://git@bitbucket.org/myworkspace/terraform-modules.git//modules/vpc?ref=v1.0.0"
}
```

## Authentication for Private Repositories

```bash
# App passwords for HTTPS
git config --global credential.helper store
echo "https://username:app-password@bitbucket.org" > ~/.git-credentials

# SSH key - add to Bitbucket account Settings > SSH Keys
ssh-keygen -t ed25519 -C "terraform@example.com"
cat ~/.ssh/id_ed25519.pub  # Add this to Bitbucket
```

## Practical Example with Version Tags

```hcl
# Create tags in Bitbucket to version your modules
# git tag v1.2.0 && git push origin v1.2.0

module "networking" {
  source = "bitbucket.org/mycompany/tf-modules//networking/vpc?ref=v1.2.0"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}

module "compute" {
  source = "bitbucket.org/mycompany/tf-modules//compute/eks?ref=v1.2.0"

  vpc_id   = module.networking.vpc_id
  subnets  = module.networking.private_subnets
}
```

## Conclusion

Bitbucket module sources work similarly to GitHub sources. Use the `bitbucket.org/` shorthand for convenience, always pin to a specific `?ref=` tag for production, and configure SSH keys or app passwords for private repository access.
