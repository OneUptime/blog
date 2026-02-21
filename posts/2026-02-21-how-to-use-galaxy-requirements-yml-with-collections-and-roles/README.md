# How to Use Galaxy requirements.yml with Collections and Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Requirements, Collections, Roles

Description: How to structure a unified requirements.yml that manages both Ansible collections and roles with version pinning and multiple sources.

---

A `requirements.yml` file can manage both collections and roles in a single place. This is the standard way to declare all Galaxy dependencies for an Ansible project. However, there are some nuances to how the two sections interact and how you install them. This post dives into the details of using a unified requirements file for both content types.

## The Unified Format

Since Ansible 2.10, the requirements file supports both `roles` and `collections` top-level keys:

```yaml
# requirements.yml - both roles and collections
---
roles:
  - name: geerlingguy.nginx
    version: "3.1.0"

  - name: geerlingguy.postgresql
    version: "3.4.0"

  - name: geerlingguy.certbot
    version: "5.1.0"

collections:
  - name: community.general
    version: "8.1.0"

  - name: amazon.aws
    version: "7.2.0"

  - name: ansible.posix
    version: "1.5.4"
```

## The Two-Command Installation

Here is the catch that trips people up: you need two separate commands to install both sections:

```bash
# Install roles (reads the "roles" section)
ansible-galaxy install -r requirements.yml

# Install collections (reads the "collections" section)
ansible-galaxy collection install -r requirements.yml
```

The `ansible-galaxy install` command only processes the `roles` section. The `ansible-galaxy collection install` command only processes the `collections` section. Neither command installs both.

Wrap them together:

```bash
# Install both roles and collections
ansible-galaxy install -r requirements.yml -p ./roles/
ansible-galaxy collection install -r requirements.yml -p ./collections/
```

Or put it in a script:

```bash
#!/bin/bash
# install-deps.sh - Install all Galaxy dependencies
set -e

ROLES_DIR="${1:-./roles}"
COLLECTIONS_DIR="${2:-./collections}"
REQUIREMENTS="${3:-requirements.yml}"

echo "Installing roles from ${REQUIREMENTS}..."
ansible-galaxy install -r "$REQUIREMENTS" -p "$ROLES_DIR"

echo ""
echo "Installing collections from ${REQUIREMENTS}..."
ansible-galaxy collection install -r "$REQUIREMENTS" -p "$COLLECTIONS_DIR"

echo ""
echo "Installation complete."
echo "Roles:"
ansible-galaxy list -p "$ROLES_DIR"
echo ""
echo "Collections:"
ansible-galaxy collection list -p "$COLLECTIONS_DIR"
```

## Roles with Different Sources

The `roles` section supports multiple source types:

```yaml
# requirements.yml - roles from various sources
---
roles:
  # From Ansible Galaxy
  - name: geerlingguy.nginx
    version: "3.1.0"

  # From a public GitHub repo
  - name: custom_haproxy
    src: git+https://github.com/myorg/ansible-role-haproxy.git
    version: v2.0.0

  # From a private GitHub repo via SSH
  - name: internal_security
    src: git+ssh://git@github.com/myorg/ansible-role-security.git
    version: v1.5.0

  # From a tarball URL
  - name: legacy_monitoring
    src: https://artifacts.internal.com/ansible/legacy_monitoring-1.0.0.tar.gz

  # From a local tarball
  - name: local_testing
    src: file:///opt/ansible-artifacts/local_testing-1.0.0.tar.gz
```

## Collections with Different Sources

The `collections` section also supports multiple sources:

```yaml
# requirements.yml - collections from various sources
---
collections:
  # From public Galaxy
  - name: community.general
    version: "8.1.0"

  # From Automation Hub
  - name: amazon.aws
    version: "7.2.0"
    source: https://cloud.redhat.com/api/automation-hub/content/published/

  # From a private Galaxy server
  - name: myorg.infrastructure
    version: "1.0.0"
    source: https://galaxy.internal.com/api/galaxy/content/published/

  # From a Git repository
  - name: https://github.com/myorg/ansible-collection-tools.git
    type: git
    version: v1.3.0

  # From a local tarball
  - name: /path/to/myorg-tools-1.0.0.tar.gz
    type: file
```

## Handling Overlapping Functionality

Sometimes a collection includes roles that overlap with standalone Galaxy roles. For example, `community.postgresql` has modules but you might also use `geerlingguy.postgresql` for its role. Be explicit about what comes from where:

```yaml
# requirements.yml - clear separation of collections vs roles
---
# Collections provide modules and plugins
collections:
  - name: community.postgresql
    version: "3.3.0"
  - name: community.general
    version: "8.1.0"

# Roles provide task workflows that use those modules
roles:
  - name: geerlingguy.postgresql
    version: "3.4.0"
```

In your playbook, the role uses modules from the collection:

