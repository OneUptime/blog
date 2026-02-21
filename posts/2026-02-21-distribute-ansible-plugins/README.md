# How to Distribute Ansible Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Collections, Galaxy, Distribution

Description: Learn the different methods for distributing Ansible plugins including Galaxy, private automation hub, Git repos, and PyPI packages.

---

You built a custom Ansible plugin and it works great in your project. Now you need to share it with your team, your organization, or the wider community. Ansible provides several distribution channels, each suited for different use cases. This guide covers all the main approaches.

## Distribution Options Overview

There are four primary ways to distribute Ansible plugins:

1. **Ansible Galaxy** - Public registry, best for open source plugins
2. **Private Automation Hub** - Enterprise option for internal distribution
3. **Git repositories** - Direct installation from source control
4. **Tarballs and artifact repositories** - Manual distribution or integration with CI/CD

All of these work through the Ansible collections packaging format.

## Packaging Plugins as a Collection

Before distributing, your plugins must be packaged as a collection. Make sure your directory structure is correct:

```
myorg/myutils/
  galaxy.yml
  plugins/
    filter/
      my_filters.py
    lookup/
      my_lookups.py
    callback/
      my_callbacks.py
  README.md
  CHANGELOG.md
```

The `galaxy.yml` file defines your collection metadata:

```yaml
# galaxy.yml
namespace: myorg
name: myutils
version: 1.2.0
readme: README.md
authors:
  - DevOps Team <devops@myorg.com>
description: Custom utility plugins for infrastructure automation
license:
  - Apache-2.0
tags:
  - infrastructure
  - networking
  - utilities
dependencies: {}
repository: https://github.com/myorg/ansible-collection-myutils
```

Build the distributable tarball:

```bash
# Build the collection archive
ansible-galaxy collection build

# This produces: myorg-myutils-1.2.0.tar.gz
```

## Publishing to Ansible Galaxy

Galaxy is the public registry for Ansible content. Publishing there makes your plugins available to anyone.

First, create an account on [galaxy.ansible.com](https://galaxy.ansible.com) and get an API token from your profile settings.

```bash
# Set up your Galaxy token
export ANSIBLE_GALAXY_TOKEN="your-token-here"

# Or configure it in ansible.cfg
# [galaxy]
# token = your-token-here

# Publish the collection
ansible-galaxy collection publish myorg-myutils-1.2.0.tar.gz --token "$ANSIBLE_GALAXY_TOKEN"
```

Users install your collection with:

```bash
ansible-galaxy collection install myorg.myutils
```

Or pin a version in a requirements file:

```yaml
# requirements.yml
collections:
  - name: myorg.myutils
    version: ">=1.2.0,<2.0.0"
```

```bash
ansible-galaxy collection install -r requirements.yml
```

## Publishing to Private Automation Hub

For enterprise environments, Red Hat provides Private Automation Hub as part of the Ansible Automation Platform. It works like Galaxy but is hosted internally.

Configure your `ansible.cfg` to point to your private hub:

```ini
# ansible.cfg
[galaxy]
server_list = private_hub, galaxy

[galaxy_server.private_hub]
url = https://hub.internal.myorg.com/api/galaxy/
token = your-hub-token
auth_url = https://sso.myorg.com/auth/realms/ansible/protocol/openid-connect/token

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

Publish to the private hub:

```bash
ansible-galaxy collection publish myorg-myutils-1.2.0.tar.gz --server private_hub
```

## Installing from Git Repositories

For teams that do not need a registry, you can install collections directly from Git:

```bash
# Install from a Git repository
ansible-galaxy collection install git+https://github.com/myorg/ansible-collection-myutils.git

# Install a specific version (Git tag)
ansible-galaxy collection install git+https://github.com/myorg/ansible-collection-myutils.git,v1.2.0

# Install a specific branch
ansible-galaxy collection install git+https://github.com/myorg/ansible-collection-myutils.git,develop
```

In a requirements file:

```yaml
# requirements.yml
collections:
  - name: https://github.com/myorg/ansible-collection-myutils.git
    type: git
    version: v1.2.0
```

The repository must contain the collection at its root (with `galaxy.yml` at the top level).

## Hosting on an Artifact Repository

For organizations using Nexus, Artifactory, or S3, you can host collection tarballs and install from a URL:

```bash
# Upload to your artifact repo (example with curl)
curl -u admin:password \
  --upload-file myorg-myutils-1.2.0.tar.gz \
  https://nexus.myorg.com/repository/ansible-collections/

# Install from URL
ansible-galaxy collection install \
  https://nexus.myorg.com/repository/ansible-collections/myorg-myutils-1.2.0.tar.gz
```

Or configure it as a Galaxy server:

```ini
# ansible.cfg
[galaxy_server.nexus]
url = https://nexus.myorg.com/repository/ansible-collections/
```

## Versioning Strategy

Follow semantic versioning for your collection:

- **Major** (2.0.0) - Breaking changes (renamed plugins, removed options, changed behavior)
- **Minor** (1.2.0) - New plugins or new options on existing plugins
- **Patch** (1.2.1) - Bug fixes that do not change the interface

Keep a changelog to track what changed between versions:

```markdown
# CHANGELOG.md

## 1.2.0 (2025-03-15)
### New Features
- Added `vault_secret` lookup plugin for HashiCorp Vault integration
- Added `cidr_to_netmask` filter plugin

### Bug Fixes
- Fixed `sort_ips` filter handling of IPv6 addresses

## 1.1.0 (2025-02-01)
### New Features
- Added `api_lookup` lookup plugin
```

## Automating Releases with CI/CD

Automate the build and publish process with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release Collection
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install ansible-core
        run: pip install ansible-core

      - name: Build collection
        run: ansible-galaxy collection build

      - name: Publish to Galaxy
        run: |
          ansible-galaxy collection publish \
            *.tar.gz \
            --token "${{ secrets.GALAXY_API_TOKEN }}"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: '*.tar.gz'
```

## Dependency Management

If your collection depends on other collections, declare them in `galaxy.yml`:

```yaml
dependencies:
  ansible.utils: ">=2.0.0"
  community.general: ">=6.0.0"
```

When users install your collection, dependencies are resolved automatically:

```bash
# This installs myorg.myutils AND its dependencies
ansible-galaxy collection install myorg.myutils
```

## Distribution Checklist

Before publishing a release, verify these items:

```bash
# Run sanity tests
ansible-test sanity --docker default

# Run unit tests
pytest tests/unit/ -v

# Run integration tests
ansible-test integration --docker default

# Verify documentation renders
ansible-doc -t filter myorg.myutils.cidr_to_netmask
ansible-doc -t lookup myorg.myutils.vault_secret

# Build and inspect the tarball
ansible-galaxy collection build
tar tzf myorg-myutils-1.2.0.tar.gz | head -20
```

## Summary

Distributing Ansible plugins through collections gives you versioning, dependency management, and multiple distribution channels. Use Galaxy for public plugins, Private Automation Hub for enterprise environments, Git repos for team-internal sharing, and artifact repositories for CI/CD integration. Automate the release process so every tagged commit gets built, tested, and published automatically.
