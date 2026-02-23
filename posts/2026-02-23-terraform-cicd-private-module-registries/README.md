# How to Handle Terraform CI/CD with Private Module Registries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Modules, Registry, DevOps, Infrastructure as Code

Description: Configure Terraform CI/CD pipelines to authenticate with private module registries including Terraform Cloud, Artifactory, GitHub, and self-hosted registries.

---

Reusable Terraform modules are essential for scaling infrastructure management across teams. But when those modules live in private registries - whether Terraform Cloud, Artifactory, a private GitHub org, or a self-hosted registry - your CI/CD pipeline needs proper authentication to fetch them during `terraform init`.

This post covers how to configure CI/CD pipelines to work with various private module registry setups.

## How Terraform Resolves Modules

When Terraform encounters a module source, it needs to download the module code. The source format determines how it authenticates:

```hcl
# Public registry - no auth needed
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"
}

# Terraform Cloud private registry - needs TFC token
module "network" {
  source  = "app.terraform.io/myorg/network/aws"
  version = "2.0.0"
}

# Private GitHub repo - needs Git credentials
module "database" {
  source = "git::https://github.com/myorg/terraform-aws-database.git?ref=v1.0.0"
}

# Private S3 bucket - needs AWS credentials
module "monitoring" {
  source = "s3::https://s3-us-east-1.amazonaws.com/my-terraform-modules/monitoring.zip"
}
```

## Terraform Cloud Private Registry

Terraform Cloud offers a built-in private module registry. Authentication requires a team or user API token.

```yaml
# .github/workflows/terraform.yml
name: Terraform with TFC Registry
on:
  push:
    branches: [main]

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      # The setup-terraform action creates ~/.terraformrc with the token
      # This allows terraform init to pull private modules from TFC

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

If you need more control, create the credentials file manually:

```yaml
- name: Configure TFC Credentials
  run: |
    cat > ~/.terraformrc << EOF
    credentials "app.terraform.io" {
      token = "${{ secrets.TF_API_TOKEN }}"
    }
    EOF
    chmod 600 ~/.terraformrc

- name: Terraform Init
  run: terraform init
```

## GitHub Private Repository Modules

When modules are in private GitHub repos, you need to configure Git authentication:

```yaml
# .github/workflows/terraform.yml
jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Configure Git to use the GitHub token for private repos
      - name: Configure Git Credentials
        run: |
          git config --global url."https://oauth2:${{ secrets.GITHUB_TOKEN }}@github.com".insteadOf "https://github.com"

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

For SSH-based module sources:

```yaml
- name: Configure SSH for Private Modules
  uses: webfactory/ssh-agent@v0.9.0
  with:
    ssh-private-key: ${{ secrets.MODULE_DEPLOY_KEY }}

- name: Terraform Init
  run: terraform init
```

With module sources using SSH:

```hcl
# Modules from private repos via SSH
module "database" {
  source = "git@github.com:myorg/terraform-aws-database.git?ref=v1.0.0"
}
```

## Artifactory as a Terraform Registry

JFrog Artifactory can serve as a Terraform module registry:

```yaml
# Configure Artifactory credentials
- name: Configure Terraform for Artifactory
  run: |
    cat > ~/.terraformrc << EOF
    credentials "artifactory.mycompany.com" {
      token = "${{ secrets.ARTIFACTORY_TOKEN }}"
    }
    EOF
    chmod 600 ~/.terraformrc
```

Module source in your Terraform config:

```hcl
# Module from Artifactory Terraform registry
module "network" {
  source  = "artifactory.mycompany.com/terraform-modules__network/aws"
  version = "1.2.0"
}
```

## S3-Backed Module Sources

For modules stored in S3, AWS credentials in your pipeline handle authentication automatically:

```yaml
- name: Configure AWS
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: us-east-1

- name: Terraform Init
  run: terraform init  # S3 module sources use the configured AWS credentials
```

The module source:

```hcl
module "monitoring" {
  source = "s3::https://s3-us-east-1.amazonaws.com/my-terraform-modules/monitoring/v1.0.0.zip"
}
```

## Self-Hosted Terraform Registry

You can run your own Terraform registry that implements the registry protocol:

```hcl
# main.tf
module "compute" {
  source  = "registry.internal.mycompany.com/infra/compute/aws"
  version = "3.1.0"
}
```

Configure the CI pipeline to authenticate:

```yaml
- name: Configure Internal Registry
  run: |
    cat > ~/.terraformrc << EOF
    credentials "registry.internal.mycompany.com" {
      token = "${{ secrets.INTERNAL_REGISTRY_TOKEN }}"
    }
    EOF
    chmod 600 ~/.terraformrc

    # If using self-signed certificates
    export TF_CLI_CONFIG_FILE=~/.terraformrc
```

For self-signed certificates on the registry:

```yaml
- name: Trust Internal CA
  run: |
    # Add your internal CA certificate
    echo "${{ secrets.INTERNAL_CA_CERT }}" > /usr/local/share/ca-certificates/internal-ca.crt
    sudo update-ca-certificates
```

## GitLab CI with Private Modules

```yaml
# .gitlab-ci.yml
variables:
  # GitLab CI provides CI_JOB_TOKEN for accessing repos in the same group
  GIT_CONFIG_COUNT: 1
  GIT_CONFIG_KEY_0: "url.https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com.insteadOf"
  GIT_CONFIG_VALUE_0: "https://gitlab.com"

terraform_apply:
  image: hashicorp/terraform:1.7.4
  before_script:
    # Configure credentials for Terraform Cloud registry
    - |
      cat > ~/.terraformrc << EOF
      credentials "app.terraform.io" {
        token = "${TF_API_TOKEN}"
      }
      EOF
  script:
    - terraform init
    - terraform apply -auto-approve
```

## Multi-Registry Configuration

When your modules come from multiple registries:

```yaml
- name: Configure Multiple Registries
  run: |
    cat > ~/.terraformrc << EOF
    # Terraform Cloud private registry
    credentials "app.terraform.io" {
      token = "${{ secrets.TFC_TOKEN }}"
    }

    # Internal company registry
    credentials "registry.internal.mycompany.com" {
      token = "${{ secrets.INTERNAL_REGISTRY_TOKEN }}"
    }

    # Artifactory registry
    credentials "artifactory.mycompany.com" {
      token = "${{ secrets.ARTIFACTORY_TOKEN }}"
    }

    # Enable provider caching for performance
    plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
    EOF

    mkdir -p "$HOME/.terraform.d/plugin-cache"
    chmod 600 ~/.terraformrc
```

## Module Version Pinning

Always pin module versions in CI/CD to ensure reproducible builds:

```hcl
# Good: Exact version pin
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "2.3.1"
}

# Acceptable: Pessimistic constraint (patch updates only)
module "database" {
  source  = "app.terraform.io/myorg/database/aws"
  version = "~> 3.1.0"
}

# Bad: No version constraint
module "monitoring" {
  source = "app.terraform.io/myorg/monitoring/aws"
  # No version = potentially different module on every init
}
```

## Caching Modules in CI/CD

Speed up pipeline runs by caching downloaded modules:

```yaml
# GitHub Actions module caching
- name: Cache Terraform Modules
  uses: actions/cache@v4
  with:
    path: |
      .terraform/modules
      ~/.terraform.d/plugin-cache
    key: terraform-modules-${{ hashFiles('**/*.tf') }}
    restore-keys: |
      terraform-modules-

- name: Terraform Init
  run: terraform init
```

## Debugging Module Download Issues

When `terraform init` fails to fetch modules:

```yaml
- name: Debug Module Downloads
  run: |
    # Enable debug logging
    export TF_LOG=DEBUG

    # Show current credentials file (redacted)
    echo "Terraform config exists: $(test -f ~/.terraformrc && echo yes || echo no)"

    # Test registry connectivity
    curl -sf "https://app.terraform.io/.well-known/terraform.json" && echo "TFC reachable" || echo "TFC unreachable"

    # Try init with verbose output
    terraform init -no-color 2>&1 | tee init-output.txt
```

## Summary

Handling private module registries in CI/CD comes down to:

1. Configure credentials via `~/.terraformrc` for each registry
2. Use `setup-terraform` action for Terraform Cloud tokens
3. Configure Git credentials for GitHub/GitLab-hosted modules
4. Add CA certificates for self-signed registries
5. Pin module versions for reproducible builds
6. Cache downloaded modules for faster pipeline runs

The specific approach depends on your registry choice, but the pattern is always the same: provide credentials at init time and let Terraform handle the downloads. For setting up the complete CI/CD pipeline, see [Terraform CI/CD with pull request workflows](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pull-request-workflows/view).