```yaml
# playbook.yml - role uses collection modules
---
- hosts: databases
  become: true
  collections:
    - community.postgresql
  roles:
    - role: geerlingguy.postgresql
      vars:
        postgresql_version: "15"
```

## The Legacy Format

Before Ansible 2.10, the requirements file used a flat list without the `roles:` key:

```yaml
# Old format (still works but not recommended)
---
- name: geerlingguy.nginx
  version: "3.1.0"

- name: geerlingguy.postgresql
  version: "3.4.0"
```

This old format only supports roles, not collections. If you have a legacy project, migrate to the new format:

```yaml
# New format (recommended)
---
roles:
  - name: geerlingguy.nginx
    version: "3.1.0"

  - name: geerlingguy.postgresql
    version: "3.4.0"

collections: []
```

## Separating Requirements Files

For large projects, split requirements by purpose:

```yaml
# requirements-core.yml - always needed
---
roles:
  - name: geerlingguy.nginx
    version: "3.1.0"
collections:
  - name: community.general
    version: "8.1.0"
  - name: ansible.posix
    version: "1.5.4"
```

```yaml
# requirements-aws.yml - AWS-specific
---
roles:
  - name: geerlingguy.aws-inspector
    version: "2.0.0"
collections:
  - name: amazon.aws
    version: "7.2.0"
  - name: community.aws
    version: "7.1.0"
```

```yaml
# requirements-monitoring.yml - monitoring stack
---
roles:
  - name: cloudalchemy.prometheus
    version: "2.22.0"
  - name: cloudalchemy.grafana
    version: "0.17.0"
collections:
  - name: community.grafana
    version: "1.7.0"
```

Install selectively:

```bash
# Always install core
ansible-galaxy install -r requirements-core.yml -p ./roles/
ansible-galaxy collection install -r requirements-core.yml -p ./collections/

# Install AWS deps when deploying to AWS
if [ "$CLOUD_PROVIDER" = "aws" ]; then
    ansible-galaxy install -r requirements-aws.yml -p ./roles/
    ansible-galaxy collection install -r requirements-aws.yml -p ./collections/
fi
```

## Validating the Requirements File

A quick validation script:

```python
#!/usr/bin/env python3
# validate-requirements.py - Validate requirements.yml structure
import yaml
import sys

def validate(filename):
    with open(filename) as f:
        data = yaml.safe_load(f)

    if not isinstance(data, dict):
        print(f"ERROR: {filename} must be a YAML dictionary with 'roles' and/or 'collections' keys")
        return False

    valid = True
    allowed_keys = {"roles", "collections"}
    unknown_keys = set(data.keys()) - allowed_keys

    if unknown_keys:
        print(f"WARNING: Unknown top-level keys: {unknown_keys}")

    # Validate roles
    for i, role in enumerate(data.get("roles", [])):
        if "name" not in role:
            print(f"ERROR: Role entry {i} missing 'name' field")
            valid = False
        if "version" not in role and "src" not in role:
            print(f"WARNING: Role '{role.get('name', 'unknown')}' has no version pin")

    # Validate collections
    for i, coll in enumerate(data.get("collections", [])):
        if "name" not in coll:
            print(f"ERROR: Collection entry {i} missing 'name' field")
            valid = False
        if "version" not in coll:
            print(f"WARNING: Collection '{coll.get('name', 'unknown')}' has no version pin")

    roles_count = len(data.get("roles", []))
    colls_count = len(data.get("collections", []))
    print(f"Found {roles_count} roles and {colls_count} collections")

    return valid

if __name__ == "__main__":
    filename = sys.argv[1] if len(sys.argv) > 1 else "requirements.yml"
    if validate(filename):
        print("Validation passed")
    else:
        print("Validation failed")
        sys.exit(1)
```

## CI/CD Integration

A complete CI job for a project with both roles and collections:

```yaml
# .github/workflows/deploy.yml
---
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pip install ansible-core

      - name: Validate requirements
        run: python3 validate-requirements.py requirements.yml

      - name: Install all dependencies
        run: |
          ansible-galaxy install -r requirements.yml -p ./roles/
          ansible-galaxy collection install -r requirements.yml -p ./collections/

      - name: Verify installations
        run: |
          echo "=== Roles ==="
          ansible-galaxy list -p ./roles/
          echo "=== Collections ==="
          ansible-galaxy collection list -p ./collections/

      - name: Run playbook
        run: ansible-playbook -i inventory site.yml
```

## Summary

Using a unified `requirements.yml` with both `roles` and `collections` sections keeps all your Galaxy dependencies in one place. Remember that you need two commands to install both sections: `ansible-galaxy install -r` for roles and `ansible-galaxy collection install -r` for collections. Pin versions for all entries, use the `source` field for collections from specific servers, and support multiple source types (Galaxy, Git, tarballs) for roles. For large projects, split requirements into purpose-specific files and install them selectively. Always validate the file structure before committing changes.
