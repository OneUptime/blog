# How to Create a requirements.yml for Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Requirements, Dependency Management

Description: Learn how to create and manage a requirements.yml file for Ansible roles with version pinning, multiple sources, and CI integration.

---

The `requirements.yml` file is to Ansible what `package.json` is to Node.js or `requirements.txt` is to Python. It declares all the external roles (and collections) your project depends on, with version pins, so anyone can reproduce your environment with a single command. This post covers the full syntax, best practices for version management, and how to integrate it into your workflow.

## Basic Structure

A simple `requirements.yml` lists the roles your project needs:

```yaml
# requirements.yml
# External roles required by this project
---
roles:
  - name: geerlingguy.docker
    version: "6.1.0"

  - name: geerlingguy.nginx
    version: "3.1.0"

  - name: geerlingguy.postgresql
    version: "3.4.0"
```

Install them all with:

```bash
# Install all roles defined in requirements.yml
ansible-galaxy install -r requirements.yml -p roles/
```

## Full Role Specification Options

Each role entry supports several fields:

```yaml
# requirements.yml
# Comprehensive role definitions showing all available fields
---
roles:
  # From Ansible Galaxy by name
  - name: geerlingguy.docker
    version: "6.1.0"

  # From a Git repository via HTTPS
  - name: nginx
    src: https://github.com/myorg/ansible-role-nginx.git
    scm: git
    version: v2.0.0

  # From a Git repository via SSH
  - name: postgresql
    src: git@github.com:myorg/ansible-role-postgresql.git
    scm: git
    version: v1.5.0

  # From a tarball URL
  - name: custom_role
    src: https://artifacts.internal.com/roles/custom_role-1.0.0.tar.gz

  # From a specific Galaxy server
  - name: myorg.common
    src: https://hub.internal.com/api/galaxy/
    version: "1.0.0"
```

### Field Reference

| Field | Description | Required |
|-------|-------------|----------|
| name | Local name for the role | Yes |
| src | Source URL or Galaxy name | No (defaults to name) |
| scm | Source control type (git, hg) | No (defaults to git) |
| version | Tag, branch, or commit SHA | No (defaults to main/master) |

## Including Collections

Since Ansible 2.10, `requirements.yml` can also declare collection dependencies:

```yaml
# requirements.yml
# Both roles and collections in one file
---
roles:
  - name: geerlingguy.docker
    version: "6.1.0"

  - name: nginx
    src: git@github.com:myorg/ansible-role-nginx.git
    scm: git
    version: v2.0.0

collections:
  - name: community.general
    version: ">=7.0.0,<8.0.0"

  - name: community.postgresql
    version: "3.2.0"

  - name: ansible.posix
    version: "1.5.4"

  - name: myorg.infrastructure
    source: https://hub.internal.com/api/galaxy/
    version: "1.0.0"
```

Install both:

```bash
# Install roles
ansible-galaxy install -r requirements.yml -p roles/

# Install collections
ansible-galaxy collection install -r requirements.yml
```

Or install everything at once (Ansible 2.10+):

```bash
# Install both roles and collections
ansible-galaxy install -r requirements.yml
```

## Version Pinning Strategies

### Exact Version (Recommended for Production)

```yaml
roles:
  - name: nginx
    src: git@github.com:myorg/ansible-role-nginx.git
    version: v2.0.0    # Always gets this exact version
```

### Branch Tracking (For Development Only)

```yaml
roles:
  - name: nginx
    src: git@github.com:myorg/ansible-role-nginx.git
    version: develop    # Gets the latest commit on develop
```

### Commit SHA (Maximum Reproducibility)

```yaml
roles:
  - name: nginx
    src: git@github.com:myorg/ansible-role-nginx.git
    version: a1b2c3d4e5f6    # Pinned to an exact commit
```

### Collection Version Ranges

Collections support PEP 440 version specifiers:

```yaml
collections:
  - name: community.general
    version: ">=7.0.0,<8.0.0"    # Any 7.x version

  - name: community.postgresql
    version: "==3.2.0"           # Exactly this version

  - name: ansible.posix
    version: ">=1.5.0"           # This version or newer
```

## Organizing Requirements for Multiple Environments

For projects with different role needs per environment, create multiple requirements files:

```
project/
  requirements.yml              # Common roles
  requirements-dev.yml          # Development-only roles
  requirements-production.yml   # Production-specific roles
```

```yaml
# requirements.yml
# Base roles used in all environments
---
roles:
  - name: common
    src: git@github.com:myorg/ansible-role-common.git
    version: v1.5.0

  - name: security
    src: git@github.com:myorg/ansible-role-security.git
    version: v2.1.0
```

