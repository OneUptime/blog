# How to Create a Test Plugin for Custom Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Testing, Validation, Jinja2

Description: Build custom Ansible test plugins that validate infrastructure data like hostnames, configuration values, and compliance requirements.

---

Custom test plugins let you define validation logic that integrates directly into Ansible's `when` conditions and `assert` statements. Unlike filter plugins that transform data, test plugins return True or False. This makes them perfect for validating that infrastructure data meets your organization's standards before applying configuration.

This guide builds test plugins for real validation scenarios: naming conventions, security compliance, and configuration validation.

## Naming Convention Validator

Many organizations enforce strict naming conventions for hostnames, resources, and tags. Here is a test plugin that validates against configurable patterns.

Create `test_plugins/naming_tests.py`:

```python
# naming_tests.py - Test plugins for naming convention validation
import re


def is_valid_hostname_pattern(value, pattern=None):
    """Test if a hostname matches the organization naming pattern.

    Default pattern: <role>-<env>-<number>
    Examples: web-prod-01, db-staging-02, cache-dev-01
    """
    if not isinstance(value, str):
        return False

    if pattern:
        return bool(re.match(pattern, value))

    # Default pattern: role-environment-number
    default_pattern = r'^[a-z]+-(?:prod|staging|dev|qa|uat)-\d{2,3}$'
    return bool(re.match(default_pattern, value))


def is_valid_tag_format(value):
    """Test if a value follows the standard tagging format.

    Expected: key:value with lowercase alphanumeric and hyphens.
    """
    if not isinstance(value, str):
        return False
    pattern = r'^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'
    return bool(re.match(pattern, value))


def is_valid_resource_name(value, max_length=63):
    """Test if a name is valid for cloud resources (DNS-compatible).

    Rules: lowercase, starts with letter, alphanumeric and hyphens only,
    does not end with hyphen, max 63 characters.
    """
    if not isinstance(value, str):
        return False
    if len(value) > max_length or len(value) == 0:
        return False
    pattern = r'^[a-z][a-z0-9-]*[a-z0-9]$'
    return bool(re.match(pattern, value))


def follows_convention(value, convention):
    """Test if a value follows a named convention.

    Supported conventions:
    - snake_case
    - kebab_case
    - camelCase
    - PascalCase
    """
    if not isinstance(value, str) or not isinstance(convention, str):
        return False

    patterns = {
        'snake_case': r'^[a-z][a-z0-9]*(_[a-z0-9]+)*$',
        'kebab_case': r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
        'camelCase': r'^[a-z][a-zA-Z0-9]*$',
        'PascalCase': r'^[A-Z][a-zA-Z0-9]*$',
    }

    pattern = patterns.get(convention)
    if not pattern:
        return False
    return bool(re.match(pattern, value))


class TestModule:
    def tests(self):
        return {
            'valid_hostname_pattern': is_valid_hostname_pattern,
            'valid_tag_format': is_valid_tag_format,
            'valid_resource_name': is_valid_resource_name,
            'follows_convention': follows_convention,
        }
```

## Security Compliance Tests

Create `test_plugins/security_tests.py`:

```python
# security_tests.py - Test plugins for security compliance checks
import re


def is_strong_password(value, min_length=12):
    """Test if a password meets complexity requirements.

    Requirements: min length, uppercase, lowercase, digit, special char.
    """
    if not isinstance(value, str):
        return False
    if len(value) < min_length:
        return False
    if not re.search(r'[A-Z]', value):
        return False
    if not re.search(r'[a-z]', value):
        return False
    if not re.search(r'\d', value):
        return False
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', value):
        return False
    return True


def is_secure_port(value):
    """Test if a port number is not in the well-known insecure range.

    Rejects common insecure service ports: telnet(23), ftp(21), etc.
    """
    insecure_ports = {21, 23, 25, 69, 110, 119, 143, 161, 162, 389, 445, 512, 513, 514}
    try:
        port = int(value)
        return port not in insecure_ports
    except (ValueError, TypeError):
        return False


def is_encrypted_protocol(value):
    """Test if a protocol/URL uses encryption."""
    if not isinstance(value, str):
        return False
    secure_prefixes = ('https://', 'tls://', 'ssl://', 'ftps://', 'ldaps://', 'imaps://')
    insecure_prefixes = ('http://', 'ftp://', 'telnet://', 'ldap://')
    value_lower = value.lower()
    if any(value_lower.startswith(p) for p in secure_prefixes):
        return True
    if any(value_lower.startswith(p) for p in insecure_prefixes):
        return False
    # If it is just a protocol name
    secure_protocols = ('https', 'tls', 'ssh', 'sftp', 'scp', 'ldaps', 'imaps')
    return value_lower in secure_protocols


def is_private_subnet(value):
    """Test if a CIDR block is within private IP ranges."""
    import ipaddress
    try:
        network = ipaddress.ip_network(value, strict=False)
        # Check if the network falls within RFC 1918 ranges
        private_ranges = [
            ipaddress.ip_network('10.0.0.0/8'),
            ipaddress.ip_network('172.16.0.0/12'),
            ipaddress.ip_network('192.168.0.0/16'),
        ]
        for private_range in private_ranges:
            if network.subnet_of(private_range):
                return True
        return False
    except (ValueError, TypeError):
        return False


def has_no_default_credentials(value):
    """Test that a configuration dict does not contain default credentials."""
    common_defaults = {
        'admin', 'password', 'Password1', 'changeme', 'default',
        'root', 'toor', 'test', '12345', 'abc123',
    }
    if isinstance(value, dict):
        for key in ('password', 'passwd', 'secret', 'token', 'api_key'):
            if key in value and str(value[key]) in common_defaults:
                return False
    elif isinstance(value, str):
        return value not in common_defaults
    return True


class TestModule:
    def tests(self):
        return {
            'strong_password': is_strong_password,
            'secure_port': is_secure_port,
            'encrypted_protocol': is_encrypted_protocol,
            'private_subnet': is_private_subnet,
            'has_no_default_credentials': has_no_default_credentials,
        }
```

