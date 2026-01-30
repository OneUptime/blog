# How to Build Ansible Filter Plugins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Plugins, Automation, Python

Description: Create custom Ansible filter plugins for data transformation in templates and playbooks with Python filter functions.

---

Ansible filter plugins allow you to transform data within templates and playbooks. While Ansible ships with many built-in filters (from Jinja2 and its own library), you will eventually need custom transformations specific to your infrastructure. This guide walks through building filter plugins from scratch, with practical examples you can adapt for your own automation workflows.

## Understanding Filter Plugins

Filter plugins are Python functions that accept input, perform transformations, and return output. They integrate directly with Jinja2 templating, letting you chain operations with the pipe operator.

Here is a simple example of filter usage in a playbook:

```yaml
- name: Transform server names
  debug:
    msg: "{{ server_name | to_fqdn('example.com') }}"
```

The `to_fqdn` filter takes the variable `server_name` and appends a domain suffix. Let us build this filter and many more.

## Filter Plugin Directory Structure

Ansible looks for filter plugins in several locations. For development, place filters in a `filter_plugins` directory alongside your playbook.

```
project/
├── ansible.cfg
├── playbook.yml
├── filter_plugins/
│   ├── __init__.py
│   ├── network_filters.py
│   └── string_filters.py
└── roles/
    └── webserver/
        └── filter_plugins/
            └── webserver_filters.py
```

You can also configure custom paths in `ansible.cfg`:

```ini
[defaults]
filter_plugins = ./filter_plugins:/usr/share/ansible/plugins/filter
```

## Basic Filter Plugin Structure

Every filter plugin module must contain a `FilterModule` class with a `filters` method. This method returns a dictionary mapping filter names to Python functions.

Here is the minimal template for a filter plugin file:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Custom Ansible filter plugins for network operations.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type


class FilterModule(object):
    """Ansible filter plugin class."""

    def filters(self):
        """Return a dictionary of filters."""
        return {
            'filter_name': self.filter_function,
        }

    def filter_function(self, value):
        """Transform the input value."""
        return value
```

The `__future__` imports ensure Python 2/3 compatibility. While Python 2 support is deprecated, many production environments still run older Ansible versions.

## Building Your First Filter

Let us create a practical filter that converts hostnames to fully qualified domain names.

Create the file `filter_plugins/network_filters.py`:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Network-related filter plugins for hostname and IP manipulation.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type


class FilterModule(object):
    """Network filter plugins."""

    def filters(self):
        """Export filter functions."""
        return {
            'to_fqdn': self.to_fqdn,
            'strip_domain': self.strip_domain,
            'is_private_ip': self.is_private_ip,
        }

    def to_fqdn(self, hostname, domain):
        """
        Convert a hostname to a fully qualified domain name.

        Args:
            hostname: The short hostname (e.g., 'webserver01')
            domain: The domain suffix (e.g., 'prod.example.com')

        Returns:
            The FQDN with domain appended
        """
        # Remove any trailing dots from hostname
        hostname = hostname.rstrip('.')
        # Remove any leading dots from domain
        domain = domain.lstrip('.')

        # Check if hostname already contains the domain
        if hostname.endswith(domain):
            return hostname

        return f"{hostname}.{domain}"

    def strip_domain(self, fqdn):
        """
        Extract the hostname from an FQDN.

        Args:
            fqdn: The fully qualified domain name

        Returns:
            The hostname portion only
        """
        if '.' in fqdn:
            return fqdn.split('.')[0]
        return fqdn

    def is_private_ip(self, ip_address):
        """
        Check if an IP address is in a private range.

        Args:
            ip_address: IPv4 address as string

        Returns:
            Boolean indicating if the IP is private
        """
        import ipaddress
        try:
            ip = ipaddress.ip_address(ip_address)
            return ip.is_private
        except ValueError:
            return False
```

Use these filters in your playbook:

```yaml
---
- name: Demonstrate network filters
  hosts: localhost
  gather_facts: false
  vars:
    short_name: "webserver01"
    full_name: "database.prod.example.com"
    test_ips:
      - "192.168.1.100"
      - "10.0.0.50"
      - "8.8.8.8"
      - "172.16.0.1"

  tasks:
    - name: Convert to FQDN
      debug:
        msg: "{{ short_name | to_fqdn('prod.example.com') }}"

    - name: Extract hostname
      debug:
        msg: "{{ full_name | strip_domain }}"

    - name: Check private IPs
      debug:
        msg: "{{ item }} is private: {{ item | is_private_ip }}"
      loop: "{{ test_ips }}"
```

