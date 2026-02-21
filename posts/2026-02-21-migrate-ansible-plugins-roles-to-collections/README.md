# How to Migrate Plugins from Roles to Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Collections, Migration, Best Practices

Description: Step-by-step guide to migrating Ansible plugins from roles and local directories into properly structured collections.

---

If you have been building Ansible plugins for a while, they are probably scattered across roles, project-level plugin directories, and maybe `~/.ansible/plugins/`. Collections are the modern way to organize and distribute plugins. Migrating to collections gives you versioning, proper namespacing, dependency management, and compatibility with `ansible-test`. This guide walks through the migration process.

## Before You Start

Take inventory of your existing plugins. They might live in any of these locations:

```
# Project-level plugins
my_project/
  filter_plugins/
    my_filters.py
  lookup_plugins/
    my_lookup.py
  callback_plugins/
    my_callback.py
  library/
    my_module.py

# Role-level plugins
roles/
  my_role/
    filter_plugins/
      role_filters.py
    library/
      role_module.py
    module_utils/
      role_utils.py

# User-level plugins
~/.ansible/plugins/
  filter/
    user_filters.py
```

List everything:

```bash
# Find all plugin files across your project
find . -path '*/filter_plugins/*.py' -o \
       -path '*/lookup_plugins/*.py' -o \
       -path '*/callback_plugins/*.py' -o \
       -path '*/connection_plugins/*.py' -o \
       -path '*/library/*.py' -o \
       -path '*/module_utils/*.py' | sort
```

## Step 1: Create the Collection Structure

Initialize the collection:

```bash
# Create the collection skeleton
ansible-galaxy collection init myorg.myutils

# This creates:
# myorg/myutils/
#   galaxy.yml
#   plugins/
#     README.md
#   roles/
#   docs/
#   meta/
#     runtime.yml
```

Set up the plugin directories you need:

```bash
cd myorg/myutils

# Create directories for each plugin type you have
mkdir -p plugins/filter
mkdir -p plugins/lookup
mkdir -p plugins/callback
mkdir -p plugins/modules
mkdir -p plugins/module_utils
mkdir -p plugins/inventory
mkdir -p plugins/connection
mkdir -p plugins/test
mkdir -p tests/unit/plugins/filter
mkdir -p tests/unit/plugins/lookup
mkdir -p tests/integration/targets
```

## Step 2: Move Plugin Files

Copy plugins to their new locations. Note that directory names change:

```bash
# Filter plugins: filter_plugins/ -> plugins/filter/
cp ../my_project/filter_plugins/my_filters.py plugins/filter/

# Lookup plugins: lookup_plugins/ -> plugins/lookup/
cp ../my_project/lookup_plugins/my_lookup.py plugins/lookup/

# Callback plugins: callback_plugins/ -> plugins/callback/
cp ../my_project/callback_plugins/my_callback.py plugins/callback/

# Modules: library/ -> plugins/modules/
cp ../my_project/library/my_module.py plugins/modules/

# Module utilities: module_utils/ -> plugins/module_utils/
cp ../roles/my_role/module_utils/role_utils.py plugins/module_utils/
```

## Step 3: Update Import Paths

This is the most critical step. All imports between plugins must use the full collection path.

Before (role-based):

```python
# In a module, importing from module_utils
from ansible.module_utils.role_utils import MyHelper
```

After (collection-based):

```python
# In a module, importing from collection module_utils
from ansible_collections.myorg.myutils.plugins.module_utils.role_utils import MyHelper
```

Before (relative imports in filter plugins):

```python
# This does not work in collections
from my_shared_lib import helper_function
```

After (using module_utils):

```python
# Move shared code to module_utils and import with FQCN
from ansible_collections.myorg.myutils.plugins.module_utils.shared_lib import helper_function
```

Here is a script that helps find imports that need updating:

```python
# find_imports.py - Find imports that need updating for collections
import ast
import sys
import os

def check_file(filepath):
    """Check a Python file for imports that need updating."""
    with open(filepath) as f:
        try:
            tree = ast.parse(f.read())
        except SyntaxError:
            print("SYNTAX ERROR: %s" % filepath)
            return

    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            module = node.module or ''
            # Flag imports from ansible.module_utils that are custom
            if module.startswith('ansible.module_utils.') and \
               not module.startswith('ansible.module_utils.basic') and \
               not module.startswith('ansible.module_utils.common') and \
               not module.startswith('ansible.module_utils.urls'):
                print("%s:%d - UPDATE: from %s import ..." % (
                    filepath, node.lineno, module
                ))

for root, dirs, files in os.walk(sys.argv[1]):
    for f in files:
        if f.endswith('.py'):
            check_file(os.path.join(root, f))
```

## Step 4: Add DOCUMENTATION Strings

