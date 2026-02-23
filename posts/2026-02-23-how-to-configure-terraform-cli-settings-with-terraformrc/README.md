# How to Configure Terraform CLI Settings with .terraformrc

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CLI, Configuration, DevOps, Infrastructure as Code

Description: Learn how to configure Terraform CLI behavior using the .terraformrc file including plugin caching, provider installation, credentials, and custom settings.

---

Terraform's behavior is not just controlled by your `.tf` files. There is a separate CLI configuration file called `.terraformrc` (or `terraform.rc` on Windows) that controls how the Terraform binary itself behaves. This file is personal to your machine and affects all Terraform projects you run, regardless of which directory you are in.

In this post, I will explain what `.terraformrc` does, where it lives, and the most useful settings you can configure in it.

## Where Does .terraformrc Live?

The CLI configuration file lives in your home directory:

- **Linux and macOS**: `~/.terraformrc`
- **Windows**: `%APPDATA%\terraform.rc`

You can override the location with the `TF_CLI_CONFIG_FILE` environment variable:

```bash
# Point Terraform at a custom config file location
export TF_CLI_CONFIG_FILE="/path/to/custom/terraformrc"
```

If the file does not exist, Terraform uses default settings for everything. You only need to create it when you want to customize something.

## Creating the File

```bash
# Create or edit the Terraform CLI configuration
touch ~/.terraformrc
```

The file uses HCL syntax (the same language as Terraform configuration files).

## Plugin Cache Directory

This is probably the most useful setting. By default, every Terraform project downloads its own copy of every provider it needs. If you have ten projects that all use the AWS provider, you end up with ten copies of the same binary. The plugin cache directory fixes this.

```hcl
# ~/.terraformrc
# Enable shared plugin caching across all projects
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
```

Create the cache directory:

```bash
# Create the plugin cache directory
mkdir -p ~/.terraform.d/plugin-cache
```

With this setting, `terraform init` stores downloaded providers in the cache directory and creates symlinks in your project's `.terraform/providers/` folder. This saves disk space and speeds up initialization for subsequent projects.

You can also set this via an environment variable instead:

```bash
# Alternative: set plugin cache via environment variable
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
```

### Important Notes About Plugin Caching

- The cache only stores providers, not modules
- Two simultaneous `terraform init` runs might conflict if they try to cache the same provider at the same time
- The cache does not automatically clean up old versions - you may want to periodically remove old entries

```bash
# Check cache size
du -sh ~/.terraform.d/plugin-cache/

# List cached providers
ls -la ~/.terraform.d/plugin-cache/registry.terraform.io/
```

## Provider Installation Methods

You can control how Terraform discovers and installs providers using `provider_installation` blocks.

### Network Mirror

If you run a local provider mirror (common in enterprise environments), configure it here:

```hcl
# ~/.terraformrc
provider_installation {
  network_mirror {
    url = "https://terraform-mirror.internal.company.com/"
  }

  # Fall back to direct download for anything not in the mirror
  direct {}
}
```

### Filesystem Mirror

If you have providers available on a local filesystem (useful for air-gapped environments):

```hcl
# ~/.terraformrc
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/hashicorp/*"]
  }

  # Use direct download for everything else
  direct {
    exclude = ["registry.terraform.io/hashicorp/*"]
  }
}
```

### Dev Overrides for Local Provider Development

If you are developing a Terraform provider and want to test it locally without publishing:

```hcl
# ~/.terraformrc
provider_installation {
  dev_overrides {
    # Point to your locally built provider binary
    "hashicorp/example" = "/home/user/go/bin"
  }

  # Install all other providers normally
  direct {}
}
```

With dev overrides, Terraform uses your local build instead of downloading from the registry. This is only useful during provider development.

## Credentials for Terraform Cloud and Enterprise

If you use Terraform Cloud or Terraform Enterprise, you can store your API token here:

```hcl
# ~/.terraformrc
credentials "app.terraform.io" {
  token = "your-terraform-cloud-api-token"
}
```

For Terraform Enterprise on a custom domain:

```hcl
# ~/.terraformrc
credentials "terraform.mycompany.com" {
  token = "your-terraform-enterprise-api-token"
}
```

