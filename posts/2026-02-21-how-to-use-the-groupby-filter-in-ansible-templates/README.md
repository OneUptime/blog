# How to Use the groupby Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Filters, Configuration Management

Description: Learn how to use the groupby filter in Ansible templates to organize and categorize data by specific attributes for cleaner configuration generation.

---

When you are working with lists of structured data in Ansible, you often need to group items by a shared attribute. Maybe you have a list of servers and want to group them by datacenter, or a list of users that need to be grouped by department. The `groupby` filter in Jinja2 templates gives you a clean way to do exactly that.

This filter comes from Jinja2, and Ansible makes it available in templates and even in task-level expressions. Let me walk through how it works, what gotchas to watch for, and some practical examples you can use in your own playbooks.

## What groupby Actually Does

The `groupby` filter takes a list of objects (dictionaries, typically) and groups them by a specified attribute. The result is a list of tuples, where each tuple contains the group key and a list of items that share that key.

If you have worked with Python's `itertools.groupby` or SQL's `GROUP BY`, the concept is the same. The difference is that Jinja2's `groupby` does not require the input to be pre-sorted.

## Basic Syntax

The basic pattern looks like this inside a Jinja2 template:

```jinja2
{# Group a list of items by a specific attribute #}
{% for group_name, group_items in my_list | groupby('attribute_name') %}
  Group: {{ group_name }}
  {% for item in group_items %}
    - {{ item.name }}
  {% endfor %}
{% endfor %}
```

## A Practical Example: Grouping Servers by Environment

Suppose you have an inventory or variable file that defines a list of servers with their environments.

Here is the variable definition in your playbook or vars file:

```yaml
# vars/servers.yml - List of servers with environment labels
servers:
  - name: web01
    environment: production
    role: webserver
  - name: web02
    environment: production
    role: webserver
  - name: db01
    environment: production
    role: database
  - name: web03
    environment: staging
    role: webserver
  - name: db02
    environment: staging
    role: database
  - name: dev01
    environment: development
    role: webserver
```

Now create a template that generates a report grouped by environment:

```jinja2
{# templates/server_report.txt.j2 - Generate a server report grouped by environment #}
Server Inventory Report
========================

{% for env, env_servers in servers | groupby('environment') %}
Environment: {{ env | upper }}
-----------------------------------
{% for server in env_servers %}
  Hostname: {{ server.name }}
  Role:     {{ server.role }}
{% endfor %}

{% endfor %}
```

The playbook to render this template:

```yaml
# playbook.yml - Render the grouped server report
---
- name: Generate server inventory report
  hosts: localhost
  vars_files:
    - vars/servers.yml
  tasks:
    - name: Create the server report
      ansible.builtin.template:
        src: templates/server_report.txt.j2
        dest: /tmp/server_report.txt
```

The output would look like this:

```
Server Inventory Report
========================

Environment: DEVELOPMENT
-----------------------------------
  Hostname: dev01
  Role:     webserver

Environment: PRODUCTION
-----------------------------------
  Hostname: web01
  Role:     webserver
  Hostname: web02
  Role:     webserver
  Hostname: db01
  Role:     database

Environment: STAGING
-----------------------------------
  Hostname: web03
  Role:     webserver
  Hostname: db02
  Role:     database
```

Notice that the groups are sorted alphabetically by the group key. That is the default behavior of `groupby`.

## Generating Configuration Files with groupby

A common real-world use case is generating configuration files where sections correspond to groups. Let me show an example with a load balancer config.

```yaml
# vars/backends.yml - Backend servers for an HAProxy configuration
backends:
  - name: app01
    ip: 10.0.1.10
    port: 8080
    pool: web
  - name: app02
    ip: 10.0.1.11
    port: 8080
    pool: web
  - name: api01
    ip: 10.0.2.10
    port: 9090
    pool: api
  - name: api02
    ip: 10.0.2.11
    port: 9090
    pool: api
  - name: ws01
    ip: 10.0.3.10
    port: 8443
    pool: websocket
```

