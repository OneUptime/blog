# How to Create a Filter Plugin for Custom Data Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Filter, Jinja2, Data Transformation

Description: Build Ansible filter plugins that transform data structures in your playbooks, from network calculations to config file generation.

---

Filter plugins are the workhorses of Ansible data manipulation. Every time you pipe a value through something like `| to_json` or `| regex_replace`, you are using a filter plugin. When the built-in filters do not cover your use case, writing a custom filter is one of the fastest ways to simplify your playbooks.

This guide builds several practical filter plugins covering real-world data transformation needs: network calculations, configuration generation, and structured data manipulation.

## Filter Plugin Basics

A filter plugin is a Python file that contains a `FilterModule` class with a `filters()` method. This method returns a dictionary mapping filter names to functions.

Create `filter_plugins/data_transforms.py`:

```python
# data_transforms.py - Custom data transformation filters
from ansible.errors import AnsibleFilterError


class FilterModule:
    """Custom filters for data transformation."""

    def filters(self):
        return {
            'to_ini': self.to_ini,
            'to_env_file': self.to_env_file,
            'deep_merge': self.deep_merge,
            'flatten_dict': self.flatten_dict,
            'group_by_key': self.group_by_key,
            'bytes_to_human': self.bytes_to_human,
            'human_to_bytes': self.human_to_bytes,
        }

    @staticmethod
    def to_ini(data, section='DEFAULT'):
        """Convert a dictionary to INI format string.

        Usage: {{ my_dict | to_ini('section_name') }}
        """
        if not isinstance(data, dict):
            raise AnsibleFilterError(
                "to_ini expects a dict, got %s" % type(data).__name__
            )

        lines = ['[%s]' % section]
        for key, value in sorted(data.items()):
            if isinstance(value, bool):
                value = str(value).lower()
            lines.append('%s = %s' % (key, value))
        return '\n'.join(lines) + '\n'

    @staticmethod
    def to_env_file(data):
        """Convert a dictionary to .env file format.

        Usage: {{ my_dict | to_env_file }}
        """
        if not isinstance(data, dict):
            raise AnsibleFilterError(
                "to_env_file expects a dict, got %s" % type(data).__name__
            )

        lines = []
        for key, value in sorted(data.items()):
            # Quote values that contain spaces or special characters
            str_value = str(value)
            if ' ' in str_value or '"' in str_value or "'" in str_value:
                str_value = '"%s"' % str_value.replace('"', '\\"')
            lines.append('%s=%s' % (key.upper(), str_value))
        return '\n'.join(lines) + '\n'

    @staticmethod
    def deep_merge(base, override):
        """Recursively merge two dictionaries.

        Usage: {{ base_config | deep_merge(override_config) }}
        """
        if not isinstance(base, dict) or not isinstance(override, dict):
            raise AnsibleFilterError("deep_merge requires two dicts")

        result = base.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = FilterModule.deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    @staticmethod
    def flatten_dict(data, prefix='', separator='.'):
        """Flatten a nested dictionary into dot-notation keys.

        Usage: {{ nested_dict | flatten_dict }}
        Output: {'server.host': 'localhost', 'server.port': 8080}
        """
        if not isinstance(data, dict):
            raise AnsibleFilterError(
                "flatten_dict expects a dict, got %s" % type(data).__name__
            )

        items = {}
        for key, value in data.items():
            new_key = '%s%s%s' % (prefix, separator, key) if prefix else key
            if isinstance(value, dict):
                items.update(
                    FilterModule.flatten_dict(value, new_key, separator)
                )
            else:
                items[new_key] = value
        return items

    @staticmethod
    def group_by_key(items, key):
        """Group a list of dicts by a specific key.

        Usage: {{ servers | group_by_key('datacenter') }}
        """
        if not isinstance(items, list):
            raise AnsibleFilterError(
                "group_by_key expects a list, got %s" % type(items).__name__
            )

        result = {}
        for item in items:
            if not isinstance(item, dict):
                raise AnsibleFilterError(
                    "group_by_key: each item must be a dict"
                )
            group_value = item.get(key, 'unknown')
            if group_value not in result:
                result[group_value] = []
            result[group_value].append(item)
        return result

    @staticmethod
    def bytes_to_human(size_bytes):
        """Convert bytes to human-readable format.

        Usage: {{ 1073741824 | bytes_to_human }}
        Output: '1.0 GB'
        """
        try:
            size_bytes = int(size_bytes)
        except (ValueError, TypeError):
            raise AnsibleFilterError(
                "bytes_to_human expects a number, got %s" % type(size_bytes).__name__
            )

        units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
        unit_index = 0
        size = float(size_bytes)

        while size >= 1024 and unit_index < len(units) - 1:
            size /= 1024
            unit_index += 1

        return '%.1f %s' % (size, units[unit_index])

    @staticmethod
    def human_to_bytes(size_string):
        """Convert human-readable size to bytes.

        Usage: {{ '2 GB' | human_to_bytes }}
        Output: 2147483648
        """
        if not isinstance(size_string, str):
            raise AnsibleFilterError(
                "human_to_bytes expects a string like '2 GB'"
            )

        units = {
            'b': 1, 'kb': 1024, 'mb': 1024**2,
            'gb': 1024**3, 'tb': 1024**4, 'pb': 1024**5,
        }

        size_string = size_string.strip().lower()
        for unit, multiplier in sorted(units.items(), key=lambda x: -len(x[0])):
            if size_string.endswith(unit):
                number = size_string[:-len(unit)].strip()
                try:
                    return int(float(number) * multiplier)
                except ValueError:
                    raise AnsibleFilterError(
                        "Cannot parse number from '%s'" % size_string
                    )

        raise AnsibleFilterError(
            "Unknown unit in '%s'. Use B, KB, MB, GB, TB, or PB." % size_string
        )
```

