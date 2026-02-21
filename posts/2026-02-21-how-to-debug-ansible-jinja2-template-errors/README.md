# How to Debug Ansible Jinja2 Template Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Debugging

Description: Learn how to identify, understand, and fix common Jinja2 template errors in Ansible playbooks with practical debugging techniques.

---

Jinja2 template errors are among the most frustrating issues in Ansible because the error messages often point to the wrong line, reference internal template engine details, and do not clearly explain what went wrong. This post covers the most common Jinja2 errors, how to read Ansible's template error messages, and systematic approaches to finding and fixing template problems.

## Understanding Jinja2 Error Messages

When a Jinja2 template fails, Ansible produces an error that typically looks like this:

```
fatal: [web-01]: FAILED! => {"changed": false, "msg": "AnsibleUndefinedVariable:
  'app_port' is undefined. 'app_port' is undefined\n
  The error appears to be in '/home/deploy/roles/webapp/templates/nginx.conf.j2': line 15, column 22"}
```

Key parts of this message:
- The error type (`AnsibleUndefinedVariable`)
- The template file path
- The line and column number (sometimes inaccurate for included templates)

## Common Error 1: Undefined Variables

This is by far the most common template error:

```
AnsibleUndefinedVariable: 'database_host' is undefined
```

**Debugging steps:**

```yaml
# Step 1: Check if the variable exists at all
- name: Show all defined variables
  ansible.builtin.debug:
    var: vars.keys() | list | sort

# Step 2: Check the specific variable
- name: Check database_host
  ansible.builtin.debug:
    msg: "database_host = {{ database_host | default('NOT DEFINED') }}"

# Step 3: Check where it should come from
- name: Check host vars
  ansible.builtin.debug:
    var: hostvars[inventory_hostname].keys() | list | sort
```

**Common causes and fixes:**

```yaml
# Cause 1: Typo in variable name
# Template has: {{ databse_host }}  (missing 'a')
# Fix: {{ database_host }}

# Cause 2: Variable defined in wrong scope
# Variable is in group_vars/dbservers.yml but host is in webservers group
# Fix: Move variable to group_vars/all.yml or pass it explicitly

# Cause 3: Variable should come from another host
# Fix: Use hostvars to access it
server_host: "{{ hostvars[groups['dbservers'][0]]['ansible_default_ipv4']['address'] }}"
```

**Prevention: Use the default filter:**

```jinja2
{# Provide fallback values for optional variables #}
server_name {{ server_name | default('localhost') }};
listen {{ listen_port | default(80) }};
```

## Common Error 2: Template Syntax Errors

Jinja2 syntax errors produce messages like:

```
AnsibleError: template error while templating string: expected token 'end of print statement', got '='
```

**Typical mistakes:**

```jinja2
{# WRONG: Using = instead of == in conditions #}
{% if env = 'production' %}
{# FIX: Use == for comparison #}
{% if env == 'production' %}

{# WRONG: Missing closing tag #}
{% if enable_ssl %}
ssl on;
{# Missing {% endif %} #}

{# WRONG: Using Python dict syntax in Jinja2 #}
{{ config['key'] = 'value' }}
{# FIX: Jinja2 is for output, not assignment. Use set: #}
{% set value = config['key'] %}
{{ value }}
```

## Common Error 3: Type Errors

Type errors happen when you try to use a filter or operation on the wrong type:

```
AnsibleFilterError: int() argument must be a string, a bytes-like object or a number, not 'AnsibleUndefined'
```

**Debugging approach:**

```yaml
# Check the type of the variable before the template
- name: Debug variable types
  ansible.builtin.debug:
    msg: |
      worker_count value: {{ worker_count }}
      worker_count type: {{ worker_count | type_debug }}
      Is it a string? {{ worker_count is string }}
      Is it a number? {{ worker_count is number }}
```

**Common type issues:**

```jinja2
{# WRONG: Comparing string to integer #}
{% if ansible_memtotal_mb > '4096' %}
{# FIX: Convert to int first #}
{% if ansible_memtotal_mb | int > 4096 %}

{# WRONG: Math on a string variable #}
worker_processes {{ cpu_count * 2 }};
{# FIX: Ensure it is an integer #}
worker_processes {{ (cpu_count | int) * 2 }};

{# WRONG: Joining a non-list #}
allowed_hosts = {{ allowed_hosts | join(',') }}
{# FIX: Ensure it is a list #}
allowed_hosts = {{ (allowed_hosts if allowed_hosts is iterable and allowed_hosts is not string else [allowed_hosts]) | join(',') }}
```

## Common Error 4: Recursive Template Errors

When a variable references itself or creates a circular reference:

```
AnsibleError: recursive loop detected in template string
```

```yaml
# This creates a recursive loop
vars:
  app_url: "https://{{ app_url }}/api"  # References itself!

# Fix: Use a different variable name for the base
vars:
  app_host: "example.com"
  app_url: "https://{{ app_host }}/api"
```

## Debugging Technique: Render Templates Locally