## Filters with Multiple Arguments

Filters can accept multiple arguments in two ways: positional arguments and keyword arguments.

Here is a filter that formats disk sizes with various options:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Storage and size formatting filter plugins.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type


class FilterModule(object):
    """Storage formatting filters."""

    def filters(self):
        return {
            'format_bytes': self.format_bytes,
            'to_bytes': self.to_bytes,
            'disk_usage_bar': self.disk_usage_bar,
        }

    def format_bytes(self, size_bytes, unit='auto', precision=2):
        """
        Format byte size into human readable format.

        Args:
            size_bytes: Size in bytes (integer)
            unit: Target unit (auto, KB, MB, GB, TB) or 'auto' for automatic
            precision: Decimal places to show

        Returns:
            Formatted string with unit
        """
        units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
        size = float(size_bytes)

        if unit == 'auto':
            # Find the best unit automatically
            unit_index = 0
            while size >= 1024 and unit_index < len(units) - 1:
                size /= 1024
                unit_index += 1
            return f"{size:.{precision}f} {units[unit_index]}"
        else:
            # Convert to specified unit
            unit_upper = unit.upper()
            if unit_upper not in units:
                return f"{size_bytes} B"

            target_index = units.index(unit_upper)
            size = size_bytes / (1024 ** target_index)
            return f"{size:.{precision}f} {unit_upper}"

    def to_bytes(self, size_string):
        """
        Convert human readable size to bytes.

        Args:
            size_string: Size with unit (e.g., '10GB', '500 MB')

        Returns:
            Integer size in bytes
        """
        import re

        units = {
            'B': 1,
            'KB': 1024,
            'MB': 1024 ** 2,
            'GB': 1024 ** 3,
            'TB': 1024 ** 4,
            'PB': 1024 ** 5,
        }

        # Parse the size string
        match = re.match(r'^([\d.]+)\s*([A-Za-z]+)$', str(size_string).strip())
        if not match:
            raise ValueError(f"Invalid size format: {size_string}")

        value = float(match.group(1))
        unit = match.group(2).upper()

        if unit not in units:
            raise ValueError(f"Unknown unit: {unit}")

        return int(value * units[unit])

    def disk_usage_bar(self, used_percent, width=20, filled='#', empty='-'):
        """
        Create an ASCII progress bar for disk usage.

        Args:
            used_percent: Percentage used (0-100)
            width: Total width of the bar
            filled: Character for filled portion
            empty: Character for empty portion

        Returns:
            ASCII progress bar string
        """
        percent = min(100, max(0, float(used_percent)))
        filled_width = int(width * percent / 100)
        empty_width = width - filled_width

        bar = filled * filled_width + empty * empty_width
        return f"[{bar}] {percent:.1f}%"
```

Usage in playbooks with different argument styles:

```yaml
---
- name: Storage filter examples
  hosts: localhost
  gather_facts: false
  vars:
    disk_size: 5368709120  # 5 GB in bytes
    human_size: "2.5 TB"
    usage_percent: 73.5

  tasks:
    # Positional argument
    - name: Format with specific unit
      debug:
        msg: "{{ disk_size | format_bytes('GB') }}"

    # Keyword arguments
    - name: Format with options
      debug:
        msg: "{{ disk_size | format_bytes(unit='MB', precision=1) }}"

    # Auto detection
    - name: Auto format
      debug:
        msg: "{{ disk_size | format_bytes }}"

    # Convert back to bytes
    - name: Parse human size
      debug:
        msg: "{{ human_size | to_bytes }} bytes"

    # Usage bar with custom characters
    - name: Show disk usage
      debug:
        msg: "{{ usage_percent | disk_usage_bar(width=30, filled='=', empty=' ') }}"
