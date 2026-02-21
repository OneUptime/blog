# How to Version Control Ansible Galaxy Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Version Control, Git, DevOps

Description: Best practices for tracking Ansible Galaxy dependencies in Git including requirements files, lock strategies, and reproducible builds.

---

Ansible Galaxy dependencies are just like any other software dependency: if you do not manage them properly, they will eventually break your builds, cause inconsistencies across environments, and create debugging nightmares. This post covers how to version control your Galaxy dependencies so that every team member, CI pipeline, and production deployment uses the exact same versions of roles and collections.

## The Core Principle

Commit the dependency declaration, not the dependencies themselves. This means:

- `requirements.yml` goes into Git
- Downloaded roles and collections go into `.gitignore`
- Every environment installs from the requirements file

Think of it like `package.json` (committed) vs `node_modules/` (gitignored).

## Setting Up .gitignore

First, exclude downloaded content from version control:

```gitignore
# .gitignore - exclude Galaxy downloads
roles/
collections/
*.retry

# Keep the requirements file
!requirements.yml
```

If you have any roles written in-house that live in the `roles/` directory alongside downloaded ones, use a more targeted approach:

```gitignore
# .gitignore - exclude only Galaxy-downloaded roles
roles/geerlingguy.*
roles/community.*

# Or use a separate directory for Galaxy content
galaxy-roles/
galaxy-collections/
```

A cleaner approach is to separate your own roles from Galaxy roles entirely:

```
project/
    playbooks/
    roles/                    # Your own roles (committed)
        my_custom_role/
    galaxy-roles/             # Downloaded from Galaxy (gitignored)
        geerlingguy.nginx/
    collections/              # Downloaded from Galaxy (gitignored)
    requirements.yml          # Committed
    ansible.cfg               # Committed
```

Configure `ansible.cfg` to search both directories:

```ini
# ansible.cfg - search multiple role paths
[defaults]
roles_path = ./roles:./galaxy-roles
collections_path = ./collections
```

## Pinning Exact Versions

The most important practice is pinning every dependency to an exact version:

```yaml
# requirements.yml - all versions pinned
---
roles:
  - name: geerlingguy.nginx
    version: "3.1.0"

  - name: geerlingguy.postgresql
    version: "3.4.0"

  - name: geerlingguy.redis
    version: "1.8.0"

collections:
  - name: community.general
    version: "8.1.0"

  - name: amazon.aws
    version: "7.2.0"

  - name: ansible.posix
    version: "1.5.4"
```

Never use version ranges like `>=8.0.0` in production requirements. Ranges are fine for library authors declaring compatibility, but infrastructure code needs exact reproducibility.

## Creating a Lock File

Ansible does not have a native lock file mechanism like `package-lock.json` or `poetry.lock`. You can create your own by recording the exact installed versions:

```bash
#!/bin/bash
# generate-lock.sh - Record exact installed versions
set -e

echo "# Auto-generated lock file - do not edit manually" > requirements.lock.yml
echo "# Generated on: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> requirements.lock.yml
echo "---" >> requirements.lock.yml

# Record installed roles
echo "roles:" >> requirements.lock.yml
ansible-galaxy list 2>/dev/null | while IFS= read -r line; do
    # Parse "- role_name, version" format
    role_name=$(echo "$line" | sed 's/^- //' | cut -d',' -f1 | tr -d ' ')
    role_version=$(echo "$line" | cut -d',' -f2 | tr -d ' ')
    if [ -n "$role_name" ] && [ -n "$role_version" ]; then
        echo "  - name: ${role_name}" >> requirements.lock.yml
        echo "    version: \"${role_version}\"" >> requirements.lock.yml
    fi
done

# Record installed collections
echo "collections:" >> requirements.lock.yml
ansible-galaxy collection list --format yaml 2>/dev/null | python3 -c "
import sys, yaml
data = yaml.safe_load(sys.stdin)
if data:
    for path, collections in data.items():
        for name, info in collections.items():
            print(f'  - name: {name}')
            print(f'    version: \"{info[\"version\"]}\"')
" >> requirements.lock.yml

echo "Lock file generated: requirements.lock.yml"
```

Commit this lock file alongside your requirements file:

```bash
# Generate and commit the lock file
chmod +x generate-lock.sh
./generate-lock.sh
git add requirements.yml requirements.lock.yml
git commit -m "Pin Galaxy dependencies"
```

## Tracking Dependency Changes in Pull Requests

Set up a CI job that detects when dependencies change:

```yaml
# .github/workflows/check-deps.yml - Flag dependency changes in PRs
---
name: Check Dependencies

on:
  pull_request:
    paths:
      - requirements.yml

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Ansible
        run: pip install ansible-core pyyaml

      - name: Verify all versions are pinned
        run: |
          python3 << 'SCRIPT'
          import yaml
          import sys

          with open("requirements.yml") as f:
              data = yaml.safe_load(f)

          errors = []

          for role in data.get("roles", []):
              if "version" not in role:
                  errors.append(f"Role {role['name']} has no version pin")

          for coll in data.get("collections", []):
              if "version" not in coll:
                  errors.append(f"Collection {coll['name']} has no version pin")
              elif any(c in str(coll["version"]) for c in [">", "<", "*", "~"]):
                  errors.append(f"Collection {coll['name']} uses a version range: {coll['version']}")

          if errors:
              print("Dependency pinning errors found:")
              for e in errors:
                  print(f"  - {e}")
              sys.exit(1)
          else:
              print("All dependencies properly pinned")
          SCRIPT

      - name: Test installation
        run: |
          ansible-galaxy install -r requirements.yml -p ./galaxy-roles/
          ansible-galaxy collection install -r requirements.yml -p ./collections/
```

## Automating Dependency Updates

Use a scheduled CI job to check for available updates:

```yaml
# .github/workflows/update-deps.yml - Check for dependency updates weekly
---
name: Check for Galaxy Updates

on:
  schedule:
    - cron: "0 9 * * 1"  # Every Monday at 9 AM
  workflow_dispatch:

jobs:
  check-updates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install ansible-core pyyaml requests

      - name: Check for updates
        run: |
          python3 << 'SCRIPT'
          import yaml
          import requests

          with open("requirements.yml") as f:
              data = yaml.safe_load(f)

          print("Checking for Galaxy collection updates...\n")

          for coll in data.get("collections", []):
              name = coll["name"]
              current = coll.get("version", "unknown")
              namespace, collection = name.split(".")

              resp = requests.get(
                  f"https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/{namespace}/{collection}/"
              )
              if resp.status_code == 200:
                  latest = resp.json().get("highest_version", {}).get("version", "unknown")
                  if latest != current:
                      print(f"UPDATE AVAILABLE: {name} {current} -> {latest}")
                  else:
                      print(f"  up to date: {name} {current}")

          SCRIPT
```

## Branching Strategy for Dependency Updates

When updating dependencies, follow this process:

1. Create a feature branch for the update
2. Update the version in `requirements.yml`
3. Run your full test suite
4. Update the lock file
5. Open a pull request with the changes

```bash
# Update a dependency safely
git checkout -b update/community-general-8.2.0

# Edit requirements.yml to bump the version
# Then test
ansible-galaxy collection install -r requirements.yml -p ./collections/ --force
ansible-playbook tests/integration.yml --check

# Regenerate lock file
./generate-lock.sh

# Commit and push
git add requirements.yml requirements.lock.yml
git commit -m "Bump community.general from 8.1.0 to 8.2.0"
git push origin update/community-general-8.2.0
```

## Using Git Submodules for Roles (Alternative)

Some teams prefer Git submodules over Galaxy for role management. Each role lives in its own repository and is included as a submodule:

```bash
# Add a role as a Git submodule
git submodule add https://github.com/geerlingguy/ansible-role-nginx.git roles/geerlingguy.nginx

# Pin to a specific commit
cd roles/geerlingguy.nginx
git checkout v3.1.0
cd ../..
git add .gitmodules roles/geerlingguy.nginx
git commit -m "Add nginx role as submodule at v3.1.0"
```

This approach gives you maximum control but adds complexity. Submodules require extra steps during cloning (`--recurse-submodules`) and can confuse team members who are not familiar with them.

## Storing Requirements in ansible.cfg

For simple projects, you can reference the requirements file in `ansible.cfg`:

```ini
# ansible.cfg - reference requirements file
[galaxy]
role_file = requirements.yml
collection_file = requirements.yml
```

## Summary

Version-controlling Ansible Galaxy dependencies requires a disciplined approach: pin exact versions in `requirements.yml`, gitignore downloaded content, generate lock files for full reproducibility, and automate update detection. The key is treating your Ansible dependencies with the same rigor you apply to application dependencies. Every change to `requirements.yml` should go through code review, every update should be tested before merging, and every deployment should install from the requirements file rather than relying on pre-installed content.
