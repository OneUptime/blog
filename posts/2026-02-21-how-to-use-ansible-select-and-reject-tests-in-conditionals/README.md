# How to Use Ansible select and reject Tests in Conditionals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2 Filters, Conditionals, Automation

Description: Master the Ansible select and reject filters to filter lists based on test conditions for cleaner and more expressive playbook logic.

---

Ansible leverages Jinja2's `select` and `reject` filters to let you filter lists based on test functions. These filters are incredibly useful when you need to extract specific items from a list based on conditions, without writing explicit loops with `when` clauses. They make your playbooks more concise and your variable transformations more readable.

## Understanding select and reject

The `select` filter keeps items that pass a test. The `reject` filter does the opposite and removes items that pass the test. Think of `select` as "keep matches" and `reject` as "drop matches."

```yaml
# Basic select example: keep only numbers greater than 5
- name: Filter numbers greater than 5
  ansible.builtin.debug:
    msg: "{{ [1, 3, 5, 7, 9, 11] | select('greaterthan', 5) | list }}"
  # Output: [7, 9, 11]

# Basic reject example: remove numbers greater than 5
- name: Filter numbers not greater than 5
  ansible.builtin.debug:
    msg: "{{ [1, 3, 5, 7, 9, 11] | reject('greaterthan', 5) | list }}"
  # Output: [1, 3, 5]
```

Notice the `| list` at the end. The `select` and `reject` filters return generators, so you need to pipe to `list` to get an actual list you can work with.

## Available Test Functions

Ansible and Jinja2 provide many built-in tests you can use with `select` and `reject`:

- `defined` / `undefined` - check if values are defined
- `none` - check for None values
- `string` / `number` / `integer` / `float` - type checks
- `mapping` / `iterable` / `sequence` - collection type checks
- `equalto` - equality comparison
- `greaterthan` / `lessthan` - numeric comparisons
- `match` / `search` / `regex` - string pattern matching
- `in` - membership test

Here is a practical example using several of these:

```yaml
# Filter a list of server records using different test functions
- name: Set server list
  ansible.builtin.set_fact:
    servers:
      - { name: "web01", port: 80, active: true }
      - { name: "web02", port: 443, active: true }
      - { name: "db01", port: 5432, active: false }
      - { name: "cache01", port: 6379, active: true }
      - { name: "db02", port: 3306, active: false }

# selectattr filters objects based on an attribute passing a test
- name: Get only active servers
  ansible.builtin.debug:
    msg: "{{ servers | selectattr('active', 'equalto', true) | list }}"

# rejectattr removes objects where the attribute passes the test
- name: Get inactive servers
  ansible.builtin.debug:
    msg: "{{ servers | rejectattr('active') | list }}"
```

## selectattr and rejectattr for Dictionaries

While `select` and `reject` work on simple lists, `selectattr` and `rejectattr` work on lists of dictionaries (or objects) by testing a specific attribute:

```yaml
# Filter users based on their role attribute
- name: Define users
  ansible.builtin.set_fact:
    users:
      - { name: "alice", role: "admin", department: "engineering" }
      - { name: "bob", role: "developer", department: "engineering" }
      - { name: "charlie", role: "admin", department: "operations" }
      - { name: "diana", role: "developer", department: "operations" }
      - { name: "eve", role: "viewer", department: "marketing" }

# Select only admin users
- name: Get admin users
  ansible.builtin.debug:
    msg: "{{ users | selectattr('role', 'equalto', 'admin') | map(attribute='name') | list }}"
  # Output: ["alice", "charlie"]

# Reject viewers from the list
- name: Get non-viewer users
  ansible.builtin.debug:
    msg: "{{ users | rejectattr('role', 'equalto', 'viewer') | map(attribute='name') | list }}"
  # Output: ["alice", "bob", "charlie", "diana"]

# Chain selectattr with map to get specific attributes
- name: Get names of engineering department users
  ansible.builtin.debug:
    msg: "{{ users | selectattr('department', 'equalto', 'engineering') | map(attribute='name') | list }}"
  # Output: ["alice", "bob"]
```

## Using select with String Matching

The `match` and `search` tests enable powerful string-based filtering:

```yaml
# Filter file paths based on patterns
- name: Define file list
  ansible.builtin.set_fact:
    files:
      - "/etc/nginx/nginx.conf"
      - "/etc/nginx/sites-enabled/default"
      - "/etc/apache2/apache2.conf"
      - "/etc/nginx/conf.d/ssl.conf"
      - "/etc/apache2/sites-enabled/000-default"

# Select only nginx configuration files
- name: Get nginx config files
  ansible.builtin.debug:
    msg: "{{ files | select('search', 'nginx') | list }}"
  # Output: files containing 'nginx' in the path

# Select files ending in .conf
- name: Get .conf files
  ansible.builtin.debug:
    msg: "{{ files | select('match', '.*\\.conf$') | list }}"

# Reject apache files from the list
- name: Get non-apache files
  ansible.builtin.debug:
    msg: "{{ files | reject('search', 'apache') | list }}"
```