```

## Error Handling in Filters

Robust filters handle errors gracefully. Ansible provides the `AnsibleFilterError` exception for reporting filter failures.

Here is a filter module with comprehensive error handling:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
JSON and data structure manipulation filters with error handling.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import json
import re

# Import Ansible's error class for proper error reporting
try:
    from ansible.errors import AnsibleFilterError
except ImportError:
    # Fallback for testing outside Ansible
    class AnsibleFilterError(Exception):
        pass


class FilterModule(object):
    """Data manipulation filters."""

    def filters(self):
        return {
            'json_query_safe': self.json_query_safe,
            'extract_field': self.extract_field,
            'validate_schema': self.validate_schema,
            'merge_configs': self.merge_configs,
        }

    def json_query_safe(self, data, query, default=None):
        """
        Safely query nested JSON data with a default fallback.

        Args:
            data: Dictionary or list to query
            query: Dot-notation path (e.g., 'servers.web.port')
            default: Value to return if path not found

        Returns:
            Value at path or default
        """
        if not isinstance(data, (dict, list)):
            raise AnsibleFilterError(
                f"json_query_safe requires dict or list, got {type(data).__name__}"
            )

        try:
            result = data
            for key in query.split('.'):
                # Handle list indexing with bracket notation
                if '[' in key:
                    match = re.match(r'(\w+)\[(\d+)\]', key)
                    if match:
                        result = result[match.group(1)][int(match.group(2))]
                    else:
                        raise KeyError(key)
                else:
                    if isinstance(result, dict):
                        result = result[key]
                    elif isinstance(result, list):
                        result = result[int(key)]
                    else:
                        raise KeyError(key)
            return result
        except (KeyError, IndexError, TypeError, ValueError):
            return default

    def extract_field(self, items, field, unique=False):
        """
        Extract a specific field from a list of dictionaries.

        Args:
            items: List of dictionaries
            field: Field name to extract
            unique: If True, return only unique values

        Returns:
            List of extracted values
        """
        if not isinstance(items, list):
            raise AnsibleFilterError(
                f"extract_field expects a list, got {type(items).__name__}"
            )

        result = []
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                raise AnsibleFilterError(
                    f"Item at index {idx} is not a dictionary"
                )
            if field not in item:
                raise AnsibleFilterError(
                    f"Field '{field}' not found in item at index {idx}"
                )
            result.append(item[field])

        if unique:
            # Preserve order while removing duplicates
            seen = set()
            result = [x for x in result if not (x in seen or seen.add(x))]

        return result

    def validate_schema(self, data, schema):
        """
        Validate data against a simple schema definition.

        Args:
            data: Dictionary to validate
            schema: Dictionary defining required fields and types

        Returns:
            Dictionary with 'valid' boolean and 'errors' list
        """
        errors = []

        if not isinstance(data, dict):
            return {'valid': False, 'errors': ['Input must be a dictionary']}

        type_map = {
            'string': str,
            'str': str,
            'integer': int,
            'int': int,
            'float': float,
            'number': (int, float),
            'boolean': bool,
            'bool': bool,
            'list': list,
            'array': list,
            'dict': dict,
            'object': dict,
        }

        for field, expected_type in schema.items():
            if field not in data:
                errors.append(f"Missing required field: {field}")
            elif expected_type in type_map:
                if not isinstance(data[field], type_map[expected_type]):
                    errors.append(
                        f"Field '{field}' should be {expected_type}, "
                        f"got {type(data[field]).__name__}"
                    )

        return {'valid': len(errors) == 0, 'errors': errors}

    def merge_configs(self, base, overlay, deep=True):
        """
        Merge two configuration dictionaries.

        Args:
            base: Base configuration dictionary
            overlay: Configuration to merge on top
            deep: If True, recursively merge nested dicts

        Returns:
            Merged configuration dictionary
        """
        if not isinstance(base, dict) or not isinstance(overlay, dict):
            raise AnsibleFilterError(
                "merge_configs requires two dictionary arguments"
            )

        result = base.copy()

        for key, value in overlay.items():
            if deep and key in result:
                if isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = self.merge_configs(result[key], value, deep)
                else:
                    result[key] = value
            else:
                result[key] = value

        return result
```

Example playbook demonstrating error handling:

```yaml
---
- name: Data manipulation examples
  hosts: localhost
  gather_facts: false
  vars:
    config:
      servers:
        web:
          port: 8080
          workers: 4
        database:
          port: 5432

    servers_list:
      - name: web01
        ip: 10.0.0.1
        role: frontend
      - name: web02
        ip: 10.0.0.2
        role: frontend
      - name: db01
        ip: 10.0.0.10
        role: database

    user_input:
      username: "admin"
      email: "admin@example.com"
      age: 30

    user_schema:
      username: string
      email: string
      age: integer

  tasks:
    - name: Safe nested query with default
      debug:
        msg: "{{ config | json_query_safe('servers.cache.port', 6379) }}"

    - name: Extract all server names
      debug:
        msg: "{{ servers_list | extract_field('name') }}"

    - name: Get unique roles
      debug:
        msg: "{{ servers_list | extract_field('role', unique=True) }}"

    - name: Validate user input
      debug:
        msg: "{{ user_input | validate_schema(user_schema) }}"

    - name: Merge configurations
      debug:
        msg: "{{ config | merge_configs({'servers': {'web': {'workers': 8}}}) }}"
```

