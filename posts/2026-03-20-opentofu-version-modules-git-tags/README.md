# How to Version Modules with Git Tags in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module, Git

Description: Learn how to version OpenTofu modules using Git tags to enable consumers to pin to specific releases and safely upgrade over time.

## Introduction

Git tags are the versioning mechanism for OpenTofu modules stored in Git repositories. A tagged commit creates a stable, immutable reference that consumers can pin to. Without tags, callers must reference mutable branch names that can change unexpectedly.

## Creating a Semantic Version Tag

Follow semantic versioning (semver): `MAJOR.MINOR.PATCH`

```bash
# Tag the current commit as v1.0.0

git tag v1.0.0

# Push the tag to the remote
git push origin v1.0.0

# Create an annotated tag (preferred - includes message and tagger info)
git tag -a v1.0.0 -m "Initial stable release"
git push origin v1.0.0
```

## Consuming a Tagged Module Version

```hcl
# Pin to a specific tag
module "vpc" {
  source = "git::https://github.com/acme-corp/terraform-modules.git//modules/vpc?ref=v2.1.0"

  name       = "production"
  cidr_block = "10.0.0.0/16"
}
```

## Semantic Versioning Conventions

| Version | When to Use |
|---------|------------|
| `v1.0.0 → v2.0.0` | Breaking change: removed variable, renamed output |
| `v1.0.0 → v1.1.0` | New feature: added optional variable with default |
| `v1.0.0 → v1.0.1` | Bug fix: no interface change |

```bash
# Bug fix - increment patch
git tag v1.0.1 && git push origin v1.0.1

# New optional feature - increment minor
git tag v1.1.0 && git push origin v1.1.0

# Breaking change - increment major
git tag v2.0.0 && git push origin v2.0.0
```

## Release Workflow

A typical module release process:

```bash
# 1. Merge feature branch to main
git checkout main
git merge feature/add-nat-gateway

# 2. Update CHANGELOG.md with changes

# 3. Create and push the tag
git tag -a v1.2.0 -m "Add optional NAT gateway support"
git push origin main
git push origin v1.2.0
```

## Automating Releases with GitHub Actions

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: Release ${{ github.ref_name }}
          draft: false
```

## Listing Available Tags

```bash
# List all tags in the repository
git tag --list 'v*' --sort=-version:refname

# Output:
# v2.1.0
# v2.0.0
# v1.3.2
# v1.3.1
# v1.0.0
```

## Pinning to a Commit SHA

For maximum reproducibility, pin to an immutable commit SHA:

```hcl
module "vpc" {
  source = "git::https://github.com/acme-corp/terraform-modules.git//modules/vpc?ref=a1b2c3d4e5f6789"
}
```

Commit SHAs never change, making them the most stable reference - though less readable than version tags.

## Important Notes

- Avoid referencing mutable branch names like `?ref=main` in production - the branch tip can change.
- For the public OpenTofu Registry, tags are the mechanism for publishing new versions.
- Keep a CHANGELOG.md to document what changed in each version.

## Conclusion

Git tags give OpenTofu module consumers a stable, versioned interface. Use semantic versioning to communicate the impact of each release, automate the tag-and-release process in CI/CD, and encourage consumers to pin to specific tags rather than branch names. This creates a predictable upgrade path for all module consumers.
