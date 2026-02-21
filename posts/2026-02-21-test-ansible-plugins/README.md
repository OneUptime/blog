# How to Test Ansible Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Testing, Python, CI/CD

Description: A practical guide to testing Ansible plugins with unit tests, integration tests, and ansible-test for reliable plugin development.

---

Testing Ansible plugins is essential but often overlooked. Unlike roles and playbooks where Molecule is the standard testing tool, plugins need Python-level unit tests and Ansible-level integration tests. This guide covers both approaches, plus how to use `ansible-test` for comprehensive validation.

## Testing Strategy

A solid plugin testing strategy involves three layers:

1. **Unit tests** - Test Python functions in isolation
2. **Integration tests** - Test the plugin running inside Ansible
3. **Sanity tests** - Validate code style, documentation, and compatibility

Let us work through each layer with practical examples.

## Project Structure for Tests

If your plugins are in a collection, follow this layout:

```
collections/ansible_collections/myorg/myutils/
  plugins/
    filter/
      network_utils.py
    lookup/
      api_lookup.py
  tests/
    unit/
      plugins/
        filter/
          test_network_utils.py
        lookup/
          test_api_lookup.py
    integration/
      targets/
        test_network_filters/
          tasks/
            main.yml
        test_api_lookup/
          tasks/
            main.yml
```

## Unit Testing Filter Plugins

Filter plugins are the easiest to unit test because they are pure functions. Here is a filter plugin and its tests.

The filter plugin:

```python
# plugins/filter/network_utils.py
import ipaddress
import re


class FilterModule:
    def filters(self):
        return {
            'cidr_to_netmask': self.cidr_to_netmask,
            'ip_in_network': self.ip_in_network,
            'sort_ips': self.sort_ips,
        }

    @staticmethod
    def cidr_to_netmask(prefix_length):
        """Convert a CIDR prefix length to a dotted-decimal netmask."""
        if not isinstance(prefix_length, int) or prefix_length < 0 or prefix_length > 32:
            raise ValueError("Invalid prefix length: %s" % prefix_length)
        bits = '1' * prefix_length + '0' * (32 - prefix_length)
        return '%d.%d.%d.%d' % (
            int(bits[0:8], 2),
            int(bits[8:16], 2),
            int(bits[16:24], 2),
            int(bits[24:32], 2),
        )

    @staticmethod
    def ip_in_network(ip_addr, network):
        """Check if an IP address belongs to a network."""
        return ipaddress.ip_address(ip_addr) in ipaddress.ip_network(network, strict=False)

    @staticmethod
    def sort_ips(ip_list):
        """Sort a list of IP addresses numerically."""
        return sorted(ip_list, key=lambda ip: ipaddress.ip_address(ip))
```

The unit tests:

```python
# tests/unit/plugins/filter/test_network_utils.py
import pytest
import sys
import os

# Add the plugins directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'plugins', 'filter'))

from network_utils import FilterModule


class TestCidrToNetmask:
    """Tests for the cidr_to_netmask filter."""

    def setup_method(self):
        self.f = FilterModule()

    def test_class_24(self):
        assert self.f.cidr_to_netmask(24) == '255.255.255.0'

    def test_class_16(self):
        assert self.f.cidr_to_netmask(16) == '255.255.0.0'

    def test_class_8(self):
        assert self.f.cidr_to_netmask(8) == '255.0.0.0'

    def test_host_mask(self):
        assert self.f.cidr_to_netmask(32) == '255.255.255.255'

    def test_zero_mask(self):
        assert self.f.cidr_to_netmask(0) == '0.0.0.0'

    def test_odd_prefix(self):
        assert self.f.cidr_to_netmask(25) == '255.255.255.128'

    def test_invalid_negative(self):
        with pytest.raises(ValueError):
            self.f.cidr_to_netmask(-1)

    def test_invalid_too_large(self):
        with pytest.raises(ValueError):
            self.f.cidr_to_netmask(33)

    def test_invalid_type(self):
        with pytest.raises(ValueError):
            self.f.cidr_to_netmask("24")


class TestIpInNetwork:
    """Tests for the ip_in_network filter."""

    def setup_method(self):
        self.f = FilterModule()

    def test_ip_in_range(self):
        assert self.f.ip_in_network('192.168.1.50', '192.168.1.0/24') is True

    def test_ip_not_in_range(self):
        assert self.f.ip_in_network('10.0.0.1', '192.168.1.0/24') is False

    def test_network_address(self):
        assert self.f.ip_in_network('192.168.1.0', '192.168.1.0/24') is True

    def test_broadcast_address(self):
        assert self.f.ip_in_network('192.168.1.255', '192.168.1.0/24') is True


class TestSortIps:
    """Tests for the sort_ips filter."""

    def setup_method(self):
        self.f = FilterModule()

    def test_sort_basic(self):
        ips = ['192.168.1.10', '192.168.1.2', '192.168.1.1']
        expected = ['192.168.1.1', '192.168.1.2', '192.168.1.10']
        assert self.f.sort_ips(ips) == expected

    def test_sort_different_subnets(self):
        ips = ['10.0.0.1', '192.168.1.1', '172.16.0.1']
        expected = ['10.0.0.1', '172.16.0.1', '192.168.1.1']
        assert self.f.sort_ips(ips) == expected

    def test_empty_list(self):
        assert self.f.sort_ips([]) == []
```