## Using Validation Tests in Playbooks

### Pre-deployment Validation

```yaml
---
# validate_deployment.yml - Run validation before deploying
- name: Pre-deployment validation
  hosts: all
  gather_facts: false

  tasks:
    - name: Validate hostname follows naming convention
      ansible.builtin.assert:
        that:
          - inventory_hostname is valid_hostname_pattern
        fail_msg: >
          Host '{{ inventory_hostname }}' does not follow naming convention.
          Expected pattern: <role>-<env>-<number> (e.g., web-prod-01)

    - name: Validate all service ports are secure
      ansible.builtin.assert:
        that:
          - item.value is secure_port
        fail_msg: "Port {{ item.value }} for {{ item.key }} is insecure"
      loop: "{{ service_ports | dict2items }}"
      vars:
        service_ports:
          http: 443
          ssh: 22
          monitoring: 9090

    - name: Validate URLs use encryption
      ansible.builtin.assert:
        that:
          - api_endpoint is encrypted_protocol
        fail_msg: "API endpoint must use HTTPS: {{ api_endpoint }}"
      vars:
        api_endpoint: "https://api.myorg.com"
```

### Configuration Compliance Check

```yaml
---
# compliance_check.yml - Check security compliance
- name: Security compliance validation
  hosts: all
  become: true

  tasks:
    - name: Check that application subnets are private
      ansible.builtin.assert:
        that:
          - item is private_subnet
        fail_msg: "Subnet {{ item }} is not a private range"
      loop:
        - "{{ app_subnet }}"
        - "{{ db_subnet }}"
      vars:
        app_subnet: "10.1.0.0/16"
        db_subnet: "10.2.0.0/16"

    - name: Validate no default credentials in config
      ansible.builtin.assert:
        that:
          - db_config is has_no_default_credentials
        fail_msg: "Database configuration contains default credentials"
      vars:
        db_config:
          host: db.internal
          user: app_user
          password: "{{ vault_db_password }}"

    - name: Validate resource names
      ansible.builtin.assert:
        that:
          - item is valid_resource_name
        fail_msg: "Resource name '{{ item }}' is not valid for cloud resources"
      loop:
        - my-web-service
        - api-gateway-prod
        - cache-cluster-01
```

### Conditional Task Execution

```yaml
  tasks:
    - name: Apply strict security policies on production
      ansible.builtin.include_tasks: harden_security.yml
      when:
        - inventory_hostname is valid_hostname_pattern
        - "'prod' in inventory_hostname"

    - name: Skip configuration if names do not follow convention
      ansible.builtin.debug:
        msg: "Skipping {{ inventory_hostname }} - does not follow naming convention"
      when: inventory_hostname is not valid_hostname_pattern
```

## Unit Testing Your Test Plugins

```python
# test_naming_tests.py
from naming_tests import (
    is_valid_hostname_pattern, is_valid_tag_format,
    is_valid_resource_name, follows_convention
)

# Hostname tests
assert is_valid_hostname_pattern('web-prod-01') == True
assert is_valid_hostname_pattern('db-staging-02') == True
assert is_valid_hostname_pattern('Web-Prod-01') == False
assert is_valid_hostname_pattern('server1') == False

# Tag format tests
assert is_valid_tag_format('env:production') == True
assert is_valid_tag_format('ENV:Production') == False

# Resource name tests
assert is_valid_resource_name('my-api-service') == True
assert is_valid_resource_name('-bad-name') == False
assert is_valid_resource_name('a' * 64) == False

# Convention tests
assert follows_convention('my_variable', 'snake_case') == True
assert follows_convention('my-component', 'kebab_case') == True
assert follows_convention('myVariable', 'camelCase') == True

print("All tests passed")
```

## Summary

Custom test plugins encode your organization's validation rules as reusable Jinja2 tests. They work seamlessly with `when` conditions, `assert` statements, and template expressions. Build test plugins for naming conventions, security policies, compliance requirements, and data format validation. They keep your playbooks readable while enforcing standards consistently across your entire infrastructure.
