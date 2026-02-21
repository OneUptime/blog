# How to Create a Custom Lookup Plugin in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Plugin Development, Automation

Description: Learn how to build custom lookup plugins in Ansible to fetch data from external sources and integrate them into your playbooks.

---

Ansible ships with dozens of built-in lookup plugins for reading files, querying databases, fetching environment variables, and more. But sometimes you need to pull data from a source that no existing plugin supports. Maybe you have a custom key-value store, an internal API, or a proprietary configuration management system. That is where custom lookup plugins come in.

In this guide, I will walk you through the process of building your own lookup plugin from scratch, testing it, and using it in playbooks.

## Understanding Lookup Plugin Architecture

Lookup plugins in Ansible are Python classes that inherit from `LookupBase`. They live in specific directories where Ansible knows to find them. When you call `lookup('my_plugin', 'some_term')` in a playbook, Ansible searches for a Python file named `my_plugin.py` in the lookup plugin path.

The plugin search order is:

1. `./lookup_plugins/` relative to the playbook
2. `~/.ansible/plugins/lookup/`
3. `/usr/share/ansible/plugins/lookup/`
4. Any path defined in `ANSIBLE_LOOKUP_PLUGINS` environment variable
5. Paths listed in `ansible.cfg` under `lookup_plugins`

## The Minimal Lookup Plugin Structure

Every lookup plugin needs a `run` method that receives a list of terms and keyword arguments. Here is the simplest possible lookup plugin.

Create a file at `lookup_plugins/hello.py` in your project directory:

```python
# lookup_plugins/hello.py
# A minimal lookup plugin that returns a greeting for each term passed in

from ansible.plugins.lookup import LookupBase

class LookupModule(LookupBase):

    def run(self, terms, variables=None, **kwargs):
        results = []
        for term in terms:
            results.append("Hello, {}!".format(term))
        return results
```

You can use this plugin in a playbook immediately:

```yaml
# test_hello.yml
# Demonstrates using the custom hello lookup plugin
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Greet team members
      debug:
        msg: "{{ lookup('hello', 'Alice', 'Bob', 'Charlie') }}"
```

Running this playbook produces the output: `Hello, Alice!,Hello, Bob!,Hello, Charlie!`

## Building a Practical Lookup Plugin

Let us build something more useful: a lookup plugin that reads configuration values from a JSON-based configuration store. This simulates fetching data from an external API or database.

First, create the configuration file:

```json
{
    "database_host": "db.prod.internal",
    "database_port": 5432,
    "cache_ttl": 300,
    "max_connections": 100,
    "feature_flags": {
        "dark_mode": true,
        "beta_api": false
    }
}
```

Now create the lookup plugin:

```python
# lookup_plugins/config_store.py
# Lookup plugin that reads values from a JSON configuration store
# Supports nested key access using dot notation (e.g., "feature_flags.dark_mode")

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import json
import os

from ansible.errors import AnsibleError
from ansible.plugins.lookup import LookupBase
from ansible.utils.display import Display

display = Display()

DOCUMENTATION = """
    name: config_store
    short_description: Read values from a JSON config store
    description:
        - This lookup reads configuration values from a JSON file.
        - Supports nested key access using dot notation.
    options:
        config_file:
            description: Path to the JSON configuration file
            default: config_store.json
            type: string
"""

class LookupModule(LookupBase):

    def run(self, terms, variables=None, **kwargs):
        # Allow the user to override the config file path
        config_file = kwargs.get('config_file', 'config_store.json')

        # Resolve the file path relative to the playbook directory
        if variables is not None:
            playbook_dir = variables.get('playbook_dir', '.')
        else:
            playbook_dir = '.'

        config_path = os.path.join(playbook_dir, config_file)

        # Load the JSON configuration
        try:
            with open(config_path, 'r') as f:
                config_data = json.load(f)
        except FileNotFoundError:
            raise AnsibleError(
                "Config file not found: {}".format(config_path)
            )
        except json.JSONDecodeError as e:
            raise AnsibleError(
                "Invalid JSON in config file: {}".format(str(e))
            )

        results = []
        for term in terms:
            value = self._resolve_dotted_key(config_data, term)
            if value is None:
                display.warning("Key '{}' not found in config store".format(term))
            results.append(value)

        return results

    def _resolve_dotted_key(self, data, key):
        """Walk through nested dicts using dot-separated keys."""
        parts = key.split('.')
        current = data
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        return current
```

