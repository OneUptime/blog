# How to Use the sort Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Filters, Sorting

Description: Master the sort filter in Ansible templates to order lists of strings, numbers, and dictionaries for predictable configuration file generation.

---

Sorting data might seem like a trivial operation, but in the context of configuration management, it matters more than you might think. When Ansible generates configuration files from templates, unsorted data can cause unnecessary diffs between runs. A list of firewall rules that keeps changing order will trigger a service restart every single time, even though nothing actually changed. The `sort` filter fixes that problem.

Let me show you how the sort filter works in Ansible templates and playbooks, along with real examples you can adapt.

## Basic Sorting

At its simplest, the sort filter orders a list in ascending order:

```jinja2
{# Sort a simple list of strings alphabetically #}
{% set fruits = ['banana', 'apple', 'cherry', 'date'] %}
{% for item in fruits | sort %}
{{ item }}
{% endfor %}
```

Output:

```
apple
banana
cherry
date
```

In a playbook task:

```yaml
# Sort a list and display the result
- name: Show sorted packages
  ansible.builtin.debug:
    msg: "{{ packages | sort }}"
  vars:
    packages:
      - nginx
      - curl
      - apache2
      - vim
```

This prints `['apache2', 'curl', 'nginx', 'vim']`.

## Reverse Sorting

To sort in descending order, pass `reverse=true`:

```jinja2
{# Sort numbers in descending order #}
{% set numbers = [42, 7, 19, 3, 88] %}
{% for num in numbers | sort(reverse=true) %}
{{ num }}
{% endfor %}
```

In a playbook:

```yaml
# Sort a list of version numbers in reverse
- name: Show latest versions first
  ansible.builtin.debug:
    msg: "{{ versions | sort(reverse=true) }}"
  vars:
    versions:
      - "1.0.0"
      - "2.3.1"
      - "1.5.0"
      - "3.0.0"
```

## Sorting Lists of Dictionaries

This is where things get practical. Most real-world Ansible data is structured as lists of dictionaries. You can sort these by a specific attribute using the `attribute` parameter.

```yaml
# vars/users.yml - List of users with priority levels
users:
  - name: alice
    uid: 1003
    priority: 2
  - name: bob
    uid: 1001
    priority: 1
  - name: charlie
    uid: 1005
    priority: 3
  - name: diana
    uid: 1002
    priority: 1
```

Sort by the `uid` attribute:

```jinja2
{# templates/passwd_entries.j2 - Generate passwd-style entries sorted by UID #}
# User entries sorted by UID
{% for user in users | sort(attribute='uid') %}
{{ user.name }}:x:{{ user.uid }}:{{ user.uid }}::/home/{{ user.name }}:/bin/bash
{% endfor %}
```

Output:

```
# User entries sorted by UID
bob:x:1001:1001::/home/bob:/bin/bash
diana:x:1002:1002::/home/diana:/bin/bash
alice:x:1003:1003::/home/alice:/bin/bash
charlie:x:1005:1005::/home/charlie:/bin/bash
```

## Sorting by Multiple Attributes

Jinja2's sort filter supports sorting by multiple attributes using a comma-separated string. Items are sorted by the first attribute, then by the second attribute for ties:

```jinja2
{# Sort by priority first, then by name for users with the same priority #}
{% for user in users | sort(attribute='priority,name') %}
{{ user.priority }} - {{ user.name }} (UID: {{ user.uid }})
{% endfor %}
```

Output:

```
1 - bob (UID: 1001)
1 - diana (UID: 1002)
2 - alice (UID: 1003)
3 - charlie (UID: 1005)
```

Bob and Diana both have priority 1, so they are further sorted alphabetically by name.

## Case-Insensitive Sorting

By default, sorting is case-sensitive, which means uppercase letters come before lowercase letters. You can control this with the `case_sensitive` parameter:

```jinja2
{# Case-insensitive sort for mixed-case hostnames #}
{% set hosts = ['Zebra', 'alpha', 'Beta', 'gamma'] %}

Case-sensitive (default):
{% for h in hosts | sort %}
  {{ h }}
{% endfor %}

Case-insensitive:
{% for h in hosts | sort(case_sensitive=false) %}
  {{ h }}
{% endfor %}
```

