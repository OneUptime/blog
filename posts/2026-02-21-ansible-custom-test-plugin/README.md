# How to Create a Custom Ansible Test Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Jinja2, Testing, Automation

Description: Learn how to create custom Ansible test plugins for building reusable validation logic in your Jinja2 conditionals and templates.

---

Ansible test plugins let you define custom Jinja2 tests that you can use in `when` conditions, `assert` statements, and template expressions. If you have ever found yourself writing the same complex conditional logic across multiple playbooks, building a test plugin is one of the best ways to clean things up.

A test plugin is essentially a Python function that returns `True` or `False`. Once registered, you can use it with the `is` keyword in Jinja2, like `value is my_custom_test`. This guide walks through creating test plugins from scratch, covering the plugin structure, registration, and practical examples.

## Understanding Test Plugins

Test plugins are different from filter plugins. Filters transform data (e.g., `value | to_json`), while tests evaluate conditions (e.g., `value is truthy`). Ansible ships with built-in tests like `defined`, `undefined`, `match`, `search`, `version`, and many more. When you need domain-specific validation that goes beyond what the built-in tests offer, you write a custom test plugin.

## Plugin File Structure

Test plugins go into a `test_plugins/` directory either in your project root or inside an Ansible collection. Here is the basic layout:

```
my_project/
  test_plugins/
    network_tests.py
  playbooks/
    validate_network.yml
```

Or inside a collection:

```
collections/
  ansible_collections/
    myorg/
      myutils/
        plugins/
          test/
            network_tests.py
```

## Writing Your First Test Plugin

Let us start with a simple test plugin that checks whether a string is a valid IPv4 address.

Create the file `test_plugins/network_tests.py`:

```python
# network_tests.py - Custom test plugin for network validation
import ipaddress


def is_valid_ipv4(value):
    """Test whether a string is a valid IPv4 address."""
    try:
        ipaddress.IPv4Address(value)
        return True
    except (ipaddress.AddressValueError, ValueError):
        return False


def is_valid_cidr(value):
    """Test whether a string is a valid CIDR notation."""
    try:
        ipaddress.ip_network(value, strict=False)
        return True
    except (ValueError, TypeError):
        return False


def is_private_ip(value):
    """Test whether an IP address is in a private range."""
    try:
        addr = ipaddress.ip_address(value)
        return addr.is_private
    except (ValueError, TypeError):
        return False


def is_valid_port(value):
    """Test whether a value is a valid TCP/UDP port number."""
    try:
        port = int(value)
        return 1 <= port <= 65535
    except (ValueError, TypeError):
        return False


# This class is how Ansible discovers the tests
class TestModule:
    """Custom test plugin for network validation."""

    def tests(self):
        return {
            'valid_ipv4': is_valid_ipv4,
            'valid_cidr': is_valid_cidr,
            'private_ip': is_private_ip,
            'valid_port': is_valid_port,
        }
```

The key piece is the `TestModule` class with a `tests()` method. This method returns a dictionary that maps test names to Python functions. Ansible uses this class to register your tests.

## Using Your Custom Tests in Playbooks

Now you can use these tests in any playbook within the same project.

This playbook validates network configuration variables before applying them:

```yaml
---
# validate_network.yml - Validate network config before applying
- name: Validate and apply network configuration
  hosts: all
  vars:
    server_ip: "192.168.1.50"
    server_cidr: "10.0.0.0/24"
    app_port: 8080
    external_ip: "8.8.8.8"

  tasks:
    - name: Validate server IP is a valid IPv4 address
      ansible.builtin.assert:
        that:
          - server_ip is valid_ipv4
        fail_msg: "server_ip '{{ server_ip }}' is not a valid IPv4 address"
        success_msg: "server_ip is valid"

    - name: Validate CIDR notation
      ansible.builtin.assert:
        that:
          - server_cidr is valid_cidr
        fail_msg: "server_cidr '{{ server_cidr }}' is not valid CIDR"

    - name: Check if server IP is private
      ansible.builtin.debug:
        msg: "Server IP is {{ 'private' if server_ip is private_ip else 'public' }}"

    - name: Validate application port
      ansible.builtin.assert:
        that:
          - app_port is valid_port
        fail_msg: "app_port {{ app_port }} is not a valid port number"

    - name: Skip task if IP is not private
      ansible.builtin.debug:
        msg: "Configuring firewall for public-facing IP"
      when: external_ip is not private_ip
```

## A More Advanced Example: Semantic Version Tests

Here is a test plugin for validating semantic version strings and comparing them.

Create `test_plugins/version_tests.py`:

