# How to Use Terraform with Provider Plugin Cache

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, Provider Cache, CI/CD, DevOps

Description: Learn how to configure and use Terraform provider plugin caching to speed up initialization and reduce bandwidth usage across projects.

---

If you work with Terraform across multiple projects, you have probably noticed that `terraform init` downloads the same provider plugins over and over. The AWS provider alone is over 300 MB. Multiply that by 10 projects and several runs per day, and you are wasting gigabytes of bandwidth and minutes of waiting.

Terraform has a built-in plugin cache mechanism that solves this problem. Once configured, provider binaries are downloaded once and reused everywhere. This guide walks through setting it up properly.

## How Provider Downloads Work Without Cache

By default, every time you run `terraform init`, Terraform:

1. Reads the `required_providers` block in your configuration
2. Contacts the Terraform registry to find the download URL for each provider
3. Downloads the provider binary to `.terraform/providers/` in your project directory
4. Verifies the checksum

This happens independently for every project. If you have three projects all using the AWS provider v5.30.0, you end up with three copies of the same 300 MB binary.

## Setting Up the Plugin Cache

The simplest way to enable caching is with an environment variable:

```bash
# Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"

# Create the directory
mkdir -p "$HOME/.terraform.d/plugin-cache"
```

Alternatively, you can configure it in the Terraform CLI configuration file:

```hcl
# ~/.terraformrc (Linux/Mac) or %APPDATA%/terraform.rc (Windows)
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
```

After setting this up, the next time you run `terraform init`, Terraform will:

1. Check if the required provider version exists in the cache directory
2. If it does, create a symlink (on Linux/Mac) or copy (on Windows) from the cache to `.terraform/providers/`
3. If it does not exist in the cache, download it to the cache first, then symlink it

## Verifying the Cache Is Working

Run `terraform init` in a project and check the cache directory:

```bash
# Initialize a project
terraform init

# Check what is in the cache
ls -la "$HOME/.terraform.d/plugin-cache/"

# You should see directories like:
# registry.terraform.io/hashicorp/aws/5.30.0/linux_amd64/
# registry.terraform.io/hashicorp/random/3.6.0/linux_amd64/
```

The second time you run `terraform init` in another project using the same providers, it will be noticeably faster because no downloads are needed.

## Cache Behavior Details

There are a few things worth knowing about how the cache works under the hood.

### Symlinks vs Copies

On Linux and macOS, Terraform creates symbolic links from the project `.terraform` directory to the cache. This means:

- Disk space is only used once per provider version
- If you delete the cache directory, existing projects will break until you re-run `terraform init`

On Windows, Terraform copies the files instead of symlinking, so disk savings are less significant.

### Cache Does Not Handle Registry Lookups

Even with caching enabled, Terraform still contacts the registry to resolve version constraints and get checksums. The cache only skips the actual binary download. If you need fully offline operation, you will need a filesystem mirror instead (covered below).

### No Automatic Cleanup

The cache directory grows over time as you use different provider versions. Terraform never deletes old entries. You should periodically clean it:

```bash
# See how much space the cache uses
du -sh "$HOME/.terraform.d/plugin-cache"

# Remove everything and let it rebuild naturally
rm -rf "$HOME/.terraform.d/plugin-cache"/*
```

## Setting Up a Filesystem Mirror for Offline Use

If you need to go beyond caching and support fully offline initialization, you can set up a filesystem mirror:

```hcl
# ~/.terraformrc
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/hashicorp/*"]
  }
  direct {
    exclude = ["registry.terraform.io/hashicorp/*"]
  }
}
```

Populate the mirror directory using `terraform providers mirror`:

```bash
# Download providers for your project into the mirror directory
terraform providers mirror /opt/terraform/providers
```

This downloads the provider binaries and creates the proper directory structure. Now `terraform init` will use the local mirror without any network calls for the mirrored providers.

## Using Plugin Cache in CI/CD Pipelines

The plugin cache is especially valuable in CI/CD, where you might run `terraform init` dozens of times per day across different pipelines.

### GitHub Actions Example

```yaml
name: Terraform Plan
on: [pull_request]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # Cache the provider plugins between runs
      - name: Cache Terraform providers
        uses: actions/cache@v4
        with:
          path: ~/.terraform.d/plugin-cache
          key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}
          restore-keys: |
            terraform-providers-

      - name: Terraform Init
        run: terraform init
        env:
          TF_PLUGIN_CACHE_DIR: ~/.terraform.d/plugin-cache

      - name: Terraform Plan
        run: terraform plan
```

The `actions/cache` step persists the plugin cache between workflow runs. The cache key is based on the lock file, so when you update provider versions, the cache is refreshed.

### GitLab CI Example

```yaml
stages:
  - plan

terraform-plan:
  stage: plan
  image: hashicorp/terraform:1.7
  cache:
    key: terraform-plugins
    paths:
      - .terraform-plugin-cache/
  variables:
    TF_PLUGIN_CACHE_DIR: "${CI_PROJECT_DIR}/.terraform-plugin-cache"
  before_script:
    - mkdir -p "$TF_PLUGIN_CACHE_DIR"
  script:
    - terraform init
    - terraform plan
```

## Shared Cache for Teams

If multiple developers on your team work on the same projects, you can set up a shared network cache:

```bash
# Mount a shared NFS directory
# On each developer machine, set:
export TF_PLUGIN_CACHE_DIR="/mnt/shared/terraform-plugin-cache"
```

This works well on a fast network. On slower connections, a local cache is better because the overhead of network file access can negate the savings from caching.

## Combining Cache with Lock Files

Terraform's `.terraform.lock.hcl` file records the exact checksums of providers. When using a cache, the lock file ensures that even if someone tampers with cached binaries, Terraform will detect the mismatch:

```bash
# Generate or update the lock file
terraform init -upgrade

# Commit the lock file to version control
git add .terraform.lock.hcl
git commit -m "Update provider lock file"
```

Always commit your lock files. They work alongside the cache to provide both speed and security.

## Measuring the Impact

Here is a rough comparison from a project using the AWS, Azure, and Google providers:

| Scenario | Time |
|----------|------|
| First init (no cache) | 45 seconds |
| Second init (with cache) | 3 seconds |
| Init after provider version change | 15 seconds |

The improvement scales with the number and size of providers you use. For projects with 5+ providers, caching can save over a minute per init.

## Troubleshooting Common Issues

**Cache directory permissions**: Make sure the cache directory is writable by the user running Terraform. In CI/CD, the pipeline user might differ from the one who created the directory.

**Stale symlinks**: If you manually delete cache entries, existing projects will have broken symlinks. Run `terraform init` again to fix them.

**Version conflicts**: The cache stores multiple versions side by side. This is safe and you do not need to worry about version conflicts between projects.

## Summary

Provider plugin caching is one of the easiest Terraform optimizations to set up and one of the most impactful, especially if you manage multiple projects or run frequent CI/CD pipelines. Set the `TF_PLUGIN_CACHE_DIR` environment variable, create the directory, and you are done. For CI/CD, combine it with your pipeline's caching mechanism to persist the cache between runs.

If you are looking for a monitoring solution for the infrastructure you deploy with Terraform, check out [OneUptime](https://oneuptime.com) for comprehensive uptime monitoring and alerting.