## Using the Custom Plugin in Playbooks

Here is a playbook that uses the config_store lookup:

```yaml
# deploy.yml
# Uses the custom config_store lookup to fetch deployment configuration values
- hosts: webservers
  vars:
    db_host: "{{ lookup('config_store', 'database_host') }}"
    db_port: "{{ lookup('config_store', 'database_port') }}"
    max_conn: "{{ lookup('config_store', 'max_connections') }}"
    dark_mode: "{{ lookup('config_store', 'feature_flags.dark_mode') }}"

  tasks:
    - name: Show database configuration
      debug:
        msg: "Connecting to {{ db_host }}:{{ db_port }} with max {{ max_conn }} connections"

    - name: Check feature flag
      debug:
        msg: "Dark mode is {{ 'enabled' if dark_mode else 'disabled' }}"

    - name: Use custom config file path
      debug:
        msg: "{{ lookup('config_store', 'cache_ttl', config_file='staging_config.json') }}"
```

## Adding Input Validation and Error Handling

Production-quality plugins need proper error handling. Here is how to add validation:

```python
# Enhanced run method with input validation
def run(self, terms, variables=None, **kwargs):
    # Validate that at least one term was provided
    if not terms:
        raise AnsibleError("config_store lookup requires at least one key to look up")

    # Validate each term is a string
    for term in terms:
        if not isinstance(term, str):
            raise AnsibleError(
                "config_store lookup expects string keys, got: {} ({})".format(
                    term, type(term).__name__
                )
            )

    # Set self._options from kwargs for plugins that use option handling
    self.set_options(var_options=variables, direct=kwargs)

    config_file = kwargs.get('config_file', 'config_store.json')
    # ... rest of the method
```

## Writing Tests for Your Lookup Plugin

You should test your plugins outside of Ansible to catch bugs early. Here is a test file using pytest:

```python
# tests/test_config_store.py
# Unit tests for the config_store lookup plugin

import json
import os
import pytest
import tempfile

# Adjust the import path so pytest can find the plugin
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lookup_plugins'))

from config_store import LookupModule

@pytest.fixture
def config_file(tmp_path):
    """Create a temporary config file for testing."""
    config = {
        "app_name": "myapp",
        "nested": {"key": "value"},
        "port": 8080
    }
    config_path = tmp_path / "config_store.json"
    config_path.write_text(json.dumps(config))
    return str(tmp_path)

def test_simple_key_lookup(config_file):
    plugin = LookupModule()
    variables = {"playbook_dir": config_file}
    result = plugin.run(["app_name"], variables=variables)
    assert result == ["myapp"]

def test_nested_key_lookup(config_file):
    plugin = LookupModule()
    variables = {"playbook_dir": config_file}
    result = plugin.run(["nested.key"], variables=variables)
    assert result == ["value"]

def test_missing_key_returns_none(config_file):
    plugin = LookupModule()
    variables = {"playbook_dir": config_file}
    result = plugin.run(["nonexistent"], variables=variables)
    assert result == [None]
```

## Distributing Your Plugin in a Collection

If you want to share your lookup plugin with others, package it in an Ansible collection. The directory structure looks like this:

```
my_namespace/my_collection/
    galaxy.yml
    plugins/
        lookup/
            config_store.py
    README.md
```

After publishing the collection, users reference it with the fully qualified name:

```yaml
# Using a lookup plugin from a collection
- hosts: localhost
  tasks:
    - name: Fetch config value
      debug:
        msg: "{{ lookup('my_namespace.my_collection.config_store', 'database_host') }}"
```

## Debugging Tips

When developing lookup plugins, use the `Display` class to emit debug messages:

```python
from ansible.utils.display import Display
display = Display()

# Inside your run method
display.vvv("config_store: looking up key '{}'".format(term))
```

Run your playbook with `-vvv` to see these messages. This is much more reliable than using print statements, which can interfere with Ansible's output formatting.

## Summary

Custom lookup plugins let you extend Ansible's data retrieval capabilities without modifying core code. The key steps are: create a Python class inheriting from `LookupBase`, implement the `run` method to process terms and return a list of results, place the file in a recognized plugin directory, and handle errors gracefully. Once you have built a few, the pattern becomes second nature, and you will find yourself reaching for custom plugins anytime you need to bridge Ansible with an external data source.
