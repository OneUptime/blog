# How to Use ansible-galaxy init to Create Role Scaffolding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, Scaffolding

Description: Learn how to use ansible-galaxy init to quickly scaffold Ansible roles with the correct directory structure and customization options.

---

Every Ansible role follows the same directory convention: tasks, handlers, defaults, vars, templates, files, meta, and tests. Creating all of those directories and placeholder files by hand gets old quickly, especially when you are building multiple roles for a project. The `ansible-galaxy init` command generates the entire scaffolding for you in one shot. This post covers how to use it effectively, customize the output, and integrate it into your workflow.

## Basic Usage

The simplest invocation creates a role in the current directory:

```bash
# Create a new role called "loadbalancer" with the standard directory structure
ansible-galaxy init loadbalancer
```

This produces the following tree:

```
loadbalancer/
  README.md
  defaults/
    main.yml
  files/
  handlers/
    main.yml
  meta/
    main.yml
  tasks/
    main.yml
  templates/
  tests/
    inventory
    test.yml
  vars/
    main.yml
```

Every `main.yml` file comes pre-populated with a minimal YAML skeleton (usually just `---` and some comments), so you can start filling in content immediately.

## Specifying an Output Path

By default, the role directory is created in your current working directory. If you want it inside an existing `roles/` directory:

```bash
# Place the new role inside the project's roles directory
ansible-galaxy init --init-path roles/ loadbalancer
```

This creates `roles/loadbalancer/` with the full structure. The `--init-path` flag is particularly useful when you have a standard project layout and want roles to land in the right place without navigating around.

## What Gets Generated

Let's look at the key files that `ansible-galaxy init` creates and what they contain by default.

### tasks/main.yml

```yaml
# roles/loadbalancer/tasks/main.yml
# Auto-generated - add your tasks here
---
# tasks file for loadbalancer
```

### defaults/main.yml

```yaml
# roles/loadbalancer/defaults/main.yml
# Auto-generated - add your default variables here
---
# defaults file for loadbalancer
```

### handlers/main.yml

```yaml
# roles/loadbalancer/handlers/main.yml
# Auto-generated - add your handlers here
---
# handlers file for loadbalancer
```

### meta/main.yml

This is the most interesting auto-generated file because it includes a full Galaxy metadata template:

```yaml
# roles/loadbalancer/meta/main.yml
# Auto-generated Galaxy metadata - fill in your role details
galaxy_info:
  author: your name
  description: your role description
  company: your company (optional)

  license: license (GPL-2.0-or-later, MIT, etc)

  min_ansible_version: "2.1"

  # platforms:
  # - name: Fedora
  #   versions:
  #   - all
  # - name: Ubuntu
  #   versions:
  #   - all

  galaxy_tags: []

dependencies: []
```

### tests/test.yml and tests/inventory

```yaml
# roles/loadbalancer/tests/test.yml
# Auto-generated test playbook
---
- hosts: localhost
  remote_user: root
  roles:
    - loadbalancer
```

```ini
# roles/loadbalancer/tests/inventory
localhost
```

## Preventing Overwrites

If you accidentally run `ansible-galaxy init` for a role that already exists, it will fail with an error:

```bash
# This will fail because the directory already exists
ansible-galaxy init loadbalancer
# ERROR! The directory loadbalancer already exists.
```

If you genuinely want to regenerate the scaffolding (for example, after deleting corrupted files), use the `--force` flag:

```bash
# Overwrite an existing role directory with fresh scaffolding
ansible-galaxy init --force loadbalancer
```

Be careful with `--force` because it will overwrite all existing files in the role directory.

## Using a Custom Skeleton

The default template is fine for most cases, but if your organization has standards (like mandatory CI files, linting configs, or specific README formats), you can point `ansible-galaxy init` at a custom skeleton directory.

First, create your skeleton:

```bash
# Set up a custom skeleton with your organization's standards
mkdir -p /opt/ansible-skeletons/role_skeleton
mkdir -p /opt/ansible-skeletons/role_skeleton/tasks
mkdir -p /opt/ansible-skeletons/role_skeleton/defaults
mkdir -p /opt/ansible-skeletons/role_skeleton/meta
mkdir -p /opt/ansible-skeletons/role_skeleton/molecule/default
```

Add your template files. The skeleton supports Jinja2 templating with a few built-in variables:

```yaml
# /opt/ansible-skeletons/role_skeleton/tasks/main.yml
# {{ role_name }} - main tasks
---
# This role was scaffolded on {{ template_date }}
# Owner: platform-engineering
```

```yaml
# /opt/ansible-skeletons/role_skeleton/meta/main.yml
---
galaxy_info:
  author: platform-engineering
  description: "{{ role_name }} role"
  license: MIT
  min_ansible_version: "2.14"
  galaxy_tags:
    - {{ role_name }}

dependencies: []
```

```yaml
# /opt/ansible-skeletons/role_skeleton/molecule/default/molecule.yml
# Standard Molecule test configuration
---
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: instance
    image: ubuntu:22.04
provisioner:
  name: ansible
verifier:
  name: ansible
```

Now use your skeleton:

```bash
# Scaffold a role using your custom template
ansible-galaxy init --role-skeleton=/opt/ansible-skeletons/role_skeleton loadbalancer
```

## Setting a Default Skeleton in ansible.cfg

If you want every `ansible-galaxy init` to use your custom skeleton without specifying the flag each time:

```ini
# ansible.cfg
[galaxy]
role_skeleton = /opt/ansible-skeletons/role_skeleton
role_skeleton_ignore =
  - .git
  - .github
  - __pycache__
```

The `role_skeleton_ignore` option tells `ansible-galaxy` to skip certain files or directories from the skeleton during scaffolding.

## Scaffolding Multiple Roles at Once

`ansible-galaxy init` only handles one role at a time. If you need to scaffold several roles for a new project, a simple shell loop works well:

```bash
# Scaffold multiple roles in one go
for role in webserver database cache loadbalancer monitoring; do
  ansible-galaxy init --init-path roles/ "$role"
done
```

This gives you a fully structured `roles/` directory in seconds:

```
roles/
  webserver/
  database/
  cache/
  loadbalancer/
  monitoring/
```

## Integrating with Version Control

Right after scaffolding, it is a good idea to initialize the role as its own Git repository if you plan to share it independently:

```bash
# Initialize the role as a standalone Git repo
cd roles/loadbalancer
git init
git add .
git commit -m "Initial role scaffolding"
```

If the role lives inside a larger project repo, you can skip this step. But for roles shared across multiple projects, having a dedicated repository per role is the standard approach.

## Practical Workflow

Here is how I typically scaffold and flesh out a new role:

```bash
# 1. Scaffold the role
ansible-galaxy init --init-path roles/ loadbalancer

# 2. Fill in the metadata
vim roles/loadbalancer/meta/main.yml

# 3. Define default variables
vim roles/loadbalancer/defaults/main.yml

# 4. Write the main tasks
vim roles/loadbalancer/tasks/main.yml

# 5. Add templates as needed
vim roles/loadbalancer/templates/haproxy.cfg.j2

# 6. Write handlers
vim roles/loadbalancer/handlers/main.yml

# 7. Run a syntax check
ansible-playbook site.yml --syntax-check

# 8. Test against a local or dev environment
ansible-playbook site.yml --limit dev --check --diff
```

## Cleaning Up Unused Directories

If your role does not use certain directories (say, `files/` or `library/`), you can safely delete them. Ansible will not complain about missing directories within a role. Only `tasks/main.yml` is needed for a functional role. That said, many teams prefer to keep the empty directories as a signal to future contributors that those extension points exist.

## Wrapping Up

The `ansible-galaxy init` command is a small but effective productivity tool. It saves you from the tedious work of creating directories and boilerplate files, ensures you follow the standard Ansible role layout, and can be customized with skeletons to enforce organizational standards. Whether you are creating a single role or scaffolding a dozen at once, it is the right starting point for every Ansible role you build.
