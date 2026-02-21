# How to Use the select and reject Filters in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Data Processing

Description: Learn how to use the select and reject filters in Ansible to filter list elements based on tests and conditions.

---

When working with lists in Ansible, you frequently need to filter items based on some condition: keep only the numbers above a threshold, remove empty strings, select only certain types of values, or reject items that match a pattern. The `select` and `reject` filters do exactly this. `select` keeps items that pass a test, and `reject` removes items that pass a test. They are the list filtering workhorses of Jinja2.

## Basic Syntax

Both filters work with Jinja2 tests (not filters). A test is something you would use with `is` in a Jinja2 expression:

```jinja2
{# select keeps items that pass the test #}
{{ [1, 2, 3, "", "hello", none, true] | select | list }}
{# Output: [1, 2, 3, 'hello', True] - keeps truthy values #}

{# reject removes items that pass the test #}
{{ [1, 2, 3, "", "hello", none, true] | reject | list }}
{# Output: ['', None] - keeps falsy values #}
```

Without any test specified, `select` keeps truthy values and `reject` keeps falsy values.

## Using Tests with select and reject

You can pass a test name to filter by specific conditions:

```jinja2
{# Select only strings #}
{{ [1, "hello", 2.5, "world", true, none] | select('string') | list }}
{# Output: ['hello', 'world'] #}

{# Select only numbers (integers) #}
{{ [1, "hello", 2, "world", 3] | select('integer') | list }}
{# Output: [1, 2, 3] #}

{# Reject none values #}
{{ [1, none, "hello", none, 3] | reject('none') | list }}
{# Output: [1, 'hello', 3] #}

{# Select defined values #}
{{ [1, undefined_var, "hello"] | select('defined') | list }}
```

## Comparison Tests

The most powerful use of `select` and `reject` involves comparison tests:

```jinja2
{# Numbers greater than 5 #}
{{ [1, 3, 5, 7, 9, 11] | select('gt', 5) | list }}
{# Output: [7, 9, 11] #}

{# Numbers less than or equal to 5 #}
{{ [1, 3, 5, 7, 9, 11] | select('le', 5) | list }}
{# Output: [1, 3, 5] #}

{# Strings equal to a specific value #}
{{ ["web", "api", "web", "worker", "api"] | select('eq', 'web') | list }}
{# Output: ['web', 'web'] #}

{# Reject a specific value #}
{{ ["web", "api", "web", "worker", "api"] | reject('eq', 'web') | list }}
{# Output: ['api', 'worker', 'api'] #}
```

Available comparison tests:
- `eq` (equal)
- `ne` (not equal)
- `gt` (greater than)
- `ge` (greater than or equal)
- `lt` (less than)
- `le` (less than or equal)

## Practical Example: Filtering Servers by Role

```yaml
# filter_servers.yml - Filter servers based on properties
- name: Configure servers by role
  hosts: localhost
  vars:
    all_servers:
      - name: web-01
        ip: "10.0.1.10"
        port: 8080
        role: web
        enabled: true
      - name: web-02
        ip: "10.0.1.11"
        port: 8080
        role: web
        enabled: false
      - name: api-01
        ip: "10.0.2.10"
        port: 9090
        role: api
        enabled: true
      - name: db-01
        ip: "10.0.3.10"
        port: 5432
        role: database
        enabled: true
  tasks:
    - name: Get ports of enabled servers
      ansible.builtin.set_fact:
        active_ports: "{{ all_servers | selectattr('enabled') | map(attribute='port') | unique | list }}"

    - name: Display active ports
      ansible.builtin.debug:
        var: active_ports
```

Note that for filtering dictionaries by attribute, you should use `selectattr` and `rejectattr` (covered in a separate post). The `select` and `reject` filters work on the values themselves, not on attributes of objects.

## Filtering Port Numbers

```yaml
# firewall_config.yml - Filter ports for firewall rules
- name: Configure firewall
  hosts: all
  vars:
    all_ports:
      - 22
      - 80
      - 443
      - 3000
      - 5432
      - 8080
      - 9090
      - 27017
    privileged_port_threshold: 1024
  tasks:
    - name: Open privileged ports (below 1024)
      ansible.posix.firewalld:
        port: "{{ item }}/tcp"
        state: enabled
        permanent: true
      loop: "{{ all_ports | select('lt', privileged_port_threshold) | list }}"

    - name: Open high ports (1024 and above)
      ansible.posix.firewalld:
        port: "{{ item }}/tcp"
        state: enabled
        permanent: true
      loop: "{{ all_ports | select('ge', privileged_port_threshold) | list }}"
```

## Cleaning Up Lists

Remove empty or unwanted values from lists:

```jinja2
{# Remove empty strings #}
{% set raw_list = ["hello", "", "world", "", "ansible", ""] %}
{{ raw_list | reject('eq', '') | list }}
{# Output: ['hello', 'world', 'ansible'] #}

{# Remove none values #}
{% set mixed_list = [1, none, "hello", none, 3, none] %}
{{ mixed_list | reject('none') | list }}
{# Output: [1, 'hello', 3] #}

{# Keep only truthy values (removes "", 0, none, false, []) #}
{{ [0, 1, "", "hello", none, true, false, [], [1]] | select | list }}
{# Output: [1, 'hello', True, [1]] #}
```

