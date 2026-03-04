# How to Lock Collection Versions in Ansible Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Collections, Version Pinning, Reproducibility

Description: Techniques for locking Ansible Galaxy collection versions to ensure reproducible builds including pinning strategies and custom lock files.

---

One of the fastest ways to break a working Ansible deployment is to let a collection update silently. A module parameter gets renamed, a default changes, or a deprecated feature gets removed, and suddenly your playbook fails in production even though you did not change anything. Locking collection versions prevents this by ensuring every installation uses exactly the same versions.

This post covers every technique for locking collection versions, from basic pinning to automated lock file generation.

## Why Version Locking Matters

Consider this scenario: your `requirements.yml` says `community.general: ">=8.0.0"`. On Monday, version 8.1.0 is installed and everything works. On Wednesday, version 8.2.0 is released with a breaking change in a module you use. Your CI pipeline runs, pulls 8.2.0 automatically, and the deployment fails. Nobody changed any code, but the build is broken.

Exact version pins eliminate this class of failure entirely.

## Basic Version Pinning

The simplest locking mechanism is pinning exact versions in `requirements.yml`:

```yaml
# requirements.yml - exact version pins
---
collections:
  - name: community.general
    version: "8.1.0"

  - name: amazon.aws
    version: "7.2.0"

  - name: ansible.posix
    version: "1.5.4"

  - name: community.docker
    version: "3.7.0"

  - name: community.postgresql
    version: "3.3.0"
```

This is the minimum viable approach. Every version is a fixed target, and `ansible-galaxy collection install` will install exactly these versions.

## The Problem with Transitive Dependencies

Pinning your direct dependencies is not enough. Collections can depend on other collections. If `amazon.aws` requires `ansible.utils >= 2.0.0`, Galaxy resolves that dependency at install time and might pull different versions on different days.

To see a collection's dependencies:

```bash
# Check what dependencies a collection requires
ansible-galaxy collection install amazon.aws:7.2.0 --dry-run 2>&1
```

Or inspect the installed collection:

```bash
# View the manifest of an installed collection
cat ~/.ansible/collections/ansible_collections/amazon/aws/MANIFEST.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
deps = data.get('collection_info', {}).get('dependencies', {})
for name, version in deps.items():
    print(f'{name}: {version}')
"
```

## Building a Complete Lock File

To fully lock your dependency tree, include both direct and transitive dependencies in your requirements file:

```bash
#!/bin/bash
# generate-collection-lock.sh - Generate a complete lock file
set -e

TEMP_DIR=$(mktemp -d)
LOCK_FILE="requirements.lock.yml"

# Install collections to a temporary location
ansible-galaxy collection install -r requirements.yml -p "$TEMP_DIR" --force

# Generate the lock file from what was actually installed
echo "# Auto-generated lock file - $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LOCK_FILE"
echo "# Do not edit manually. Regenerate with: ./generate-collection-lock.sh" >> "$LOCK_FILE"
echo "---" >> "$LOCK_FILE"
echo "collections:" >> "$LOCK_FILE"

# Parse the installed collections
ansible-galaxy collection list -p "$TEMP_DIR" --format yaml | python3 -c "
import sys, yaml

data = yaml.safe_load(sys.stdin)
if data:
    for path, collections in data.items():
        for name, info in sorted(collections.items()):
            print(f'  - name: {name}')
            print(f'    version: \"{info[\"version\"]}\"')
" >> "$LOCK_FILE"

# Cleanup
rm -rf "$TEMP_DIR"

echo "Lock file generated: ${LOCK_FILE}"
echo "Contents:"
cat "$LOCK_FILE"
```

The resulting lock file includes everything that was resolved during installation:

```yaml
# requirements.lock.yml - complete dependency tree
# Auto-generated lock file - 2026-02-21T10:30:00Z
# Do not edit manually. Regenerate with: ./generate-collection-lock.sh
---
collections:
  - name: amazon.aws
    version: "7.2.0"
  - name: ansible.posix
    version: "1.5.4"
  - name: ansible.utils
    version: "3.1.0"
  - name: community.docker
    version: "3.7.0"
  - name: community.general
    version: "8.1.0"
  - name: community.postgresql
    version: "3.3.0"
```

Now use the lock file for installations instead of the requirements file:

```bash
# Install from the lock file for reproducible builds
ansible-galaxy collection install -r requirements.lock.yml -p ./collections/
```

## Verifying Installed Versions

After installation, verify that the installed versions match expectations:

```python
#!/usr/bin/env python3
# verify-collection-versions.py - Verify installed collections match lock file
import yaml
import subprocess
import sys

def get_installed_collections(path="./collections"):
    result = subprocess.run(
        ["ansible-galaxy", "collection", "list", "-p", path, "--format", "yaml"],
        capture_output=True, text=True
    )
    installed = {}
    data = yaml.safe_load(result.stdout)
    if data:
        for coll_path, collections in data.items():
            for name, info in collections.items():
                installed[name] = info["version"]
    return installed

def main():
    lock_file = sys.argv[1] if len(sys.argv) > 1 else "requirements.lock.yml"

    with open(lock_file) as f:
        locked = yaml.safe_load(f)

    installed = get_installed_collections()
    mismatches = []

    for coll in locked.get("collections", []):
        name = coll["name"]
        locked_version = coll["version"]
        installed_version = installed.get(name)

        if not installed_version:
            mismatches.append(f"MISSING: {name} (expected {locked_version})")
        elif installed_version != locked_version:
            mismatches.append(
                f"MISMATCH: {name} installed={installed_version} locked={locked_version}"
            )

    if mismatches:
        print("Version verification FAILED:")
        for m in mismatches:
            print(f"  {m}")
        sys.exit(1)
    else:
        print(f"All {len(locked.get('collections', []))} collections match lock file")

if __name__ == "__main__":
    main()
```