Run with pytest:

```bash
cd collections/ansible_collections/myorg/myutils
python -m pytest tests/unit/ -v
```

## Unit Testing Lookup Plugins

Lookup plugins are trickier because they depend on Ansible internals. Use mocking:

```python
# tests/unit/plugins/lookup/test_api_lookup.py
import pytest
from unittest.mock import patch, MagicMock
import json


class TestApiLookup:
    """Tests for the API lookup plugin."""

    def test_successful_lookup(self):
        """Test that the lookup returns data from the API."""
        # Mock the HTTP response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            'servers': [
                {'name': 'web1', 'ip': '10.0.0.1'},
                {'name': 'web2', 'ip': '10.0.0.2'},
            ]
        }).encode()
        mock_response.getcode.return_value = 200

        with patch('ansible.module_utils.urls.open_url', return_value=mock_response):
            # Import after patching
            from api_lookup import LookupModule
            lookup = LookupModule()

            # Mock the options
            lookup._options = {
                'api_url': 'https://api.example.com',
                'api_token': 'test-token',
            }
            lookup.get_option = lambda key: lookup._options.get(key)

            # The actual test would call lookup.run()
            # but this depends on your specific implementation

    def test_api_error_handling(self):
        """Test that API errors are handled gracefully."""
        with patch('ansible.module_utils.urls.open_url', side_effect=Exception("Connection refused")):
            from api_lookup import LookupModule
            lookup = LookupModule()
            # Verify the plugin raises AnsibleError, not a raw exception
```

## Integration Testing

Integration tests run the actual plugin inside Ansible. Create a test target:

```yaml
# tests/integration/targets/test_network_filters/tasks/main.yml
---
- name: Test cidr_to_netmask filter
  block:
    - name: Convert /24 to netmask
      ansible.builtin.set_fact:
        result: "{{ 24 | myorg.myutils.cidr_to_netmask }}"

    - name: Verify /24 result
      ansible.builtin.assert:
        that:
          - result == '255.255.255.0'

    - name: Convert /16 to netmask
      ansible.builtin.set_fact:
        result: "{{ 16 | myorg.myutils.cidr_to_netmask }}"

    - name: Verify /16 result
      ansible.builtin.assert:
        that:
          - result == '255.255.0.0'

    - name: Test ip_in_network filter
      ansible.builtin.assert:
        that:
          - "'192.168.1.50' | myorg.myutils.ip_in_network('192.168.1.0/24')"
          - "not '10.0.0.1' | myorg.myutils.ip_in_network('192.168.1.0/24')"

    - name: Test sort_ips filter
      ansible.builtin.set_fact:
        sorted_ips: "{{ ['10.0.0.2', '10.0.0.1', '10.0.0.10'] | myorg.myutils.sort_ips }}"

    - name: Verify sorted IPs
      ansible.builtin.assert:
        that:
          - sorted_ips[0] == '10.0.0.1'
          - sorted_ips[1] == '10.0.0.2'
          - sorted_ips[2] == '10.0.0.10'
```

Run integration tests:

```bash
ansible-test integration test_network_filters --docker default -v
```

## Sanity Testing

Sanity tests check code quality and documentation:

```bash
# Run all sanity tests
ansible-test sanity --docker default

# Run specific sanity tests
ansible-test sanity --test pep8
ansible-test sanity --test pylint
ansible-test sanity --test validate-modules
ansible-test sanity --test ansible-doc
```

## Testing with tox

For testing across multiple Python versions, use tox:

```ini
# tox.ini
[tox]
envlist = py39, py310, py311

[testenv]
deps =
    pytest
    ansible-core>=2.14
commands =
    pytest tests/unit/ -v {posargs}
```

```bash
tox
```

## Continuous Integration

Here is a GitHub Actions workflow for testing plugins:

```yaml
# .github/workflows/test-plugins.yml
name: Test Plugins
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install ansible-core pytest
      - run: pytest tests/unit/ -v

  sanity-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          path: ansible_collections/myorg/myutils
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install ansible-core
      - run: ansible-test sanity --docker default
        working-directory: ansible_collections/myorg/myutils

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          path: ansible_collections/myorg/myutils
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install ansible-core
      - run: ansible-test integration --docker default
        working-directory: ansible_collections/myorg/myutils
```

## Summary

Testing Ansible plugins requires a mix of Python unit tests for logic validation, Ansible integration tests for end-to-end behavior, and sanity tests for code quality. Use pytest for unit tests, `ansible-test integration` for integration tests, and `ansible-test sanity` for linting and documentation checks. Automate everything in CI so every change gets validated before merging.