You can render a template without deploying it to see the output:

```yaml
# Render template to a local file for inspection
- name: Render template locally for debugging
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /tmp/nginx-debug-output.conf
  delegate_to: localhost
  become: false

- name: Show rendered template content
  ansible.builtin.command:
    cmd: cat /tmp/nginx-debug-output.conf
  delegate_to: localhost
  register: rendered_template
  changed_when: false

- name: Display rendered content
  ansible.builtin.debug:
    var: rendered_template.stdout_lines
```

## Debugging Technique: Use the Template Module in Check Mode

Running with `--check --diff` is very useful for template debugging:

```bash
# See what the template would produce without deploying it
ansible-playbook deploy.yml --check --diff --tags templates
```

## Debugging Technique: Isolate the Problem

When a large template fails, isolate which section is causing the issue:

```jinja2
{# Add debug markers to find where the error occurs #}
# DEBUG: Section 1 - Basic server config
server {
    listen {{ listen_port }};
    server_name {{ server_name }};
}

# DEBUG: Section 2 - SSL configuration
{% if enable_ssl %}
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
{% endif %}

# DEBUG: Section 3 - Upstream backends
{% for backend in app_backends %}
    server {{ backend.host }}:{{ backend.port }};
{% endfor %}
```

If the template fails at "Section 2," you know the issue is with SSL-related variables.

## Debugging Technique: The ansible.builtin.template Lookup

You can test template rendering inline without a separate file:

```yaml
# Test a Jinja2 expression directly
- name: Test template expression
  ansible.builtin.debug:
    msg: "{{ lookup('template', 'test.j2') }}"

# Or test inline
- name: Test Jinja2 expression inline
  ansible.builtin.debug:
    msg: >-
      {% for server in database_servers %}
      {{ server.host }}:{{ server.port }}
      {% endfor %}
```

## Common Error 5: Filter Errors

Filters that do not exist or receive wrong input:

```
AnsibleFilterError: No filter named 'to_yaml'
```

or

```
AnsibleFilterError: |combine expects dictionaries
```

**Debugging:**

```yaml
# Verify filter input types
- name: Debug filter inputs
  ansible.builtin.debug:
    msg: |
      base_config type: {{ base_config | type_debug }}
      override_config type: {{ override_config | type_debug }}

# Then apply the filter
- name: Combine configs
  ansible.builtin.set_fact:
    merged_config: "{{ base_config | combine(override_config) }}"
```

**Common filter fixes:**

```jinja2
{# WRONG: combine on a list instead of a dict #}
{{ my_list | combine(other_dict) }}
{# FIX: combine works on dicts only #}
{{ my_dict | combine(other_dict) }}

{# WRONG: regex_replace with wrong argument count #}
{{ my_string | regex_replace('pattern') }}
{# FIX: regex_replace needs replacement string #}
{{ my_string | regex_replace('pattern', 'replacement') }}

{# WRONG: selectattr on a non-list #}
{{ my_dict | selectattr('key', 'equalto', 'value') }}
{# FIX: Convert dict to list first #}
{{ my_dict | dict2items | selectattr('key', 'equalto', 'target') }}
```

## Handling Complex Template Logic

When templates get complex, break them into smaller pieces:

```jinja2
{# Instead of one massive template, use includes #}
# Main nginx configuration
user www-data;
worker_processes {{ ansible_processor_vcpus }};

events {
    worker_connections {{ nginx_worker_connections | default(1024) }};
}

http {
    {% include 'includes/mime_types.j2' %}
    {% include 'includes/logging.j2' %}
    {% include 'includes/ssl.j2' if enable_ssl else '' %}

    {% for site in nginx_sites %}
    {% include 'includes/server_block.j2' %}
    {% endfor %}
}
```

Each include is a smaller template that is easier to debug independently.

## A Systematic Debugging Workflow

When you hit a template error, follow this workflow:

```yaml
---
# Step 1: Add pre-template variable checks
- name: Verify all template variables exist
  ansible.builtin.assert:
    that:
      - app_name is defined
      - app_port is defined
      - app_workers is defined
      - database_url is defined
    fail_msg: "Missing required template variables"

# Step 2: Check variable types
- name: Verify variable types
  ansible.builtin.assert:
    that:
      - app_port | int > 0
      - app_workers | int > 0
      - app_name | length > 0
    fail_msg: "Template variable type check failed"

# Step 3: Try rendering the template
- name: Deploy application configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/app.conf
    validate: /opt/app/bin/validate-config %s
```

The `validate` parameter on the template module runs a validation command on the rendered file before deploying it. If validation fails, the original file is not changed.

## Summary

Jinja2 template errors in Ansible come down to a few categories: undefined variables, syntax mistakes, type mismatches, recursive references, and filter errors. Debug them systematically by checking variable existence and types before rendering, using `--check --diff` to preview template output, breaking complex templates into smaller includes, and using the `validate` parameter to catch content errors. The `default` filter is your best preventive measure against undefined variable errors.
