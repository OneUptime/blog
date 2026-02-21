# How to Build Ansible Collections for Galaxy Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Collections, Packaging, Development

Description: End-to-end guide to building professional Ansible collections for Galaxy distribution including testing, documentation, CI/CD, and release management.

---

Building an Ansible collection that is ready for Galaxy distribution involves more than just bundling some modules together. A well-built collection has proper documentation, comprehensive tests, a clean build process, and a release workflow that produces consistent artifacts. This post walks through the entire build process from project setup to published release.

## Project Structure

A distributable collection follows this directory layout:

```
my_namespace/my_collection/
    changelogs/
        changelog.yml           # Machine-readable changelog
        fragments/              # Changelog fragments per change
    docs/                       # Documentation
    meta/
        runtime.yml             # Runtime configuration
    plugins/
        modules/                # Ansible modules
        module_utils/           # Shared Python code
        inventory/              # Inventory plugins
        lookup/                 # Lookup plugins
        filter/                 # Filter plugins
        callback/               # Callback plugins
    roles/                      # Roles included in the collection
    tests/
        integration/            # Integration tests
        unit/                   # Unit tests
        sanity/                 # Sanity test overrides
    galaxy.yml                  # Collection manifest
    README.md                   # Main documentation
    LICENSE                     # License file
    CHANGELOG.rst               # Human-readable changelog
```

## Setting Up galaxy.yml

The manifest file controls how the collection is built and what metadata appears on Galaxy:

```yaml
# galaxy.yml - collection manifest
---
namespace: devops_tooling
name: infrastructure
version: 1.0.0
readme: README.md
authors:
  - Platform Team <platform@example.com>
description: Infrastructure automation modules and roles for cloud-native deployments
license:
  - Apache-2.0
license_file: LICENSE
tags:
  - infrastructure
  - cloud
  - kubernetes
  - monitoring
  - deployment
dependencies:
  ansible.utils: ">=2.0.0,<4.0.0"
  ansible.posix: ">=1.4.0"
repository: https://github.com/devops-tooling/ansible-collection-infrastructure
documentation: https://devops-tooling.github.io/ansible-collection-infrastructure/
homepage: https://github.com/devops-tooling/ansible-collection-infrastructure
issues: https://github.com/devops-tooling/ansible-collection-infrastructure/issues
build_ignore:
  - .git
  - .github
  - .gitignore
  - .vscode
  - tests/output
  - "*.tar.gz"
  - Makefile
  - tox.ini
  - .pre-commit-config.yaml
```

The `build_ignore` list is critical. Without it, your tarball includes unnecessary files that bloat the package and might expose internal information.

## Writing Quality Modules

Every module needs proper documentation strings for Galaxy to render:

```python
#!/usr/bin/python
# plugins/modules/app_deploy.py

from ansible.module_utils.basic import AnsibleModule

DOCUMENTATION = r"""
---
module: app_deploy
short_description: Deploy applications to target servers
version_added: "1.0.0"
description:
  - Deploys application artifacts to target servers.
  - Handles rolling deployments with configurable batch sizes.
  - Supports rollback on failure.
options:
  app_name:
    description: Name of the application to deploy.
    required: true
    type: str
  version:
    description: Version of the application to deploy.
    required: true
    type: str
  deploy_path:
    description: Path where the application will be deployed.
    required: false
    type: str
    default: /opt/apps
  batch_size:
    description: Number of servers to deploy to simultaneously.
    required: false
    type: int
    default: 1
  rollback_on_failure:
    description: Whether to rollback if deployment fails.
    required: false
    type: bool
    default: true
author:
  - Platform Team (@devops-tooling)
seealso:
  - module: devops_tooling.infrastructure.app_config
"""

EXAMPLES = r"""
- name: Deploy the web application
  devops_tooling.infrastructure.app_deploy:
    app_name: webapp
    version: "2.5.0"
    deploy_path: /opt/apps
    batch_size: 2
    rollback_on_failure: true

- name: Deploy with defaults
  devops_tooling.infrastructure.app_deploy:
    app_name: api_service
    version: "1.3.1"
"""

RETURN = r"""
deployed_version:
  description: The version that was deployed.
  type: str
  returned: always
  sample: "2.5.0"
deploy_path:
  description: The path where the application was deployed.
  type: str
  returned: always
  sample: "/opt/apps/webapp/2.5.0"
previous_version:
  description: The version that was active before deployment.
  type: str
  returned: when a previous version exists
  sample: "2.4.0"
"""


def main():
    module = AnsibleModule(
        argument_spec=dict(
            app_name=dict(type="str", required=True),
            version=dict(type="str", required=True),
            deploy_path=dict(type="str", default="/opt/apps"),
            batch_size=dict(type="int", default=1),
            rollback_on_failure=dict(type="bool", default=True),
        ),
        supports_check_mode=True,
    )

    app_name = module.params["app_name"]
    version = module.params["version"]
    deploy_path = module.params["deploy_path"]

    result = dict(
        changed=True,
        deployed_version=version,
        deploy_path=f"{deploy_path}/{app_name}/{version}",
    )

    if module.check_mode:
        module.exit_json(**result)

    # Actual deployment logic would go here

    module.exit_json(**result)


if __name__ == "__main__":
    main()
```

## Configuring meta/runtime.yml

This file tells Ansible which version you require and handles module routing:

```yaml
# meta/runtime.yml
---
requires_ansible: ">=2.14.0"
plugin_routing:
  modules:
    # Handle module renames gracefully
    deploy:
      redirect: devops_tooling.infrastructure.app_deploy
  action:
    # Action plugin routing if needed
    {}
```

## Writing Tests

