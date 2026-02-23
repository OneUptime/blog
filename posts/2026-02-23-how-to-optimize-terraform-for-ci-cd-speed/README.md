# How to Optimize Terraform for CI/CD Speed

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Performance, GitHub Actions, DevOps

Description: Reduce Terraform execution time in CI/CD pipelines with caching, parallelism tuning, selective planning, and pipeline architecture improvements.

---

Slow Terraform pipelines are a drag on engineering velocity. When every pull request takes 15 minutes for a Terraform plan, developers stop making small, frequent changes. They batch changes instead, which increases risk and makes debugging harder.

I have spent a lot of time optimizing Terraform in CI/CD environments. Here is everything that actually makes a measurable difference.

## Cache Everything

The single biggest time saver in CI/CD is caching. Without caching, every pipeline run downloads providers (hundreds of megabytes) and modules from scratch.

### Provider Cache

```yaml
# GitHub Actions
jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      TF_PLUGIN_CACHE_DIR: ${{ github.workspace }}/.terraform-plugin-cache
    steps:
      - uses: actions/checkout@v4

      - name: Create plugin cache dir
        run: mkdir -p $TF_PLUGIN_CACHE_DIR

      - name: Cache Terraform providers
        uses: actions/cache@v4
        with:
          path: .terraform-plugin-cache
          key: tf-providers-${{ hashFiles('.terraform.lock.hcl') }}
          restore-keys: tf-providers-

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan
```

### Module Cache

```yaml
      - name: Cache Terraform modules
        uses: actions/cache@v4
        with:
          path: .terraform/modules
          key: tf-modules-${{ hashFiles('**/*.tf') }}
          restore-keys: tf-modules-
```

Combined, these caches can reduce `terraform init` from 60+ seconds to under 5 seconds.

## Skip Refresh When Appropriate

Terraform's refresh step queries every resource from the cloud provider API. For 500 resources, this can take several minutes. In CI/CD, you can often skip it:

```yaml
      - name: Terraform Plan (no refresh)
        run: terraform plan -refresh=false
```

Use this for pull request plans where you just want to see the diff. For the actual apply pipeline, keep refresh enabled to catch drift.

A balanced approach is to run a full refresh on the main branch apply and skip refresh for PR plans:

```yaml
      - name: Terraform Plan
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            terraform plan -refresh=false -out=plan.tfplan
          else
            terraform plan -out=plan.tfplan
          fi
```

## Tune Parallelism

Adjust parallelism based on your infrastructure and CI/CD runner capacity:

```yaml
      - name: Terraform Plan
        run: terraform plan -parallelism=20
```

CI/CD runners often have more CPU cores available than a developer laptop, so you can push parallelism higher. Test different values and measure the impact.

## Use Plan Files

Generate a plan file during the plan step and reuse it during apply. This avoids computing the plan twice:

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: terraform init
      - run: terraform plan -out=plan.tfplan
      - uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: plan.tfplan

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: terraform init
      - uses: actions/download-artifact@v4
        with:
          name: terraform-plan
      - run: terraform apply plan.tfplan
```

This also ensures that exactly what was reviewed gets applied, with no surprises from changes that happened between plan and apply.

## Parallelize Across Projects

If your infrastructure is split into multiple Terraform projects (as it should be for performance), run them in parallel:

```yaml
jobs:
  plan-networking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd networking && terraform init && terraform plan

  plan-compute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd compute && terraform init && terraform plan

  plan-database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd database && terraform init && terraform plan
```

Each project runs on its own runner, so they execute simultaneously. For 5 projects that each take 2 minutes, parallel execution gives you the result in 2 minutes instead of 10.

## Only Plan Changed Projects

For monorepos with multiple Terraform projects, detect which projects were affected by the PR and only plan those:

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      networking: ${{ steps.filter.outputs.networking }}
      compute: ${{ steps.filter.outputs.compute }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            networking:
              - 'networking/**'
            compute:
              - 'compute/**'

  plan-networking:
    needs: detect-changes
    if: needs.detect-changes.outputs.networking == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd networking && terraform init && terraform plan

  plan-compute:
    needs: detect-changes
    if: needs.detect-changes.outputs.compute == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd compute && terraform init && terraform plan
```

This is a huge time saver. If a PR only changes the compute project, why plan networking?

## Pre-build Terraform Providers

Instead of downloading providers in every pipeline run, build a Docker image with providers pre-installed:

```dockerfile
# Dockerfile.terraform
FROM hashicorp/terraform:1.7

# Copy lock file to determine required providers
COPY .terraform.lock.hcl /workspace/.terraform.lock.hcl
COPY main.tf /workspace/main.tf

WORKDIR /workspace

# Pre-download providers
RUN terraform init -backend=false

# The .terraform directory now has all providers
# Any init in the pipeline will find them already present
```

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/myorg/terraform-with-providers:latest
    steps:
      - uses: actions/checkout@v4
      - run: terraform init  # Nearly instant since providers are in the image
      - run: terraform plan
```

Rebuild the image when you update provider versions.

## Use Terraform Cloud or Atlantis

Dedicated Terraform automation tools are optimized for CI/CD:

**Terraform Cloud** runs plans remotely on their infrastructure, which has pre-cached providers and optimized state access:

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "production"
    }
  }
}
```

**Atlantis** is a self-hosted alternative that runs Terraform in response to PR comments. It maintains provider caches and can run plans immediately when PRs are opened.

## Reduce Plan Output Size

Large plans generate huge output that takes time to render and upload. If you post plan output as PR comments, truncate it:

```bash
# Generate plan and capture output
terraform plan -no-color > plan.txt 2>&1

# Truncate if over 60,000 characters (GitHub comment limit is 65,536)
if [ $(wc -c < plan.txt) -gt 60000 ]; then
  head -c 60000 plan.txt > plan-truncated.txt
  echo "... (plan output truncated)" >> plan-truncated.txt
  mv plan-truncated.txt plan.txt
fi
```

## Benchmark Your Pipeline

Measure each step to know where time is spent:

```yaml
      - name: Terraform Init
        run: |
          start=$(date +%s)
          terraform init
          echo "Init took $(($(date +%s) - start)) seconds"

      - name: Terraform Plan
        run: |
          start=$(date +%s)
          terraform plan
          echo "Plan took $(($(date +%s) - start)) seconds"
```

Track these numbers over time. When a step suddenly gets slower, investigate before it becomes a bigger problem.

## Summary

Optimizing Terraform for CI/CD comes down to: cache providers and modules aggressively, skip refresh for PR plans, parallelize across projects, and only plan what changed. These optimizations can take a 15-minute pipeline down to 2-3 minutes. The faster your pipeline, the more confidently your team can ship infrastructure changes.

For monitoring the health of your CI/CD pipelines and the infrastructure they manage, [OneUptime](https://oneuptime.com) provides unified observability and alerting.