The HAProxy template using groupby:

```jinja2
{# templates/haproxy.cfg.j2 - HAProxy config with backend pools grouped by pool name #}
global
    log /dev/log local0
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

{% for pool_name, pool_servers in backends | groupby('pool') %}
backend {{ pool_name }}_backend
    balance roundrobin
{% for server in pool_servers %}
    server {{ server.name }} {{ server.ip }}:{{ server.port }} check
{% endfor %}

{% endfor %}
```

This produces a valid HAProxy config with each backend pool defined separately, all from a single flat list of servers.

## Nested Grouping

You can also do nested grouping if you need to categorize by multiple attributes. While `groupby` itself only groups by one key at a time, you can chain the logic:

```jinja2
{# templates/nested_report.txt.j2 - Group servers by environment, then by role #}
{% for env, env_servers in servers | groupby('environment') %}
== {{ env | upper }} ==
{% for role, role_servers in env_servers | groupby('role') %}
  [{{ role }}]
{% for server in role_servers %}
    - {{ server.name }}
{% endfor %}
{% endfor %}

{% endfor %}
```

This first groups by environment, then within each environment group, it groups again by role. The result is a nicely nested report.

## Using groupby with the default Filter

Sometimes the attribute you are grouping by might not exist on every item. You can handle this by using the `default` filter in combination:

```jinja2
{# templates/safe_grouping.j2 - Handle missing attributes with default values #}
{% for region, region_servers in servers | groupby(attribute='region', default='unknown') %}
Region: {{ region }}
{% for server in region_servers %}
  - {{ server.name }}
{% endfor %}
{% endfor %}
```

In older versions of Jinja2 (before 3.0), the `default` parameter was not available. In that case, you would need to make sure all items have the attribute set before passing them to groupby.

## Using groupby in Task-Level Expressions

You are not limited to using groupby inside templates. You can also use it in task loops and conditionals:

```yaml
# Use groupby directly in a playbook task to loop over groups
- name: Show servers grouped by environment
  ansible.builtin.debug:
    msg: "Environment {{ item.0 }} has {{ item.1 | length }} servers"
  loop: "{{ servers | groupby('environment') }}"
  loop_control:
    label: "{{ item.0 }}"
```

Note that in task-level expressions, each item in the loop is a list with two elements: `item.0` is the group key and `item.1` is the list of grouped items.

## Combining groupby with Other Filters

The power of groupby grows when you combine it with other Jinja2 filters:

```jinja2
{# templates/summary.txt.j2 - Combine groupby with map and length for summaries #}
Summary:
{% for env, env_servers in servers | groupby('environment') %}
  {{ env }}: {{ env_servers | length }} servers ({{ env_servers | map(attribute='name') | join(', ') }})
{% endfor %}
```

You can also sort the groups in reverse order:

```jinja2
{# Reverse the group order #}
{% for env, env_servers in servers | groupby('environment') | reverse %}
  {{ env }}: {{ env_servers | length }} servers
{% endfor %}
```

## Things to Watch Out For

There are a few things that trip people up when working with groupby:

1. The output groups are sorted alphabetically by the group key. If you need a specific order, you will need to sort or reorder after grouping.

2. If items have inconsistent attribute names (some use "env" while others use "environment"), groupby will not merge them. Make sure your data is consistent.

3. When using groupby in `loop` at the task level, remember to use `item.0` and `item.1` rather than unpacking syntax.

4. The groupby filter returns a list of namedtuples in Jinja2, but in Ansible's task context, they behave like regular lists.

## Wrapping Up

The `groupby` filter is one of those tools that feels simple but saves you from writing a lot of messy conditional logic. Instead of manually checking attributes and building groups yourself, you let the filter handle the categorization and focus your template logic on rendering the output.

Whether you are generating HAProxy configs, Nginx upstream blocks, inventory reports, or any other structured output from flat data, groupby keeps your templates clean and readable. Pair it with `map`, `selectattr`, and `sort` for even more powerful data transformations right inside your templates.