```python
# version_tests.py - Test plugin for semantic version validation
import re

SEMVER_PATTERN = re.compile(
    r'^(?P<major>0|[1-9]\d*)'
    r'\.(?P<minor>0|[1-9]\d*)'
    r'\.(?P<patch>0|[1-9]\d*)'
    r'(?:-(?P<prerelease>[0-9A-Za-z\-.]+))?'
    r'(?:\+(?P<build>[0-9A-Za-z\-.]+))?$'
)


def is_semver(value):
    """Test whether a string follows semantic versioning."""
    if not isinstance(value, str):
        return False
    return bool(SEMVER_PATTERN.match(value))


def is_prerelease(value):
    """Test whether a semver string is a pre-release version."""
    if not isinstance(value, str):
        return False
    match = SEMVER_PATTERN.match(value)
    if not match:
        return False
    return match.group('prerelease') is not None


def is_stable_version(value):
    """Test whether a semver string is a stable (non-prerelease) version."""
    if not isinstance(value, str):
        return False
    match = SEMVER_PATTERN.match(value)
    if not match:
        return False
    return match.group('prerelease') is None


def is_major_version(value, major):
    """Test whether a semver string has a specific major version."""
    if not isinstance(value, str):
        return False
    match = SEMVER_PATTERN.match(value)
    if not match:
        return False
    return int(match.group('major')) == int(major)


class TestModule:
    """Semantic version test plugins."""

    def tests(self):
        return {
            'semver': is_semver,
            'prerelease': is_prerelease,
            'stable_version': is_stable_version,
            'major_version': is_major_version,
        }
```

Using the version tests in a playbook:

```yaml
---
# deploy_versioned_app.yml - Deploy based on version checks
- name: Deploy application with version validation
  hosts: app_servers
  vars:
    app_version: "2.1.0"
    beta_version: "3.0.0-beta.1"

  tasks:
    - name: Ensure version follows semver
      ansible.builtin.assert:
        that:
          - app_version is semver
        fail_msg: "Version {{ app_version }} does not follow semver"

    - name: Deploy to production only if stable
      ansible.builtin.include_tasks: deploy_production.yml
      when: app_version is stable_version

    - name: Deploy to staging if pre-release
      ansible.builtin.include_tasks: deploy_staging.yml
      when: beta_version is prerelease

    - name: Check major version for migration
      ansible.builtin.debug:
        msg: "Running v2 migration scripts"
      when: app_version is major_version(2)
```

## Test Plugins with Arguments

Notice the `is_major_version` example above. When you call `value is major_version(2)`, Ansible passes the value as the first argument and `2` as the second argument. Your Python function just needs to accept both parameters.

Here is another example of a test with arguments:

```python
# range_tests.py - Test plugin for range checks
def is_in_range(value, min_val, max_val):
    """Test whether a number falls within a given range (inclusive)."""
    try:
        return float(min_val) <= float(value) <= float(max_val)
    except (ValueError, TypeError):
        return False


class TestModule:
    def tests(self):
        return {
            'in_range': is_in_range,
        }
```

Usage in a playbook:

```yaml
- name: Check memory threshold
  ansible.builtin.debug:
    msg: "Memory usage is within acceptable range"
  when: ansible_memfree_mb is in_range(512, 32768)
```

## Handling Edge Cases

Your test functions should be robust. Always handle `None` values, wrong types, and unexpected input gracefully. A test plugin should never throw an unhandled exception. It should return `False` for invalid input.

```python
def is_valid_hostname(value):
    """Test whether a string is a valid hostname per RFC 1123."""
    if not isinstance(value, str) or not value:
        return False
    if len(value) > 253:
        return False
    # Remove trailing dot if present
    if value.endswith('.'):
        value = value[:-1]
    labels = value.split('.')
    hostname_re = re.compile(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$')
    return all(hostname_re.match(label) for label in labels)
```

## Testing Your Test Plugin

Before shipping a test plugin, test it locally. You can run the Python functions directly:

```python
# test_network_tests.py - Unit tests for the network test plugin
from network_tests import is_valid_ipv4, is_valid_cidr, is_private_ip

assert is_valid_ipv4("192.168.1.1") == True
assert is_valid_ipv4("999.999.999.999") == False
assert is_valid_ipv4("not_an_ip") == False
assert is_valid_ipv4(None) == False

assert is_valid_cidr("10.0.0.0/24") == True
assert is_valid_cidr("10.0.0.0/33") == False

assert is_private_ip("192.168.1.1") == True
assert is_private_ip("8.8.8.8") == False

print("All tests passed")
```

Run it with:

```bash
python test_network_tests.py
```

## Summary

Custom test plugins give you a clean way to encapsulate validation logic as reusable Jinja2 tests. They keep your playbooks readable and your conditionals short. The pattern is straightforward: write Python functions that return booleans, put them in a `TestModule` class, and drop the file into `test_plugins/` or into your collection's `plugins/test/` directory. Once you start using them, you will find they dramatically reduce the complexity of your `when` clauses and `assert` blocks.
