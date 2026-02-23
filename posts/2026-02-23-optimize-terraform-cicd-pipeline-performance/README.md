# How to Optimize Terraform CI/CD Pipeline Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Performance, Optimization, DevOps, Infrastructure as Code

Description: Speed up your Terraform CI/CD pipelines with provider caching, parallelism tuning, state splitting, selective planning, and runner optimization techniques.

---

Slow Terraform pipelines are a productivity killer. Developers wait 20 minutes for a plan to finish, lose context, and move on to something else. Multiply that across a team and the wasted time adds up fast. Most slow pipelines can be sped up significantly with a few targeted optimizations.

This post covers the techniques that give the biggest performance improvements.

## Measure Before Optimizing

Before changing anything, understand where time is spent:

```yaml
# .github/workflows/terraform-timed.yml
- name: Terraform Init (timed)
  run: |
    START=$(date +%s%N)
    terraform init -no-color
    DURATION=$(( ($(date +%s%N) - START) / 1000000 ))
    echo "Init took ${DURATION}ms"
    echo "init_ms=$DURATION" >> "$GITHUB_ENV"

- name: Terraform Plan (timed)
  run: |
    START=$(date +%s%N)
    terraform plan -out=tfplan -no-color
    DURATION=$(( ($(date +%s%N) - START) / 1000000 ))
    echo "Plan took ${DURATION}ms"
    echo "plan_ms=$DURATION" >> "$GITHUB_ENV"

- name: Report Timing
  run: |
    echo "## Pipeline Timing" >> "$GITHUB_STEP_SUMMARY"
    echo "| Phase | Duration |" >> "$GITHUB_STEP_SUMMARY"
    echo "|-------|----------|" >> "$GITHUB_STEP_SUMMARY"
    echo "| Init | ${init_ms}ms |" >> "$GITHUB_STEP_SUMMARY"
    echo "| Plan | ${plan_ms}ms |" >> "$GITHUB_STEP_SUMMARY"
```

Typically, the breakdown looks like:
- Provider downloads (init): 30-60% of total time on first run
- State refresh (plan): 20-40% of total time
- Change calculation (plan): 10-20% of total time

## Provider Caching

Provider binaries are the biggest download during `terraform init`. The AWS provider alone is over 400MB. Caching them across pipeline runs is the single biggest performance win.

### GitHub Actions Cache

```yaml
# .github/workflows/terraform.yml
- name: Cache Terraform Providers
  uses: actions/cache@v4
  with:
    path: |
      ~/.terraform.d/plugin-cache
    key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}
    restore-keys: |
      terraform-providers-

- name: Configure Provider Cache
  run: |
    mkdir -p ~/.terraform.d/plugin-cache
    cat > ~/.terraformrc << 'EOF'
    plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
    disable_checkpoint = true
    EOF

- name: Terraform Init
  working-directory: infrastructure
  run: terraform init
```

### Cache the .terraform Directory

For even faster init, cache the entire `.terraform` directory:

```yaml
- name: Cache Terraform Directory
  uses: actions/cache@v4
  with:
    path: infrastructure/.terraform
    key: terraform-dir-${{ hashFiles('infrastructure/.terraform.lock.hcl', 'infrastructure/backend.tf') }}
    restore-keys: |
      terraform-dir-

- name: Terraform Init
  working-directory: infrastructure
  run: |
    # Init will be nearly instant if cache hits
    terraform init -lockfile=readonly
```

## Increase Parallelism

Terraform's default parallelism is 10 concurrent operations. For state refresh, this means only 10 API calls at a time. Increase it:

```yaml
- name: Terraform Plan
  run: |
    # Increase parallelism for faster state refresh
    terraform plan -parallelism=30 -out=tfplan -no-color
```

Monitor for rate limiting. If you see errors like `ThrottlingException`, reduce the parallelism:

```yaml
- name: Terraform Plan
  run: |
    # AWS rate limits vary by service
    # 20-30 is usually safe, 50+ may trigger throttling
    terraform plan -parallelism=25 -out=tfplan -no-color
  env:
    # Some providers support their own rate limiting config
    AWS_MAX_ATTEMPTS: "10"
```

## Selective Planning

Only plan the directories that changed:

```yaml
jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      dirs: ${{ steps.changes.outputs.dirs }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Find Changed Directories
        id: changes
        run: |
          CHANGED=$(git diff --name-only origin/main...HEAD | \
            grep '\.tf$' | \
            xargs -I {} dirname {} | \
            sort -u | \
            jq -R -s -c 'split("\n") | map(select(. != ""))')
          echo "dirs=$CHANGED" >> "$GITHUB_OUTPUT"

  plan:
    needs: detect
    if: needs.detect.outputs.dirs != '[]'
    strategy:
      matrix:
        dir: ${{ fromJson(needs.detect.outputs.dirs) }}
      fail-fast: false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Plan Changed Directory
        working-directory: ${{ matrix.dir }}
        run: |
          terraform init -lockfile=readonly
          terraform plan -out=tfplan -no-color
```

## Split Large State Files

Large state files (1000+ resources) cause slow plans. Split them by domain:

```
# Before: One massive state
infrastructure/
  main.tf        # 500+ resources, 20-minute plans

# After: Split by domain
infrastructure/
  networking/    # ~50 resources, 2-minute plans
  compute/       # ~100 resources, 3-minute plans
  database/      # ~30 resources, 1-minute plans
  monitoring/    # ~40 resources, 1-minute plans
```

Use `terraform state mv` to migrate resources to new state files:

```bash
# Move networking resources to new state
cd infrastructure/networking
terraform init

# Import existing resources into the new state
terraform import aws_vpc.main vpc-12345
terraform import aws_subnet.private[0] subnet-67890
```

## Disable Checkpoint Calls

Terraform phones home to check for updates by default. Disable it:

```yaml
- name: Terraform Plan
  env:
    CHECKPOINT_DISABLE: "1"  # Skip version check
  run: terraform plan -out=tfplan
```

Or in `.terraformrc`:

```hcl
disable_checkpoint = true
```

## Use Terraform Cloud for Remote Operations

Offload plan and apply to Terraform Cloud's infrastructure:

```hcl
# backend.tf
terraform {
  cloud {
    organization = "myorg"
    workspaces {
      name = "production"
    }
  }
}
```

```yaml
- name: Terraform Plan (remote)
  run: |
    # Plan runs on Terraform Cloud's infrastructure
    # Your CI runner just streams the output
    terraform plan -no-color
```

## Runner Optimization

### Use Larger Runners

GitHub Actions offers larger runners with more CPU and RAM:

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest-16-cores  # 16 cores, 64GB RAM
    steps:
      - name: Terraform Plan
        run: terraform plan -parallelism=50 -out=tfplan
```

### Pre-built Docker Images

Build a Docker image with Terraform and providers pre-installed:

```dockerfile
# Dockerfile.terraform-ci
FROM hashicorp/terraform:1.7.4

# Pre-install commonly used providers
RUN mkdir -p /root/.terraform.d/plugin-cache

# Copy provider lock file and pre-download providers
COPY .terraform.lock.hcl /tmp/
WORKDIR /tmp
RUN terraform init -backend=false && \
    cp -r .terraform/providers/* /root/.terraform.d/plugin-cache/ || true
```

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/myorg/terraform-ci:latest
    steps:
      - uses: actions/checkout@v4
      - run: terraform init  # Near-instant with pre-cached providers
      - run: terraform plan -out=tfplan
```

## Benchmark Results

Typical improvements from these optimizations on a 300-resource state:

| Optimization | Before | After | Improvement |
|-------------|--------|-------|-------------|
| Provider caching | 90s init | 5s init | 94% faster |
| Parallelism (10 to 30) | 180s plan | 70s plan | 61% faster |
| State splitting (3 parts) | 180s plan | 60s each | 67% faster per run |
| Selective planning | Always runs | Runs when needed | Skips unchanged |
| Disable checkpoint | +2s per run | 0s | Minor but free |

Combined, a 5-minute pipeline can often be reduced to under 90 seconds.

## Summary

Optimizing Terraform CI/CD pipeline performance:

1. Cache providers - the biggest single win, saves minutes per run
2. Increase parallelism to 25-30 for faster state refresh
3. Plan only changed directories using change detection
4. Split large state files into smaller, focused ones
5. Disable checkpoint calls and version checks
6. Use larger runners or pre-built images for faster execution

Start with provider caching since it is the easiest to implement and gives the biggest improvement. Then add change detection and parallelism tuning. State splitting requires more effort but pays dividends for large codebases. For handling the plans from split states, see [handling large Terraform plans in CI/CD](https://oneuptime.com/blog/post/2026-02-23-handle-large-terraform-plans-cicd/view).