The `match` test checks from the beginning of the string (like `re.match` in Python), while `search` looks for the pattern anywhere in the string (like `re.search`).

## Combining select with Conditionals

You can use `select` and `reject` results directly in `when` clauses:

```yaml
# Only run a task if there are critical alerts in the list
- name: Define alerts
  ansible.builtin.set_fact:
    alerts:
      - { message: "Disk space low", severity: "warning" }
      - { message: "Service down", severity: "critical" }
      - { message: "High CPU usage", severity: "warning" }

- name: Send emergency notification
  ansible.builtin.mail:
    to: oncall@example.com
    subject: "Critical alerts detected"
    body: "{{ alerts | selectattr('severity', 'equalto', 'critical') | map(attribute='message') | join(', ') }}"
  when: (alerts | selectattr('severity', 'equalto', 'critical') | list | length) > 0
```

The `when` clause checks if the filtered list has any items. If there are no critical alerts, the notification task is skipped entirely.

## Chaining Filters for Complex Queries

You can chain `select`, `reject`, `selectattr`, and `rejectattr` together with other Jinja2 filters:

```yaml
# Complex filtering pipeline on a list of services
- name: Define services
  ansible.builtin.set_fact:
    services:
      - { name: "api", replicas: 3, environment: "production", healthy: true }
      - { name: "worker", replicas: 2, environment: "production", healthy: false }
      - { name: "api-staging", replicas: 1, environment: "staging", healthy: true }
      - { name: "scheduler", replicas: 1, environment: "production", healthy: true }
      - { name: "worker-staging", replicas: 1, environment: "staging", healthy: false }

# Get names of unhealthy production services
- name: Find unhealthy production services
  ansible.builtin.debug:
    msg: >-
      {{
        services
        | selectattr('environment', 'equalto', 'production')
        | rejectattr('healthy')
        | map(attribute='name')
        | list
      }}
  # Output: ["worker"]

# Count healthy services per environment
- name: Count healthy production services
  ansible.builtin.debug:
    msg: >-
      Healthy production services:
      {{
        services
        | selectattr('environment', 'equalto', 'production')
        | selectattr('healthy')
        | list
        | length
      }}
```

This chaining pattern reads top to bottom like a data pipeline: start with all services, filter to production, reject unhealthy ones, extract names, convert to list.

## Practical Example: Dynamic Inventory Filtering

Here is a real-world example where `selectattr` simplifies managing host groups:

```yaml
# Dynamically assign tasks based on filtered host metadata
- name: Manage hosts based on attributes
  hosts: localhost
  vars:
    host_inventory:
      - { hostname: "web01", datacenter: "us-east", os: "ubuntu", maintenance: false }
      - { hostname: "web02", datacenter: "us-west", os: "ubuntu", maintenance: true }
      - { hostname: "db01", datacenter: "us-east", os: "centos", maintenance: false }
      - { hostname: "db02", datacenter: "us-west", os: "centos", maintenance: false }
      - { hostname: "cache01", datacenter: "us-east", os: "ubuntu", maintenance: false }

  tasks:
    # Get all hosts not in maintenance
    - name: Identify active hosts
      ansible.builtin.set_fact:
        active_hosts: "{{ host_inventory | rejectattr('maintenance') | list }}"

    # From active hosts, get only Ubuntu hosts in us-east
    - name: Identify target hosts for Ubuntu update
      ansible.builtin.set_fact:
        ubuntu_east_hosts: >-
          {{
            active_hosts
            | selectattr('os', 'equalto', 'ubuntu')
            | selectattr('datacenter', 'equalto', 'us-east')
            | map(attribute='hostname')
            | list
          }}

    - name: Show targeted hosts
      ansible.builtin.debug:
        msg: "Will update: {{ ubuntu_east_hosts }}"
      # Output: ["web01", "cache01"]
```

## Using select Without a Test

When you call `select` or `reject` without specifying a test, they filter based on truthiness:

```yaml
# Filter out falsy values from a list
- name: Remove empty and false values
  ansible.builtin.debug:
    msg: "{{ [true, false, '', 'hello', 0, 42, none, 'world'] | select | list }}"
  # Output: [true, "hello", 42, "world"]

- name: Keep only falsy values
  ansible.builtin.debug:
    msg: "{{ [true, false, '', 'hello', 0, 42, none, 'world'] | reject | list }}"
  # Output: [false, "", 0, none]
```

This is handy for cleaning up lists that might contain empty strings or None values from previous processing steps.

## Summary

The `select` and `reject` filters (along with their attribute-aware cousins `selectattr` and `rejectattr`) give you a powerful, declarative way to filter lists in Ansible. Instead of writing loops with `when` clauses to build filtered lists, you can express the filtering inline as part of a Jinja2 expression. They are especially powerful when chained together and combined with `map`, `list`, and `length` to build complex data transformation pipelines right inside your playbook variables.
