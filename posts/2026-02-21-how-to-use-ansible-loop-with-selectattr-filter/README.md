# How to Use Ansible loop with selectattr Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Jinja2, Automation

Description: Learn how to use the selectattr filter in Ansible to filter lists of dictionaries before looping, enabling conditional iteration based on object attributes.

---

When you have a list of dictionaries in Ansible, you often need to loop over only the items that match certain criteria. Instead of cluttering your tasks with `when` conditions on every loop iteration, the `selectattr` filter lets you pre-filter the list before the loop even starts. This is cleaner, more efficient, and produces better output since skipped items do not show up at all.

This post covers how `selectattr` works, the test expressions you can use with it, and practical examples of combining it with `loop` for real infrastructure tasks.

## How selectattr Works

The `selectattr` filter selects items from a list of dictionaries based on an attribute test. It takes the attribute name and an optional test with a value.

```yaml
# basic-selectattr.yml
# Demonstrates filtering a list by an attribute value
- name: Basic selectattr example
  hosts: localhost
  gather_facts: false
  vars:
    servers:
      - name: web-01
        role: web
        enabled: true
      - name: web-02
        role: web
        enabled: false
      - name: db-01
        role: database
        enabled: true
      - name: cache-01
        role: cache
        enabled: true
  tasks:
    - name: Show only enabled servers
      ansible.builtin.debug:
        msg: "{{ item.name }} ({{ item.role }})"
      loop: "{{ servers | selectattr('enabled', 'equalto', true) | list }}"
```

The `| list` at the end is important. `selectattr` returns a generator, and Ansible's `loop` needs a list.

## Available Tests

The `selectattr` filter supports several Jinja2 tests.

| Test | Usage | Description |
|------|-------|-------------|
| `equalto` | `selectattr('key', 'equalto', 'value')` | Exact match |
| `ne` | `selectattr('key', 'ne', 'value')` | Not equal |
| `match` | `selectattr('key', 'match', '^web')` | Regex match from start |
| `search` | `selectattr('key', 'search', 'prod')` | Regex search anywhere |
| `defined` | `selectattr('key', 'defined')` | Attribute exists |
| `undefined` | `selectattr('key', 'undefined')` | Attribute missing |
| `truthy` | `selectattr('key', 'truthy')` | Truthy value |
| `falsy` | `selectattr('key', 'falsy')` | Falsy value |
| `in` | `selectattr('key', 'in', list)` | Value in list |

## Filtering by Role or Type

A common pattern is deploying different configurations based on a role attribute.

```yaml
# filter-by-role.yml
# Deploys service configs only to servers matching a specific role
- name: Deploy role-specific configurations
  hosts: localhost
  gather_facts: false
  vars:
    services:
      - name: nginx
        type: webserver
        port: 80
        config_template: nginx.conf.j2
      - name: postgresql
        type: database
        port: 5432
        config_template: postgresql.conf.j2
      - name: redis
        type: cache
        port: 6379
        config_template: redis.conf.j2
      - name: haproxy
        type: loadbalancer
        port: 443
        config_template: haproxy.cfg.j2
      - name: apache
        type: webserver
        port: 8080
        config_template: apache.conf.j2
  tasks:
    - name: Show only webserver services
      ansible.builtin.debug:
        msg: "{{ item.name }} on port {{ item.port }}"
      loop: "{{ services | selectattr('type', 'equalto', 'webserver') | list }}"

    - name: Show only database services
      ansible.builtin.debug:
        msg: "{{ item.name }} on port {{ item.port }}"
      loop: "{{ services | selectattr('type', 'equalto', 'database') | list }}"
```

## Filtering Enabled vs Disabled Items

This is probably the most frequently used pattern: only operate on items that are marked as enabled.

```yaml
# enabled-filter.yml
# Starts only the services marked as enabled
- name: Manage enabled services
  hosts: appservers
  become: true
  vars:
    managed_services:
      - name: nginx
        enabled: true
        state: started
      - name: redis-server
        enabled: true
        state: started
      - name: apache2
        enabled: false
        state: stopped
      - name: memcached
        enabled: false
        state: stopped
      - name: postgresql
        enabled: true
        state: started
  tasks:
    - name: Start enabled services
      ansible.builtin.service:
        name: "{{ item.name }}"
        state: "{{ item.state }}"
        enabled: true
      loop: "{{ managed_services | selectattr('enabled', 'truthy') | list }}"

    - name: Stop disabled services
      ansible.builtin.service:
        name: "{{ item.name }}"
        state: stopped
        enabled: false
      loop: "{{ managed_services | selectattr('enabled', 'falsy') | list }}"
```

## Using rejectattr (the Opposite)

The `rejectattr` filter is the inverse of `selectattr`. It returns items that do NOT match the condition.

```yaml
# rejectattr-example.yml
# Finds servers that are NOT in maintenance mode
- name: Find active servers
  hosts: localhost
  gather_facts: false
  vars:
    servers:
      - name: web-01
        maintenance: false
      - name: web-02
        maintenance: true
      - name: web-03
        maintenance: false
      - name: db-01
        maintenance: true
  tasks:
    - name: Show servers NOT in maintenance
      ansible.builtin.debug:
        msg: "{{ item.name }} is active"
      loop: "{{ servers | rejectattr('maintenance', 'truthy') | list }}"
```

