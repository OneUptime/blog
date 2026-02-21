# How to Upload Collections to Ansible Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Collections, Publishing

Description: Step-by-step guide to building and publishing Ansible collections to Galaxy including namespace setup, metadata, building, and automated releases.

---

Collections are the primary distribution format for Ansible content. If you have modules, plugins, roles, or playbooks to share, packaging them as a collection and publishing to Galaxy is the way to go. Unlike roles (which are imported from GitHub), collections are built into tarballs and uploaded directly to Galaxy. This post walks through the entire process from start to finish.

## Prerequisites

You need:
- An Ansible Galaxy account (https://galaxy.ansible.com, sign in with GitHub)
- A Galaxy namespace (matches your GitHub username or organization)
- `ansible-core` installed locally
- Your collection structured according to the Ansible collection format

## Step 1: Initialize Your Collection

If you are starting from scratch, use the `collection init` command:

```bash
# Initialize a new collection skeleton
ansible-galaxy collection init my_namespace.my_collection
```

This creates the following structure:

```
my_namespace/my_collection/
    docs/
    meta/
        runtime.yml
    plugins/
        README.md
    roles/
    galaxy.yml
    README.md
```

## Step 2: Configure galaxy.yml

The `galaxy.yml` file is the collection manifest. Fill it out completely:

```yaml
# galaxy.yml - Collection metadata
---
namespace: my_namespace
name: my_collection
version: 1.0.0
readme: README.md
authors:
  - Your Name <your.email@example.com>
description: A collection of modules and roles for managing MyApp infrastructure
license:
  - MIT
license_file: LICENSE
tags:
  - infrastructure
  - myapp
  - deployment
  - linux
dependencies:
  ansible.utils: ">=2.0.0"
  community.general: ">=7.0.0"
repository: https://github.com/my_namespace/my_collection
documentation: https://github.com/my_namespace/my_collection/blob/main/README.md
homepage: https://github.com/my_namespace/my_collection
issues: https://github.com/my_namespace/my_collection/issues
build_ignore:
  - .gitignore
  - .github
  - tests/output
  - "*.tar.gz"
```

Important fields:

- `namespace` must match your Galaxy namespace exactly
- `version` follows semantic versioning (Galaxy rejects duplicate versions)
- `dependencies` lists other collections your collection needs
- `build_ignore` prevents unnecessary files from being included in the tarball

## Step 3: Add Your Content

Place your content in the appropriate directories:

```
my_namespace/my_collection/
    plugins/
        modules/
            myapp_config.py       # Custom module
            myapp_service.py      # Another module
        module_utils/
            myapp_common.py       # Shared Python utilities
        inventory/
            myapp_inventory.py    # Inventory plugin
        filter/
            myapp_filters.py      # Custom Jinja2 filters
    roles/
        install/                  # Role for installing MyApp
            tasks/main.yml
            defaults/main.yml
            handlers/main.yml
        configure/                # Role for configuring MyApp
            tasks/main.yml
            defaults/main.yml
            templates/
    playbooks/
        deploy.yml                # Example playbook
    docs/
        myapp_config_module.rst   # Module documentation
```

## Step 4: Write a meta/runtime.yml

This file handles module routing and deprecation:

```yaml
# meta/runtime.yml - Runtime configuration
---
requires_ansible: ">=2.12.0"
plugin_routing:
  modules:
    # Redirect old module names to new ones if you rename modules
    old_module_name:
      redirect: my_namespace.my_collection.myapp_config
    # Deprecate modules that should no longer be used
    deprecated_module:
      deprecation:
        removal_version: "2.0.0"
        warning_text: "Use myapp_config instead"
```

## Step 5: Build the Collection

Build the collection into a distributable tarball:

```bash
# Build the collection tarball
cd my_namespace/my_collection/
ansible-galaxy collection build
```

This creates a file like `my_namespace-my_collection-1.0.0.tar.gz` in the current directory. Inspect the contents:

```bash
# Verify the tarball contents
tar tzf my_namespace-my_collection-1.0.0.tar.gz
```

Make sure it includes all the files you expect and does not include anything unnecessary (test outputs, `.git` directory, etc.).

## Step 6: Get Your Galaxy API Token

1. Go to https://galaxy.ansible.com
2. Click on your profile icon
3. Go to "API Token" or "Preferences"
4. Generate or copy your API token

Store it securely. You will need it for the upload command.

## Step 7: Publish to Galaxy

Upload the built tarball:

```bash
# Publish the collection to Galaxy
ansible-galaxy collection publish my_namespace-my_collection-1.0.0.tar.gz \
    --token your_galaxy_api_token
```

Or use the token from an environment variable:

```bash
# Set token as environment variable
export ANSIBLE_GALAXY_TOKEN="your_galaxy_api_token"

# Publish without passing the token flag
ansible-galaxy collection publish my_namespace-my_collection-1.0.0.tar.gz
```

You can also configure the token in `ansible.cfg`:

```ini
# ansible.cfg - configure Galaxy token
[galaxy]
server_list = galaxy

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
token = your_galaxy_api_token
```

## Step 8: Verify the Upload

After publishing, verify your collection appears on Galaxy:

```bash
# Search for your collection
ansible-galaxy collection install my_namespace.my_collection

# Check the info
ansible-galaxy collection list | grep my_namespace
```

Visit the Galaxy web page for your collection to verify the README, metadata, and documentation render correctly.

## Automating Releases with GitHub Actions

Set up a CI/CD pipeline that builds and publishes automatically on tagged releases:

```yaml
# .github/workflows/release.yml - Auto-publish to Galaxy
---
name: Release to Galaxy

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Ansible
        run: pip install ansible-core

      - name: Get version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Verify galaxy.yml version matches tag
        run: |
          GALAXY_VERSION=$(grep '^version:' galaxy.yml | awk '{print $2}')
          TAG_VERSION="${{ steps.version.outputs.VERSION }}"
          if [ "$GALAXY_VERSION" != "$TAG_VERSION" ]; then
            echo "Version mismatch: galaxy.yml=$GALAXY_VERSION tag=$TAG_VERSION"
            exit 1
          fi

      - name: Build collection
        run: ansible-galaxy collection build

      - name: Publish to Galaxy
        run: |
          ansible-galaxy collection publish \
            *.tar.gz \
            --token ${{ secrets.GALAXY_API_TOKEN }}
```

## Testing Before Publishing

Always test your collection before publishing. Run sanity tests:

```bash
# Run Ansible sanity tests on your collection
cd my_namespace/my_collection/
ansible-test sanity --docker

# Run unit tests if you have them
ansible-test units --docker

# Run integration tests if you have them
ansible-test integration --docker
```

You can integrate these into your CI pipeline:

```yaml
# .github/workflows/ci.yml - Test collection before release
---
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  sanity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          path: ansible_collections/my_namespace/my_collection
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install ansible-core
      - run: ansible-test sanity --docker
        working-directory: ansible_collections/my_namespace/my_collection
```

## Updating Your Collection

To publish an update:

1. Make your changes
2. Bump the version in `galaxy.yml` (Galaxy rejects duplicate versions)
3. Update the CHANGELOG
4. Build and publish

```bash
# After updating galaxy.yml version to 1.1.0
ansible-galaxy collection build
ansible-galaxy collection publish my_namespace-my_collection-1.1.0.tar.gz \
    --token your_galaxy_api_token
```

## Writing a CHANGELOG

Galaxy does not require a changelog, but users expect one:

```markdown
# Changelog

## 1.1.0 (2026-02-21)

### New Features
- Added myapp_backup module for automated backups
- Added `configure` role for post-install configuration

### Bug Fixes
- Fixed idempotency issue in myapp_config module

## 1.0.0 (2026-01-15)

### Initial Release
- myapp_config module for managing configuration
- myapp_service module for service management
- install role for deploying MyApp
```

## Summary

Publishing collections to Galaxy involves building a tarball from your properly structured collection and uploading it with `ansible-galaxy collection publish`. The process starts with a well-configured `galaxy.yml` manifest, includes the right content in the right directories, and ends with a verified upload. Automate the release process with GitHub Actions so that tagging a release in Git triggers an automatic build and publish. Always run sanity tests before publishing, bump the version in `galaxy.yml` for every release, and maintain a changelog so users know what changed.
