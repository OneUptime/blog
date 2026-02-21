# How to Manage Collection Dependencies in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Dependency Management, DevOps

Description: Learn how to declare, install, and manage Ansible collection dependencies using requirements files, galaxy.yml, and version constraints.

---

As your Ansible automation grows, you will inevitably depend on multiple collections from Ansible Galaxy, private repositories, and even Git repos. Managing these dependencies well is the difference between a playbook that works reliably across environments and one that breaks because someone has a different collection version installed. This post covers all the mechanisms Ansible provides for managing collection dependencies.

## The Problem: Why Dependency Management Matters

Consider this scenario: your playbook uses modules from `community.general`, `community.mysql`, and `amazon.aws`. Developer A installs the latest versions of everything. Developer B has older versions from six months ago. Your CI pipeline has yet another set of versions. The playbook works on one machine and fails on the others because a module parameter was renamed or a new required dependency was added.

Sound familiar? That is why you need explicit dependency management.

## Using requirements.yml

The primary way to declare collection dependencies is through a `requirements.yml` file. This file lists every collection your project needs along with version constraints.

```yaml
# requirements.yml - declare all collection dependencies
collections:
  # Pin to a specific version for maximum reproducibility
  - name: amazon.aws
    version: "7.2.0"

  # Allow any version in a major release
  - name: community.general
    version: ">=8.0.0,<9.0.0"

  # Use the latest available version
  - name: community.mysql
    version: "*"

  # Install from a Git repository
  - name: https://github.com/example/custom-collection.git
    type: git
    version: main

  # Install from a tarball URL
  - name: https://artifacts.example.com/collections/internal-ops-1.2.0.tar.gz
    type: url

  # Install from a private Galaxy server
  - name: internal.infrastructure
    version: ">=2.0.0"
    source: https://galaxy.internal.example.com/
```

Install everything with one command.

```bash
# Install all collections from requirements.yml
ansible-galaxy collection install -r requirements.yml

# Force reinstall to update to the latest allowed versions
ansible-galaxy collection install -r requirements.yml --force

# Install to a specific directory instead of the default
ansible-galaxy collection install -r requirements.yml -p ./collections
```

## Version Constraint Syntax

The version constraint syntax follows PEP 440-style specifiers. Here are the options you will use most.

```yaml
# requirements-version-examples.yml - version constraint patterns
collections:
  # Exact version
  - name: community.general
    version: "8.1.0"

  # Minimum version
  - name: community.docker
    version: ">=3.4.0"

  # Range (inclusive minimum, exclusive maximum)
  - name: amazon.aws
    version: ">=7.0.0,<8.0.0"

  # Compatible release (allows patch updates within minor version)
  - name: kubernetes.core
    version: "~=3.0"  # equivalent to >=3.0,<4.0

  # Any version (not recommended for production)
  - name: community.crypto
    version: "*"

  # Multiple constraints
  - name: ansible.netcommon
    version: ">=5.0.0,!=5.1.0,<6.0.0"  # skip the buggy 5.1.0 release
```

## Collection Dependencies in galaxy.yml

If you are building your own collection, you declare dependencies on other collections in your `galaxy.yml` file.

```yaml
# galaxy.yml - collection metadata with dependencies
namespace: mycompany
name: infrastructure
version: 1.0.0
readme: README.md
authors:
  - Platform Team <platform@mycompany.com>
description: Internal infrastructure automation collection
license:
  - Apache-2.0

dependencies:
  community.general: ">=8.0.0"
  community.mysql: ">=3.5.0"
  amazon.aws: ">=7.0.0,<8.0.0"
  ansible.posix: ">=1.5.0"

# These get installed transitively when someone installs your collection
```

When someone installs your collection, `ansible-galaxy` automatically resolves and installs all declared dependencies.

```bash
# This installs mycompany.infrastructure and all its dependencies
ansible-galaxy collection install mycompany.infrastructure
```

## Offline and Air-Gapped Installations

In restricted environments without internet access, you need to download collections ahead of time and install from local files.

```bash
# Step 1: Download collections on a machine with internet access
ansible-galaxy collection download -r requirements.yml -p ./collection-tarballs/

# Step 2: Transfer the tarballs directory to the restricted environment

# Step 3: Install from local files
ansible-galaxy collection install -r requirements.yml -p ./collections \
  --offline \
  --collections-path ./collection-tarballs/
```