## Filtering with Regex

The `match` and `search` tests support regular expressions.

```yaml
# regex-filter.yml
# Selects items whose name matches a regex pattern
- name: Filter by name pattern
  hosts: localhost
  gather_facts: false
  vars:
    inventory_items:
      - name: prod-web-01
        ip: 10.0.1.10
      - name: prod-web-02
        ip: 10.0.1.11
      - name: staging-web-01
        ip: 10.1.1.10
      - name: prod-db-01
        ip: 10.0.2.10
      - name: dev-web-01
        ip: 10.2.1.10
  tasks:
    - name: Show only production servers
      ansible.builtin.debug:
        msg: "{{ item.name }}: {{ item.ip }}"
      loop: "{{ inventory_items | selectattr('name', 'match', '^prod-') | list }}"

    - name: Show only web servers (any environment)
      ansible.builtin.debug:
        msg: "{{ item.name }}: {{ item.ip }}"
      loop: "{{ inventory_items | selectattr('name', 'search', '-web-') | list }}"
```

`match` tests from the beginning of the string (like Python's `re.match`), while `search` looks anywhere in the string (like `re.search`).

## Chaining Multiple Filters

You can chain `selectattr` calls to apply multiple conditions (AND logic).

```yaml
# multi-filter.yml
# Applies multiple filter conditions to find specific items
- name: Multi-condition filtering
  hosts: localhost
  gather_facts: false
  vars:
    applications:
      - name: api
        environment: production
        healthy: true
        version: "2.1.0"
      - name: worker
        environment: production
        healthy: false
        version: "2.0.9"
      - name: api
        environment: staging
        healthy: true
        version: "2.2.0-beta"
      - name: scheduler
        environment: production
        healthy: true
        version: "1.5.0"
  tasks:
    - name: Find production apps that are healthy
      ansible.builtin.debug:
        msg: "{{ item.name }} v{{ item.version }}"
      loop: >-
        {{
          applications
          | selectattr('environment', 'equalto', 'production')
          | selectattr('healthy', 'equalto', true)
          | list
        }}
```

Each `selectattr` in the chain further narrows the list.

## Practical Example: Firewall Rules

Use `selectattr` to apply only the rules relevant to the current host.

```yaml
# firewall-filter.yml
# Applies firewall rules filtered by the target environment
- name: Apply environment-specific firewall rules
  hosts: all
  become: true
  vars:
    all_rules:
      - port: 22
        proto: tcp
        environments: ["production", "staging", "development"]
      - port: 80
        proto: tcp
        environments: ["production", "staging"]
      - port: 443
        proto: tcp
        environments: ["production"]
      - port: 8080
        proto: tcp
        environments: ["staging", "development"]
      - port: 3000
        proto: tcp
        environments: ["development"]
    current_env: production
  tasks:
    - name: Apply rules for current environment
      community.general.ufw:
        rule: allow
        port: "{{ item.port | string }}"
        proto: "{{ item.proto }}"
      loop: "{{ all_rules | selectattr('environments', 'contains', current_env) | list }}"
```

Note: The `contains` test checks if a list attribute contains a specific value.

## Filtering Registered Results

You can filter registered loop results using `selectattr` on the `.changed` or `.failed` attributes.

```yaml
# filter-results.yml
# Filters registered loop results to find changed items
- name: Filter loop results
  hosts: all
  become: true
  tasks:
    - name: Create configuration files
      ansible.builtin.template:
        src: "{{ item }}.j2"
        dest: "/etc/myapp/{{ item }}"
      loop:
        - app.conf
        - db.conf
        - cache.conf
        - queue.conf
      register: config_results

    - name: Show only changed configurations
      ansible.builtin.debug:
        msg: "{{ item.item }} was updated"
      loop: "{{ config_results.results | selectattr('changed', 'equalto', true) | list }}"
```

## Checking for Defined Attributes

When items in your list may or may not have certain attributes, `selectattr` with the `defined` test prevents errors.

```yaml
# defined-filter.yml
# Processes only items that have a specific optional attribute
- name: Handle optional attributes
  hosts: localhost
  gather_facts: false
  vars:
    users:
      - name: alice
        email: alice@example.com
        sudo: true
      - name: bob
        email: bob@example.com
      - name: charlie
        email: charlie@example.com
        sudo: true
  tasks:
    - name: Show users with sudo access defined
      ansible.builtin.debug:
        msg: "{{ item.name }} has sudo access"
      loop: "{{ users | selectattr('sudo', 'defined') | selectattr('sudo', 'truthy') | list }}"
```

First we filter for users where `sudo` is defined, then we filter for those where it is truthy. Without the `defined` check first, Ansible would throw an error on users without the `sudo` attribute.

## Summary

The `selectattr` filter is one of the most useful tools for working with lists of dictionaries in Ansible. It lets you filter data before it reaches the loop, which is cleaner than using `when` conditions inside the loop. The key patterns are: use `equalto` for exact matches, `match` and `search` for regex, `truthy` and `falsy` for boolean-like checks, and `defined`/`undefined` for optional attributes. Chain multiple `selectattr` calls for AND logic, and use `rejectattr` for the inverse. Always remember to append `| list` at the end since `selectattr` returns a generator that `loop` cannot consume directly.
