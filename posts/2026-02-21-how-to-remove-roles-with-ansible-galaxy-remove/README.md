# How to Remove Roles with ansible-galaxy remove

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, Cleanup, Maintenance

Description: How to remove Ansible Galaxy roles and collections using the CLI, clean up unused dependencies, and manage role lifecycle properly.

---

Over time, Ansible projects accumulate roles that are no longer needed. Maybe you replaced a Galaxy role with a custom one, or a service was decommissioned and its automation is no longer relevant. Leaving unused roles around clutters your environment and can cause confusion. The `ansible-galaxy remove` command handles cleanup, and this post covers all the ways to use it.

## Removing a Role

The basic removal command takes the role name:

```bash
# Remove a specific role
ansible-galaxy remove geerlingguy.nginx
```

This deletes the role directory from the default roles path (`~/.ansible/roles/`). You will see output like:

```
- successfully removed geerlingguy.nginx
```

If the role is not installed, you get:

```
- geerlingguy.nginx is not installed, skipping.
```

## Removing a Role from a Specific Path

If your roles are installed in a project-local directory, specify the path:

```bash
# Remove a role from a specific directory
ansible-galaxy remove geerlingguy.nginx -p ./roles/
```

This is important because `ansible-galaxy remove` only checks the default path unless you tell it otherwise. If you installed to `./roles/` but try to remove without `-p`, it will report the role as not installed.

## Removing Multiple Roles

You can remove multiple roles in one command:

```bash
# Remove several roles at once
ansible-galaxy remove geerlingguy.nginx geerlingguy.postgresql geerlingguy.redis
```

Each role is removed independently, and you get a status message for each one.

## Removing Collections

Collections use a different command pattern. As of current Ansible versions, there is no `ansible-galaxy collection remove` command built in. You need to delete the collection directory manually:

```bash
# Remove a collection manually
rm -rf ~/.ansible/collections/ansible_collections/community/general/

# Or from a project-local path
rm -rf ./collections/ansible_collections/community/general/
```

You can wrap this in a helper script:

```bash
#!/bin/bash
# remove-collection.sh - Remove an installed collection
set -e

COLLECTION="$1"
COLLECTIONS_PATH="${2:-$HOME/.ansible/collections}"

if [ -z "$COLLECTION" ]; then
    echo "Usage: $0 <namespace.collection> [collections_path]"
    echo "Example: $0 community.general"
    exit 1
fi

# Convert dot notation to path
NAMESPACE=$(echo "$COLLECTION" | cut -d. -f1)
NAME=$(echo "$COLLECTION" | cut -d. -f2)
COLL_DIR="${COLLECTIONS_PATH}/ansible_collections/${NAMESPACE}/${NAME}"

if [ -d "$COLL_DIR" ]; then
    rm -rf "$COLL_DIR"
    echo "Removed collection: ${COLLECTION} from ${COLL_DIR}"

    # Clean up empty namespace directory
    NAMESPACE_DIR="${COLLECTIONS_PATH}/ansible_collections/${NAMESPACE}"
    if [ -z "$(ls -A "$NAMESPACE_DIR" 2>/dev/null)" ]; then
        rmdir "$NAMESPACE_DIR"
        echo "Cleaned up empty namespace directory: ${NAMESPACE_DIR}"
    fi
else
    echo "Collection not found: ${COLLECTION} (looked in ${COLL_DIR})"
    exit 1
fi
```

Usage:

```bash
# Remove a collection with the helper script
chmod +x remove-collection.sh
./remove-collection.sh community.general
./remove-collection.sh community.general ./collections
```

## Finding Unused Roles

Before removing roles, you should verify they are actually unused. Here is a script that checks which installed roles are referenced in your playbooks:

```python
#!/usr/bin/env python3
# find-unused-roles.py - Identify roles not referenced in playbooks
import os
import re
import subprocess
import yaml

def get_installed_roles(roles_path="./roles"):
    """Get list of installed role names."""
    roles = []
    if os.path.isdir(roles_path):
        for item in os.listdir(roles_path):
            if os.path.isdir(os.path.join(roles_path, item)):
                roles.append(item)
    return roles

def get_referenced_roles(playbook_dir="."):
    """Scan playbooks and task files for role references."""
    referenced = set()
    patterns = [
        r"role:\s*(\S+)",           # role: name format
        r"- (\S+)\s*$",            # simple role list format
        r"include_role:\s*\n\s*name:\s*(\S+)",  # include_role
        r"import_role:\s*\n\s*name:\s*(\S+)",   # import_role
    ]

    for root, dirs, files in os.walk(playbook_dir):
        # Skip the roles directory itself
        if "roles" in root.split(os.sep):
            continue
        for filename in files:
            if filename.endswith((".yml", ".yaml")):
                filepath = os.path.join(root, filename)
                try:
                    with open(filepath) as f:
                        content = f.read()
                    for pattern in patterns:
                        matches = re.findall(pattern, content)
                        referenced.update(matches)
                except Exception:
                    pass

    return referenced

def main():
    installed = get_installed_roles()
    referenced = get_referenced_roles()

    print(f"Installed roles: {len(installed)}")
    print(f"Referenced roles: {len(referenced)}")

    unused = set(installed) - referenced
    if unused:
        print(f"\nPotentially unused roles ({len(unused)}):")
        for role in sorted(unused):
            print(f"  - {role}")
        print("\nVerify manually before removing.")
    else:
        print("\nAll installed roles appear to be in use.")

if __name__ == "__main__":
    main()
```