Case-sensitive output: `Beta, Zebra, alpha, gamma`
Case-insensitive output: `alpha, Beta, gamma, Zebra`

## Practical Example: Generating Sorted Firewall Rules

One of the most common reasons to sort in templates is to prevent unnecessary config changes. Here is a firewall rules example:

```yaml
# vars/firewall.yml - Firewall rules that might come from multiple sources
firewall_rules:
  - port: 443
    protocol: tcp
    source: 0.0.0.0/0
    comment: HTTPS
  - port: 22
    protocol: tcp
    source: 10.0.0.0/8
    comment: SSH internal
  - port: 80
    protocol: tcp
    source: 0.0.0.0/0
    comment: HTTP
  - port: 5432
    protocol: tcp
    source: 10.0.1.0/24
    comment: PostgreSQL
  - port: 53
    protocol: udp
    source: 10.0.0.0/8
    comment: DNS
```

The template sorts rules by port number for consistent output:

```jinja2
{# templates/iptables_rules.j2 - Generate iptables rules sorted by port number #}
# Firewall rules - managed by Ansible
# Do not edit manually
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Allow loopback
-A INPUT -i lo -j ACCEPT
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Application rules (sorted by port)
{% for rule in firewall_rules | sort(attribute='port') %}
# {{ rule.comment }}
-A INPUT -p {{ rule.protocol }} -s {{ rule.source }} --dport {{ rule.port }} -j ACCEPT
{% endfor %}

COMMIT
```

Because the rules are always sorted by port, running the playbook multiple times produces identical output unless the actual rules change. No more phantom diffs.

## Sorting in Task Loops

You can also sort directly in a `loop` directive:

```yaml
# Install packages in alphabetical order for cleaner logs
- name: Install required packages
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: "{{ required_packages | sort }}"
  vars:
    required_packages:
      - nginx
      - certbot
      - fail2ban
      - ufw
      - logrotate
```

## Sorting Nested Attributes

If your data has nested structures, you can sort by a nested attribute using dot notation:

```yaml
# Sort services by their config's listen port
services:
  - name: frontend
    config:
      listen_port: 8080
  - name: api
    config:
      listen_port: 3000
  - name: admin
    config:
      listen_port: 9090
```

```jinja2
{# Sort by a nested attribute using dot notation #}
{% for svc in services | sort(attribute='config.listen_port') %}
{{ svc.name }}: port {{ svc.config.listen_port }}
{% endfor %}
```

Output:

```
api: port 3000
frontend: port 8080
admin: port 9090
```

## Combining sort with Other Filters

The sort filter works well chained with other filters:

```jinja2
{# Get the top 3 users by UID (highest first) #}
{% for user in users | sort(attribute='uid', reverse=true) | list | batch(3) | first %}
{{ user.name }}: {{ user.uid }}
{% endfor %}
```

Or use it with `map` and `unique`:

```yaml
# Get a sorted, deduplicated list of all environments
- name: List unique environments
  ansible.builtin.debug:
    msg: "{{ servers | map(attribute='environment') | unique | sort | list }}"
```

## Idempotent Configuration Generation

Here is the core principle: always sort data before rendering it into configuration files. This applies to any template-generated config where ordering does not matter functionally but matters for idempotency.

```jinja2
{# templates/hosts_allow.j2 - Sorted for idempotency #}
# /etc/hosts.allow - Managed by Ansible
{% for entry in allowed_hosts | sort(attribute='service') %}
{{ entry.service }}: {{ entry.networks | sort | join(', ') }}
{% endfor %}
```

Without sorting, if the variable data comes from multiple sources (group_vars, host_vars, dynamic inventory), the order might differ between runs and cause unnecessary changes.

## Summary

The sort filter is a small tool with outsized impact on your Ansible workflows. It keeps configuration files stable between runs, makes logs easier to read, and ensures that your generated configs are always predictable. Use `attribute` for sorting dictionaries, `reverse=true` for descending order, and `case_sensitive=false` when dealing with mixed-case strings. Most importantly, get into the habit of sorting any list before rendering it into a config file. Your future self will appreciate the clean diffs.
