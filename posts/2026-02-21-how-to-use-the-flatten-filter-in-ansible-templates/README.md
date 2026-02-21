# How to Use the flatten Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Data Transformation, Automation

Description: Learn how to use the flatten filter in Ansible to collapse nested lists into a single flat list for easier processing in playbooks and templates.

---

Nested lists show up everywhere in Ansible. You combine variables from multiple sources, use `subelements`, or work with APIs that return data in nested structures. The `flatten` filter takes those nested lists and turns them into a single, flat list that you can loop over cleanly.

If you have ever run into an error because you tried to iterate over a list of lists and got unexpected behavior, flatten is the fix. Let me walk through how it works and where it comes in handy.

## Basic Flattening

The flatten filter collapses all levels of nesting by default:

```yaml
# Flatten a nested list into a single flat list
- name: Demonstrate basic flatten
  ansible.builtin.debug:
    msg: "{{ nested_list | flatten }}"
  vars:
    nested_list:
      - [1, 2, 3]
      - [4, 5]
      - [6, 7, 8, 9]
```

Output: `[1, 2, 3, 4, 5, 6, 7, 8, 9]`

For deeply nested structures:

```yaml
# Flatten handles multiple levels of nesting
- name: Deep flatten
  ansible.builtin.debug:
    msg: "{{ deep_list | flatten }}"
  vars:
    deep_list:
      - [1, [2, [3, [4]]]]
      - [5, 6]
```

Output: `[1, 2, 3, 4, 5, 6]`

## Controlling the Flatten Depth

Sometimes you only want to flatten one level, not all of them. Pass a `levels` parameter to control the depth:

```yaml
# Flatten only one level of nesting
- name: Flatten one level
  ansible.builtin.debug:
    msg: "{{ deep_list | flatten(levels=1) }}"
  vars:
    deep_list:
      - [1, [2, 3]]
      - [4, [5, 6]]
```

Output: `[1, [2, 3], 4, [5, 6]]`

Only the outer level gets flattened. The inner `[2, 3]` and `[5, 6]` lists remain intact.

## Why Flatten Matters: Combining Variable Lists

The most common use case is merging package lists from different variable files. In a real infrastructure, packages come from multiple sources:

```yaml
# group_vars/all.yml
common_packages:
  - curl
  - wget
  - git

# group_vars/webservers.yml
web_packages:
  - nginx
  - certbot

# group_vars/databases.yml
db_packages:
  - postgresql-14
  - pgbouncer
```

When a host belongs to multiple groups, you might want to install all relevant packages:

```yaml
# Combine multiple package lists and flatten into a single installable list
- name: Install all packages for this host
  ansible.builtin.apt:
    name: "{{ all_packages | flatten | unique | sort }}"
    state: present
  vars:
    all_packages:
      - "{{ common_packages }}"
      - "{{ web_packages | default([]) }}"
      - "{{ db_packages | default([]) }}"
```

Without `flatten`, `all_packages` would be a list of lists, and apt would choke on it. The flatten filter turns it into a single list of package names.

## Flattening in Templates

Inside Jinja2 templates, flatten works the same way:

```jinja2
{# templates/repos.list.j2 - Generate a flat list of repository entries #}
# APT Repository Sources - Managed by Ansible
{% for repo in (base_repos + extra_repos + security_repos) | flatten | unique | sort %}
deb {{ repo }}
{% endfor %}
```

This handles the case where some of those variables might contain nested lists (for example, if extra_repos is defined as a list of lists in some group_vars).

## Practical Example: Aggregating Firewall Rules

Imagine you have firewall rules defined at different levels of your inventory:

```yaml
# group_vars/all.yml
global_fw_rules:
  - port: 22
    source: 10.0.0.0/8
  - port: 443
    source: 0.0.0.0/0

# group_vars/webservers.yml
web_fw_rules:
  - port: 80
    source: 0.0.0.0/0
  - port: 8080
    source: 10.0.0.0/8

# host_vars/web01.yml
host_fw_rules:
  - port: 9090
    source: 10.0.1.0/24
```

The playbook combines them:

```yaml
# Aggregate firewall rules from all sources and generate iptables config
- name: Generate firewall rules
  ansible.builtin.template:
    src: templates/iptables.j2
    dest: /etc/iptables/rules.v4
  vars:
    all_rules: >-
      {{ [
        global_fw_rules | default([]),
        web_fw_rules | default([]),
        host_fw_rules | default([])
      ] | flatten }}
```

The template:

```jinja2
{# templates/iptables.j2 - Flat list of firewall rules from all sources #}
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

-A INPUT -i lo -j ACCEPT
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

{% for rule in all_rules | sort(attribute='port') %}
-A INPUT -p tcp -s {{ rule.source }} --dport {{ rule.port }} -j ACCEPT
{% endfor %}

COMMIT
```

## Flattening with with_items (Legacy)

In older Ansible versions, `with_items` automatically flattened lists. The modern `loop` directive does not. This caught a lot of people off guard during the migration:

```yaml
# Old style - with_items auto-flattens
- name: Old way (auto-flatten)
  ansible.builtin.debug:
    msg: "{{ item }}"
  with_items:
    - [1, 2, 3]
    - [4, 5, 6]

# New style - loop requires explicit flatten
- name: New way (explicit flatten)
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop: "{{ [[1, 2, 3], [4, 5, 6]] | flatten }}"
```

If you are converting old playbooks that use `with_items` with nested lists to the `loop` syntax, always add `| flatten` to maintain the same behavior.

## Using flatten with map

A powerful pattern is extracting attributes from nested structures and flattening the result:

```yaml
# Extract all ports from nested service definitions
- name: List all ports across all services
  ansible.builtin.debug:
    msg: "{{ services | map(attribute='ports') | flatten | unique | sort }}"
  vars:
    services:
      - name: web
        ports: [80, 443]
      - name: api
        ports: [3000, 3001]
      - name: monitoring
        ports: [9090, 3000]
```

Output: `[80, 443, 3000, 3001, 9090]`

The `map` extracts the ports attribute from each service (resulting in a list of lists), and `flatten` collapses them into a single list.

## Flatten with Conditional Data

When working with optional variables, flatten helps clean up lists that might contain empty sublists:

```yaml
# Handle optional package lists gracefully
- name: Install packages from all available sources
  ansible.builtin.apt:
    name: "{{ packages | flatten | select | list }}"
    state: present
  vars:
    packages:
      - "{{ required_packages }}"
      - "{{ optional_packages | default([]) }}"
      - "{{ development_packages if is_dev_server else [] }}"
```

The combination of `flatten` and `select` (which removes falsy values like empty strings and None) gives you a clean list regardless of which variable sources are defined.

## Generating Comma-Separated Values

Flatten is useful when you need to produce comma-separated values from nested data:

```jinja2
{# templates/pg_hba.conf.j2 - Generate PostgreSQL HBA entries #}
# PostgreSQL Client Authentication Configuration
# Managed by Ansible

# TYPE  DATABASE  USER  ADDRESS  METHOD
{% for entry in (default_hba + replication_hba + app_hba) | flatten %}
{{ entry.type }}  {{ entry.database }}  {{ entry.user }}  {{ entry.address }}  {{ entry.method }}
{% endfor %}
```

## Edge Cases

There are a few things to be aware of:

1. Flatten on a list that is already flat does nothing. It is safe to use defensively.

2. Flatten does not work on strings. If you pass a string, it stays as a string.

3. If your list contains None or null values mixed with sublists, flatten preserves the None values. Use `select` or `reject('none')` to clean those out.

```yaml
# Flatten preserves None values - clean them if needed
- name: Flatten and clean
  ansible.builtin.debug:
    msg: "{{ messy | flatten | select('defined') | list }}"
  vars:
    messy:
      - [1, 2]
      - null
      - [3, 4]
```

## Summary

The flatten filter is a workhorse for data aggregation in Ansible. Any time you combine variables from multiple sources, you are likely to end up with lists of lists. Use flatten to collapse them into a single list, pair it with `unique` to remove duplicates, and add `sort` for idempotent output. Remember that `loop` does not auto-flatten like the old `with_items` did, so add flatten explicitly when migrating legacy playbooks.
