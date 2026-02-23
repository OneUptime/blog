# How to Handle OpenTofu Registry Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Registry, Authentication, IaC, Security, DevOps

Description: Learn how to configure authentication for the OpenTofu registry, including public and private module sources, token management, and CI/CD integration for secure provider and module access.

---

OpenTofu uses a registry to discover and download providers and modules. While the public registry works without authentication, many organizations need private registries for proprietary modules or need to authenticate to access certain providers. This guide covers how to set up and manage registry authentication for OpenTofu.

## How the OpenTofu Registry Works

OpenTofu uses `registry.opentofu.org` as its default provider registry. When you declare a provider in your configuration, OpenTofu contacts the registry to find the download URL:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

During `tofu init`, OpenTofu:

1. Resolves the provider source to a registry URL
2. Queries the registry API for available versions
3. Downloads the provider binary for your platform
4. Verifies the checksums and GPG signature

For public providers, no authentication is required. But there are scenarios where you need to authenticate.

## Configuring Registry Credentials

OpenTofu uses the same credential configuration format as Terraform. Credentials are stored in the CLI configuration file.

### Using the CLI Configuration File

Create or edit the `~/.tofurc` file (or `~/.terraformrc` which OpenTofu also reads):

```hcl
# ~/.tofurc

# Credentials for a private registry
credentials "registry.example.com" {
  token = "your-api-token-here"
}

# Credentials for the Terraform Cloud/Enterprise registry
# (if you still use it for module sources)
credentials "app.terraform.io" {
  token = "your-tfe-token-here"
}
```

### Using Environment Variables

For CI/CD environments, you can pass credentials via environment variables instead of config files:

```bash
# Set credentials via environment variable
export TF_TOKEN_registry_example_com="your-api-token-here"

# The format is: TF_TOKEN_<hostname_with_underscores>
# Dots in the hostname become underscores
# Hyphens in the hostname become double underscores

# Examples:
export TF_TOKEN_app_terraform_io="your-tfe-token"
export TF_TOKEN_registry_opentofu_org="your-opentofu-token"
export TF_TOKEN_my__private__registry_example_com="your-token"
```

This approach is preferred for automation because it avoids writing credential files to disk.

### Using a Credentials Helper

For more sophisticated credential management, OpenTofu supports credential helpers - external programs that provide tokens on demand:

```hcl
# ~/.tofurc
credentials_helper "vault" {
  args = ["get-token"]
}
```

The credential helper is an executable named `tofu-credentials-<name>` (or `terraform-credentials-<name>`) in your PATH. It receives a JSON request on stdin and returns credentials on stdout:

```bash
#!/bin/bash
# tofu-credentials-vault
# A simple credential helper that fetches tokens from Vault

# Read the request
REQUEST=$(cat)
HOSTNAME=$(echo "$REQUEST" | jq -r '.hostname')

# Fetch the token from Vault
TOKEN=$(vault kv get -field=token "secret/registry/${HOSTNAME}")

# Return the credentials
echo "{\"token\": \"${TOKEN}\"}"
```

Make it executable:

```bash
chmod +x /usr/local/bin/tofu-credentials-vault
```

## Private Module Registries

Organizations often run private module registries to share reusable infrastructure components. Several options are available:

### Git-Based Module Sources

The simplest approach is to use Git repositories as module sources with SSH or HTTPS authentication:

```hcl
# SSH-based module source (uses your SSH key)
module "networking" {
  source = "git::ssh://git@github.com/my-org/terraform-modules.git//networking?ref=v1.2.0"
}

# HTTPS-based module source (uses git credentials)
module "networking" {
  source = "git::https://github.com/my-org/terraform-modules.git//networking?ref=v1.2.0"
}
```

For HTTPS sources, configure Git to use a token:

```bash
# Configure git to use a token for HTTPS
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com".insteadOf "https://github.com"

# Or use a .netrc file
cat > ~/.netrc << EOF
machine github.com
login oauth2
password ${GITHUB_TOKEN}
EOF
chmod 600 ~/.netrc
```

### S3 or GCS-Based Module Sources

You can host modules in cloud storage buckets:

```hcl
# S3-based module source
module "networking" {
  source = "s3::https://my-modules.s3.us-east-1.amazonaws.com/networking/v1.2.0/module.zip"
}

# GCS-based module source
module "networking" {
  source = "gcs::https://storage.googleapis.com/my-modules/networking/v1.2.0/module.zip"
}
```

Authentication for these follows the standard cloud provider credential chain (environment variables, instance profiles, etc.).