You can also build a requirements file that points to local tarballs.

```yaml
# requirements-offline.yml - install from local tarballs
collections:
  - name: /path/to/tarballs/community-general-8.1.0.tar.gz
    type: file
  - name: /path/to/tarballs/amazon-aws-7.2.0.tar.gz
    type: file
  - name: /path/to/tarballs/community-mysql-3.8.0.tar.gz
    type: file
```

## The collections Directory Structure

When you install collections, understanding where they go helps with troubleshooting.

```
# Default installation paths (in order of precedence)
~/.ansible/collections/ansible_collections/
/usr/share/ansible/collections/ansible_collections/

# Project-local installation (recommended)
./collections/ansible_collections/

# Inside each collection namespace
./collections/ansible_collections/
  community/
    general/
      plugins/
        modules/
        lookup/
        filter/
      roles/
      meta/
        runtime.yml
      MANIFEST.json
      FILES.json
    mysql/
      ...
  amazon/
    aws/
      ...
```

To use a project-local collections directory, add it to your `ansible.cfg`.

```ini
# ansible.cfg - point Ansible to project-local collections
[defaults]
collections_path = ./collections:~/.ansible/collections:/usr/share/ansible/collections
```

## Resolving Dependency Conflicts

When two collections require different versions of a shared dependency, you may hit conflicts. Here is how to handle them.

```bash
# Check what is currently installed and look for version mismatches
ansible-galaxy collection list

# Force a specific version to override a transitive dependency
ansible-galaxy collection install community.general:8.2.0 --force
```

A practical strategy for managing conflicts is to create a lockfile-like approach.

```yaml
# requirements-locked.yml - fully resolved versions (like a lockfile)
# Generated by testing, then pinning all exact versions that work together
collections:
  - name: amazon.aws
    version: "7.2.0"
  - name: community.general
    version: "8.1.0"
  - name: community.mysql
    version: "3.8.0"
  - name: ansible.posix
    version: "1.5.4"
  - name: ansible.utils
    version: "3.1.0"
  - name: community.crypto
    version: "2.18.0"
```

## Automating Dependency Installation in CI/CD

In CI pipelines, always install dependencies explicitly before running playbooks.

```yaml
# .gitlab-ci.yml - install collection dependencies in CI
ansible-deploy:
  image: python:3.11
  before_script:
    - pip install ansible-core boto3
    - ansible-galaxy collection install -r requirements.yml --force
  script:
    - ansible-playbook -i inventory deploy.yml
```

For GitHub Actions:

```yaml
# .github/workflows/deploy.yml - install dependencies in GitHub Actions
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible and dependencies
        run: |
          pip install ansible-core boto3
          ansible-galaxy collection install -r requirements.yml --force

      - name: Run playbook
        run: ansible-playbook -i inventory deploy.yml
```

## Listing and Verifying Installed Collections

Check what is installed and verify integrity.

```bash
# List all installed collections with versions
ansible-galaxy collection list

# List collections matching a pattern
ansible-galaxy collection list community.*

# Verify collection integrity against Galaxy signatures
ansible-galaxy collection verify community.general
```

## Best Practices

From managing collection dependencies across many projects, here is what works:

1. **Always use a requirements.yml file.** Never rely on globally installed collections. Each project should declare its own dependencies.

2. **Pin major versions at minimum.** Use `>=7.0.0,<8.0.0` style constraints to prevent breaking changes from slipping in while still getting bug fixes.

3. **Use project-local collections paths.** Install collections into a `./collections` directory within your project. This isolates projects from each other.

4. **Version-control your requirements.yml.** Treat it like a `package.json` or `requirements.txt`. It belongs in your Git repository.

5. **Test dependency updates explicitly.** Do not just run `--force` in production. Update requirements in a test environment first, verify everything works, then update your pinned versions.

6. **Document Python dependencies separately.** Some collections require specific Python libraries (like `boto3` or `hvac`). List these in a separate `requirements.txt` file alongside your `requirements.yml`.

Managing collection dependencies well is not glamorous work, but it prevents the kind of "works on my machine" failures that waste hours of debugging time. Get it right once and your future self will thank you.
