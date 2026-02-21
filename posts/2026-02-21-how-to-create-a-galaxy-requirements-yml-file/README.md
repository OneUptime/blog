# How to Create a Galaxy requirements.yml File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Requirements, Dependency Management

Description: Complete guide to creating and structuring Ansible Galaxy requirements.yml files for managing roles and collections as project dependencies.

---

A `requirements.yml` file is the dependency manifest for your Ansible project. It lists every role and collection your playbooks need, with version pins, so that anyone on your team can reproduce the exact same environment. Think of it like a `package.json` for Node.js or a `requirements.txt` for Python, but for Ansible content.

Without a requirements file, you end up with verbal instructions like "make sure you install geerlingguy.nginx version 3.1.0 before running the playbook." That does not scale and it does not survive the test of time.

## Basic Structure

A requirements file is a YAML document with two top-level keys: `roles` and `collections`. You can use either or both.

```yaml
# requirements.yml - basic structure with both roles and collections
---
roles:
  - name: geerlingguy.nginx
    version: "3.1.0"

  - name: geerlingguy.postgresql
    version: "3.4.0"

collections:
  - name: community.general
    version: "8.1.0"

  - name: amazon.aws
    version: "7.2.0"
```

Install everything with a single command:

```bash
# Install both roles and collections from one file
ansible-galaxy install -r requirements.yml
ansible-galaxy collection install -r requirements.yml
```

Note that you need two separate commands: `ansible-galaxy install` processes the `roles` section, and `ansible-galaxy collection install` processes the `collections` section.

## Role Entries in Detail

Each role entry supports several fields:

```yaml
# requirements.yml - all available fields for roles
---
roles:
  # Simple Galaxy role with version pin
  - name: geerlingguy.nginx
    version: "3.1.0"

  # Role from a Git repository
  - name: my_custom_role
    src: git+https://github.com/myorg/ansible-role-custom.git
    version: v2.0.0
    scm: git

  # Role from a private Git repo via SSH
  - name: internal_webserver
    src: git+ssh://git@gitlab.internal.com/infra/ansible-role-webserver.git
    version: main

  # Role from a tarball URL
  - name: legacy_role
    src: https://artifacts.internal.com/ansible/legacy_role-1.0.0.tar.gz

  # Role from a local file
  - name: local_role
    src: file:///opt/ansible/roles/local_role-1.0.0.tar.gz
```

The `name` field is what you reference in your playbooks. The `src` field tells Galaxy where to get the role. If `src` is omitted, Galaxy assumes the name is a Galaxy role name.

## Collection Entries in Detail

Collections support a similar set of fields:

```yaml
# requirements.yml - all available fields for collections
---
collections:
  # Standard Galaxy collection with version pin
  - name: community.general
    version: "8.1.0"

  # Collection with a version range
  - name: ansible.posix
    version: ">=1.5.0,<2.0.0"

  # Collection from a specific Galaxy server
  - name: company.internal_utils
    version: "1.2.0"
    source: https://galaxy.internal.com/

  # Collection from a Git repository
  - name: https://github.com/myorg/my_collection.git
    type: git
    version: v1.0.0

  # Collection from a URL (tarball)
  - name: https://artifacts.internal.com/collections/my_namespace-my_collection-1.0.0.tar.gz
    type: url

  # Collection from a local file
  - name: /path/to/my_namespace-my_collection-1.0.0.tar.gz
    type: file
```

## Version Constraints

Version pinning is critical. Here are the different ways to specify versions:

```yaml
# requirements.yml - version constraint examples
---
collections:
  # Exact version (most restrictive, most predictable)
  - name: community.general
    version: "8.1.0"

  # Minimum version
  - name: ansible.posix
    version: ">=1.5.0"

  # Version range
  - name: community.docker
    version: ">=3.5.0,<4.0.0"

  # Compatible release (same as >=3.7.0,<4.0.0)
  - name: community.postgresql
    version: "~=3.7"

  # Any version (not recommended for production)
  - name: community.crypto
    version: "*"

roles:
  # Exact version pin
  - name: geerlingguy.nginx
    version: "3.1.0"

  # Git tag
  - name: my_role
    src: git+https://github.com/myorg/my-role.git
    version: v2.0.0

  # Git branch (avoid for production)
  - name: dev_role
    src: git+https://github.com/myorg/dev-role.git
    version: develop

  # Git commit hash (most precise)
  - name: pinned_role
    src: git+https://github.com/myorg/pinned-role.git
    version: a1b2c3d4e5f6
```

For production, I always recommend exact version pins. Ranges are fine for development, but if you need reproducibility, pin to a specific version.