However, I prefer using `terraform login` instead, which manages credentials for you:

```bash
# Interactive login to Terraform Cloud
terraform login

# Login to a custom Terraform Enterprise instance
terraform login terraform.mycompany.com
```

The `terraform login` command stores the token in a separate credentials file at `~/.terraform.d/credentials.tfrc.json` rather than in `.terraformrc`. This is actually better because you can more easily manage file permissions on the credentials file.

### Credentials Helpers

For more secure credential management, you can use a credentials helper:

```hcl
# ~/.terraformrc
credentials_helper "example" {
  args = []
}
```

Credentials helpers are external programs that Terraform calls to obtain tokens. This lets you integrate with secret management systems like HashiCorp Vault or OS keychains.

## Disabling Checkpoint Calls

Terraform periodically contacts HashiCorp's checkpoint service to check for new versions and security bulletins. If you want to disable this (common in air-gapped or privacy-sensitive environments):

```hcl
# ~/.terraformrc
disable_checkpoint = true
```

You can also disable just the upgrade notification without disabling the security check:

```hcl
# ~/.terraformrc
disable_checkpoint_signature = true
```

Or use environment variables:

```bash
# Disable checkpoint via environment variable
export CHECKPOINT_DISABLE=1
```

## A Complete Example Configuration

Here is a full `.terraformrc` file with commonly used settings:

```hcl
# ~/.terraformrc
# Terraform CLI Configuration

# Cache providers to save disk space and speed up init
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"

# Disable version check calls to HashiCorp
disable_checkpoint = true

# Provider installation configuration
provider_installation {
  # Use filesystem mirror for HashiCorp providers (if available)
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/hashicorp/*"]
  }

  # Direct download for everything else
  direct {}
}

# Terraform Cloud credentials
credentials "app.terraform.io" {
  token = "your-token-here"
}
```

## Verifying Your Configuration

There is no built-in command to validate `.terraformrc`, but you can check that your settings are taking effect:

```bash
# Test plugin caching by initializing a project
cd ~/some-terraform-project
rm -rf .terraform
terraform init

# Check if providers were cached
ls ~/.terraform.d/plugin-cache/
```

If you see providers in the cache directory, the plugin caching is working.

For credential verification:

```bash
# Test Terraform Cloud credentials
terraform login
# If already logged in, it will confirm the existing token
```

## Configuration for Different Environments

Sometimes you need different CLI configurations for different contexts (personal vs. work, different Terraform Cloud organizations, etc.). Use the `TF_CLI_CONFIG_FILE` environment variable to switch:

```bash
# Create separate configs
cat > ~/.terraformrc-personal <<'EOF'
credentials "app.terraform.io" {
  token = "personal-org-token"
}
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
EOF

cat > ~/.terraformrc-work <<'EOF'
credentials "terraform.company.com" {
  token = "work-enterprise-token"
}
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
EOF

# Switch between configs
export TF_CLI_CONFIG_FILE="$HOME/.terraformrc-work"

# Or create aliases
alias tf-personal='export TF_CLI_CONFIG_FILE="$HOME/.terraformrc-personal"'
alias tf-work='export TF_CLI_CONFIG_FILE="$HOME/.terraformrc-work"'
```

## Security Considerations

The `.terraformrc` file may contain sensitive information (API tokens, credential configurations). Protect it appropriately:

```bash
# Set restrictive permissions on the config file
chmod 600 ~/.terraformrc

# Do NOT commit .terraformrc to version control
echo ".terraformrc" >> ~/.gitignore_global
```

If you are storing Terraform Cloud tokens in `.terraformrc`, consider using `terraform login` instead, which stores credentials in a separate file with appropriate permissions.

## Conclusion

The `.terraformrc` file is a small but powerful configuration point. The plugin cache alone can save gigabytes of disk space if you work with many Terraform projects. Provider installation settings are essential for enterprise environments with private registries or air-gapped networks. And credential configuration ties everything together for Terraform Cloud and Enterprise users. Even if you only set up the plugin cache, it is worth the thirty seconds it takes.
