# How to Configure Terraform Settings in the terraform Block

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Configuration, Backend, Infrastructure as Code

Description: Learn how to configure Terraform behavior using the terraform block, including required version, required providers, backend configuration, and experimental features.

---

The `terraform` block is where you configure Terraform itself - not your infrastructure, but the tool that manages it. It controls which Terraform version is required, which providers to use, where state is stored, and other engine-level settings.

This post covers every section of the `terraform` block and how to configure them for real-world projects.

## The terraform Block Structure

Here is a complete `terraform` block showing all the major sections:

```hcl
terraform {
  # Minimum Terraform CLI version
  required_version = ">= 1.6.0"

  # Provider requirements
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State storage configuration
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Let us walk through each section.

## required_version

The `required_version` setting specifies which versions of the Terraform CLI can work with your configuration:

```hcl
terraform {
  # Only allow Terraform 1.6.x or newer
  required_version = ">= 1.6.0"
}
```

This is important for teams. If someone on your team has an older version of Terraform installed, they will get a clear error message instead of confusing syntax errors or unexpected behavior.

Common constraint patterns:

```hcl
terraform {
  # Minimum version
  required_version = ">= 1.6.0"

  # Exact version (strict, used in CI/CD)
  # required_version = "1.7.2"

  # Pessimistic - allow patch updates
  # required_version = "~> 1.7.0"  # allows 1.7.x

  # Range constraint
  # required_version = ">= 1.6.0, < 2.0.0"
}
```

For most teams, `>= 1.6.0` or `~> 1.7.0` strikes the right balance between flexibility and safety.

## required_providers

This section declares the providers your configuration uses. Every provider should be listed here with a source and version constraint:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }

    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}
```

For more detail on this section, see [How to Use the Required Providers Block in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-required-providers-block/view).

## Backend Configuration

The `backend` block tells Terraform where to store its state file. This is critical for team collaboration and CI/CD pipelines.

### S3 Backend

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"  # state locking
    encrypt        = true               # encrypt state at rest
  }
}
```

### Azure Backend

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstateaccount"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}
```

### GCS Backend

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "production/infrastructure"
  }
}
```

### Terraform Cloud Backend

```hcl
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "production-infrastructure"
    }
  }
}
```

Note: The `cloud` block replaces the older `backend "remote"` configuration for Terraform Cloud.

### Important Backend Limitations

Backend configuration does not support variables, locals, or any dynamic expressions:

```hcl
terraform {
  # This does NOT work - backends don't support variables
  backend "s3" {
    bucket = var.state_bucket  # ERROR
    key    = "terraform.tfstate"
    region = var.region         # ERROR
  }
}
```

Instead, use partial configuration and pass backend values at init time:

```hcl
# In your .tf file
terraform {
  backend "s3" {
    key = "terraform.tfstate"
  }
}
```

```bash
# Pass the rest at init time
terraform init \
  -backend-config="bucket=mycompany-terraform-state" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=terraform-locks"
```

Or use a backend config file:

```hcl
# backend.hcl
bucket         = "mycompany-terraform-state"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
```

```bash
terraform init -backend-config=backend.hcl
```

## experiments

Terraform occasionally introduces experimental features that you can opt into:

```hcl
terraform {
  # Enable experimental features (use with caution)
  experiments = [module_variable_optional_attrs]
}
```

Experimental features are not guaranteed to be stable and may change or be removed in future versions. Only use them in non-production configurations or when you are willing to adapt to changes.

## Cloud Block

The `cloud` block (introduced in Terraform 1.1) is the preferred way to integrate with Terraform Cloud or Terraform Enterprise:

```hcl
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      # Use a single workspace
      name = "production"

      # Or use tags to match multiple workspaces
      # tags = ["production", "aws"]
    }
  }
}
```

The `cloud` block and `backend` block are mutually exclusive - you can use one or the other, not both.

## Putting It All Together

Here is a production-ready `terraform` block:

```hcl
# versions.tf

terraform {
  # Require a recent Terraform version
  required_version = ">= 1.6.0"

  # Declare all providers with version constraints
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Store state in S3 with locking
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/main/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

## File Organization

By convention, the `terraform` block goes in a file called `versions.tf` or `providers.tf`. Either name works - the community is split on this. What matters is consistency within your project.

```text
project/
  versions.tf     # terraform block with required_version and required_providers
  providers.tf    # provider configuration blocks
  main.tf         # resources
  variables.tf    # input variables
  outputs.tf      # output values
```

Some teams combine the `terraform` block and `provider` blocks into a single `providers.tf` file. That works too.

## terraform Block in Modules

Child modules can also have a `terraform` block, but it should only include `required_providers` (and optionally `required_version`). Modules should not have `backend` configurations.

```hcl
# modules/vpc/versions.tf

terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"  # use >= for module flexibility
    }
  }
}
```

## Wrapping Up

The `terraform` block is the control center for your Terraform configuration. Use `required_version` to ensure CLI compatibility, `required_providers` to pin provider sources and versions, and `backend` to configure state storage. Keep these settings in a dedicated `versions.tf` file so they are easy to find and update. For teams, the backend configuration with state locking is especially important to prevent conflicts.

For related topics, see [How to Use the Required Providers Block in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-required-providers-block/view) and [How to Split Terraform Configuration Across Multiple Files](https://oneuptime.com/blog/post/2026-02-23-terraform-split-configuration-multiple-files/view).