Collections require proper documentation in every plugin. If your old plugins lacked docs, add them now:

```python
# Before: No documentation
class FilterModule:
    def filters(self):
        return {'my_filter': self.my_filter}

    @staticmethod
    def my_filter(value):
        return value.upper()
```

```python
# After: With proper collection documentation
DOCUMENTATION = """
    name: my_filter
    short_description: Convert string to uppercase
    version_added: "1.0.0"
    description:
        - Converts a string value to uppercase.
    positional: _input
    options:
      _input:
        description: The string to convert.
        type: str
        required: true
"""

EXAMPLES = """
- name: Convert to uppercase
  debug:
    msg: "{{ 'hello' | myorg.myutils.my_filter }}"
"""

RETURN = """
  _value:
    description: The uppercased string.
    type: str
"""


class FilterModule:
    def filters(self):
        return {'my_filter': self.my_filter}

    @staticmethod
    def my_filter(value):
        return value.upper()
```

## Step 5: Update Playbooks to Use FQCN

Update all playbooks that reference your plugins to use the fully qualified collection name:

Before:

```yaml
- name: Use filter
  debug:
    msg: "{{ my_var | my_filter }}"

- name: Use lookup
  debug:
    msg: "{{ lookup('my_lookup', 'key') }}"

- name: Use module
  my_module:
    param1: value1
```

After:

```yaml
- name: Use filter
  debug:
    msg: "{{ my_var | myorg.myutils.my_filter }}"

- name: Use lookup
  debug:
    msg: "{{ lookup('myorg.myutils.my_lookup', 'key') }}"

- name: Use module
  myorg.myutils.my_module:
    param1: value1
```

## Step 6: Set Up Redirects for Backward Compatibility

If other people use your plugins with the old names, set up redirects in `meta/runtime.yml`:

```yaml
# meta/runtime.yml
requires_ansible: ">=2.14.0"

plugin_routing:
  modules:
    my_module:
      redirect: myorg.myutils.my_module
  lookup:
    my_lookup:
      redirect: myorg.myutils.my_lookup
  filter:
    my_filter:
      redirect: myorg.myutils.my_filter
```

## Step 7: Add Tests

Create tests for every migrated plugin:

```python
# tests/unit/plugins/filter/test_my_filters.py
import pytest
from plugins.filter.my_filters import FilterModule


class TestMyFilter:
    def setup_method(self):
        self.fm = FilterModule()

    def test_basic(self):
        assert self.fm.my_filter('hello') == 'HELLO'

    def test_empty(self):
        assert self.fm.my_filter('') == ''

    def test_already_upper(self):
        assert self.fm.my_filter('HELLO') == 'HELLO'
```

Run the tests:

```bash
cd myorg/myutils
python -m pytest tests/unit/ -v
ansible-test sanity --docker default
```

## Step 8: Build and Install

```bash
# Build the collection
ansible-galaxy collection build

# Install locally for testing
ansible-galaxy collection install myorg-myutils-1.0.0.tar.gz --force

# Verify plugins are accessible
ansible-doc -t filter myorg.myutils.my_filter
ansible-doc -t lookup myorg.myutils.my_lookup
```

## Step 9: Clean Up Old Plugin Locations

Once the collection is working and deployed, remove the old plugin files:

```bash
# Remove project-level plugin directories
rm -rf filter_plugins/ lookup_plugins/ callback_plugins/

# Remove role-level plugins if they were moved
rm -rf roles/my_role/filter_plugins/ roles/my_role/library/

# Update ansible.cfg to remove old plugin paths
# Remove lines like:
# filter_plugins = ./filter_plugins
# lookup_plugins = ./lookup_plugins
```

Update `ansible.cfg` to reference the collection:

```ini
# ansible.cfg
[defaults]
collections_path = ./collections:~/.ansible/collections
```

## Migration Checklist

1. Inventory all existing plugins across projects, roles, and user directories
2. Create the collection skeleton with `ansible-galaxy collection init`
3. Copy plugin files to the correct collection directories
4. Update all import paths to use FQCN
5. Add `DOCUMENTATION`, `EXAMPLES`, and `RETURN` strings
6. Update playbooks to use FQCN for plugin references
7. Set up `meta/runtime.yml` redirects for backward compatibility
8. Write unit and integration tests
9. Run `ansible-test sanity` to validate
10. Build, install, and verify
11. Remove old plugin files and update `ansible.cfg`

## Summary

Migrating from role-based plugins to collections is primarily about restructuring directories, updating import paths, and adding documentation. The biggest effort goes into updating import statements to use the full FQCN and updating playbooks to reference plugins with their collection namespace. Use `meta/runtime.yml` redirects for backward compatibility during the transition. Once migrated, you get proper versioning, dependency management, and distribution through Galaxy or a private hub.
