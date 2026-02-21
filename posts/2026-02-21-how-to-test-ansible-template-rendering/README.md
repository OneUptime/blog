# How to Test Ansible Template Rendering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Jinja2, Templates, DevOps

Description: A practical guide to testing Ansible Jinja2 template rendering to catch syntax errors, logic bugs, and variable issues before deploying to production.

---

Jinja2 templates are the backbone of Ansible configuration management. They generate config files, scripts, and anything text-based from variables and logic. But a template with a missing variable, a broken conditional, or a wrong filter can produce output that looks fine in development and breaks everything in production. I have spent more hours than I would like debugging templates that rendered correctly on my local test box but produced garbage on a different OS because of a missing fact.

This guide covers multiple approaches to testing your Ansible templates before they cause problems.

## Why Template Testing Matters

Consider this Jinja2 template for an nginx virtual host:

```jinja2
{# templates/vhost.conf.j2 #}
{# Generate nginx virtual host configuration #}
server {
    listen {{ nginx_port | default(80) }};
    server_name {{ server_name }};

    {% if ssl_enabled %}
    listen 443 ssl;
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
    {% endif %}

    location / {
        proxy_pass http://{{ upstream_host }}:{{ upstream_port }};
        {% for header in proxy_headers %}
        proxy_set_header {{ header.name }} {{ header.value }};
        {% endfor %}
    }
}
```

If `server_name` is undefined, the template will fail at render time. If `ssl_enabled` is true but `ssl_cert_path` is not set, you get an invalid nginx config. These issues need to be caught during development, not during a production deploy.

## Method 1: The ansible.builtin.template Module in Check Mode

The quickest way to verify template rendering is running the template task in check mode with diff enabled:

```bash
# Run template rendering in check mode with diff output
ansible-playbook deploy.yml --check --diff --tags template-only
```

This shows you what would change without actually writing files. Tag your template tasks so you can run them in isolation:

```yaml
# playbook.yml
# Deploy config with template task tagged for isolated testing
- name: Deploy nginx virtual host
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: /etc/nginx/sites-available/{{ server_name }}.conf
  tags:
    - template-only
    - nginx
```

## Method 2: Using Python to Render Templates Offline

You can render Jinja2 templates outside of Ansible using Python directly. This is faster because it does not require an inventory or SSH connections.

```python
#!/usr/bin/env python3
# scripts/test_template.py
# Render an Ansible Jinja2 template with test variables and validate output
import sys
from jinja2 import Environment, FileSystemLoader, StrictUndefined

def render_template(template_path, variables):
    """Render a Jinja2 template with given variables."""
    env = Environment(
        loader=FileSystemLoader('.'),
        undefined=StrictUndefined,  # Fail on undefined variables
        trim_blocks=True,
        lstrip_blocks=True,
    )
    template = env.get_template(template_path)
    return template.render(**variables)

# Test variables matching what Ansible would provide
test_vars = {
    'server_name': 'app.example.com',
    'nginx_port': 80,
    'ssl_enabled': True,
    'ssl_cert_path': '/etc/ssl/certs/app.pem',
    'ssl_key_path': '/etc/ssl/private/app.key',
    'upstream_host': '127.0.0.1',
    'upstream_port': 8080,
    'proxy_headers': [
        {'name': 'Host', 'value': '$host'},
        {'name': 'X-Real-IP', 'value': '$remote_addr'},
    ]
}

try:
    output = render_template('templates/vhost.conf.j2', test_vars)
    print(output)
    print("\n--- Template rendered successfully ---")
except Exception as e:
    print(f"Template rendering failed: {e}", file=sys.stderr)
    sys.exit(1)
```

Run this script from your role directory:

```bash
# Execute the template test from the role directory
cd roles/nginx && python3 ../../scripts/test_template.py
```

## Method 3: Pytest with Jinja2 for Automated Testing

For proper automated testing, use pytest to write test cases for each template:

```python
# tests/test_templates.py
# Automated tests for Jinja2 templates using pytest
import pytest
from jinja2 import Environment, FileSystemLoader, StrictUndefined, UndefinedError

@pytest.fixture
def jinja_env():
    """Create a Jinja2 environment pointing to the templates directory."""
    return Environment(
        loader=FileSystemLoader('roles/nginx/templates'),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )

@pytest.fixture
def base_vars():
    """Minimal variables required by the vhost template."""
    return {
        'server_name': 'test.example.com',
        'upstream_host': '127.0.0.1',
        'upstream_port': 8080,
        'ssl_enabled': False,
        'proxy_headers': [],
    }

def test_basic_rendering(jinja_env, base_vars):
    """Verify template renders with minimal required variables."""
    template = jinja_env.get_template('vhost.conf.j2')
    output = template.render(**base_vars)
    assert 'server_name test.example.com' in output
    assert 'listen 80' in output

def test_ssl_enabled(jinja_env, base_vars):
    """Verify SSL block is included when ssl_enabled is True."""
    base_vars['ssl_enabled'] = True
    base_vars['ssl_cert_path'] = '/etc/ssl/cert.pem'
    base_vars['ssl_key_path'] = '/etc/ssl/key.pem'
    template = jinja_env.get_template('vhost.conf.j2')
    output = template.render(**base_vars)
    assert 'listen 443 ssl' in output
    assert 'ssl_certificate /etc/ssl/cert.pem' in output

def test_ssl_without_cert_path_fails(jinja_env, base_vars):
    """Verify that enabling SSL without cert path raises an error."""
    base_vars['ssl_enabled'] = True
    template = jinja_env.get_template('vhost.conf.j2')
    with pytest.raises(UndefinedError):
        template.render(**base_vars)

def test_proxy_headers_rendered(jinja_env, base_vars):
    """Verify proxy headers are rendered in the location block."""
    base_vars['proxy_headers'] = [
        {'name': 'Host', 'value': '$host'},
        {'name': 'X-Forwarded-For', 'value': '$proxy_add_x_forwarded_for'},
    ]
    template = jinja_env.get_template('vhost.conf.j2')
    output = template.render(**base_vars)
    assert 'proxy_set_header Host $host' in output
    assert 'proxy_set_header X-Forwarded-For' in output

def test_custom_port(jinja_env, base_vars):
    """Verify custom nginx port is used when provided."""
    base_vars['nginx_port'] = 8443
    template = jinja_env.get_template('vhost.conf.j2')
    output = template.render(**base_vars)
    assert 'listen 8443' in output
```