## Working with Complex Data Types

Filters often need to handle Ansible-specific data types. Here are filters for working with inventory and host data.

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Inventory and host data manipulation filters.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import re
from collections import defaultdict

try:
    from ansible.errors import AnsibleFilterError
except ImportError:
    class AnsibleFilterError(Exception):
        pass


class FilterModule(object):
    """Inventory manipulation filters."""

    def filters(self):
        return {
            'group_by_attr': self.group_by_attr,
            'sort_by_attr': self.sort_by_attr,
            'filter_by_attr': self.filter_by_attr,
            'host_pattern_match': self.host_pattern_match,
            'generate_inventory_entry': self.generate_inventory_entry,
        }

    def group_by_attr(self, items, attribute):
        """
        Group a list of dictionaries by an attribute value.

        Args:
            items: List of dictionaries
            attribute: Key to group by

        Returns:
            Dictionary with attribute values as keys
        """
        result = defaultdict(list)

        for item in items:
            if not isinstance(item, dict):
                continue
            key = item.get(attribute, 'undefined')
            result[key].append(item)

        return dict(result)

    def sort_by_attr(self, items, attribute, reverse=False):
        """
        Sort a list of dictionaries by an attribute.

        Args:
            items: List of dictionaries
            attribute: Key to sort by
            reverse: Sort descending if True

        Returns:
            Sorted list
        """
        def get_sort_key(item):
            if isinstance(item, dict):
                return item.get(attribute, '')
            return ''

        return sorted(items, key=get_sort_key, reverse=reverse)

    def filter_by_attr(self, items, attribute, value, operator='eq'):
        """
        Filter a list of dictionaries by attribute value.

        Args:
            items: List of dictionaries
            attribute: Key to filter on
            value: Value to compare against
            operator: Comparison operator (eq, ne, gt, lt, ge, le, contains, regex)

        Returns:
            Filtered list
        """
        operators = {
            'eq': lambda a, b: a == b,
            'ne': lambda a, b: a != b,
            'gt': lambda a, b: a > b,
            'lt': lambda a, b: a < b,
            'ge': lambda a, b: a >= b,
            'le': lambda a, b: a <= b,
            'contains': lambda a, b: b in str(a),
            'regex': lambda a, b: bool(re.search(b, str(a))),
        }

        if operator not in operators:
            raise AnsibleFilterError(f"Unknown operator: {operator}")

        compare = operators[operator]
        result = []

        for item in items:
            if isinstance(item, dict) and attribute in item:
                try:
                    if compare(item[attribute], value):
                        result.append(item)
                except (TypeError, ValueError):
                    continue

        return result

    def host_pattern_match(self, hostname, patterns):
        """
        Check if a hostname matches any of the given patterns.

        Args:
            hostname: Hostname to check
            patterns: List of patterns (supports * and ? wildcards)

        Returns:
            Boolean indicating if any pattern matches
        """
        import fnmatch

        if isinstance(patterns, str):
            patterns = [patterns]

        for pattern in patterns:
            if fnmatch.fnmatch(hostname, pattern):
                return True
        return False

    def generate_inventory_entry(self, host_data, format='ini'):
        """
        Generate an inventory entry from host data.

        Args:
            host_data: Dictionary with host information
            format: Output format (ini or yaml)

        Returns:
            Formatted inventory entry string
        """
        hostname = host_data.get('hostname', host_data.get('name', 'unknown'))
        ansible_host = host_data.get('ip', host_data.get('ansible_host', ''))

        # Build variables list
        vars_list = []
        skip_keys = {'hostname', 'name', 'ip'}

        for key, value in host_data.items():
            if key not in skip_keys:
                if key.startswith('ansible_'):
                    vars_list.append((key, value))
                else:
                    vars_list.append((f"host_{key}", value))

        if ansible_host:
            vars_list.insert(0, ('ansible_host', ansible_host))

        if format == 'ini':
            vars_str = ' '.join(f"{k}={v}" for k, v in vars_list)
            return f"{hostname} {vars_str}".strip()
        elif format == 'yaml':
            lines = [f"  {hostname}:"]
            for key, value in vars_list:
                lines.append(f"    {key}: {value}")
            return '\n'.join(lines)
        else:
            raise AnsibleFilterError(f"Unknown format: {format}")
