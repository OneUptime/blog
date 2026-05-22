# How to Handle Terragrunt Caching and Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Performance, Caching, DevOps, Infrastructure as Code

Description: Learn how to optimize Terragrunt performance with caching strategies, parallelism tuning, provider mirrors, and techniques to reduce plan and apply times in large repos.

---

Terragrunt adds a layer on top of Terraform, and that layer has its own performance characteristics. In small repos with a handful of modules, you won't notice any overhead. But once you're managing 50+ modules across multiple environments, slow Terragrunt runs start to hurt - especially in CI/CD. This post covers the practical techniques for speeding things up.

## Understanding Terragrunt's Cache

When you run Terragrunt, it creates a `.terragrunt-cache` directory in each module folder. This cache contains a copy of the Terraform source code (downloaded from the `source` URL), along with the `.terraform` directory that holds providers and module dependencies.

```text
my-module/
  terragrunt.hcl
  .terragrunt-cache/
    abc123def456/          # Hash-based directory name
      modules/vpc/         # Downloaded Terraform source
      .terraform/          # Terraform init output
        providers/
        modules/
```

Every time you change your `source` URL, Terragrunt may create a new cache directory. Old ones stick around until you clean them up.

## Controlling the Cache Location

By default, the cache lives inside each module's directory. You can change this with the `TG_DOWNLOAD_DIR` environment variable:

```bash
# Move all caches to a central location

export TG_DOWNLOAD_DIR="/tmp/terragrunt-cache"

# This is especially useful in CI where you want to cache this directory
terragrunt run --all plan
```

The `download_dir` attribute in `terragrunt.hcl` does the same thing:

```hcl
# terragrunt.hcl
download_dir = "/tmp/terragrunt-cache"
```

A central cache location helps with CI caching since you can cache one directory instead of hunting for `.terragrunt-cache` folders scattered across your repo.

## Terraform Provider Caching

The biggest performance win comes from caching Terraform providers. Without a shared cache, each new Terraform working directory downloads providers from the registry - and the AWS provider alone is over 300MB.

### Plugin Cache Directory

Set the `TF_PLUGIN_CACHE_DIR` environment variable:

```bash
# Create the cache directory
mkdir -p ~/.terraform.d/plugin-cache

# Tell Terraform to use it
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
```

Or use a `.terraformrc` file:

```hcl
# ~/.terraformrc
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
```

With this set, the first module that needs the AWS provider downloads it, and every subsequent module can reuse the cached copy. When possible, Terraform uses a symlink to avoid storing a separate copy in each working directory. This can cut `init` time from minutes to seconds.

One important caveat: Terraform's plugin cache is not guaranteed to be concurrency safe. If you run many modules concurrently with `terragrunt run --all`, prefer Terragrunt's provider cache server instead:

```bash
terragrunt run --all --provider-cache plan
```

### Provider Filesystem Mirror

For air-gapped environments or maximum speed, use a filesystem mirror:

```bash
# Download providers to a local mirror
terraform providers mirror /opt/terraform/providers

# Configure Terraform to use the mirror
cat > ~/.terraformrc <<EOF
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/*/*"]
  }
  direct {
    exclude = ["registry.terraform.io/*/*"]
  }
}
EOF
```

## Parallelism Tuning

Terragrunt's `run --all` command executes modules in parallel, respecting dependency order. You can control the maximum concurrency:

```bash
# Run up to 4 modules in parallel
terragrunt run --all --parallelism 4 plan

# Run modules one at a time (useful for debugging)
terragrunt run --all --parallelism 1 plan

# Higher parallelism for fast machines with lots of modules
terragrunt run --all --parallelism 10 plan
```

The right number depends on your machine's resources and your cloud provider's API rate limits. AWS, for example, will start throttling if you hit too many APIs simultaneously. A parallelism of 3-5 is usually a good sweet spot.

### Terraform Internal Parallelism

Terraform itself also has a parallelism setting that controls how many resources it manages concurrently:

```bash
# Terraform's default is 10
terragrunt run -- plan -parallelism=20

# Or set it in terragrunt.hcl using extra_arguments
terraform {
  extra_arguments "parallelism" {
    commands = ["plan", "apply"]
    arguments = ["-parallelism=20"]
  }
}
```

## Reducing init Time

`terraform init` is often the slowest part of a Terragrunt run. Here's how to speed it up:

### Skip init When Possible

Terragrunt runs `init` automatically, but if nothing has changed, it's wasted time. You can tell Terragrunt to skip auto-init:

```bash
# Skip auto-init (you must have already initialized)
terragrunt plan --no-auto-init
```

This is useful in CI when you have a separate init step with caching.

### Use Local Sources During Development

If your Terraform modules are in the same repo, use local paths instead of remote URLs during development:

```hcl
# Slow - downloads from git when Terragrunt has to populate the cache
terraform {
  source = "git::https://github.com/org/modules.git//vpc?ref=v1.2.0"
}

# Fast - uses local files directly
terraform {
  source = "../../../modules/vpc"
}
```

Local sources skip the remote Git download. Use remote sources for versioned releases and local sources for development.

## Cleaning the Cache

Over time, the `.terragrunt-cache` directories accumulate old versions. Clean them periodically:

```bash
# Remove all Terragrunt caches in the current directory tree
find . -type d -name ".terragrunt-cache" -prune -exec rm -rf {} \;
```

In CI pipelines, caches are usually ephemeral, but if you're caching the Terragrunt download directory, set a reasonable cache expiration.

## Optimizing run --all for Large Repos

When you have hundreds of modules, even `run --all plan` takes a long time. Here are strategies to speed it up:

### Target Specific Directories

Instead of running from the repo root, target specific environments:

```bash
# Slow - plans everything
cd infrastructure
terragrunt run --all plan

# Faster - plans only dev
cd infrastructure/dev
terragrunt run --all plan

# Fastest - plans a single module
cd infrastructure/dev/us-east-1/vpc
terragrunt plan
```

### Use --queue-include-dir

Filter which modules `run --all` processes:

```bash
# Only run modules in specific directories
terragrunt run --all \
  --queue-include-dir "infrastructure/dev/us-east-1/*" \
  plan
```

### Use --queue-exclude-dir

Exclude modules you don't need:

```bash
# Skip slow or irrelevant modules
terragrunt run --all \
  --queue-exclude-dir "infrastructure/*/data-warehouse" \
  --queue-exclude-dir "infrastructure/*/ml-pipeline" \
  plan
```

## Dependency Fetch Optimization

When Terragrunt resolves dependencies, it may run `terraform output` on dependency modules. This adds overhead, especially with many dependencies:

```hcl
# Using mock_outputs allows plan/validate to proceed when dependency outputs are unavailable
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id     = "vpc-mock12345"
    subnet_ids = ["subnet-mock1", "subnet-mock2"]
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}
```

Mock outputs let Terragrunt use placeholder values for commands like plan and validate when real dependency outputs are unavailable. They do not replace real outputs from state unless you also set `skip_outputs = true`, which makes Terragrunt use mocks all the time and should be used carefully.

## CI-Specific Optimizations

In CI/CD pipelines, combine multiple strategies:

```yaml
# Example CI configuration
variables:
  TG_PROVIDER_CACHE: "1"
  TG_PROVIDER_CACHE_DIR: "/cache/terragrunt-providers"
  TG_DOWNLOAD_DIR: "/cache/terragrunt"
  TF_IN_AUTOMATION: "true"

cache:
  paths:
    - /cache/terragrunt-providers/
    - /cache/terragrunt/

script:
  # Use Terragrunt's provider cache server and moderate parallelism
  - terragrunt run --all
    --non-interactive
    --parallelism 4
    --no-auto-retry
    -- plan -lock=false
```

Key CI optimizations:
- Cache the Terragrunt provider cache directory between runs
- Use `-lock=false` for plan jobs only when you know no concurrent apply targets the same workspace
- Set `TF_IN_AUTOMATION=true` so Terraform adjusts its output for automation, and use `--non-interactive` for Terragrunt prompts
- Tune parallelism based on your CI runner's resources

## Measuring Performance

To understand where time is being spent, enable Terragrunt debug logging:

```bash
# Show timing information
export TG_LOG_LEVEL=debug
terragrunt run --all plan 2>&1 | grep -E "time=|duration="
```

You can also time individual phases:

```bash
# Time the init phase separately
time terragrunt init

# Time the plan phase
time terragrunt plan --no-auto-init
```

## Summary

Most Terragrunt performance issues come down to provider downloads and unnecessary init runs. Use Terragrunt's provider cache server for concurrent `run --all` jobs, use Terraform's plugin cache for single-module or non-concurrent workflows, tune your parallelism, and target specific directories instead of running everything. In CI, caching provider downloads between runs is the single most impactful optimization. For more on Terragrunt configuration, check out our [debugging guide](https://oneuptime.com/blog/post/2026-02-23-debug-terragrunt-configuration-issues/view).
