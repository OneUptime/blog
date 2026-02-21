# How to Lock Ansible Role Versions in requirements.yml

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Version Control, Galaxy, DevOps

Description: Learn how to pin and lock Ansible role versions in requirements.yml for reproducible builds and safe dependency management.

---

Installing Ansible roles without pinning versions is like running `apt-get install package` without specifying a version. It works today, but six months from now when a breaking change is released, your playbook suddenly fails and you have no idea why. Version locking in `requirements.yml` ensures that your Ansible roles are reproducible, predictable, and safe to install on any machine at any time.

## What Is requirements.yml?

The `requirements.yml` file lists external roles (and collections) that your project depends on. It is the equivalent of `package.json` in Node.js or `requirements.txt` in Python. You use `ansible-galaxy` to install everything listed in it:

```bash
# Install all roles and collections from requirements.yml
ansible-galaxy install -r requirements.yml
```

## Basic Version Pinning

Here is a `requirements.yml` with pinned versions:

```yaml
# requirements.yml
# Pin every role to a specific version for reproducibility
roles:
  - name: geerlingguy.docker
    version: "6.1.0"

  - name: geerlingguy.nginx
    version: "3.2.0"

  - name: geerlingguy.postgresql
    version: "3.5.0"

  - name: geerlingguy.certbot
    version: "5.1.0"

  - name: geerlingguy.nodejs
    version: "6.2.0"
```

The `version` field accepts:

- Exact version tags: `"6.1.0"`
- Git tags: `"v2.3.1"`
- Git branches: `"main"` (not recommended for locking)
- Git commit SHAs: `"a1b2c3d4e5f6"` (most precise)

## Roles from Git Repositories

For roles hosted in Git repositories (not on Galaxy), specify the source:

```yaml
# requirements.yml
roles:
  # Role from a public GitHub repository
  - name: custom_nginx
    src: https://github.com/myorg/ansible-role-nginx.git
    version: "v2.5.0"
    scm: git

  # Role from a private repository
  - name: internal_deploy
    src: git@github.com:myorg/ansible-role-deploy.git
    version: "v1.8.3"
    scm: git

  # Pin to a specific commit for maximum precision
  - name: critical_security
    src: https://github.com/myorg/ansible-role-security.git
    version: "8f4a2e1b3c5d7f9a0e2b4c6d8f0a1b3c5d7e9f0"
    scm: git
```

## Collections with Version Constraints

Starting with Ansible 2.10+, you should also pin collection versions:

```yaml
# requirements.yml
roles:
  - name: geerlingguy.docker
    version: "6.1.0"

collections:
  # Exact version
  - name: community.general
    version: "8.3.0"

  # Version range (install any 2.x version)
  - name: community.docker
    version: ">=3.0.0,<4.0.0"

  # Exact version for cloud providers
  - name: amazon.aws
    version: "7.2.0"

  - name: community.postgresql
    version: "3.3.0"
```

## Why Exact Versions Matter

Here is what happens without version pinning:

```yaml
# BAD - no version specified
roles:
  - name: geerlingguy.docker
  - name: geerlingguy.nginx
```

Today this installs version 6.1.0 and 3.2.0. Next month it might install 7.0.0 with breaking changes. Your CI pipeline fails on a Friday afternoon and you spend hours figuring out that a role update changed the default variable names.

With version pinning:

```yaml
# GOOD - specific versions locked
roles:
  - name: geerlingguy.docker
    version: "6.1.0"
  - name: geerlingguy.nginx
    version: "3.2.0"
```

This installs the exact same versions every time, on every machine, forever (or until you intentionally update them).

## The Update Workflow

Updating a pinned role should be a deliberate action:

```bash
# Step 1: Check what version is currently installed
ansible-galaxy role list

# Step 2: Check what versions are available
ansible-galaxy role info geerlingguy.docker

# Step 3: Install the new version in a test environment
ansible-galaxy install geerlingguy.docker,7.0.0 --force

# Step 4: Test your playbooks against the new version
ansible-playbook site.yml --check --diff

# Step 5: Update requirements.yml
# (edit the version number)

# Step 6: Commit the change
git add requirements.yml
git commit -m "Update geerlingguy.docker from 6.1.0 to 7.0.0"
```

## Force Reinstall

