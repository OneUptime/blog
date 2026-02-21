# How to Version Your Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Versioning, Semantic Versioning

Description: Learn how to version your Ansible roles using semantic versioning, Git tags, changelogs, and Galaxy metadata for reliable automation.

---

Versioning Ansible roles is one of those practices that feels unnecessary when you start but becomes critical once you have multiple teams and projects depending on shared roles. Without versioning, updating a role in one place can silently break playbooks in other projects. This post covers how to version roles properly using Git tags, semantic versioning, Galaxy metadata, and changelog practices that keep everyone on the same page.

## Why Version Your Roles?

Consider this scenario: you have a PostgreSQL role used by five different projects. You change the default `postgresql_max_connections` from 100 to 200. Without versioning:

- All five projects silently get the new default on their next deployment
- Some projects might have been relying on the old value
- There is no record of when or why the change happened
- Rolling back requires Git archaeology

With proper versioning, each project pins to a specific version, updates are explicit, and breaking changes are communicated through version numbers.

## Semantic Versioning for Roles

Semantic versioning (SemVer) works well for Ansible roles. The format is `MAJOR.MINOR.PATCH`:

- **MAJOR**: Breaking changes (renamed variables, removed features, changed behavior)
- **MINOR**: New features that are backward compatible (new variables, new task files, new platform support)
- **PATCH**: Bug fixes that do not change the interface (fixed idempotency issues, corrected file permissions)

Examples of version bumps:

| Change | Version Bump | Example |
|--------|-------------|---------|
| Renamed `nginx_port` to `nginx_listen_port` | Major (2.0.0) | Breaking: existing playbooks fail |
| Added `nginx_enable_gzip` variable | Minor (1.1.0) | New feature, backward compatible |
| Fixed template rendering bug | Patch (1.0.1) | Bug fix, no interface change |
| Dropped support for Ubuntu 18.04 | Major (3.0.0) | Breaking for users on that platform |
| Added Rocky Linux 9 support | Minor (1.2.0) | New platform, no breaking changes |

## Using Git Tags for Versions

Git tags are the primary mechanism for versioning Ansible roles. When `ansible-galaxy` installs a role with a version specifier, it checks out the corresponding Git tag.

```bash
# Tag a new version
git tag -a v1.0.0 -m "Initial stable release"
git push origin v1.0.0

# Tag a patch release
git tag -a v1.0.1 -m "Fix idempotency issue in config template"
git push origin v1.0.1

# Tag a minor release
git tag -a v1.1.0 -m "Add support for custom error pages"
git push origin v1.1.0
```

### Tag Naming Convention

Use the `v` prefix consistently:

```
v1.0.0    # Good - consistent convention
v1.0.1    # Good
v1.1.0    # Good
1.0.0     # Works but less conventional
release-1.0.0  # Avoid - not standard
```

## Galaxy Metadata Version

Keep the version in `meta/main.yml` in sync with your Git tags:

```yaml
# roles/nginx/meta/main.yml
# Keep this version in sync with your Git tags
---
galaxy_info:
  author: nawazdhandala
  description: Installs and configures Nginx
  license: MIT
  min_ansible_version: "2.14"
  version: 1.1.0    # Must match the Git tag (without "v" prefix)
  platforms:
    - name: Ubuntu
      versions:
        - focal
        - jammy
    - name: EL
      versions:
        - "8"
        - "9"
  galaxy_tags:
    - nginx
    - webserver
```

## Maintaining a CHANGELOG

A changelog is essential for role consumers to understand what changed between versions. Use the Keep a Changelog format:

```markdown
# Changelog

All notable changes to this role will be documented in this file.

## [1.1.0] - 2026-02-21

### Added
- Support for custom error pages via `nginx_custom_error_pages` variable
- Rocky Linux 9 platform support
- New `nginx_enable_gzip` variable with default `true`

### Changed
- Updated default `nginx_worker_connections` from 768 to 1024

## [1.0.1] - 2026-02-15

### Fixed
- Template rendering issue when `nginx_server_name` contains special characters
- Idempotency problem with the APT repository task on Ubuntu 22.04

## [1.0.0] - 2026-02-01

### Added
- Initial release
- Support for Ubuntu 20.04, 22.04
- Support for RHEL 8, 9
- Basic Nginx installation and configuration
- Virtual host management
- TLS support
```

## Release Workflow

Here is a practical workflow for releasing a new version:

```bash
# 1. Make your changes on a feature branch
git checkout -b feature/custom-error-pages
# ... make changes ...
git add .
git commit -m "Add custom error page support"

# 2. Update the changelog
vim CHANGELOG.md

# 3. Update the version in meta/main.yml
vim meta/main.yml

# 4. Merge to main
git checkout main
git merge feature/custom-error-pages

# 5. Tag the release
git tag -a v1.1.0 -m "Add custom error page support"

# 6. Push everything
git push origin main
git push origin v1.1.0
```

## Automating Version Bumps

You can automate versioning with a simple script:

```bash
#!/bin/bash
# scripts/release.sh
# Usage: ./release.sh patch|minor|major "Release message"

set -euo pipefail

BUMP_TYPE=$1
MESSAGE=$2

# Get current version from meta/main.yml
CURRENT=$(grep 'version:' meta/main.yml | head -1 | awk '{print $2}' | tr -d '"')

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Usage: $0 patch|minor|major \"Release message\""
    exit 1
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "Bumping version: ${CURRENT} -> ${NEW_VERSION}"

# Update meta/main.yml
sed -i "s/version: .*/version: ${NEW_VERSION}/" meta/main.yml

# Commit the version bump
git add meta/main.yml
git commit -m "Bump version to ${NEW_VERSION}"

# Create the tag
git tag -a "v${NEW_VERSION}" -m "${MESSAGE}"

echo "Created tag v${NEW_VERSION}"
echo "Run 'git push origin main && git push origin v${NEW_VERSION}' to publish"
```

## GitHub Releases

Combine Git tags with GitHub releases for better visibility:

```bash
# Create a GitHub release with release notes
gh release create v1.1.0 \
  --title "v1.1.0 - Custom Error Pages" \
  --notes "$(cat <<'EOF'
## What's New

- Added support for custom error pages via `nginx_custom_error_pages` variable
- Added Rocky Linux 9 platform support
- New `nginx_enable_gzip` variable (default: true)

## Changes

- Updated default `nginx_worker_connections` from 768 to 1024

## Upgrading

This is a backward-compatible release. No changes needed to existing playbooks.
EOF
)"
```

## Pre-Release Versions

For testing before a stable release, use pre-release tags:

```bash
# Create a release candidate
git tag -a v2.0.0-rc1 -m "Release candidate 1 for version 2.0.0"
git push origin v2.0.0-rc1
```

Projects can test the release candidate:

```yaml
# requirements.yml - testing a release candidate
---
roles:
  - name: nginx
    src: git@github.com:myorg/ansible-role-nginx.git
    version: v2.0.0-rc1
```

## CI/CD Integration for Version Validation

Add a CI check that ensures the version in `meta/main.yml` matches the Git tag:

```yaml
# .github/workflows/release.yml
name: Validate Release

on:
  push:
    tags:
      - 'v*'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract tag version
        id: tag
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Extract meta version
        id: meta
        run: |
          version=$(grep 'version:' meta/main.yml | head -1 | awk '{print $2}' | tr -d '"')
          echo "version=$version" >> $GITHUB_OUTPUT

      - name: Compare versions
        run: |
          if [ "${{ steps.tag.outputs.version }}" != "${{ steps.meta.outputs.version }}" ]; then
            echo "ERROR: Tag version (${{ steps.tag.outputs.version }}) does not match meta version (${{ steps.meta.outputs.version }})"
            exit 1
          fi
          echo "Versions match: ${{ steps.tag.outputs.version }}"
```

## Version Compatibility Matrix

For roles that support multiple Ansible versions, document the compatibility:

```yaml
# meta/main.yml
galaxy_info:
  min_ansible_version: "2.14"
```

In your README or changelog:

```markdown
## Compatibility

| Role Version | Ansible Version | Python Version |
|-------------|----------------|----------------|
| 1.x         | 2.12 - 2.16   | 3.8+          |
| 2.x         | 2.14+          | 3.9+          |
```

## Pinning in Consumer Projects

Once your roles are versioned, consumers pin to specific versions in their `requirements.yml`:

```yaml
# requirements.yml in a consumer project
---
roles:
  - name: nginx
    src: git@github.com:myorg/ansible-role-nginx.git
    version: v1.1.0    # Pinned - will not change until explicitly updated

  - name: postgresql
    src: git@github.com:myorg/ansible-role-postgresql.git
    version: v2.3.0
```

This means updating a role is always a deliberate action: change the version in `requirements.yml`, test, and commit.

## Wrapping Up

Versioning Ansible roles is not overhead; it is insurance. Semantic versioning communicates the nature of changes. Git tags give you immutable release points. Changelogs explain what changed and why. And version pinning in `requirements.yml` ensures that no project gets surprised by an unexpected change. Start versioning your roles from the first release, even if you think only one project uses them. It costs almost nothing and saves significant debugging time when things inevitably change.