```

## Testing Filter Plugins

Testing filters outside of Ansible helps catch bugs early. Here is a test file using pytest.

Create `tests/test_filters.py`:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Unit tests for custom Ansible filter plugins.
"""

import pytest
import sys
import os

# Add filter_plugins directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'filter_plugins'))

from network_filters import FilterModule as NetworkFilters
from storage_filters import FilterModule as StorageFilters
from data_filters import FilterModule as DataFilters


class TestNetworkFilters:
    """Test network filter functions."""

    def setup_method(self):
        """Initialize filter module."""
        self.filters = NetworkFilters()

    def test_to_fqdn_basic(self):
        """Test basic FQDN conversion."""
        result = self.filters.to_fqdn('webserver01', 'example.com')
        assert result == 'webserver01.example.com'

    def test_to_fqdn_already_qualified(self):
        """Test FQDN that already has domain."""
        result = self.filters.to_fqdn('web.example.com', 'example.com')
        assert result == 'web.example.com'

    def test_to_fqdn_trailing_dot(self):
        """Test hostname with trailing dot."""
        result = self.filters.to_fqdn('server.', 'example.com')
        assert result == 'server.example.com'

    def test_strip_domain(self):
        """Test domain stripping."""
        result = self.filters.strip_domain('web01.prod.example.com')
        assert result == 'web01'

    def test_strip_domain_no_domain(self):
        """Test stripping when no domain present."""
        result = self.filters.strip_domain('localhost')
        assert result == 'localhost'

    def test_is_private_ip_true(self):
        """Test private IP detection."""
        assert self.filters.is_private_ip('192.168.1.1') is True
        assert self.filters.is_private_ip('10.0.0.1') is True
        assert self.filters.is_private_ip('172.16.0.1') is True

    def test_is_private_ip_false(self):
        """Test public IP detection."""
        assert self.filters.is_private_ip('8.8.8.8') is False
        assert self.filters.is_private_ip('1.1.1.1') is False

    def test_is_private_ip_invalid(self):
        """Test invalid IP handling."""
        assert self.filters.is_private_ip('not-an-ip') is False


class TestStorageFilters:
    """Test storage filter functions."""

    def setup_method(self):
        self.filters = StorageFilters()

    def test_format_bytes_auto(self):
        """Test automatic unit selection."""
        assert self.filters.format_bytes(1024) == '1.00 KB'
        assert self.filters.format_bytes(1048576) == '1.00 MB'
        assert self.filters.format_bytes(1073741824) == '1.00 GB'

    def test_format_bytes_specific_unit(self):
        """Test specific unit conversion."""
        result = self.filters.format_bytes(5368709120, 'GB')
        assert result == '5.00 GB'

    def test_format_bytes_precision(self):
        """Test precision parameter."""
        result = self.filters.format_bytes(1536, 'KB', precision=1)
        assert result == '1.5 KB'

    def test_to_bytes(self):
        """Test human size to bytes conversion."""
        assert self.filters.to_bytes('1 KB') == 1024
        assert self.filters.to_bytes('1MB') == 1048576
        assert self.filters.to_bytes('2.5 GB') == 2684354560

    def test_to_bytes_invalid(self):
        """Test invalid input handling."""
        with pytest.raises(ValueError):
            self.filters.to_bytes('invalid')

    def test_disk_usage_bar(self):
        """Test progress bar generation."""
        result = self.filters.disk_usage_bar(50, width=10)
        assert result == '[#####-----] 50.0%'


class TestDataFilters:
    """Test data manipulation filters."""

    def setup_method(self):
        self.filters = DataFilters()

    def test_json_query_safe_found(self):
        """Test successful nested query."""
        data = {'a': {'b': {'c': 'value'}}}
        result = self.filters.json_query_safe(data, 'a.b.c')
        assert result == 'value'

    def test_json_query_safe_not_found(self):
        """Test query with default fallback."""
        data = {'a': {'b': 'value'}}
        result = self.filters.json_query_safe(data, 'a.x.y', 'default')
        assert result == 'default'

    def test_extract_field(self):
        """Test field extraction from list."""
        items = [{'name': 'a'}, {'name': 'b'}, {'name': 'c'}]
        result = self.filters.extract_field(items, 'name')
        assert result == ['a', 'b', 'c']

    def test_extract_field_unique(self):
        """Test unique field extraction."""
        items = [{'role': 'web'}, {'role': 'db'}, {'role': 'web'}]
        result = self.filters.extract_field(items, 'role', unique=True)
        assert result == ['web', 'db']

    def test_validate_schema_valid(self):
        """Test valid schema validation."""
        data = {'name': 'test', 'count': 5}
        schema = {'name': 'string', 'count': 'integer'}
        result = self.filters.validate_schema(data, schema)
        assert result['valid'] is True
        assert result['errors'] == []

    def test_validate_schema_invalid(self):
        """Test invalid schema validation."""
        data = {'name': 'test'}
        schema = {'name': 'string', 'count': 'integer'}
        result = self.filters.validate_schema(data, schema)
        assert result['valid'] is False
        assert 'Missing required field: count' in result['errors']

    def test_merge_configs_shallow(self):
        """Test shallow config merge."""
        base = {'a': 1, 'b': 2}
        overlay = {'b': 3, 'c': 4}
        result = self.filters.merge_configs(base, overlay, deep=False)
        assert result == {'a': 1, 'b': 3, 'c': 4}

    def test_merge_configs_deep(self):
        """Test deep config merge."""
        base = {'server': {'port': 80, 'host': 'localhost'}}
        overlay = {'server': {'port': 8080}}
        result = self.filters.merge_configs(base, overlay, deep=True)
        assert result == {'server': {'port': 8080, 'host': 'localhost'}}


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

Run tests with:

```bash
# Run all tests
pytest tests/test_filters.py -v