Run the tests:

```bash
# Run pytest for template tests
pytest tests/test_templates.py -v
```

## Method 4: Molecule Verify Step

Integrate template testing into your Molecule workflow. After converging, verify the rendered files contain what you expect:

```yaml
# molecule/default/verify.yml
# Verify template rendering produced correct configuration files
- name: Verify rendered templates
  hosts: all
  become: true
  tasks:
    - name: Read rendered nginx config
      ansible.builtin.slurp:
        src: /etc/nginx/sites-available/app.example.com.conf
      register: nginx_config

    - name: Decode config content
      ansible.builtin.set_fact:
        config_content: "{{ nginx_config.content | b64decode }}"

    - name: Verify server_name directive exists
      ansible.builtin.assert:
        that:
          - "'server_name app.example.com' in config_content"
        fail_msg: "server_name directive missing from rendered config"

    - name: Verify upstream configuration
      ansible.builtin.assert:
        that:
          - "'proxy_pass http://127.0.0.1:8080' in config_content"
        fail_msg: "Upstream proxy_pass directive is incorrect"

    - name: Validate nginx config syntax
      ansible.builtin.command: nginx -t
      register: nginx_syntax
      changed_when: false

    - name: Assert config syntax is valid
      ansible.builtin.assert:
        that:
          - nginx_syntax.rc == 0
        fail_msg: "Rendered nginx config has syntax errors"
```

## Method 5: Testing Ansible Filters in Templates

Ansible adds many filters beyond standard Jinja2. Testing templates that use Ansible-specific filters requires using Ansible itself or mocking those filters.

```python
# tests/test_ansible_filters.py
# Test templates that use Ansible-specific Jinja2 filters
from jinja2 import Environment, FileSystemLoader
import ipaddress

def ansible_ipaddr(value, query=''):
    """Simple mock of Ansible's ipaddr filter."""
    try:
        addr = ipaddress.ip_address(value)
        if query == 'address':
            return str(addr)
        return str(addr)
    except ValueError:
        return False

def ansible_to_nice_yaml(value, indent=2):
    """Mock of Ansible's to_nice_yaml filter."""
    import yaml
    return yaml.dump(value, default_flow_style=False, indent=indent)

def create_ansible_env():
    """Create Jinja2 env with mocked Ansible filters."""
    env = Environment(
        loader=FileSystemLoader('roles/network/templates'),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters['ipaddr'] = ansible_ipaddr
    env.filters['to_nice_yaml'] = ansible_to_nice_yaml
    return env

def test_network_template():
    env = create_ansible_env()
    template = env.get_template('interfaces.conf.j2')
    output = template.render(
        interfaces=[
            {'name': 'eth0', 'address': '10.0.1.5', 'netmask': '255.255.255.0'}
        ]
    )
    assert '10.0.1.5' in output
```

## Setting Up a Template Testing Workflow

Here is how I organize template tests in my projects:

```
roles/
  nginx/
    templates/
      vhost.conf.j2
    tests/
      test_templates.py
      fixtures/
        expected_basic.conf
        expected_ssl.conf
scripts/
  test_all_templates.sh
```

The `test_all_templates.sh` script discovers and runs all template tests:

```bash
#!/bin/bash
# scripts/test_all_templates.sh
# Find and run all template tests across all roles
set -euo pipefail

FAILED=0
for test_file in roles/*/tests/test_templates.py; do
    role_dir=$(dirname "$(dirname "$test_file")")
    echo "Testing templates in $role_dir..."
    if ! pytest "$test_file" -v; then
        FAILED=1
    fi
done

exit $FAILED
```

## Final Thoughts

Template rendering bugs are one of the most common sources of Ansible failures in production. The key insight is that you do not need to spin up full infrastructure to test most template logic. Python-based unit tests catch the majority of issues in seconds, while Molecule handles the integration cases where you need to validate the rendered output against the actual service. Build both into your CI pipeline and you will stop finding template bugs in production.