## Template Example: Generating Firewall Rules

```yaml
# iptables.yml - Generate firewall rules with filtered ports
- name: Generate iptables rules
  hosts: all
  vars:
    firewall_rules:
      - port: 22
        protocol: tcp
        source: "0.0.0.0/0"
      - port: 80
        protocol: tcp
        source: "0.0.0.0/0"
      - port: 443
        protocol: tcp
        source: "0.0.0.0/0"
      - port: 5432
        protocol: tcp
        source: "10.0.0.0/8"
      - port: 6379
        protocol: tcp
        source: "10.0.0.0/8"
      - port: 9090
        protocol: tcp
        source: "10.0.0.0/8"
    public_ports:
      - 22
      - 80
      - 443
  tasks:
    - name: Generate iptables rules file
      ansible.builtin.template:
        src: iptables.rules.j2
        dest: /etc/iptables/rules.v4
```

```jinja2
{# iptables.rules.j2 - Firewall rules using select to categorize ports #}
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Allow loopback
-A INPUT -i lo -j ACCEPT

# Allow established connections
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Public ports (accessible from anywhere)
{% set public_rules = firewall_rules | selectattr('source', 'eq', '0.0.0.0/0') %}
{% for rule in public_rules %}
-A INPUT -p {{ rule.protocol }} --dport {{ rule.port }} -j ACCEPT
{% endfor %}

# Internal ports (restricted by source)
{% set internal_rules = firewall_rules | rejectattr('source', 'eq', '0.0.0.0/0') %}
{% for rule in internal_rules %}
-A INPUT -p {{ rule.protocol }} --dport {{ rule.port }} -s {{ rule.source }} -j ACCEPT
{% endfor %}

COMMIT
```

## Using select with match and search Tests

You can use Jinja2's `match` and `search` tests with `select` for pattern-based filtering:

```jinja2
{# Select strings that start with "web" #}
{{ ["web-01", "api-01", "web-02", "db-01"] | select('match', '^web') | list }}
{# Output: ['web-01', 'web-02'] #}

{# Select strings containing "prod" anywhere #}
{{ ["web-prod-01", "web-staging-01", "api-prod-01"] | select('search', 'prod') | list }}
{# Output: ['web-prod-01', 'api-prod-01'] #}

{# Reject strings matching a pattern #}
{{ ["web-01", "api-01", "web-02", "db-01"] | reject('match', '^web') | list }}
{# Output: ['api-01', 'db-01'] #}
```

## Filtering Inventory Groups

```yaml
# inventory_filter.yml - Filter hosts from inventory
- name: Process specific hosts
  hosts: localhost
  tasks:
    - name: Get web hosts from all groups
      ansible.builtin.set_fact:
        web_hosts: "{{ groups['all'] | select('match', '^web-') | list }}"

    - name: Get non-database hosts
      ansible.builtin.set_fact:
        non_db_hosts: "{{ groups['all'] | reject('match', '^db-') | list }}"

    - name: Display filtered hosts
      ansible.builtin.debug:
        msg: |
          Web hosts: {{ web_hosts | join(', ') }}
          Non-DB hosts: {{ non_db_hosts | join(', ') }}
```

## Combining select, reject, map, and join

Build complex data processing pipelines:

```jinja2
{# Get comma-separated list of active web server IPs #}
{% set active_web_ips = servers
   | selectattr('role', 'eq', 'web')
   | selectattr('enabled')
   | map(attribute='ip')
   | list
   | join(', ')
%}
allowed_ips = {{ active_web_ips }}
```

```jinja2
{# Count items matching a condition #}
Total servers: {{ all_servers | list | length }}
Active servers: {{ all_servers | selectattr('enabled') | list | length }}
Inactive servers: {{ all_servers | rejectattr('enabled') | list | length }}
```

## Using select to Filter Numeric Ranges

```yaml
# resource_allocation.yml - Allocate resources based on thresholds
- name: Categorize servers by memory
  hosts: localhost
  vars:
    server_specs:
      - name: small-1
        memory_gb: 2
      - name: medium-1
        memory_gb: 8
      - name: large-1
        memory_gb: 32
      - name: medium-2
        memory_gb: 16
      - name: small-2
        memory_gb: 4
  tasks:
    - name: Categorize by memory size
      ansible.builtin.set_fact:
        small_servers: "{{ server_specs | map(attribute='memory_gb') | select('le', 4) | list }}"
        medium_servers: "{{ server_specs | map(attribute='memory_gb') | select('gt', 4) | select('le', 16) | list }}"
        large_servers: "{{ server_specs | map(attribute='memory_gb') | select('gt', 16) | list }}"
```

## Wrapping Up

The `select` and `reject` filters are fundamental for list processing in Ansible. `select` keeps items that match a condition, `reject` removes items that match a condition. Combined with comparison tests (`eq`, `ne`, `gt`, `lt`, `ge`, `le`), pattern tests (`match`, `search`), and type tests (`string`, `integer`, `none`), they give you fine-grained control over which elements of a list make it into your final output. Chain them with `map` and `join` for a complete data processing pipeline.