When you update a version in `requirements.yml`, you need to force reinstall:

```bash
# Force reinstall all roles (overwrite existing)
ansible-galaxy install -r requirements.yml --force

# Force reinstall a specific role
ansible-galaxy install geerlingguy.docker,6.1.0 --force
```

Without `--force`, `ansible-galaxy` skips roles that are already installed, even if the version in `requirements.yml` has changed.

## Install to a Project-Specific Directory

Avoid installing roles globally. Use a project-specific directory:

```bash
# Install roles into the project's roles/ directory
ansible-galaxy install -r requirements.yml -p roles/

# Or set this in ansible.cfg
```

```ini
# ansible.cfg
[defaults]
roles_path = ./roles
```

This keeps each project's role versions isolated, similar to how `node_modules` works in JavaScript projects.

## Using a Lock File Pattern

For even more control, adopt a two-file pattern similar to `package.json` / `package-lock.json`:

```yaml
# requirements.yml - human-edited, specifies acceptable ranges
roles:
  - name: geerlingguy.docker
    version: ">=6.0.0,<7.0.0"
  - name: geerlingguy.nginx
    version: ">=3.0.0,<4.0.0"
```

```yaml
# requirements.lock.yml - machine-generated, exact versions
# Generated by: ansible-galaxy install -r requirements.yml
# Do not edit manually
roles:
  - name: geerlingguy.docker
    version: "6.1.0"
    src: https://galaxy.ansible.com
  - name: geerlingguy.nginx
    version: "3.2.0"
    src: https://galaxy.ansible.com
```

Your CI pipeline uses the lock file:

```bash
# CI uses the lock file for exact reproducibility
ansible-galaxy install -r requirements.lock.yml --force
```

Developers can update the lock file when needed:

```bash
# Resolve latest versions within constraints and update lock file
ansible-galaxy install -r requirements.yml --force
# Then manually update requirements.lock.yml with the installed versions
ansible-galaxy role list | grep -E "geerlingguy" > /tmp/versions.txt
# Update the lock file based on what was installed
```

## CI/CD Integration

Here is a typical CI pipeline step:

```yaml
# .github/workflows/ansible.yml
- name: Install Ansible role dependencies
  run: |
    ansible-galaxy install -r requirements.yml --force -p roles/
    ansible-galaxy collection install -r requirements.yml --force

- name: Verify all roles are installed
  run: ansible-galaxy role list -p roles/

- name: Run playbook in check mode
  run: ansible-playbook site.yml --check --diff
```

## Handling Transitive Dependencies

If role A depends on role B, and you pin role A, role B might still be unpinned. Pin transitive dependencies explicitly:

```yaml
# requirements.yml
# Direct dependencies
roles:
  - name: myorg.web_stack
    src: git@github.com:myorg/ansible-role-web-stack.git
    version: "v3.2.1"
    scm: git

  # Transitive dependency - pin it too
  - name: geerlingguy.nginx
    version: "3.2.0"

  # Another transitive dependency
  - name: geerlingguy.certbot
    version: "5.1.0"
```

Check a role's `meta/main.yml` to find its dependencies:

```bash
# Look at a role's dependencies
cat roles/myorg.web_stack/meta/main.yml
```

## Checking for Outdated Roles

Periodically check if your pinned roles have newer versions:

```bash
#!/bin/bash
# check-role-versions.sh
# Compare installed versions against latest available

while IFS= read -r line; do
    name=$(echo "$line" | grep -oP 'name:\s*\K\S+')
    if [ -n "$name" ]; then
        echo "Checking $name..."
        ansible-galaxy role info "$name" 2>/dev/null | grep -E "latest_version|description"
        echo "---"
    fi
done < requirements.yml
```

## Best Practices

Always pin to exact versions in production projects. Use branches like `main` only during active development of a role, never in a production requirements file. Commit your `requirements.yml` to version control. Include role installation in your CI pipeline. Review role changelogs before updating versions. Test updates in a non-production environment before promoting the version change. Keep a separate `requirements-dev.yml` if you need bleeding-edge versions for testing.

Version locking is one of those practices that feels like unnecessary overhead until it saves you from a production outage caused by a silent dependency update. Invest the five minutes now to pin your versions and save yourself hours of debugging later.