# Run with coverage
pytest tests/test_filters.py --cov=filter_plugins --cov-report=html

# Run specific test class
pytest tests/test_filters.py::TestNetworkFilters -v
```

## Distributing Filters in Collections

For reusable filters, package them in an Ansible collection. Here is the directory structure:

```
ansible_collections/
└── mycompany/
    └── infrastructure/
        ├── galaxy.yml
        ├── plugins/
        │   └── filter/
        │       ├── network.py
        │       ├── storage.py
        │       └── data.py
        ├── tests/
        │   └── unit/
        │       └── plugins/
        │           └── filter/
        │               └── test_network.py
        └── docs/
            └── filter_plugins.md
```

The `galaxy.yml` file defines collection metadata:

```yaml
namespace: mycompany
name: infrastructure
version: 1.0.0
readme: README.md
authors:
  - Your Name <your.email@example.com>
description: Infrastructure automation filters and modules
license:
  - GPL-3.0-or-later
tags:
  - infrastructure
  - networking
  - storage
repository: https://github.com/mycompany/ansible-infrastructure
documentation: https://github.com/mycompany/ansible-infrastructure/docs
```

Build and publish the collection:

```bash
# Build the collection tarball
ansible-galaxy collection build

# Install locally for testing
ansible-galaxy collection install mycompany-infrastructure-1.0.0.tar.gz

# Publish to Ansible Galaxy
ansible-galaxy collection publish mycompany-infrastructure-1.0.0.tar.gz --api-key=YOUR_KEY
```

Use collection filters in playbooks:

```yaml
---
- name: Use collection filters
  hosts: all
  collections:
    - mycompany.infrastructure

  tasks:
    - name: Use filter from collection
      debug:
        msg: "{{ hostname | to_fqdn('example.com') }}"
```

Or reference filters with the fully qualified name:

```yaml
- name: Fully qualified filter name
  debug:
    msg: "{{ hostname | mycompany.infrastructure.to_fqdn('example.com') }}"
