# How to Use Registry Modules Across Organizations in HCP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Registry, Modules, Organization Management

Description: Learn how to share and consume Terraform registry modules across multiple HCP Terraform organizations for reusable infrastructure.

---

When your company uses multiple HCP Terraform organizations - maybe one per business unit, or separate ones for production and development - sharing Terraform modules between them becomes a challenge. The private registry is scoped to a single organization by default, which means a module published in org A is not visible in org B. This post covers the options for sharing modules across organizations and the trade-offs of each approach.

## The Problem

Each HCP Terraform organization has its own private registry. When you publish a module to the registry in "org-platform-team", workspaces in "org-application-team" cannot reference it:

```hcl
# This ONLY works in org-platform-team
module "vpc" {
  source  = "app.terraform.io/org-platform-team/vpc/aws"
  version = "1.0.0"

  cidr_block = "10.0.0.0/16"
}
```

If you try to use this module source in a workspace belonging to a different organization, Terraform cannot find it.

## Option 1: Public Terraform Registry

The simplest cross-organization sharing method is to publish modules to the public Terraform registry at registry.terraform.io. Public modules are accessible to everyone:

```hcl
# Public registry modules work everywhere
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```

The downside is obvious: your modules are public. If your modules contain company-specific patterns or intellectual property, this is not an option.

## Option 2: Git Source References

Instead of using the private registry, reference modules directly from Git repositories. Any organization can access them as long as authentication is configured:

```hcl
# Reference a module from a Git repository
module "vpc" {
  source = "git::https://github.com/my-company/terraform-aws-vpc.git?ref=v1.0.0"

  cidr_block = "10.0.0.0/16"
}
```

For private repositories, configure Git credentials in the workspace:

```bash
# Set Git credentials as environment variables in the workspace
# For HTTPS access
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "GIT_SSH_COMMAND",
        "value": "ssh -i /path/to/key -o StrictHostKeyChecking=no",
        "category": "env",
        "sensitive": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars"
```

Or use SSH:

```hcl
# SSH-based Git reference
module "vpc" {
  source = "git::ssh://git@github.com/my-company/terraform-aws-vpc.git?ref=v1.0.0"

  cidr_block = "10.0.0.0/16"
}
```

## Option 3: Publish to Multiple Registries

If you need the private registry experience in multiple organizations, publish the same module to each organization's registry. Automate this with a CI/CD pipeline:

```bash
#!/bin/bash
# publish-module-to-all-orgs.sh
# Publishes a module to multiple organization registries

MODULE_REPO="my-company/terraform-aws-vpc"
VCS_TOKEN_ID="ot-abc123"  # OAuth token for VCS provider

# List of organizations to publish to
ORGS=("org-platform" "org-app-team" "org-data-team")

for ORG in "${ORGS[@]}"; do
  echo "Publishing to $ORG..."

  # Check if module already exists
  EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
    --header "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/organizations/$ORG/registry-modules/private/$ORG/vpc/aws")

  if [ "$EXISTS" = "404" ]; then
    # Create the module
    curl -s \
      --request POST \
      --header "Authorization: Bearer $TF_TOKEN" \
      --header "Content-Type: application/vnd.api+json" \
      --data "{
        \"data\": {
          \"type\": \"registry-modules\",
          \"attributes\": {
            \"vcs-repo\": {
              \"identifier\": \"$MODULE_REPO\",
              \"oauth-token-id\": \"$VCS_TOKEN_ID\",
              \"display_identifier\": \"$MODULE_REPO\"
            }
          }
        }
      }" \
      "https://app.terraform.io/api/v2/organizations/$ORG/registry-modules"

    echo "Published to $ORG"
  else
    echo "Module already exists in $ORG"
  fi
done
```

The challenge with this approach is keeping versions synchronized across organizations. When you release a new module version, it needs to be picked up by all registries.

## Option 4: Module Registry Sharing (Enterprise)

Terraform Enterprise supports sharing registry modules across organizations within the same installation. If you run Terraform Enterprise, this is the cleanest solution:

```bash
# Share a module with another organization (Terraform Enterprise only)
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "registry-module-consumers",
      "attributes": {
        "organization": "org-app-team"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/org-platform/registry-modules/private/org-platform/vpc/aws/consumers"
```

## Option 5: Generic Module Source with S3/GCS

Store module archives in S3 or GCS and reference them with HTTPS sources:

```hcl
# Reference a module from S3
module "vpc" {
  source = "s3::https://s3-us-east-1.amazonaws.com/my-terraform-modules/vpc/aws/1.0.0/module.zip"

  cidr_block = "10.0.0.0/16"
}
```

```bash
# Package and upload a module to S3
cd terraform-aws-vpc
zip -r module.zip . -x ".git/*" -x ".terraform/*"

aws s3 cp module.zip \
  "s3://my-terraform-modules/vpc/aws/1.0.0/module.zip"
```

This works across any organization since it is just an HTTPS download. Set up AWS credentials in each workspace to access the S3 bucket.

## Recommended Architecture

For most multi-organization setups, here is what works well:

```
[Platform Team - org-platform]
  - Publishes modules to Git repositories
  - Tags releases with semantic versions
  - Each module repo follows terraform-<provider>-<name> naming

[Application Teams - org-app-*]
  - Reference modules via Git source with version tags
  - Do not need access to the platform team's registry
  - Version pinning ensures stability
```

```hcl
# Application team's configuration
# References platform team modules via Git
module "networking" {
  # Pin to a specific version tag
  source = "git::https://github.com/my-company/terraform-aws-networking.git?ref=v2.3.1"

  vpc_cidr     = "10.0.0.0/16"
  environment  = "production"
  project_name = "web-app"
}

module "database" {
  source = "git::https://github.com/my-company/terraform-aws-rds.git?ref=v1.5.0"

  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.private_subnet_ids
}
```

## Module Versioning Across Organizations

Regardless of which sharing method you use, version pinning is critical:

```hcl
# Always pin to a specific version or version range
module "vpc" {
  # Good - pinned to exact version
  source = "git::https://github.com/my-company/terraform-aws-vpc.git?ref=v1.2.3"
}

module "vpc" {
  # Good - pinned in registry
  source  = "app.terraform.io/my-org/vpc/aws"
  version = "~> 1.2"
}

# Avoid unpinned sources
module "vpc" {
  # Bad - uses latest commit on default branch
  source = "git::https://github.com/my-company/terraform-aws-vpc.git"
}
```

## Setting Up VCS Connections Across Organizations

Each organization needs its own VCS provider connection to access module repositories:

```bash
# Configure a VCS provider for an organization
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "oauth-clients",
      "attributes": {
        "service-provider": "github",
        "http-url": "https://github.com",
        "api-url": "https://api.github.com",
        "oauth-token-string": "ghp_your_github_token"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/org-app-team/oauth-clients"
```

## Summary

Sharing modules across HCP Terraform organizations requires a deliberate strategy. For most teams, Git-based module sources with version tags provide the best balance of simplicity and control. If you run Terraform Enterprise, the built-in registry sharing feature is the cleanest option. Whichever approach you choose, always pin module versions and automate the publishing process to keep all consuming organizations in sync.
