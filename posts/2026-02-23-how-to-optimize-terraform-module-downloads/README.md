# How to Optimize Terraform Module Downloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Performance, CI/CD, Optimization

Description: Speed up Terraform initialization by optimizing how modules are downloaded, cached, and referenced across your projects.

---

Every time you run `terraform init`, Terraform downloads all the modules your configuration references. For projects that use many external modules, this can add significant time to your workflow. Some teams report init times of several minutes just for module downloads alone.

The good news is there are several ways to reduce this overhead. This post covers practical strategies for making module downloads faster.

## How Module Downloads Work

When Terraform encounters a module source, it downloads the module code during `terraform init`. The behavior depends on the source type:

- **Terraform Registry modules**: Downloaded as compressed archives from the registry
- **GitHub/Git modules**: Cloned from the Git repository
- **S3/GCS modules**: Downloaded from cloud storage
- **Local path modules**: No download needed, just a filesystem reference

Each module is stored in the `.terraform/modules/` directory within your project. Terraform creates a `modules.json` manifest to track what was downloaded.

```hcl
# Registry module - downloaded from registry.terraform.io
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  # ...
}

# Git module - cloned from GitHub
module "custom" {
  source = "git::https://github.com/myorg/terraform-module.git?ref=v1.0.0"
  # ...
}

# Local module - no download, just a path reference
module "shared" {
  source = "./modules/shared"
  # ...
}
```

## Pin Module Versions Explicitly

One of the simplest optimizations is pinning exact versions instead of using version ranges:

```hcl
# Slower - Terraform must check the registry for the latest matching version
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
}

# Faster - Terraform knows exactly which version to get
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
}
```

With an exact version pin, Terraform can skip the version resolution step and go straight to downloading (or finding in cache) the specific version.

## Use Local Modules Where Possible

Local modules have zero download cost. If you find yourself using a registry module but only need a fraction of its functionality, consider copying the relevant parts into a local module:

```text
project/
  modules/
    vpc/
      main.tf
      variables.tf
      outputs.tf
  environments/
    production/
      main.tf
    staging/
      main.tf
```

```hcl
# In environments/production/main.tf
module "vpc" {
  source = "../../modules/vpc"
  # No download needed
  cidr_block = "10.0.0.0/16"
}
```

Local modules also give you full control over the code and eliminate the risk of upstream changes breaking your infrastructure.

## Cache Modules in CI/CD

In CI/CD pipelines, you can cache the `.terraform/modules/` directory between runs:

### GitHub Actions

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cache Terraform modules
        uses: actions/cache@v4
        with:
          path: |
            .terraform/modules/
            .terraform/providers/
          key: terraform-${{ hashFiles('**/*.tf') }}
          restore-keys: |
            terraform-

      - name: Terraform Init
        run: terraform init
```

### GitLab CI

```yaml
terraform-plan:
  cache:
    key: terraform-modules-${CI_COMMIT_REF_SLUG}
    paths:
      - .terraform/modules/
      - .terraform/providers/
  script:
    - terraform init
    - terraform plan
```

When the cache hits, `terraform init` finds the modules already present and skips downloading them.

## Set Up a Private Module Registry

For organizations with many shared modules, a private registry eliminates the need to download from external sources:

```hcl
# Using Terraform Cloud as a private registry
module "vpc" {
  source  = "app.terraform.io/my-org/vpc/aws"
  version = "2.0.0"
}
```

You can also use tools like JFrog Artifactory, AWS CodeArtifact, or a simple S3 bucket as a module source:

```hcl
# S3 as module source
module "vpc" {
  source = "s3::https://my-terraform-modules.s3.amazonaws.com/vpc/v2.0.0.zip"
}
```

A private registry within your cloud provider's network is faster than downloading from the public internet.

## Use Git Shallow Clones for Git Modules

When Terraform downloads a Git module, it clones the entire repository by default. For large repositories, this can be slow. Unfortunately, Terraform does not natively support shallow clones, but you can work around this.

One approach is to pre-clone modules and reference them as local paths:

```bash
#!/bin/bash
# pre-fetch-modules.sh
# Shallow clone modules before terraform init

mkdir -p .module-cache

# Shallow clone with specific tag
git clone --depth 1 --branch v1.0.0 \
  https://github.com/myorg/terraform-module.git \
  .module-cache/terraform-module
```

```hcl
# Reference the pre-cloned module
module "custom" {
  source = "./.module-cache/terraform-module"
}
```

This is more complex to maintain but can save significant time for large Git repositories.

## Vendoring Modules

Vendoring means copying module source code directly into your repository. This eliminates all download time at the cost of maintaining the copies:

```bash
# Download a module for vendoring
terraform init
cp -r .terraform/modules/vpc vendor/vpc
```

```hcl
# Reference the vendored module
module "vpc" {
  source = "./vendor/vpc"
}
```

Update your vendored modules periodically:

```bash
#!/bin/bash
# update-vendor.sh
# Re-download and vendor modules

# Temporarily use registry sources
terraform init -upgrade

# Copy updated modules to vendor directory
for module_dir in .terraform/modules/*/; do
  module_name=$(basename "$module_dir")
  if [ "$module_name" != "modules.json" ]; then
    rm -rf "vendor/$module_name"
    cp -r "$module_dir" "vendor/$module_name"
  fi
done

echo "Vendored modules updated."
```

## Reducing Module Nesting

Deeply nested modules multiply the download problem. If module A depends on module B, which depends on module C, Terraform downloads all three. Flatten your module hierarchy where possible:

```hcl
# Instead of deeply nested modules
module "app" {
  source = "my-org/app/aws"  # This internally calls 5 sub-modules
}

# Consider flattening to direct resource references
# or modules with fewer layers
module "app_compute" {
  source = "my-org/app-compute/aws"
}

module "app_networking" {
  source = "my-org/app-networking/aws"
}
```

## Monitoring Init Performance

Track how long `terraform init` takes to identify regressions:

```bash
#!/bin/bash
# timed-init.sh
# Measure terraform init time

start_time=$(date +%s)
terraform init -input=false 2>&1
end_time=$(date +%s)

duration=$((end_time - start_time))
echo "terraform init completed in ${duration} seconds"

# Report to your monitoring system
# curl -X POST "https://your-metrics-endpoint" \
#   -d "{\"metric\": \"terraform_init_seconds\", \"value\": $duration}"
```

Track this metric over time. If init time suddenly increases, investigate which new module or version change caused it.

## Summary

Module downloads are a common performance bottleneck in Terraform, especially for projects with many external dependencies. The most impactful optimizations are: use local modules when possible, cache modules in CI/CD, pin exact versions, and consider vendoring for critical projects. Each of these reduces the time spent waiting for downloads and makes your Terraform workflow faster.

If you need to monitor the infrastructure deployed through your Terraform modules, [OneUptime](https://oneuptime.com) offers comprehensive monitoring and incident management for modern cloud infrastructure.