```yaml
# requirements-dev.yml
# Additional roles for development environments
---
roles:
  - name: debug_tools
    src: git@github.com:myorg/ansible-role-debug-tools.git
    version: v1.0.0

  - name: test_fixtures
    src: git@github.com:myorg/ansible-role-test-fixtures.git
    version: v0.3.0
```

```bash
# Install base roles
ansible-galaxy install -r requirements.yml -p roles/

# Install dev roles on top
ansible-galaxy install -r requirements-dev.yml -p roles/
```

## Automating Dependency Installation

### Makefile Approach

```makefile
# Makefile
.PHONY: install-roles deploy

install-roles:
	ansible-galaxy install -r requirements.yml -p roles/ --force

deploy: install-roles
	ansible-playbook site.yml -i inventory/production

update-roles:
	ansible-galaxy install -r requirements.yml -p roles/ --force
	@echo "Roles updated. Run your tests before deploying."
```

### Shell Script Approach

```bash
#!/bin/bash
# scripts/setup.sh
# Set up the Ansible environment for this project

set -euo pipefail

echo "Installing Python dependencies..."
pip install ansible ansible-lint

echo "Installing Ansible roles..."
ansible-galaxy install -r requirements.yml -p roles/ --force

echo "Installing Ansible collections..."
ansible-galaxy collection install -r requirements.yml --force

echo "Setup complete. You can now run: ansible-playbook site.yml"
```

## Handling Private Repositories in CI/CD

In automated pipelines, you need to handle authentication for private Git repos:

```yaml
# requirements.yml for CI/CD with HTTPS token auth
---
roles:
  - name: common
    src: "https://{{ lookup('env', 'GITHUB_TOKEN') }}@github.com/myorg/ansible-role-common.git"
    scm: git
    version: v1.5.0
```

Wait, that does not work because `requirements.yml` does not support lookups. Instead, configure Git credentials before running `ansible-galaxy`:

```bash
# Configure Git to use a token for HTTPS
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"

# Now ansible-galaxy will use the token automatically
ansible-galaxy install -r requirements.yml -p roles/
```

Or use SSH:

```bash
# Set up SSH agent in CI
eval "$(ssh-agent -s)"
echo "$SSH_PRIVATE_KEY" | ssh-add -
ssh-keyscan github.com >> ~/.ssh/known_hosts

# Install roles via SSH
ansible-galaxy install -r requirements.yml -p roles/
```

## Validating requirements.yml

Check that your requirements file is syntactically valid:

```bash
# Dry run to verify the file parses correctly
ansible-galaxy install -r requirements.yml -p /tmp/test-roles --force
```

You can also use `yamllint` to catch formatting issues:

```bash
# Lint the requirements file
yamllint requirements.yml
```

## Lock File Pattern

Ansible does not have a native lock file mechanism like `package-lock.json`. To achieve reproducible builds, always pin exact versions:

```yaml
# requirements.yml - always pin exact versions for reproducibility
---
roles:
  - name: common
    src: git@github.com:myorg/ansible-role-common.git
    version: v1.5.0   # Do not use "main" or "latest"

  - name: nginx
    src: git@github.com:myorg/ansible-role-nginx.git
    version: v2.0.0

collections:
  - name: community.general
    version: "7.5.0"  # Exact version, not a range
```

If you need to update dependencies, explicitly change the version in `requirements.yml`, test, and commit the change. This gives you an auditable history of dependency updates.

## Common Pitfalls

1. **Not pinning versions.** Without a version pin, `ansible-galaxy` installs the latest, which can break your playbook unexpectedly.

2. **Forgetting `--force` on updates.** By default, `ansible-galaxy` skips roles that already exist. Use `--force` to update them.

3. **Mixing Galaxy names and Git URLs for the same role.** Pick one source per role and stick with it.

4. **Not adding installed roles to .gitignore.** Externally managed roles should not be committed to your project repository.

5. **Using branch names in production.** Branches move. Always use tags or commit SHAs for production deployments.

## Wrapping Up

A well-maintained `requirements.yml` is the foundation of reproducible Ansible projects. It declares all external dependencies in one place, supports version pinning for both roles and collections, and integrates smoothly with CI/CD pipelines. The key rules are: always pin exact versions, use `--force` when updating, keep installed roles out of your Git repository, and automate the installation step in your deployment pipeline. Follow these practices and your team will never have "it works on my machine" issues with Ansible roles.
