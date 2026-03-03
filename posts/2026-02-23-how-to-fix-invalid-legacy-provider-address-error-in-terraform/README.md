# How to Fix Invalid Legacy Provider Address Error in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Provider, Migration, DevOps

Description: How to fix the Invalid Legacy Provider Address error in Terraform that appears after upgrading from Terraform 0.12 or 0.13 to newer versions.

---

You upgrade Terraform or pull an older project, and when you run `terraform plan`, you see:

```text
Error: Invalid legacy provider address

This configuration or its associated state refers to the unqualified provider
"aws".

You must complete the Terraform 0.13 upgrade process before upgrading to later
versions. If you need to complete this step, run "terraform 0.13upgrade" with
Terraform v0.13, then apply the changes, and then upgrade to the current version
of Terraform.
```

This error shows up when your state file or configuration uses the old-style provider addresses from before Terraform 0.13. In older versions, providers were referenced as just `aws` or `google`. Starting with Terraform 0.13, providers use fully-qualified addresses like `registry.terraform.io/hashicorp/aws`.

Let us fix this.

## Understanding the Problem

Before Terraform 0.13, provider references in the state file looked like this:

```json
{
  "provider": "provider.aws"
}
```

After 0.13, they look like this:

```json
{
  "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]"
}
```

If your state file still has the old format and you are running Terraform 1.x, Terraform cannot resolve the provider addresses and throws the legacy provider error.

## Fix 1: Use terraform state replace-provider

The most direct fix is to update the provider addresses in your state file:

```bash
# Replace the legacy provider address with the new format
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"
```

Terraform will show you what it plans to change and ask for confirmation:

```text
Terraform will perform the following actions:

  ~ Updating provider:
    - registry.terraform.io/-/aws
    + registry.terraform.io/hashicorp/aws

Changing 42 resources:

  aws_vpc.main
  aws_subnet.private[0]
  aws_subnet.private[1]
  ...

Do you approve? (yes/no)
```

Type `yes` and the state file is updated. You may need to do this for each provider in your configuration:

```bash
# If you use multiple providers with legacy addresses
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"

terraform state replace-provider \
  "registry.terraform.io/-/random" \
  "registry.terraform.io/hashicorp/random"

terraform state replace-provider \
  "registry.terraform.io/-/null" \
  "registry.terraform.io/hashicorp/null"
```

## Fix 2: The Two-Step Upgrade Path

If `terraform state replace-provider` does not work (sometimes it does not if the state format is very old), you can follow the official upgrade path:

**Step 1**: Install Terraform 0.13 (temporarily)

```bash
# Using tfenv to manage Terraform versions
tfenv install 0.13.7
tfenv use 0.13.7

# Or download directly
curl -o terraform_0.13.7.zip \
  https://releases.hashicorp.com/terraform/0.13.7/terraform_0.13.7_linux_amd64.zip
unzip terraform_0.13.7.zip -d /tmp/tf013
```

**Step 2**: Run the 0.13 upgrade command

```bash
# This adds the required_providers block and updates the state
/tmp/tf013/terraform 0.13upgrade .
```

This command generates a `versions.tf` file (or updates your existing one) with the proper `required_providers` block:

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    random = {
      source = "hashicorp/random"
    }
  }
  required_version = ">= 0.13"
}
```

**Step 3**: Initialize and apply with 0.13

```bash
/tmp/tf013/terraform init
/tmp/tf013/terraform apply
```

**Step 4**: Switch back to your target Terraform version

```bash
tfenv use 1.7.0
terraform init
terraform plan  # Should work now
```

## Fix 3: Manual State File Edit (Last Resort)

If nothing else works and you need a quick fix, you can manually edit the state file. This is risky and should only be done as a last resort:

```bash
# Pull the state file
terraform state pull > terraform.tfstate.backup

# Edit the file - replace old provider addresses
# Change: "provider": "provider.aws"
# To:     "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]"
```

```bash
# Use sed to do the replacement (make a backup first!)
cp terraform.tfstate.backup terraform.tfstate.manual

# Replace legacy provider addresses
sed -i 's/"provider": "provider\.aws"/"provider": "provider[\"registry.terraform.io\/hashicorp\/aws\"]"/g' terraform.tfstate.manual

# Push the updated state
terraform state push terraform.tfstate.manual
```

Be extremely careful with manual state edits. Always back up first, and verify with `terraform plan` immediately after.

## Fix 4: When Using Modules with Legacy Providers

If the legacy provider address is coming from a module (not your root configuration), you need to update the module:

```hcl
# Old module format (pre-0.13)
# modules/vpc/main.tf
provider "aws" {
  region = var.region
}

# New module format - remove provider config from modules
# modules/vpc/versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }
}
```

Then update the module reference in your root configuration:

```hcl
# root main.tf
provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source = "./modules/vpc"
  # Provider is inherited from the root module
}
```

## Updating required_providers

After fixing the state, make sure your configuration also uses the new format:

```hcl
# OLD format (pre-0.13) - no source specified
terraform {
  required_providers {
    aws    = "~> 4.0"
    random = "~> 3.0"
  }
}

# NEW format (0.13+) - with source addresses
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}
```

## Common Provider Source Addresses

Here is a quick reference for commonly used providers and their full source addresses:

```hcl
terraform {
  required_providers {
    # HashiCorp providers
    aws      = { source = "hashicorp/aws" }
    azurerm  = { source = "hashicorp/azurerm" }
    google   = { source = "hashicorp/google" }
    random   = { source = "hashicorp/random" }
    null     = { source = "hashicorp/null" }
    template = { source = "hashicorp/template" }
    archive  = { source = "hashicorp/archive" }
    local    = { source = "hashicorp/local" }
    tls      = { source = "hashicorp/tls" }
    helm     = { source = "hashicorp/helm" }
    kubernetes = { source = "hashicorp/kubernetes" }

    # Third-party providers
    datadog    = { source = "DataDog/datadog" }
    cloudflare = { source = "cloudflare/cloudflare" }
    pagerduty  = { source = "PagerDuty/pagerduty" }
  }
}
```

## Preventing This Issue

1. **Always specify `required_providers` with source addresses** in new projects
2. **Upgrade Terraform incrementally** - do not jump from 0.12 to 1.x in one step
3. **Keep your state file format current** by running `terraform apply` after each Terraform version upgrade
4. **Pin your Terraform version** in your configuration:

```hcl
terraform {
  required_version = ">= 1.5.0, < 2.0.0"
}
```

The legacy provider address error is a one-time migration issue. Once your state and configuration are updated to use fully-qualified provider addresses, you will not see this error again. The `terraform state replace-provider` command is the fastest fix for most situations. If that does not work, the two-step upgrade through Terraform 0.13 is the reliable fallback.
