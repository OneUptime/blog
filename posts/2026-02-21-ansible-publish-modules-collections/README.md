# How to Publish Custom Ansible Modules in Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Publishing, Galaxy

Description: Package and publish custom Ansible modules as collections on Ansible Galaxy for sharing and reuse.

---

Ansible Collections are the standard way to distribute modules, plugins, roles, and playbooks.

## Collection Structure

```
my_namespace/
  my_collection/
    galaxy.yml
    plugins/
      modules/
        my_module.py
      module_utils/
        helpers.py
    roles/
    docs/
    tests/
```

## galaxy.yml

```yaml
namespace: my_namespace
name: my_collection
version: 1.0.0
readme: README.md
authors:
  - Your Name
description: My custom Ansible collection
license: GPL-3.0-or-later
tags:
  - infrastructure
  - automation
dependencies: {}
repository: https://github.com/myorg/my-collection
```

## Building

```bash
ansible-galaxy collection build
# Creates my_namespace-my_collection-1.0.0.tar.gz
```

## Publishing to Galaxy

```bash
ansible-galaxy collection publish \
  my_namespace-my_collection-1.0.0.tar.gz \
  --api-key=your-galaxy-api-key
```

## Installing Your Collection

```bash
ansible-galaxy collection install my_namespace.my_collection
```

```yaml
# Using in a playbook
- name: Use custom module
  my_namespace.my_collection.my_module:
    name: test
    state: present
```

## Key Takeaways

Package modules in collections for proper distribution. Follow the standard directory structure. Use semantic versioning. Publish to Galaxy or a private automation hub.
