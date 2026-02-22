# How to Migrate Custom Modules to Ansible Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Migration, Module Development

Description: Migrate standalone custom Ansible modules into the collection format for better organization and distribution.

---

If you have custom modules in a library/ directory, migrating them to a collection improves organization, distribution, and dependency management.

## Current Structure (Before)

```
project/
  library/
    my_module.py
    my_other_module.py
  module_utils/
    helpers.py
  playbooks/
    site.yml
```

## Collection Structure (After)

```
collections/
  ansible_collections/
    my_namespace/
      my_collection/
        galaxy.yml
        plugins/
          modules/
            my_module.py
            my_other_module.py
          module_utils/
            helpers.py
        tests/
        docs/
        roles/
```

## Migration Steps

1. Create collection skeleton:

```bash
ansible-galaxy collection init my_namespace.my_collection
```

2. Move modules:

```bash
cp library/*.py collections/ansible_collections/my_namespace/my_collection/plugins/modules/
```

3. Move module_utils:

```bash
cp module_utils/*.py collections/ansible_collections/my_namespace/my_collection/plugins/module_utils/
```

4. Update imports in modules:

```python
# Before
from ansible.module_utils.helpers import MyHelper

# After
from ansible_collections.my_namespace.my_collection.plugins.module_utils.helpers import MyHelper
```

5. Update playbooks to use FQCN:

```yaml
# Before
- my_module:
    name: test

# After
- my_namespace.my_collection.my_module:
    name: test
```

6. Create galaxy.yml:

```yaml
namespace: my_namespace
name: my_collection
version: 1.0.0
authors:
  - Your Name
description: My custom modules
```

7. Build and test:

```bash
cd collections/ansible_collections/my_namespace/my_collection
ansible-galaxy collection build
ansible-test sanity
```

## Key Takeaways

Migrate modules to collections for proper packaging and distribution. Update imports to use the full collection path. Use FQCN in playbooks. Build and test the collection before publishing. This is a one-time migration that sets you up for long-term maintainability.