## Organizing Requirements for Large Projects

For larger projects, you might split requirements into multiple files:

```yaml
# requirements-base.yml - core infrastructure roles
---
roles:
  - name: geerlingguy.nginx
    version: "3.1.0"
  - name: geerlingguy.postgresql
    version: "3.4.0"

collections:
  - name: community.general
    version: "8.1.0"
  - name: ansible.posix
    version: "1.5.4"
```

```yaml
# requirements-aws.yml - AWS-specific dependencies
---
collections:
  - name: amazon.aws
    version: "7.2.0"
  - name: community.aws
    version: "7.1.0"

roles:
  - name: geerlingguy.aws-inspector
    version: "2.0.0"
```

Then install the set you need:

```bash
# Install base dependencies
ansible-galaxy install -r requirements-base.yml
ansible-galaxy collection install -r requirements-base.yml

# Install AWS-specific dependencies when deploying to AWS
ansible-galaxy install -r requirements-aws.yml
ansible-galaxy collection install -r requirements-aws.yml
```

## A Makefile for Dependency Management

I like to wrap Galaxy commands in a Makefile to standardize the workflow:

```makefile
# Makefile - standardize dependency management
ROLES_PATH := ./roles
COLLECTIONS_PATH := ./collections
REQUIREMENTS := requirements.yml

.PHONY: deps deps-force deps-update clean-deps

# Install all dependencies
deps:
	ansible-galaxy install -r $(REQUIREMENTS) -p $(ROLES_PATH)
	ansible-galaxy collection install -r $(REQUIREMENTS) -p $(COLLECTIONS_PATH)

# Force reinstall all dependencies
deps-force:
	ansible-galaxy install -r $(REQUIREMENTS) -p $(ROLES_PATH) --force
	ansible-galaxy collection install -r $(REQUIREMENTS) -p $(COLLECTIONS_PATH) --force

# Upgrade to latest within version constraints
deps-update:
	ansible-galaxy install -r $(REQUIREMENTS) -p $(ROLES_PATH) --force
	ansible-galaxy collection install -r $(REQUIREMENTS) -p $(COLLECTIONS_PATH) --upgrade

# Remove all downloaded dependencies
clean-deps:
	rm -rf $(ROLES_PATH)/*
	rm -rf $(COLLECTIONS_PATH)/*
```

## Validating Your Requirements File

Before committing, validate the YAML syntax:

```bash
# Validate YAML syntax with Python
python3 -c "
import yaml
with open('requirements.yml') as f:
    data = yaml.safe_load(f)
    roles = data.get('roles', [])
    collections = data.get('collections', [])
    print(f'Found {len(roles)} roles and {len(collections)} collections')
    for r in roles:
        assert 'name' in r, f'Role entry missing name: {r}'
    for c in collections:
        assert 'name' in c, f'Collection entry missing name: {c}'
    print('All entries valid')
"
```

## Integrating with CI/CD

In your CI pipeline, install dependencies before running playbooks:

```yaml
# .gitlab-ci.yml - install Galaxy dependencies in CI
---
stages:
  - lint
  - deploy

lint:
  stage: lint
  image: python:3.11
  script:
    - pip install ansible-core ansible-lint
    - ansible-galaxy install -r requirements.yml -p ./roles/
    - ansible-galaxy collection install -r requirements.yml -p ./collections/
    - ansible-lint playbook.yml

deploy:
  stage: deploy
  image: python:3.11
  script:
    - pip install ansible-core
    - ansible-galaxy install -r requirements.yml -p ./roles/
    - ansible-galaxy collection install -r requirements.yml -p ./collections/
    - ansible-playbook -i inventory playbook.yml
```

## Common Mistakes to Avoid

**Forgetting version pins.** Without version pins, every install might pull different versions. This leads to "works on my machine" problems.

**Committing downloaded roles to Git.** Downloaded roles and collections should be in `.gitignore`. Only the requirements file belongs in version control.

**Using branch names as versions for Git-sourced roles.** Branches change over time. Use tags or commit hashes instead.

**Mixing role formats.** The old format used a flat list without the `roles:` key. Stick with the modern format that has explicit `roles:` and `collections:` keys.

## Summary

A well-structured `requirements.yml` file is the foundation of reproducible Ansible automation. Pin your versions, organize entries by source type, and integrate installation into your CI/CD pipeline. The file supports Galaxy roles, Git repositories, tarballs, and local files as sources for both roles and collections. Treat it like any other dependency manifest: keep it in version control, review changes carefully, and never deploy without installing from it first.