```

## Filter Comparison Table

Here is a comparison of built-in vs custom filter use cases:

| Use Case | Built-in Filter | Custom Filter Needed |
|----------|-----------------|----------------------|
| String manipulation | `upper`, `lower`, `replace` | Domain-specific formatting |
| List operations | `map`, `select`, `reject` | Complex business logic |
| Math operations | `int`, `float`, `round` | Custom calculations |
| JSON queries | `json_query` | Safe queries with defaults |
| Type conversion | `bool`, `string` | Custom type parsing |
| Path manipulation | `basename`, `dirname` | Infrastructure-specific paths |
| Data validation | None | Schema validation |
| Config merging | `combine` | Deep merge with rules |

## Performance Considerations

When writing filters, keep these performance tips in mind:

| Approach | Performance Impact | Recommendation |
|----------|-------------------|----------------|
| Import at module level | Faster execution | Do for standard library |
| Import inside function | Slower, but lazy loading | Do for heavy libraries |
| Compile regex once | Much faster for repeated use | Store as class attribute |
| Return generators | Lower memory usage | Use for large datasets |
| Cache computed values | Faster repeated calls | Use `functools.lru_cache` |

Example of optimized filter with caching:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Performance-optimized filter plugins.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import re
from functools import lru_cache


class FilterModule(object):
    """Optimized filters."""

    # Compile regex patterns once at class level
    IP_PATTERN = re.compile(
        r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}'
        r'(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    )

    HOSTNAME_PATTERN = re.compile(
        r'^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$'
    )

    def filters(self):
        return {
            'is_valid_ip': self.is_valid_ip,
            'is_valid_hostname': self.is_valid_hostname,
            'parse_config_line': self.parse_config_line,
        }

    def is_valid_ip(self, value):
        """Validate IP address format using compiled regex."""
        return bool(self.IP_PATTERN.match(str(value)))

    def is_valid_hostname(self, value):
        """Validate hostname format using compiled regex."""
        return bool(self.HOSTNAME_PATTERN.match(str(value)))

    @staticmethod
    @lru_cache(maxsize=1024)
    def parse_config_line(line):
        """
        Parse a configuration line with caching.

        Caching improves performance when the same lines
        are parsed multiple times.
        """
        line = line.strip()
        if not line or line.startswith('#'):
            return None

        if '=' in line:
            key, value = line.split('=', 1)
            return {'key': key.strip(), 'value': value.strip()}

        return {'key': line, 'value': None}
```

## Common Patterns and Recipes

Here are filters that solve common automation challenges:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Common pattern filters for infrastructure automation.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import hashlib
import base64
import json
from datetime import datetime


class FilterModule(object):
    """Common automation pattern filters."""

    def filters(self):
        return {
            'to_safe_name': self.to_safe_name,
            'checksum': self.checksum,
            'timestamp': self.timestamp,
            'env_format': self.env_format,
            'docker_labels': self.docker_labels,
            'terraform_tags': self.terraform_tags,
            'k8s_labels': self.k8s_labels,
        }

    def to_safe_name(self, value, max_length=63, separator='-'):
        """
        Convert a string to a safe resource name.

        Follows DNS label standards (lowercase, alphanumeric, hyphens).
        """
        import re

        # Convert to lowercase and replace spaces/underscores
        safe = str(value).lower()
        safe = re.sub(r'[_\s]+', separator, safe)

        # Remove invalid characters
        safe = re.sub(r'[^a-z0-9-]', '', safe)

        # Remove leading/trailing hyphens
        safe = safe.strip('-')

        # Collapse multiple hyphens
        safe = re.sub(r'-+', '-', safe)

        # Truncate to max length
        if len(safe) > max_length:
            safe = safe[:max_length].rstrip('-')

        return safe

    def checksum(self, value, algorithm='sha256', length=None):
        """
        Generate a checksum of the input value.

        Useful for generating consistent identifiers from data.
        """
        if isinstance(value, dict) or isinstance(value, list):
            value = json.dumps(value, sort_keys=True)

        data = str(value).encode('utf-8')

        if algorithm == 'md5':
            hash_obj = hashlib.md5(data)
        elif algorithm == 'sha1':
            hash_obj = hashlib.sha1(data)
        elif algorithm == 'sha256':
            hash_obj = hashlib.sha256(data)
        else:
            hash_obj = hashlib.sha256(data)

        result = hash_obj.hexdigest()

        if length:
            result = result[:length]

        return result

    def timestamp(self, value=None, format='%Y%m%d%H%M%S'):
        """
        Generate or format a timestamp.

        If value is None, returns current timestamp.
        """
        if value is None:
            dt = datetime.utcnow()
        elif isinstance(value, str):
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        else:
            dt = value

        return dt.strftime(format)

    def env_format(self, variables, prefix='', export=False):
        """
        Format a dictionary as environment variable declarations.
        """
        lines = []
        for key, value in sorted(variables.items()):
            env_key = f"{prefix}{key}".upper().replace('-', '_')

            # Quote values with spaces
            if ' ' in str(value):
                env_value = f'"{value}"'
            else:
                env_value = str(value)

            if export:
                lines.append(f"export {env_key}={env_value}")
            else:
                lines.append(f"{env_key}={env_value}")

        return '\n'.join(lines)

    def docker_labels(self, metadata):
        """
        Format metadata as Docker label arguments.
        """
        labels = []
        for key, value in metadata.items():
            # Docker labels use dots for namespacing
            label_key = key.replace('_', '.')
            labels.append(f"--label {label_key}={value}")

        return ' '.join(labels)

    def terraform_tags(self, tags):
        """
        Format tags for Terraform HCL syntax.
        """
        lines = ['tags = {']
        for key, value in sorted(tags.items()):
            lines.append(f'    {key} = "{value}"')
        lines.append('  }')

        return '\n  '.join(lines)

    def k8s_labels(self, labels, indent=4):
        """
        Format labels for Kubernetes YAML manifests.
        """
        spaces = ' ' * indent
        lines = []
        for key, value in sorted(labels.items()):
            # Kubernetes labels follow DNS subdomain rules
            safe_key = key.replace('_', '-').lower()
            lines.append(f"{spaces}{safe_key}: \"{value}\"")

        return '\n'.join(lines)