## Using the Filters in Playbooks

### Generating Configuration Files

```yaml
---
- name: Generate configuration files from variables
  hosts: app_servers
  vars:
    app_config:
      database_url: "postgresql://db.internal:5432/myapp"
      redis_url: "redis://cache.internal:6379/0"
      secret_key: "{{ vault_secret_key }}"
      debug: false
      workers: 4

    nginx_config:
      worker_processes: auto
      worker_connections: 1024
      keepalive_timeout: 65
      client_max_body_size: "10m"

  tasks:
    - name: Generate .env file for the application
      ansible.builtin.copy:
        content: "{{ app_config | to_env_file }}"
        dest: /opt/myapp/.env
        mode: '0600'

    - name: Generate INI config for nginx tuning
      ansible.builtin.copy:
        content: "{{ nginx_config | to_ini('performance') }}"
        dest: /etc/nginx/conf.d/tuning.ini
```

### Deep Merging Configuration

```yaml
  vars:
    default_config:
      server:
        host: "0.0.0.0"
        port: 8080
        workers: 2
      logging:
        level: "info"
        format: "json"
      cache:
        enabled: true
        ttl: 3600

    production_overrides:
      server:
        workers: 8
      logging:
        level: "warning"
      cache:
        ttl: 86400

  tasks:
    - name: Merge production config with defaults
      ansible.builtin.set_fact:
        final_config: "{{ default_config | deep_merge(production_overrides) }}"

    # Result:
    # server:
    #   host: "0.0.0.0"     (from default)
    #   port: 8080           (from default)
    #   workers: 8           (from override)
    # logging:
    #   level: "warning"     (from override)
    #   format: "json"       (from default)
    # cache:
    #   enabled: true        (from default)
    #   ttl: 86400           (from override)

    - name: Flatten for environment variables
      ansible.builtin.debug:
        msg: "{{ final_config | flatten_dict('APP') }}"
    # Output: {'APP.server.host': '0.0.0.0', 'APP.server.port': 8080, ...}
```

### Grouping Data

```yaml
  vars:
    servers:
      - name: web1
        datacenter: us-east
        role: web
      - name: web2
        datacenter: us-west
        role: web
      - name: db1
        datacenter: us-east
        role: database
      - name: db2
        datacenter: us-west
        role: database

  tasks:
    - name: Group servers by datacenter
      ansible.builtin.set_fact:
        by_dc: "{{ servers | group_by_key('datacenter') }}"

    - name: Show grouped servers
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ item.value | map(attribute='name') | list }}"
      loop: "{{ by_dc | dict2items }}"
    # Output:
    # us-east: [web1, db1]
    # us-west: [web2, db2]
```

### Size Conversions

```yaml
  tasks:
    - name: Display disk usage in human-readable format
      ansible.builtin.debug:
        msg: "Disk usage: {{ ansible_devices.sda.size | human_to_bytes | bytes_to_human }}"

    - name: Check if enough free memory
      ansible.builtin.assert:
        that:
          - ansible_memfree_mb * 1048576 > '1 GB' | human_to_bytes
        fail_msg: "Less than 1 GB free memory"
```

## Testing Your Filters

Write unit tests for each filter:

```python
# test_data_transforms.py
import pytest
from data_transforms import FilterModule

f = FilterModule()

def test_to_env_file():
    data = {'db_host': 'localhost', 'db_port': 5432}
    result = f.to_env_file(data)
    assert 'DB_HOST=localhost' in result
    assert 'DB_PORT=5432' in result

def test_deep_merge():
    base = {'a': {'b': 1, 'c': 2}}
    override = {'a': {'b': 10, 'd': 4}}
    result = f.deep_merge(base, override)
    assert result == {'a': {'b': 10, 'c': 2, 'd': 4}}

def test_flatten_dict():
    data = {'server': {'host': 'localhost', 'port': 8080}}
    result = f.flatten_dict(data)
    assert result == {'server.host': 'localhost', 'server.port': 8080}

def test_bytes_to_human():
    assert f.bytes_to_human(1073741824) == '1.0 GB'
    assert f.bytes_to_human(0) == '0.0 B'

def test_human_to_bytes():
    assert f.human_to_bytes('1 GB') == 1073741824
    assert f.human_to_bytes('512 MB') == 536870912
```

## Summary

Filter plugins transform data inline within your Jinja2 expressions. They keep playbooks clean by moving complex data manipulation into reusable Python functions. Start with the common patterns shown here (format conversion, deep merging, flattening, grouping, size conversion), and add more filters as your playbooks demand them. Each filter should do one thing well, handle edge cases with clear error messages, and be testable in isolation.