## Using Checksums for Integrity

For the highest level of assurance, record and verify checksums of installed collections:

```bash
#!/bin/bash
# generate-checksums.sh - Record checksums of installed collections
set -e

COLLECTIONS_PATH="./collections/ansible_collections"
CHECKSUM_FILE="collection-checksums.sha256"

> "$CHECKSUM_FILE"

for namespace_dir in "$COLLECTIONS_PATH"/*/; do
    for collection_dir in "$namespace_dir"*/; do
        if [ -f "${collection_dir}MANIFEST.json" ]; then
            # Checksum the manifest (changes with any content change)
            sha256sum "${collection_dir}MANIFEST.json" >> "$CHECKSUM_FILE"
        fi
    done
done

echo "Checksums recorded to ${CHECKSUM_FILE}"
```

Verify later:

```bash
# Verify collection integrity
sha256sum -c collection-checksums.sha256
```

## Integrating with CI/CD

Use the lock file in your deployment pipeline:

```yaml
# .github/workflows/deploy.yml - locked collection installation
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

      - name: Install locked collections
        run: |
          ansible-galaxy collection install \
            -r requirements.lock.yml \
            -p ./collections/

      - name: Verify versions
        run: python3 verify-collection-versions.py requirements.lock.yml

      - name: Deploy
        run: ansible-playbook -i inventory playbook.yml
```

## Updating Locked Versions

When you want to update dependencies:

```bash
# 1. Update the version in requirements.yml
# 2. Regenerate the lock file
./generate-collection-lock.sh

# 3. Test with the new lock file
ansible-galaxy collection install -r requirements.lock.yml -p ./collections/ --force
ansible-playbook tests/integration.yml

# 4. If tests pass, commit both files
git add requirements.yml requirements.lock.yml
git commit -m "Update community.general from 8.1.0 to 8.2.0"
```

## The Two-File Strategy

The recommended workflow uses two files:

| File | Purpose | Who edits it |
|------|---------|-------------|
| `requirements.yml` | Declare direct dependencies with constraints | Humans |
| `requirements.lock.yml` | Record exact resolved versions | Generated by script |

Your `requirements.yml` can use ranges for development flexibility:

```yaml
# requirements.yml - human-managed, can use ranges
---
collections:
  - name: community.general
    version: ">=8.1.0,<9.0.0"
  - name: amazon.aws
    version: ">=7.0.0,<8.0.0"
```

And `requirements.lock.yml` records what was actually resolved:

```yaml
# requirements.lock.yml - auto-generated, exact versions only
---
collections:
  - name: community.general
    version: "8.1.0"
  - name: amazon.aws
    version: "7.2.0"
  - name: ansible.utils
    version: "3.1.0"
```

## Preventing Accidental Upgrades

Add a CI check that fails if someone installs from `requirements.yml` instead of the lock file:

```bash
#!/bin/bash
# check-lock-freshness.sh - Ensure lock file is up to date
set -e

TEMP_DIR=$(mktemp -d)

# Install from requirements.yml
ansible-galaxy collection install -r requirements.yml -p "$TEMP_DIR" --force 2>/dev/null

# Compare with lock file
CURRENT=$(ansible-galaxy collection list -p "$TEMP_DIR" --format yaml 2>/dev/null)
rm -rf "$TEMP_DIR"

LOCK_CONTENT=$(cat requirements.lock.yml)

# Simple version comparison
python3 -c "
import yaml

# Parse current resolution
current = yaml.safe_load('''$CURRENT''')
current_versions = {}
if current:
    for path, colls in current.items():
        for name, info in colls.items():
            current_versions[name] = info['version']

# Parse lock file
with open('requirements.lock.yml') as f:
    lock_data = yaml.safe_load(f)
lock_versions = {c['name']: c['version'] for c in lock_data.get('collections', [])}

# Compare
if current_versions == lock_versions:
    print('Lock file is current')
else:
    print('Lock file is STALE - regenerate with ./generate-collection-lock.sh')
    for name in set(list(current_versions.keys()) + list(lock_versions.keys())):
        cv = current_versions.get(name, 'missing')
        lv = lock_versions.get(name, 'missing')
        if cv != lv:
            print(f'  {name}: lock={lv} resolved={cv}')
    exit(1)
"
```

## Summary

Locking collection versions requires going beyond basic version pinning to include transitive dependencies. Use a two-file strategy: `requirements.yml` for human-managed dependency declarations and `requirements.lock.yml` for auto-generated exact versions. Generate the lock file with a script that installs to a temporary location and records what was resolved. Verify installed versions in CI/CD and add checks to detect stale lock files. This approach gives you the reproducibility of exact pins with the convenience of version ranges for dependency resolution.