Run it from your project root:

```bash
# Find roles that might not be needed
python3 find-unused-roles.py
```

## Cleaning Up All Galaxy Roles

If you want to start fresh and reinstall everything from your requirements file:

```bash
#!/bin/bash
# clean-and-reinstall.sh - Remove all Galaxy content and reinstall
set -e

ROLES_DIR="./galaxy-roles"
COLLECTIONS_DIR="./collections"
REQUIREMENTS="requirements.yml"

echo "Removing all Galaxy roles..."
rm -rf "$ROLES_DIR"/*

echo "Removing all collections..."
rm -rf "$COLLECTIONS_DIR"/*

echo "Reinstalling from ${REQUIREMENTS}..."
ansible-galaxy install -r "$REQUIREMENTS" -p "$ROLES_DIR"
ansible-galaxy collection install -r "$REQUIREMENTS" -p "$COLLECTIONS_DIR"

echo "Installed content:"
ansible-galaxy list -p "$ROLES_DIR"
ansible-galaxy collection list -p "$COLLECTIONS_DIR"
```

## Handling Role Dependencies

When you remove a role, its dependencies are not automatically removed. If role A depends on role B, and you remove role A, role B remains installed. Check for orphaned dependencies:

```python
#!/usr/bin/env python3
# find-orphan-deps.py - Find role dependencies that are no longer needed
import os
import yaml

def get_role_dependencies(roles_path="./roles"):
    """Build a dependency graph from installed roles."""
    deps = {}
    for role_name in os.listdir(roles_path):
        meta_path = os.path.join(roles_path, role_name, "meta", "main.yml")
        if os.path.isfile(meta_path):
            with open(meta_path) as f:
                meta = yaml.safe_load(f)
            if meta and "dependencies" in meta:
                role_deps = []
                for dep in meta["dependencies"]:
                    if isinstance(dep, str):
                        role_deps.append(dep)
                    elif isinstance(dep, dict):
                        role_deps.append(dep.get("role", dep.get("name", "")))
                deps[role_name] = role_deps
            else:
                deps[role_name] = []
    return deps

def main():
    deps = get_role_dependencies()

    # Find roles that are only installed as dependencies
    all_deps = set()
    for role_deps in deps.values():
        all_deps.update(role_deps)

    # Roles that are dependencies but not directly required
    for dep_name in sorted(all_deps):
        if dep_name in deps:
            # Check if any non-dependency role requires this
            required_by = [r for r, d in deps.items() if dep_name in d]
            print(f"{dep_name} is required by: {', '.join(required_by)}")

if __name__ == "__main__":
    main()
```

## Removing Roles in CI/CD

In CI/CD pipelines, always start clean rather than relying on removal:

```yaml
# .github/workflows/deploy.yml - clean install in CI
---
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Clean any cached roles
        run: |
          rm -rf ./roles/ ./collections/
          mkdir -p ./roles/ ./collections/

      - name: Install dependencies
        run: |
          ansible-galaxy install -r requirements.yml -p ./roles/
          ansible-galaxy collection install -r requirements.yml -p ./collections/
```

## Updating requirements.yml After Removal

When you remove a role, do not forget to update your `requirements.yml`:

```bash
# Remove the role
ansible-galaxy remove geerlingguy.nginx -p ./roles/

# Edit requirements.yml to remove the entry
# Then commit both changes together
git add requirements.yml
git commit -m "Remove unused nginx role"
```

If you remove the role from the filesystem but leave it in `requirements.yml`, the next `ansible-galaxy install -r requirements.yml` will bring it back.

## Summary

Removing roles with `ansible-galaxy remove` is straightforward for roles, but collections require manual deletion. The bigger challenge is knowing which roles to remove. Use dependency scanning scripts to find unused roles before cleaning them up. Always update your `requirements.yml` after removing content, and in CI/CD, prefer clean installs over incremental removal. Keeping your Ansible content lean reduces confusion, speeds up installations, and makes your automation project easier to maintain.
