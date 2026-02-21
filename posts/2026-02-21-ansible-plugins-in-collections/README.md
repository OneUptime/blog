# How to Structure Ansible Plugins in Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Plugins, Packaging, Best Practices

Description: Learn the correct directory structure and organization for packaging Ansible plugins inside collections for distribution and reuse.

---

Ansible collections are the standard way to package and distribute plugins, modules, roles, and playbooks as a single unit. If you have been keeping plugins in your project's local directories or in `~/.ansible/plugins/`, moving them into a collection gives you versioning, dependency management, and easy sharing via Ansible Galaxy or a private automation hub.

This guide covers how to structure plugins inside a collection, the naming conventions Ansible expects, and how to handle dependencies between plugins.

## Collection Directory Structure

A collection follows a strict directory layout. Ansible discovers plugins based on their location within this structure.

```
collections/
  ansible_collections/
    myorg/
      myutils/
        galaxy.yml
        README.md
        plugins/
          modules/
            my_module.py
          filter/
            my_filters.py
          test/
            my_tests.py
          lookup/
            my_lookup.py
          callback/
            my_callback.py
          inventory/
            my_inventory.py
          connection/
            my_connection.py
          become/
            my_become.py
          cache/
            my_cache.py
          strategy/
            my_strategy.py
          vars/
            my_vars.py
          module_utils/
            common.py
            api_client.py
        roles/
          my_role/
            tasks/
              main.yml
        docs/
        tests/
          unit/
          integration/
```

The namespace is `myorg` and the collection name is `myutils`, making the fully qualified collection name (FQCN) `myorg.myutils`.

## The galaxy.yml File

Every collection needs a `galaxy.yml` at the root:

```yaml
# galaxy.yml - Collection metadata
namespace: myorg
name: myutils
version: 1.0.0
readme: README.md
authors:
  - Your Name <you@example.com>
description: Custom utility plugins for infrastructure automation
license:
  - GPL-3.0-or-later
tags:
  - infrastructure
  - utilities
  - networking
dependencies:
  ansible.utils: ">=2.0.0"
repository: https://github.com/myorg/ansible-collection-myutils
documentation: https://github.com/myorg/ansible-collection-myutils/wiki
homepage: https://github.com/myorg/ansible-collection-myutils
issues: https://github.com/myorg/ansible-collection-myutils/issues
build_ignore:
  - .git
  - .github
  - tests/output
```

## Plugin Directory Naming

The directory names under `plugins/` must match exactly what Ansible expects. Here is the mapping:

| Plugin Type | Directory Name |
|-------------|---------------|
| Modules | `modules/` |
| Filter plugins | `filter/` |
| Test plugins | `test/` |
| Lookup plugins | `lookup/` |
| Callback plugins | `callback/` |
| Inventory plugins | `inventory/` |
| Connection plugins | `connection/` |
| Become plugins | `become/` |
| Cache plugins | `cache/` |
| Strategy plugins | `strategy/` |
| Vars plugins | `vars/` |
| Module utilities | `module_utils/` |
| Action plugins | `action/` |
| Terminal plugins | `terminal/` |
| Cliconf plugins | `cliconf/` |
| Httpapi plugins | `httpapi/` |
| Netconf plugins | `netconf/` |

Note that filter and test directories are singular (`filter/`, `test/`) while some other references in the Ansible docs show them as plural. Use the singular form inside collections.

## Sharing Code with module_utils

When multiple plugins need the same helper code, put it in `plugins/module_utils/`. Both modules and plugins can import from here.

```python
# plugins/module_utils/api_client.py
"""Shared API client used by multiple plugins and modules."""

import json
from ansible.module_utils.urls import open_url


class APIClient:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip('/')
        self.token = token

    def get(self, path):
        url = '%s/%s' % (self.base_url, path.lstrip('/'))
        headers = {
            'Authorization': 'Bearer %s' % self.token,
            'Content-Type': 'application/json',
        }
        response = open_url(url, headers=headers, method='GET')
        return json.loads(response.read())

    def post(self, path, data):
        url = '%s/%s' % (self.base_url, path.lstrip('/'))
        headers = {
            'Authorization': 'Bearer %s' % self.token,
            'Content-Type': 'application/json',
        }
        response = open_url(
            url, headers=headers, method='POST',
            data=json.dumps(data)
        )
        return json.loads(response.read())
```