```

Usage examples for these utility filters:

```yaml
---
- name: Utility filter examples
  hosts: localhost
  gather_facts: false
  vars:
    app_name: "My Application Service"
    config:
      database_host: "db.example.com"
      database_port: 5432
      debug_mode: "true"

    resource_tags:
      Environment: production
      Team: platform
      CostCenter: eng-123

  tasks:
    - name: Generate safe resource name
      debug:
        msg: "{{ app_name | to_safe_name }}"
      # Output: my-application-service

    - name: Generate config checksum
      debug:
        msg: "{{ config | checksum(length=8) }}"
      # Output: 8 character hash

    - name: Current timestamp
      debug:
        msg: "{{ None | timestamp('%Y-%m-%d') }}"

    - name: Format as environment variables
      debug:
        msg: "{{ config | env_format(prefix='APP_', export=True) }}"

    - name: Terraform tags block
      debug:
        msg: "{{ resource_tags | terraform_tags }}"

    - name: Kubernetes labels
      debug:
        msg: "{{ resource_tags | k8s_labels(indent=8) }}"
```

## Debugging Filter Plugins

When filters do not work as expected, use these debugging techniques:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Filter with debugging support.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import os
import sys


class FilterModule(object):
    """Filters with debugging."""

    def __init__(self):
        # Enable debug mode via environment variable
        self.debug = os.environ.get('ANSIBLE_FILTER_DEBUG', '').lower() == 'true'

    def filters(self):
        return {
            'debug_filter': self.debug_filter,
        }

    def _log(self, message):
        """Write debug messages to stderr."""
        if self.debug:
            sys.stderr.write(f"[FILTER DEBUG] {message}\n")

    def debug_filter(self, value, operation='identity'):
        """
        Filter with built-in debugging.

        Set ANSIBLE_FILTER_DEBUG=true to enable debug output.
        """
        self._log(f"Input value: {value} (type: {type(value).__name__})")
        self._log(f"Operation: {operation}")

        # Perform operation
        if operation == 'identity':
            result = value
        elif operation == 'upper':
            result = str(value).upper()
        elif operation == 'length':
            result = len(value)
        else:
            result = value

        self._log(f"Output value: {result} (type: {type(result).__name__})")

        return result
```

Run playbook with debugging enabled:

```bash
ANSIBLE_FILTER_DEBUG=true ansible-playbook playbook.yml
```

## Summary

Building Ansible filter plugins requires understanding a few key concepts:

1. Every filter module needs a `FilterModule` class with a `filters()` method
2. The `filters()` method returns a dictionary mapping names to functions
3. Filter functions receive the piped value as the first argument
4. Additional arguments come from the filter call in Jinja2
5. Use `AnsibleFilterError` for meaningful error messages
6. Test filters with pytest before deploying
7. Package filters in collections for distribution

Filters transform your playbooks from simple task runners into powerful data processing pipelines. Start with the examples in this guide, then build filters specific to your infrastructure needs.
