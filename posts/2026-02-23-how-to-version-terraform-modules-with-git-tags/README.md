# How to Version Terraform Modules with Git Tags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Git, Versioning, Infrastructure as Code

Description: Learn how to version your Terraform modules using Git tags for reliable, reproducible infrastructure deployments across teams and environments.

---

When you start sharing Terraform modules across teams or projects, versioning becomes critical. Without proper versioning, a change in a shared module can silently break infrastructure across your entire organization. Git tags offer a straightforward and effective way to version your Terraform modules, and this post walks through exactly how to set that up.

## Why Version Your Terraform Modules?

Imagine you have a VPC module that ten different teams reference. Someone pushes a breaking change to the module repository. Without versioning, every team pulls the latest code on their next `terraform init`, and suddenly deployments start failing everywhere.

Versioning solves this by letting consumers pin to a specific release. Teams upgrade on their own schedule, test against new versions, and roll back if something goes wrong.

## Setting Up Your Module Repository

First, your module needs to live in its own Git repository. While you can use monorepos, individual repositories per module give you the cleanest versioning story.

```hcl
# A typical module repository structure
# terraform-aws-vpc/
#   main.tf
#   variables.tf
#   outputs.tf
#   README.md
#   examples/
#     simple/
#       main.tf
#     complete/
#       main.tf

# main.tf - The core module logic
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = var.enable_dns_support
  enable_dns_hostnames = var.enable_dns_hostnames

  tags = merge(var.tags, {
    Name = var.name
  })
}

resource "aws_subnet" "public" {
  count = length(var.public_subnets)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.public_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "${var.name}-public-${count.index}"
    Tier = "public"
  })
}
```

## Creating Your First Git Tag

Once your module is in a working state, create a tag. Terraform expects tags to follow semantic versioning, and the convention is to prefix with `v`.

```bash
# Make sure your changes are committed
git add .
git commit -m "Initial VPC module with public subnets"

# Create an annotated tag (preferred over lightweight tags)
git tag -a v1.0.0 -m "Release 1.0.0: Initial VPC module"

# Push the tag to the remote
git push origin v1.0.0
```

Annotated tags are better than lightweight tags because they store metadata like the tagger, date, and a message. This gives you an audit trail of who released what and when.

## Using Semantic Versioning

Follow semantic versioning (semver) strictly for your modules:

- **MAJOR** (v2.0.0): Breaking changes - renamed variables, removed outputs, changed resource behavior
- **MINOR** (v1.1.0): New features that are backward compatible - new optional variables, additional resources
- **PATCH** (v1.0.1): Bug fixes that do not change the interface

```bash
# Bug fix release
git tag -a v1.0.1 -m "Fix subnet CIDR calculation for edge cases"
git push origin v1.0.1

# New feature release (added private subnets)
git tag -a v1.1.0 -m "Add support for private subnets and NAT gateways"
git push origin v1.1.0

# Breaking change (renamed cidr_block to vpc_cidr)
git tag -a v2.0.0 -m "Rename cidr_block to vpc_cidr for clarity"
git push origin v2.0.0
```

## Referencing Tagged Modules

Consumers of your module can now pin to specific versions using the `ref` parameter in the source URL.

```hcl
# Pin to an exact version
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"

  name       = "production-vpc"
  cidr_block = "10.0.0.0/16"
  public_subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
  availability_zones = ["us-east-1a", "us-east-1b"]
}

# Pin to a minor version range using a branch (not recommended)
# Better to pin exact versions and upgrade deliberately
module "vpc_staging" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.1.0"

  name       = "staging-vpc"
  cidr_block = "10.1.0.0/16"
  public_subnets     = ["10.1.1.0/24", "10.1.2.0/24"]
  availability_zones = ["us-east-1a", "us-east-1b"]
}
```

For SSH-based authentication:

```hcl
# Using SSH instead of HTTPS
module "vpc" {
  source = "git::ssh://git@github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"

  name       = "production-vpc"
  cidr_block = "10.0.0.0/16"
}
```

## Automating Version Tags with CI/CD

Manual tagging works for small teams, but larger organizations benefit from automated release workflows. Here is a GitHub Actions example:

```yaml
# .github/workflows/release.yml
name: Release Module

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Determine version bump from commit messages
      - name: Determine version
        id: version
        run: |
          # Get the latest tag
          LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          echo "Latest tag: $LATEST_TAG"

          # Parse current version
          MAJOR=$(echo $LATEST_TAG | sed 's/v//' | cut -d. -f1)
          MINOR=$(echo $LATEST_TAG | sed 's/v//' | cut -d. -f2)
          PATCH=$(echo $LATEST_TAG | sed 's/v//' | cut -d. -f3)

          # Check commit messages since last tag for version hints
          if git log $LATEST_TAG..HEAD --pretty=format:"%s" | grep -q "BREAKING"; then
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
          elif git log $LATEST_TAG..HEAD --pretty=format:"%s" | grep -q "feat"; then
            MINOR=$((MINOR + 1))
            PATCH=0
          else
            PATCH=$((PATCH + 1))
          fi

          echo "new_tag=v${MAJOR}.${MINOR}.${PATCH}" >> $GITHUB_OUTPUT

      - name: Create and push tag
        run: |
          git tag -a ${{ steps.version.outputs.new_tag }} -m "Release ${{ steps.version.outputs.new_tag }}"
          git push origin ${{ steps.version.outputs.new_tag }}
```

## Managing Pre-Release Versions

When you are testing a new version before promoting it to stable, use pre-release tags:

```bash
# Create a release candidate
git tag -a v2.0.0-rc1 -m "Release candidate 1 for v2.0.0"
git push origin v2.0.0-rc1

# Teams can test against the RC
# module "vpc" {
#   source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.0.0-rc1"
# }

# When ready, promote to stable
git tag -a v2.0.0 -m "Release v2.0.0 - stable"
git push origin v2.0.0
```

## Listing and Managing Tags

Keep your tags organized and know what is available:

```bash
# List all tags sorted by version
git tag --sort=version:refname

# List tags matching a pattern
git tag -l "v1.*"

# Show details of a specific tag
git show v1.0.0

# Delete a tag (use with caution - consumers may reference it)
git tag -d v1.0.0
git push origin --delete v1.0.0
```

## Best Practices for Module Versioning

Here are the practices that have saved me the most headaches over the years:

1. **Never delete or move tags** that are in use. If a version has a bug, release a patch version instead.

2. **Write a CHANGELOG.md** in your module repository documenting what changed in each version.

3. **Test before tagging.** Run `terraform validate`, `terraform plan`, and any automated tests before creating a release tag.

4. **Use branch protection** on your main branch so that only reviewed and tested code gets tagged.

5. **Document migration paths** when releasing major versions. Tell consumers exactly what they need to change.

```markdown
## Upgrading from v1.x to v2.0

### Breaking Changes
- `cidr_block` has been renamed to `vpc_cidr`
- `public_subnets` now expects a map instead of a list

### Migration Steps
1. Rename `cidr_block` to `vpc_cidr` in your module call
2. Convert your subnet list to a map:
   Before: `public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]`
   After:  `public_subnets = { "az1" = "10.0.1.0/24", "az2" = "10.0.2.0/24" }`
```

## Conclusion

Git tags are the simplest and most portable way to version Terraform modules. They work with any Git hosting provider, require no additional tooling, and integrate naturally into existing development workflows. Start with manual tagging to get comfortable with the process, then move to automated releases as your module ecosystem grows. The key is discipline - follow semantic versioning, never break tagged releases, and always test before you tag.

For related reading, check out our post on [how to create Terraform root modules for deployments](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-root-modules-for-deployments/view) and [how to organize child modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-child-modules-in-terraform/view).
