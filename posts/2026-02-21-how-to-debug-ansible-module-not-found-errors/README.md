# How to Debug Ansible Module Not Found Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Modules, Collections, Troubleshooting

Description: Learn how to diagnose and fix Ansible module not found errors caused by missing collections, wrong module paths, or version mismatches.

---

You write a playbook, reference a module you have used before, and Ansible tells you the module does not exist. The "module not found" error is one of the more confusing issues in Ansible because there are several different reasons it can happen: missing collections, wrong module names, Python path issues, or Ansible version mismatches. This post walks through each cause and shows you how to fix it.

## The Error Message

The typical error looks like this:

```
ERROR! couldn't resolve module/action 'community.postgresql.postgresql_db'.
This often indicates a misspelling, missing collection, or incorrect module path.
```

Or the older format:

```
ERROR! no action detected in task.
```

## Cause 1: Missing Ansible Collection

Since Ansible 2.10, most modules moved from the core package to separate collections. If you are referencing a module by its FQCN (Fully Qualified Collection Name) and the collection is not installed, you get a module not found error.

**Diagnosis:**

```bash
# List installed collections
ansible-galaxy collection list

# Check if a specific collection is installed
ansible-galaxy collection list community.postgresql
```

**Fix:**

```bash
# Install the missing collection
ansible-galaxy collection install community.postgresql

# Install from a requirements file
ansible-galaxy collection install -r requirements.yml
```

Create a `requirements.yml` file for your project:

```yaml
# requirements.yml
---
collections:
  - name: community.postgresql
    version: ">=3.0.0"
  - name: community.general
    version: ">=8.0.0"
  - name: amazon.aws
    version: ">=7.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
```

Install all at once:

```bash
ansible-galaxy collection install -r requirements.yml
```

## Cause 2: Using Short Module Names with Missing Collection

Before Ansible 2.10, you could use short module names like `postgresql_db`. After 2.10, these might not work if the collection routing has changed.

```yaml
# This might fail in newer Ansible versions
- name: Create database
  postgresql_db:
    name: mydb

# Use the FQCN instead
- name: Create database
  community.postgresql.postgresql_db:
    name: mydb
```

**Diagnosis: Check which collection provides the short name:**

```bash
# Find which collection provides a module
ansible-doc -l | grep postgresql_db
```

## Cause 3: Ansible Version Mismatch

Some modules only exist in certain Ansible versions. If you are running a playbook written for Ansible 2.14 on Ansible 2.9, modules might be missing.

```bash
# Check your Ansible version
ansible --version

# Check the version that includes a specific module
ansible-doc ansible.builtin.pip
# The documentation shows the version requirements
```

**Diagnosis:**

```bash
# Check if the module exists in your installation
ansible-doc community.docker.docker_container

# If it fails, the collection or module is not available
```

## Cause 4: Custom Module Path Not Configured

If you have custom modules in a local directory, Ansible needs to know where to find them:

```ini
# ansible.cfg
[defaults]
# Add custom module paths
library = ./library:~/.ansible/plugins/modules:/usr/share/ansible/plugins/modules
```

Or set it via environment variable:

```bash
export ANSIBLE_LIBRARY=./library:~/.ansible/plugins/modules
```

**Directory structure for custom modules:**

```
project/
  ansible.cfg
  playbook.yml
  library/
    my_custom_module.py
  roles/
    myrole/
      library/
        role_specific_module.py
```

## Cause 5: Typo in Module Name

Simple but very common:

```yaml
# Wrong: typo in module name
- name: Install package
  ansible.builtin.atp:  # Should be 'apt'
    name: nginx

# Wrong: wrong collection namespace
- name: Create docker container
  community.docker.docker_containers:  # Should be 'docker_container' (singular)
    name: myapp
```

**Diagnosis:**

```bash
# List all modules matching a pattern
ansible-doc -l | grep docker_container

# Or search more broadly
ansible-doc -l | grep docker
```

## Cause 6: Collection Installed in Wrong Location

Ansible looks for collections in specific directories. If you installed a collection with the wrong user or to a non-standard path, Ansible might not find it.

```bash
# Check where Ansible looks for collections
ansible-config dump | grep COLLECTIONS_PATH

# Default locations:
# ~/.ansible/collections
# /usr/share/ansible/collections
```

**Fix: Specify collection paths:**

