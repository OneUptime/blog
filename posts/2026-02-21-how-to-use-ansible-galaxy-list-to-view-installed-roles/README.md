# How to Use ansible-galaxy list to View Installed Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, CLI, Troubleshooting

Description: How to use ansible-galaxy list to view installed roles and collections, debug path issues, and audit your Ansible environment.

---

When you have been working with Ansible for a while, you accumulate roles and collections across multiple directories. Some were installed from Galaxy, some from Git, and some are custom roles you wrote yourself. The `ansible-galaxy list` command shows you exactly what is installed and where, which is essential for debugging "role not found" errors and auditing your environment.

## Basic Usage

The simplest form lists all installed roles:

```bash
# List all installed roles
ansible-galaxy list
```

Output looks like this:

```
# /home/user/.ansible/roles
- geerlingguy.nginx, 3.1.0
- geerlingguy.postgresql, 3.4.0
- geerlingguy.redis, 1.8.0
# /home/user/project/roles
- my_custom_role, (unknown version)
```

Each section shows the roles path, and each role shows its name and version. Roles installed from Galaxy include version numbers. Roles without a proper `meta/main.yml` show "(unknown version)".

## Listing Roles in a Specific Path

If you have multiple role paths configured, you can check a specific one:

```bash
# List roles in a specific directory
ansible-galaxy list -p ./roles/
```

This is useful when your `ansible.cfg` has multiple paths and you want to inspect just one.

## Listing Installed Collections

For collections, use the `collection list` subcommand:

```bash
# List all installed collections
ansible-galaxy collection list
```

Output:

```
# /home/user/.ansible/collections/ansible_collections
Collection               Version
------------------------ -------
amazon.aws               7.2.0
ansible.posix            1.5.4
community.docker         3.7.0
community.general        8.1.0
community.postgresql     3.3.0

# /home/user/project/collections/ansible_collections
Collection               Version
------------------------ -------
myorg.infrastructure     1.0.0
```

## Filtering Collection List

To check if a specific collection is installed:

```bash
# Check for a specific collection
ansible-galaxy collection list community.general
```

This returns the collection if found, or an error if it is not installed. You can use this in scripts:

```bash
# Check if a collection is installed before using it
if ansible-galaxy collection list community.general > /dev/null 2>&1; then
    echo "community.general is installed"
else
    echo "community.general is NOT installed"
    ansible-galaxy collection install community.general
fi
```

## Understanding Role Search Paths

When you run `ansible-galaxy list` and wonder why a role is not showing up, check where Ansible looks for roles:

```bash
# Show the configured roles path
ansible-config dump | grep ROLES_PATH
```

Output:

```
DEFAULT_ROLES_PATH(default) = ['/home/user/.ansible/roles', '/usr/share/ansible/roles', '/etc/ansible/roles']
```

If your role is installed in a directory not in this list, Ansible will not find it. Common places to check:

- `~/.ansible/roles/` (user-level default)
- `/usr/share/ansible/roles/` (system-level)
- `/etc/ansible/roles/` (system-level)
- `./roles/` (project-level, if configured in ansible.cfg)

To add a path, update your `ansible.cfg`:

```ini
# ansible.cfg - add project-local roles path
[defaults]
roles_path = ./roles:./galaxy-roles:~/.ansible/roles
```

## Understanding Collection Search Paths

Similarly, check collection paths:

```bash
# Show configured collection paths
ansible-config dump | grep COLLECTIONS_PATHS
```

Output:

```
COLLECTIONS_PATHS(default) = ['/home/user/.ansible/collections', '/usr/share/ansible/collections']
```

## Auditing Your Environment

For a complete audit of everything installed, combine both commands:

```bash
#!/bin/bash
# audit-ansible-deps.sh - Audit all installed Ansible content
echo "=== Ansible Version ==="
ansible --version

echo ""
echo "=== Configured Role Paths ==="
ansible-config dump | grep ROLES_PATH

echo ""
echo "=== Installed Roles ==="
ansible-galaxy list

echo ""
echo "=== Configured Collection Paths ==="
ansible-config dump | grep COLLECTIONS_PATHS

echo ""
echo "=== Installed Collections ==="
ansible-galaxy collection list
```

## Comparing Installed vs Required

A common need is verifying that what is installed matches what your `requirements.yml` specifies. Here is a script that does this comparison:

```python
#!/usr/bin/env python3
# verify-deps.py - Compare installed content against requirements.yml
import yaml
import subprocess
import re
import sys

def get_installed_roles():
    """Parse ansible-galaxy list output."""
    result = subprocess.run(
        ["ansible-galaxy", "list"],
        capture_output=True, text=True
    )
    roles = {}
    for line in result.stdout.splitlines():
        match = re.match(r"^- (\S+),\s*(.+)$", line.strip())
        if match:
            roles[match.group(1)] = match.group(2).strip()
    return roles

def get_installed_collections():
    """Parse ansible-galaxy collection list output."""
    result = subprocess.run(
        ["ansible-galaxy", "collection", "list", "--format", "yaml"],
        capture_output=True, text=True
    )
    collections = {}
    data = yaml.safe_load(result.stdout)
    if data:
        for path, colls in data.items():
            for name, info in colls.items():
                collections[name] = info["version"]
    return collections

def main():
    with open("requirements.yml") as f:
        reqs = yaml.safe_load(f)

    installed_roles = get_installed_roles()
    installed_colls = get_installed_collections()
    issues = []

    # Check roles
    for role in reqs.get("roles", []):
        name = role["name"]
        required_version = role.get("version", "any")
        installed_version = installed_roles.get(name)

        if not installed_version:
            issues.append(f"MISSING role: {name} (need {required_version})")
        elif required_version != "any" and installed_version != required_version:
            issues.append(
                f"VERSION MISMATCH role: {name} "
                f"(installed={installed_version}, required={required_version})"
            )
        else:
            print(f"  OK: role {name} {installed_version}")

    # Check collections
    for coll in reqs.get("collections", []):
        name = coll["name"]
        required_version = coll.get("version", "any")
        installed_version = installed_colls.get(name)

        if not installed_version:
            issues.append(f"MISSING collection: {name} (need {required_version})")
        elif required_version != "any" and installed_version != required_version:
            issues.append(
                f"VERSION MISMATCH collection: {name} "
                f"(installed={installed_version}, required={required_version})"
            )
        else:
            print(f"  OK: collection {name} {installed_version}")

    if issues:
        print("\nISSUES FOUND:")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)
    else:
        print("\nAll dependencies match requirements.yml")

if __name__ == "__main__":
    main()
```

Run it:

```bash
# Verify your environment matches requirements
python3 verify-deps.py
```

## Using List in CI/CD Pipelines

In CI, list dependencies after installation to create a build artifact:

```yaml
# .github/workflows/deploy.yml - Log installed dependencies
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

      - name: Install dependencies
        run: |
          ansible-galaxy install -r requirements.yml -p ./roles/
          ansible-galaxy collection install -r requirements.yml -p ./collections/

      - name: Log installed dependencies
        run: |
          echo "=== Installed Roles ===" | tee dependency-manifest.txt
          ansible-galaxy list -p ./roles/ | tee -a dependency-manifest.txt
          echo "=== Installed Collections ===" | tee -a dependency-manifest.txt
          ansible-galaxy collection list -p ./collections/ | tee -a dependency-manifest.txt

      - name: Upload dependency manifest
        uses: actions/upload-artifact@v4
        with:
          name: dependency-manifest
          path: dependency-manifest.txt

      - name: Run playbook
        run: ansible-playbook -i inventory playbook.yml
```

## Troubleshooting with ansible-galaxy list

When a playbook fails with "role not found" or "collection not found", here is the debugging process:

1. Run `ansible-galaxy list` to see what is installed and where
2. Run `ansible-config dump | grep PATH` to see where Ansible is looking
3. Compare the two to find the mismatch
4. If the role is installed but not in the search path, either move it or update `ansible.cfg`

```bash
# Full debugging sequence
echo "--- Installed Roles ---"
ansible-galaxy list

echo "--- Installed Collections ---"
ansible-galaxy collection list

echo "--- Role Search Path ---"
ansible-config dump | grep DEFAULT_ROLES_PATH

echo "--- Collection Search Path ---"
ansible-config dump | grep COLLECTIONS_PATHS

echo "--- ansible.cfg location ---"
ansible-config dump | grep CONFIG_FILE
```

## Summary

The `ansible-galaxy list` command is your primary tool for understanding what Ansible content is installed in your environment. Use it for auditing, debugging path issues, and verifying that your environment matches your requirements file. Combined with `ansible-galaxy collection list`, you get a complete picture of both roles and collections. In CI/CD, logging the output creates a record of exactly what was deployed, which is invaluable for troubleshooting production issues after the fact.