### Sanity Tests

Sanity tests validate documentation, Python syntax, and packaging:

```bash
# Run all sanity tests
cd my_namespace/my_collection
ansible-test sanity --docker
```

Create ignore files for known issues:

```
# tests/sanity/ignore-2.14.txt
plugins/modules/app_deploy.py validate-modules:missing-gplv3-license
```

### Unit Tests

```python
# tests/unit/plugins/modules/test_app_deploy.py
import pytest
from unittest.mock import patch, MagicMock
from ansible_collections.devops_tooling.infrastructure.plugins.modules import app_deploy


class TestAppDeploy:
    def setup_method(self):
        self.mock_module = MagicMock()
        self.mock_module.params = {
            "app_name": "webapp",
            "version": "2.5.0",
            "deploy_path": "/opt/apps",
            "batch_size": 1,
            "rollback_on_failure": True,
        }
        self.mock_module.check_mode = False

    def test_module_args(self):
        """Test that module accepts the expected arguments."""
        spec = app_deploy.main.__code__
        # Verify the function exists and is callable
        assert callable(app_deploy.main)
```

Run unit tests:

```bash
ansible-test units --docker
```

### Integration Tests

```yaml
# tests/integration/targets/app_deploy/tasks/main.yml
---
- name: Test basic deployment
  devops_tooling.infrastructure.app_deploy:
    app_name: test_app
    version: "1.0.0"
  register: deploy_result

- name: Verify deployment result
  ansible.builtin.assert:
    that:
      - deploy_result is changed
      - deploy_result.deployed_version == "1.0.0"
      - deploy_result.deploy_path == "/opt/apps/test_app/1.0.0"
```

## Building the Collection

The build command creates a distributable tarball:

```bash
# Build the collection
cd devops_tooling/infrastructure
ansible-galaxy collection build

# This creates: devops_tooling-infrastructure-1.0.0.tar.gz
```

Inspect the tarball to verify its contents:

```bash
# List the tarball contents
tar tzf devops_tooling-infrastructure-1.0.0.tar.gz | head -30

# Check the size
ls -lh devops_tooling-infrastructure-1.0.0.tar.gz
```

## Automated Build with Makefile

Standardize the build process:

```makefile
# Makefile - collection build automation
NAMESPACE := devops_tooling
NAME := infrastructure
VERSION := $(shell grep '^version:' galaxy.yml | awk '{print $$2}')
TARBALL := $(NAMESPACE)-$(NAME)-$(VERSION).tar.gz

.PHONY: build test test-sanity test-units test-integration clean publish

build: clean
	ansible-galaxy collection build

test: test-sanity test-units

test-sanity:
	ansible-test sanity --docker

test-units:
	ansible-test units --docker

test-integration:
	ansible-test integration --docker

clean:
	rm -f $(NAMESPACE)-$(NAME)-*.tar.gz
	rm -rf tests/output/

publish: build
	ansible-galaxy collection publish $(TARBALL) --token $(GALAXY_TOKEN)

# Verify the build before publishing
verify: build
	@echo "Tarball: $(TARBALL)"
	@echo "Size: $$(du -h $(TARBALL) | cut -f1)"
	@echo "Contents:"
	@tar tzf $(TARBALL) | wc -l
	@echo "files in archive"
```

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml - test and build pipeline
---
name: CI

on:
  push:
    branches: [main]
  pull_request:
  release:
    types: [published]

jobs:
  sanity:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        ansible: ["2.14", "2.15", "2.16"]
    steps:
      - uses: actions/checkout@v4
        with:
          path: ansible_collections/devops_tooling/infrastructure
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install ansible-core~=${{ matrix.ansible }}.0
      - name: Run sanity tests
        run: ansible-test sanity --docker
        working-directory: ansible_collections/devops_tooling/infrastructure

  build:
    needs: [sanity]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ansible-core
      - run: ansible-galaxy collection build
      - uses: actions/upload-artifact@v4
        with:
          name: collection-tarball
          path: "*.tar.gz"

  publish:
    needs: [build]
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: collection-tarball
      - run: pip install ansible-core
      - run: ansible-galaxy collection publish *.tar.gz --token ${{ secrets.GALAXY_TOKEN }}
```

## Version Management

Bump the version in `galaxy.yml` before each release. Use semantic versioning:

- **Major** (2.0.0): Breaking changes to modules or roles
- **Minor** (1.1.0): New modules, roles, or backwards-compatible features
- **Patch** (1.0.1): Bug fixes with no feature changes

```bash
# Bump version script
#!/bin/bash
# bump-version.sh <major|minor|patch>
BUMP_TYPE="${1:-patch}"
CURRENT=$(grep '^version:' galaxy.yml | awk '{print $2}')
IFS='.' read -r major minor patch <<< "$CURRENT"

case "$BUMP_TYPE" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
esac

NEW_VERSION="${major}.${minor}.${patch}"
sed -i "s/^version: .*/version: ${NEW_VERSION}/" galaxy.yml
echo "Bumped version: ${CURRENT} -> ${NEW_VERSION}"
```

## Summary

Building an Ansible collection for Galaxy distribution involves careful project structure, thorough documentation in module docstrings, comprehensive tests at sanity, unit, and integration levels, and a clean build process that excludes development files. Use a Makefile to standardize builds, a CI/CD pipeline to test across multiple Ansible versions, and semantic versioning for predictable releases. The `build_ignore` field in `galaxy.yml` keeps your tarball lean, and proper `DOCUMENTATION`, `EXAMPLES`, and `RETURN` strings make your collection user-friendly on Galaxy. Ship quality content by testing before every release and maintaining a clear changelog.