Import it from a module:

```python
# plugins/modules/my_api_resource.py
from ansible_collections.myorg.myutils.plugins.module_utils.api_client import APIClient
```

Import it from a plugin:

```python
# plugins/lookup/my_api_lookup.py
from ansible_collections.myorg.myutils.plugins.module_utils.api_client import APIClient
```

The import path always uses the full FQCN path.

## Plugin Documentation in Collections

Every plugin in a collection should include a `DOCUMENTATION` string. This is what `ansible-doc` reads:

```python
# plugins/filter/network_utils.py
DOCUMENTATION = """
    name: cidr_to_netmask
    short_description: Convert CIDR prefix to subnet mask
    version_added: "1.0.0"
    description:
        - Takes a CIDR prefix length and returns the corresponding subnet mask.
    positional: _input
    options:
      _input:
        description: CIDR prefix length (0-32)
        type: int
        required: true
"""

EXAMPLES = """
# Convert CIDR prefix to netmask
- name: Get netmask
  debug:
    msg: "{{ 24 | myorg.myutils.cidr_to_netmask }}"
    # Output: 255.255.255.0
"""

RETURN = """
  _value:
    description: The subnet mask string
    type: str
"""
```

## Using Collection Plugins in Playbooks

Once installed, reference plugins using the FQCN:

```yaml
---
# Using collection plugins with FQCN
- name: Demo collection plugins
  hosts: localhost
  collections:
    - myorg.myutils

  tasks:
    # Using a filter plugin
    - name: Convert CIDR to netmask
      ansible.builtin.debug:
        msg: "{{ 24 | myorg.myutils.cidr_to_netmask }}"

    # Using a lookup plugin
    - name: Look up API data
      ansible.builtin.debug:
        msg: "{{ lookup('myorg.myutils.my_api_lookup', 'servers') }}"

    # Using a test plugin
    - name: Validate IP address
      ansible.builtin.assert:
        that:
          - "'192.168.1.1' is myorg.myutils.valid_ipv4"
```

You can also set the `collections` keyword to avoid repeating the FQCN, but the explicit FQCN approach is preferred for clarity.

## Building and Installing

Build the collection tarball:

```bash
# Build from the collection root directory
cd collections/ansible_collections/myorg/myutils
ansible-galaxy collection build

# This creates myorg-myutils-1.0.0.tar.gz
```

Install it locally for testing:

```bash
ansible-galaxy collection install myorg-myutils-1.0.0.tar.gz --force
```

Or install from a requirements file:

```yaml
# requirements.yml
collections:
  - name: myorg.myutils
    source: https://galaxy.ansible.com
    version: ">=1.0.0"
```

```bash
ansible-galaxy collection install -r requirements.yml
```

## Testing Collection Plugins

Structure your tests alongside the plugins:

```
tests/
  unit/
    plugins/
      filter/
        test_network_utils.py
      test/
        test_my_tests.py
  integration/
    targets/
      test_my_module/
        tasks/
          main.yml
```

Run unit tests with pytest:

```bash
cd collections/ansible_collections/myorg/myutils
python -m pytest tests/unit/ -v
```

For integration tests, use `ansible-test`:

```bash
ansible-test integration --docker default
```

## Collection Dependencies

If your collection depends on plugins from another collection, declare it in `galaxy.yml`:

```yaml
dependencies:
  ansible.utils: ">=2.0.0"
  ansible.netcommon: ">=4.0.0"
```

Users who install your collection will automatically get the dependencies too.

## Summary

Structuring plugins in collections follows a well-defined directory layout that Ansible uses for automatic discovery. The key points are: use the correct directory names under `plugins/`, include `DOCUMENTATION` strings for `ansible-doc` support, share common code via `module_utils/`, and always reference collection plugins using their FQCN in playbooks. Collections make your plugins versioned, distributable, and easy to test with `ansible-test`.
