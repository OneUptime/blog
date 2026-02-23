# How to Use Monorepo vs Polyrepo for Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Monorepo, Repository Strategy, DevOps

Description: Compare monorepo and polyrepo strategies for organizing Terraform modules, including versioning, CI/CD, code sharing, and practical guidance on when to use each approach.

---

One of the first decisions when organizing Terraform modules is how to structure your repositories. Do you put all modules in a single repository (monorepo) or give each module its own repository (polyrepo)? Both approaches work. The right choice depends on your team size, release cadence, and tooling.

This guide breaks down the trade-offs with real examples so you can make the right call.

## Monorepo Layout

All modules live in one repository:

```
terraform-modules/
  modules/
    vpc/
      main.tf
      variables.tf
      outputs.tf
      versions.tf
      README.md
    ecs-service/
      main.tf
      variables.tf
      outputs.tf
      versions.tf
      README.md
    rds-postgres/
      main.tf
      variables.tf
      outputs.tf
      versions.tf
      README.md
    s3-bucket/
      ...
    security-group/
      ...
  examples/
    complete-app/
      main.tf
  tests/
    vpc_test.go
    ecs_test.go
  .github/
    workflows/
      test.yml
      release.yml
  CHANGELOG.md
  README.md
```

Consumers reference modules with a path within the repo:

```hcl
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v1.5.0"
}

module "ecs" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/ecs-service?ref=v1.5.0"
}
```

## Polyrepo Layout

Each module has its own repository:

```
terraform-aws-vpc/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  README.md
  examples/
  tests/

terraform-aws-ecs-service/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  README.md
  examples/
  tests/

terraform-aws-rds-postgres/
  ...
```

Consumers reference each repository independently:

```hcl
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "1.5.0"
}

module "ecs" {
  source  = "app.terraform.io/myorg/ecs-service/aws"
  version = "2.1.0"
}
```

## Versioning: The Key Difference

This is the most important practical difference.

### Monorepo Versioning

In a monorepo, Git tags apply to the entire repository. When you tag `v1.5.0`, every module gets that version, even if only one module changed:

```bash
# Tags the entire repository
git tag -a v1.5.0 -m "Add autoscaling support to ECS module"
```

The VPC module did not change, but it is now also at `v1.5.0`. Consumers cannot tell which modules actually changed.

**Workarounds**:

Per-module tags:

```bash
git tag -a vpc/v1.3.0 -m "VPC module v1.3.0"
git tag -a ecs-service/v2.1.0 -m "ECS service module v2.1.0"
```

```hcl
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=vpc/v1.3.0"
}
```

This works but adds complexity. You need tooling to manage per-module tags and releases.

### Polyrepo Versioning

Each repository has its own version history:

```bash
# In terraform-aws-vpc repo
git tag -a v1.3.0 -m "Add IPv6 support"

# In terraform-aws-ecs-service repo
git tag -a v2.1.0 -m "Add autoscaling support"
```

Versions are independent and meaningful. You know exactly what changed in each release.

## CI/CD Pipeline Differences

### Monorepo CI/CD

You need CI that only tests modules that changed:

```yaml
# .github/workflows/test.yml
name: Test Modules

on:
  pull_request:
    paths:
      - 'modules/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      modules: ${{ steps.changes.outputs.modules }}
    steps:
      - uses: actions/checkout@v4
      - id: changes
        run: |
          # Detect which modules changed
          changed=$(git diff --name-only origin/main...HEAD | \
            grep '^modules/' | \
            cut -d'/' -f2 | \
            sort -u | \
            jq -R . | jq -s .)
          echo "modules=$changed" >> $GITHUB_OUTPUT

  test:
    needs: detect-changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: ${{ fromJson(needs.detect-changes.outputs.modules) }}
    steps:
      - uses: actions/checkout@v4
      - name: Test ${{ matrix.module }}
        run: |
          cd modules/${{ matrix.module }}
          terraform init -backend=false
          terraform validate
```

### Polyrepo CI/CD

Each repository has its own simple pipeline:

```yaml
# .github/workflows/test.yml in each module repo
name: Test Module

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test
        run: |
          terraform init -backend=false
          terraform validate
```

Polyrepo CI/CD is simpler because every change is relevant to the module. No need for change detection.

## Code Sharing

### Monorepo Code Sharing

Modules in a monorepo can share utilities:

```
terraform-modules/
  modules/
    vpc/
    ecs-service/
  shared/
    tags.tf       # Common tagging logic
    naming.tf     # Naming conventions
```

```hcl
# modules/vpc/main.tf can reference shared code
# (though Terraform doesn't natively support this - you'd need symlinks or code generation)
```

In practice, Terraform does not support shared code across modules within the same repo natively. You would need symlinks, code generation, or to duplicate the code.

### Polyrepo Code Sharing

Share code through a common base module:

```hcl
# terraform-aws-vpc/main.tf
module "tags" {
  source  = "app.terraform.io/myorg/standard-tags/aws"
  version = "~> 1.0"

  name        = var.name
  environment = var.environment
}
```

This is cleaner because the shared code is a proper versioned module.

## Comparison Table

| Factor | Monorepo | Polyrepo |
|--------|----------|----------|
| Versioning | Shared version or per-module tags | Independent versions |
| CI/CD | Complex (change detection) | Simple (everything relevant) |
| Cross-module changes | Single PR, single review | Multiple PRs across repos |
| Discovery | Browse one repo | Need a catalog or registry |
| Code review | All changes visible together | Changes isolated per module |
| Permissions | Same access to all modules | Per-module access control |
| Registry compatibility | Works with Git source | Works with any registry |
| Setup complexity | Low (one repo) | High (many repos to create) |

## When to Use a Monorepo

Use a monorepo when:

- You have fewer than 20 modules
- One team maintains all modules
- Modules change together frequently
- You want simple initial setup
- You do not need per-module access control

## When to Use a Polyrepo

Use a polyrepo when:

- You have many modules (20+)
- Different teams own different modules
- Modules have independent release cycles
- You need per-module access control
- You use a Terraform registry (Cloud, GitLab, Artifactory)
- You need clear, independent semantic versioning

## Hybrid Approach

Many organizations use a hybrid approach:

```
# Monorepo for small, closely related modules
terraform-aws-networking/
  modules/
    vpc/
    security-group/
    transit-gateway/

# Polyrepo for large, independently maintained modules
terraform-aws-ecs-service/
terraform-aws-rds-postgres/
terraform-aws-eks-cluster/
```

Group closely related modules together and keep large, complex modules separate.

## Migration Path

If you start with a monorepo and outgrow it, you can migrate individual modules to their own repositories:

```bash
# Extract a module from the monorepo into its own repo
# Using git filter-repo to preserve history
git clone terraform-modules terraform-aws-vpc
cd terraform-aws-vpc
git filter-repo --subdirectory-filter modules/vpc
```

Update consumers to point to the new repository:

```hcl
# Before
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v1.5.0"
}

# After
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "1.5.0"
}
```

The practical advice is to start with a monorepo if you are a small team, and split into polyrepos as you grow. It is much easier to split a monorepo than to merge polyrepos.

For distributing your modules regardless of repo strategy, see [how to manage private Terraform module registries](https://oneuptime.com/blog/post/2026-02-23-manage-private-terraform-module-registries/view).