```ini
# ansible.cfg
[defaults]
collections_path = ./collections:~/.ansible/collections:/usr/share/ansible/collections
```

Or install to the correct location:

```bash
# Install to the default user path
ansible-galaxy collection install community.postgresql

# Install to a project-specific path
ansible-galaxy collection install community.postgresql -p ./collections

# Install to system-wide path
sudo ansible-galaxy collection install community.postgresql -p /usr/share/ansible/collections
```

## Cause 7: Python Path Issues

Ansible modules run on the target host using Python. If the Python interpreter on the target host does not have required dependencies, or Ansible cannot find Python, you get errors:

```
MODULE FAILURE
The module failed to execute correctly, you probably need to set the
python interpreter.
```

**Fix:**

```yaml
# Set the Python interpreter for specific hosts
# host_vars/web-01.yml
ansible_python_interpreter: /usr/bin/python3

# Or in the playbook
- name: Configure servers
  hosts: all
  vars:
    ansible_python_interpreter: /usr/bin/python3
```

```ini
# Or in ansible.cfg
[defaults]
interpreter_python = auto_silent
```

## Cause 8: Module Dependencies Not Installed on Target

Some modules require Python packages on the target host:

```yaml
# The postgresql modules require psycopg2 on the target
- name: Create database
  community.postgresql.postgresql_db:
    name: mydb
  # Fails with: "psycopg2 is not installed"
```

**Fix: Install dependencies before using the module:**

```yaml
- name: Install PostgreSQL Python adapter
  ansible.builtin.pip:
    name: psycopg2-binary
  become: true

- name: Create database
  community.postgresql.postgresql_db:
    name: mydb
```

## Diagnostic Playbook

Here is a playbook you can run to diagnose module availability issues:

```yaml
---
- name: Diagnose module availability
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Show Ansible version
      ansible.builtin.debug:
        msg: "Ansible version: {{ ansible_version.full }}"

    - name: Show Python version
      ansible.builtin.debug:
        msg: "Python: {{ ansible_playbook_python }}"

    - name: List installed collections
      ansible.builtin.command:
        cmd: ansible-galaxy collection list
      register: collections
      changed_when: false

    - name: Show installed collections
      ansible.builtin.debug:
        var: collections.stdout_lines

    - name: Check collection paths
      ansible.builtin.command:
        cmd: ansible-config dump
      register: config
      changed_when: false

    - name: Show collection paths
      ansible.builtin.debug:
        msg: "{{ config.stdout_lines | select('search', 'COLLECTIONS') | list }}"

    - name: Show module paths
      ansible.builtin.debug:
        msg: "{{ config.stdout_lines | select('search', 'DEFAULT_MODULE_PATH') | list }}"
```

## Fixing Missing Collections in CI/CD

In CI/CD pipelines, collections need to be installed as part of the setup:

```yaml
# .gitlab-ci.yml
ansible-deploy:
  stage: deploy
  before_script:
    - pip install ansible-core==2.16.0
    - ansible-galaxy collection install -r requirements.yml
  script:
    - ansible-playbook deploy.yml
```

```yaml
# GitHub Actions workflow
- name: Install Ansible collections
  run: |
    pip install ansible-core
    ansible-galaxy collection install -r requirements.yml

- name: Run playbook
  run: ansible-playbook deploy.yml
```

## Preventing Module Not Found Errors

Set up your project to avoid these errors in the first place:

```
project/
  ansible.cfg
  requirements.yml        # Collection dependencies
  playbook.yml
  collections/            # Local collection installs
  library/                # Custom modules
  roles/
    requirements.yml      # Role dependencies
```

```ini
# ansible.cfg
[defaults]
collections_path = ./collections:~/.ansible/collections
library = ./library
```

```bash
# Part of project setup
ansible-galaxy collection install -r requirements.yml -p ./collections
ansible-galaxy role install -r roles/requirements.yml
```

## Summary

Module not found errors in Ansible are typically caused by missing collections, typos in module names, version mismatches, or incorrect paths. Start by checking your Ansible version and installed collections with `ansible-galaxy collection list`. Use fully qualified collection names (FQCNs) to avoid ambiguity. Keep a `requirements.yml` file in your project to document and automate collection dependencies. For CI/CD, always install collections as part of your pipeline setup. These practices prevent module not found errors from ever reaching production.
