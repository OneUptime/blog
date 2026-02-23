# How to Initialize a Terraform Project with terraform init

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Initialization, terraform init, Providers, Backend, DevOps

Description: Deep dive into terraform init covering provider downloads, backend configuration, module installation, and all the flags you need to know.

---

`terraform init` is the first command you run in any Terraform project. It sets up everything Terraform needs to manage your infrastructure: downloading providers, configuring backends, installing modules, and creating the working directory structure. Without init, no other Terraform command works.

Despite being a command you run all the time, there is more to `terraform init` than most people realize. This guide covers everything it does, when to re-run it, and all the useful flags.

## What terraform init Does

When you run `terraform init`, Terraform performs several operations in sequence:

1. **Backend initialization** - Sets up where the state file is stored
2. **Provider installation** - Downloads the provider plugins your configuration needs
3. **Module installation** - Downloads modules referenced in your configuration
4. **Lock file creation** - Creates or updates `.terraform.lock.hcl`

```bash
# Run terraform init in your project directory
terraform init
```

Typical output:

```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.40.0...
- Installed hashicorp/aws v5.40.0 (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!
```

## Backend Initialization

The backend determines where Terraform stores the state file. If no backend is configured, Terraform uses the local backend (a file called `terraform.tfstate` in your working directory).

### Local Backend (Default)

```hcl
# No backend block needed - local is the default
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### S3 Backend

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

When you run `terraform init` with a backend configured, Terraform:

1. Connects to the backend storage
2. Checks if a state file already exists
3. Configures the local environment to use that backend

### Changing Backends

If you change the backend configuration (e.g., from local to S3), re-run `terraform init`. Terraform detects the change and asks if you want to migrate the state:

```bash
# After changing the backend configuration
terraform init

# Terraform will ask:
# Do you want to copy existing state to the new backend?
# Enter "yes" to migrate
```

You can force reconfiguration with:

```bash
# Reconfigure the backend (useful when backend settings change)
terraform init -reconfigure
```

Or migrate state to the new backend:

```bash
# Migrate state to the new backend
terraform init -migrate-state
```

## Provider Installation

Terraform reads your `required_providers` block and downloads the matching provider plugins.

```hcl
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

Providers are downloaded to `.terraform/providers/` in your project directory.

### Upgrading Providers

By default, `terraform init` respects the version constraints in `.terraform.lock.hcl`. To upgrade to newer versions (within your constraints):

```bash
# Upgrade providers to the latest versions within constraints
terraform init -upgrade
```

This is important when you change version constraints in your configuration and want to pick up a newer version.

### Provider Plugin Cache

If you have a plugin cache configured (see [How to Configure Terraform CLI Settings with .terraformrc](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-terraform-cli-settings-with-terraformrc/view)), `terraform init` uses cached providers instead of re-downloading them:

```bash
# Set the plugin cache directory
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"

# Now terraform init uses the cache
terraform init
```

## Module Installation

If your configuration uses modules, `terraform init` downloads them:

```hcl
# A module from the Terraform registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  # ...
}

# A module from a Git repository
module "custom" {
  source = "git::https://github.com/org/terraform-modules.git//network?ref=v1.0.0"
  # ...
}

# A local module (no download needed)
module "app" {
  source = "./modules/app"
  # ...
}
```

Modules are downloaded to `.terraform/modules/`. Local modules (with `./` paths) are not downloaded - Terraform references them in place.

To update modules to newer versions:

```bash
# Re-download modules (and providers)
terraform init -upgrade
```

## The Lock File (.terraform.lock.hcl)

`terraform init` creates or updates `.terraform.lock.hcl`. This file records the exact provider versions and their hashes:

```hcl
# .terraform.lock.hcl (auto-generated)
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.40.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",
    "zh:abc123...",
  ]
}
```

This file should be committed to version control. It ensures every team member and CI/CD pipeline uses exactly the same provider versions.

### Adding Platform Support to the Lock File

If your team uses different operating systems, generate the lock file for all platforms:

```bash
# Generate lock file hashes for multiple platforms
terraform providers lock \
  -platform=darwin_arm64 \
  -platform=darwin_amd64 \
  -platform=linux_amd64
```

## Useful Flags

### -backend=false

Skip backend initialization. Useful for validating configuration syntax without connecting to the backend:

```bash
# Initialize without backend configuration
terraform init -backend=false
```

### -backend-config

Pass backend configuration values at init time. Useful for keeping secrets out of your configuration files:

```bash
# Pass backend config values dynamically
terraform init \
  -backend-config="bucket=my-terraform-state" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-east-1"
```

Or use a file:

```bash
# backend.hcl
bucket         = "my-terraform-state"
key            = "prod/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
```

```bash
# Pass a backend config file
terraform init -backend-config=backend.hcl
```

### -reconfigure

Discard any existing backend configuration and re-initialize:

```bash
# Force reconfiguration (does not migrate state)
terraform init -reconfigure
```

### -migrate-state

Migrate state from one backend to another:

```bash
# Migrate state to a new backend
terraform init -migrate-state
```

### -upgrade

Upgrade providers and modules to the latest versions within constraints:

```bash
# Upgrade all providers and modules
terraform init -upgrade
```

### -get=false

Skip module installation:

```bash
# Skip module downloads
terraform init -get=false
```

### -input=false

Disable interactive prompts (useful in CI/CD):

```bash
# Non-interactive initialization
terraform init -input=false
```

## When to Re-Run terraform init

You need to re-run `terraform init` when:

- You clone a repository for the first time
- You add, remove, or change a provider
- You add, remove, or change a module source or version
- You change the backend configuration
- You change provider version constraints and want to upgrade
- The `.terraform` directory is deleted

You do NOT need to re-run it for:

- Adding or modifying resources
- Changing variable values
- Changing output definitions
- Running plan or apply

## terraform init in CI/CD Pipelines

In CI/CD pipelines, `terraform init` runs at the start of every job:

```yaml
# GitHub Actions example
steps:
  - uses: actions/checkout@v4

  - name: Terraform Init
    run: terraform init -input=false -backend-config=backend.hcl
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

The `-input=false` flag prevents Terraform from hanging waiting for input in a non-interactive environment.

## Troubleshooting

### "Backend configuration changed"

If Terraform detects a backend change and you want to keep the new backend without migrating state:

```bash
terraform init -reconfigure
```

### "Provider not found" or version resolution failures

```bash
# Clear the local provider cache and re-download
rm -rf .terraform
terraform init
```

### Slow initialization

If init is slow due to large provider downloads:

```bash
# Set up a plugin cache to speed up subsequent inits
mkdir -p ~/.terraform.d/plugin-cache
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
terraform init
```

### "Module not found" errors

```bash
# Force re-download of all modules
terraform init -upgrade
```

## Conclusion

`terraform init` is more than just a setup command. It is the foundation that connects your configuration to providers, backends, and modules. Understanding its flags - particularly `-upgrade`, `-reconfigure`, `-migrate-state`, and `-backend-config` - gives you control over how your Terraform environment is configured. Run it whenever you start a new project, clone a repository, or change providers and backends. It is the gateway to everything else Terraform does.