### Artifactory as a Module Registry

JFrog Artifactory can serve as a Terraform/OpenTofu module registry:

```hcl
# Configure Artifactory as a module source
module "networking" {
  source  = "artifactory.example.com/terraform-modules/networking/aws"
  version = "1.2.0"
}
```

Set up authentication:

```hcl
# ~/.tofurc
credentials "artifactory.example.com" {
  token = "your-artifactory-token"
}
```

## Provider Mirror Configuration

For air-gapped environments or to improve download reliability, you can set up a provider mirror:

```hcl
# ~/.tofurc
provider_installation {
  # First, try the local filesystem mirror
  filesystem_mirror {
    path    = "/opt/opentofu/providers"
    include = ["registry.opentofu.org/*/*"]
  }

  # Then try a network mirror
  network_mirror {
    url     = "https://mirror.example.com/providers/"
    include = ["registry.opentofu.org/*/*"]
  }

  # Fall back to the direct registry
  direct {
    exclude = []
  }
}
```

### Setting Up a Filesystem Mirror

```bash
# Download providers for mirroring
tofu providers mirror /opt/opentofu/providers

# The directory structure will look like:
# /opt/opentofu/providers/
#   registry.opentofu.org/
#     hashicorp/
#       aws/
#         5.31.0.json
#         terraform-provider-aws_5.31.0_linux_amd64.zip
```

### Setting Up a Network Mirror

A network mirror is an HTTP server that implements the provider mirror protocol:

```bash
# Sync providers to an S3 bucket for use as a network mirror
aws s3 sync /opt/opentofu/providers s3://my-provider-mirror/

# Configure OpenTofu to use the mirror
# In ~/.tofurc:
# provider_installation {
#   network_mirror {
#     url = "https://my-provider-mirror.s3.amazonaws.com/"
#   }
# }
```

## CI/CD Authentication Patterns

### GitHub Actions

```yaml
# .github/workflows/opentofu.yml
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.6.2"

      - name: Configure Registry Credentials
        run: |
          # Create credentials file
          cat > ~/.tofurc << EOF
          credentials "registry.example.com" {
            token = "${{ secrets.REGISTRY_TOKEN }}"
          }
          EOF

      - name: Init
        run: tofu init
        env:
          # Alternative: use environment variable
          TF_TOKEN_registry_example_com: ${{ secrets.REGISTRY_TOKEN }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
plan:
  image: ghcr.io/opentofu/opentofu:1.6.2
  variables:
    TF_TOKEN_registry_example_com: $REGISTRY_TOKEN
  script:
    - tofu init
    - tofu plan
```

## Lock File Management

The `.terraform.lock.hcl` file records the exact provider versions and checksums used. This file should be committed to version control:

```bash
# Generate or update the lock file
tofu init

# Update providers to latest allowed versions
tofu init -upgrade

# Add platform-specific hashes for CI (if CI uses a different OS)
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64

# Commit the lock file
git add .terraform.lock.hcl
git commit -m "Update provider lock file"
```

## Monitoring Your Infrastructure

Once your providers are authenticated and modules are downloaded, [OneUptime](https://oneuptime.com) can monitor the infrastructure they create. Comprehensive monitoring ensures that your deployed services stay healthy regardless of which registry configuration you use.

## Troubleshooting Authentication Issues

Common issues and their solutions:

**401 Unauthorized**: Your token is expired or invalid. Regenerate it and update your configuration.

```bash
# Test registry access manually
curl -H "Authorization: Bearer $TOKEN" \
  "https://registry.example.com/v1/modules/my-org/networking/aws/versions"
```

**Provider not found**: The provider may not be available in the registry you configured. Check the provider source in your configuration.

**Checksum mismatch**: Your lock file may have checksums for a different platform. Regenerate it with `tofu providers lock`.

**Credential file permissions**: Make sure `~/.tofurc` is readable only by your user:

```bash
chmod 600 ~/.tofurc
```

## Conclusion

Registry authentication in OpenTofu is straightforward once you understand the configuration options. Use environment variables for CI/CD, credential helpers for advanced setups, and always commit your lock file to version control. For private modules, Git-based sources are the simplest option, while dedicated registries like Artifactory offer more features for larger organizations.

For more OpenTofu content, see our guides on [securing Terraform state files](https://oneuptime.com/blog/post/2026-02-23-how-to-secure-terraform-state-files/view) and [debugging OpenTofu configuration issues](https://oneuptime.com/blog/post/2026-02-23-how-to-debug-opentofu-configuration-issues/view).
