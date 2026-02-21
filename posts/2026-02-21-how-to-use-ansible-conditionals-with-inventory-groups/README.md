# How to Use Ansible Conditionals with Inventory Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Conditionals, Infrastructure

Description: Learn how to use Ansible when conditionals with inventory group membership to apply different configurations across host groups.

---

One of the biggest advantages of Ansible's inventory system is the ability to organize hosts into groups and then write playbooks that behave differently depending on which groups a host belongs to. Instead of writing separate playbooks for web servers, database servers, and load balancers, you write one playbook and use conditionals to apply the right tasks to the right hosts. This guide covers every pattern you need for group-based conditionals.

## The group_names Variable

Every host in Ansible has access to a magic variable called `group_names`. This is a list of all the groups that the current host belongs to (excluding `all` and `ungrouped`). This variable is the foundation of group-based conditionals.

Given this inventory:

```ini
# inventory/hosts.ini
[webservers]
web-01
web-02

[dbservers]
db-01
db-02

[monitoring]
mon-01

[production:children]
webservers
dbservers
monitoring
```

The host `web-01` would have `group_names` equal to `['webservers', 'production']`.

```yaml
# Basic group membership check
---
- name: Group-based task assignment
  hosts: all
  become: true

  tasks:
    - name: Show group membership
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} belongs to groups: {{ group_names }}"

    - name: Install nginx on web servers
      ansible.builtin.apt:
        name: nginx
        state: present
      when: "'webservers' in group_names"

    - name: Install PostgreSQL on database servers
      ansible.builtin.apt:
        name: postgresql
        state: present
      when: "'dbservers' in group_names"

    - name: Install Prometheus on monitoring servers
      ansible.builtin.apt:
        name: prometheus
        state: present
      when: "'monitoring' in group_names"
```

## Checking Parent Group Membership

Because `group_names` includes parent groups, you can create hierarchical group structures and check at any level.

```yaml
# inventory/hosts.ini
# [staging:children]
# staging_web
# staging_db
#
# [production:children]
# production_web
# production_db

---
- name: Environment-specific configuration
  hosts: all
  become: true

  tasks:
    - name: Apply production hardening
      ansible.builtin.include_role:
        name: hardening
      when: "'production' in group_names"

    - name: Enable debug logging on staging
      ansible.builtin.lineinfile:
        path: /etc/app/config.ini
        regexp: '^log_level='
        line: 'log_level=DEBUG'
      when: "'staging' in group_names"

    - name: Set production log level
      ansible.builtin.lineinfile:
        path: /etc/app/config.ini
        regexp: '^log_level='
        line: 'log_level=WARNING'
      when: "'production' in group_names"
```

## Combining Group Checks with Logical Operators

You can combine group membership checks with `and`, `or`, and `not` for precise targeting.

```yaml
# Complex group-based conditions
---
- name: Multi-group conditions
  hosts: all
  become: true

  tasks:
    # Only on production web servers
    - name: Configure SSL on production web servers
      ansible.builtin.include_role:
        name: ssl_config
      when:
        - "'webservers' in group_names"
        - "'production' in group_names"

    # On either web or API servers
    - name: Install common web packages
      ansible.builtin.apt:
        name:
          - curl
          - jq
        state: present
      when: "'webservers' in group_names or 'apiservers' in group_names"

    # On everything except monitoring
    - name: Install monitoring agent on non-monitoring hosts
      ansible.builtin.apt:
        name: node-exporter
        state: present
      when: "'monitoring' not in group_names"

    # Hosts that are in both webservers and canary groups
    - name: Deploy canary version to canary web servers
      ansible.builtin.copy:
        src: app-canary.jar
        dest: /opt/app/app.jar
      when:
        - "'webservers' in group_names"
        - "'canary' in group_names"
```

## Using the groups Variable

The `groups` variable is a dictionary containing all groups and their members. You can use it to check if specific hosts exist in groups or to iterate over group members.

```yaml
# Using the groups variable
---
- name: Cross-group references
  hosts: webservers
  become: true

  tasks:
    - name: Configure web servers to connect to database servers
      ansible.builtin.template:
        src: db-connections.conf.j2
        dest: /etc/app/db-connections.conf
      vars:
        db_hosts: "{{ groups['dbservers'] | default([]) }}"

    - name: Configure load balancer upstream
      ansible.builtin.template:
        src: upstream.conf.j2
        dest: /etc/nginx/conf.d/upstream.conf
      when: "'loadbalancers' in group_names"
      vars:
        backend_hosts: "{{ groups['webservers'] }}"

    - name: Check if there are any monitoring hosts
      ansible.builtin.debug:
        msg: "Monitoring infrastructure exists"
      when: groups['monitoring'] | default([]) | length > 0
```

## Dynamic Group-Based Variable Loading

A powerful pattern is loading different variable files based on group membership.

```yaml
# Load variables based on groups
---
- name: Dynamic variable loading
  hosts: all
  become: true

  tasks:
    - name: Load web server variables
      ansible.builtin.include_vars:
        file: "vars/webserver.yml"
      when: "'webservers' in group_names"

    - name: Load database variables
      ansible.builtin.include_vars:
        file: "vars/database.yml"
      when: "'dbservers' in group_names"

    - name: Load environment-specific variables
      ansible.builtin.include_vars:
        file: "vars/{{ item }}.yml"
      loop: "{{ group_names }}"
      when: "item in ['production', 'staging', 'development']"
      ignore_errors: true
```

## Group-Based Role Assignment

Instead of applying roles at the play level, you can conditionally include roles based on group membership. This lets you have a single play for all hosts.

```yaml
# Conditional role inclusion based on groups
---
- name: Configure all servers
  hosts: all
  become: true

  tasks:
    - name: Apply base configuration to all hosts
      ansible.builtin.include_role:
        name: base

    - name: Apply web server role
      ansible.builtin.include_role:
        name: webserver
      when: "'webservers' in group_names"

    - name: Apply database role
      ansible.builtin.include_role:
        name: database
      when: "'dbservers' in group_names"

    - name: Apply cache server role
      ansible.builtin.include_role:
        name: redis
      when: "'cacheservers' in group_names"

    - name: Apply monitoring role
      ansible.builtin.include_role:
        name: monitoring
      when: "'monitoring' in group_names"

    - name: Apply production security role
      ansible.builtin.include_role:
        name: security
      when: "'production' in group_names"
```

## Inventory Group Intersection

Sometimes you need to check if a host is in the intersection of multiple groups. Use the `intersect` filter for this.

```yaml
# Group intersection checking
---
- name: Intersection-based targeting
  hosts: all
  gather_facts: false

  tasks:
    - name: Check if host is in all required groups
      ansible.builtin.debug:
        msg: "This host is a production web server with SSL"
      vars:
        required_groups:
          - production
          - webservers
          - ssl_enabled
      when: required_groups | intersect(group_names) | length == required_groups | length

    - name: Check if host is in any of the target groups
      ansible.builtin.debug:
        msg: "This host serves HTTP traffic"
      vars:
        http_groups:
          - webservers
          - apiservers
          - loadbalancers
      when: http_groups | intersect(group_names) | length > 0
```

## Group-Based Service Discovery

Use group membership to dynamically build service configurations.

```yaml
# Service discovery using inventory groups
---
- name: Configure service mesh
  hosts: all
  become: true

  tasks:
    - name: Generate service registry config
      ansible.builtin.template:
        src: service-registry.conf.j2
        dest: /etc/consul/services.json
      vars:
        services_to_register: >-
          {{
            (['web'] if 'webservers' in group_names else []) +
            (['api'] if 'apiservers' in group_names else []) +
            (['db'] if 'dbservers' in group_names else []) +
            (['cache'] if 'cacheservers' in group_names else [])
          }}

    - name: Show registered services
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} will register services: {{ services_to_register }}"
```

## Checking Group Size

You can make decisions based on how many hosts are in a group.

```yaml
# Group size based decisions
---
- name: Scaling decisions
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Check if we have enough web servers
      ansible.builtin.debug:
        msg: "WARNING: Only {{ groups['webservers'] | length }} web servers. Minimum recommended is 3."
      when: groups['webservers'] | default([]) | length < 3

    - name: Determine deployment strategy
      ansible.builtin.set_fact:
        deploy_strategy: >-
          {% if groups['webservers'] | default([]) | length >= 6 %}rolling_25_percent
          {% elif groups['webservers'] | default([]) | length >= 3 %}rolling_one_at_a_time
          {% else %}all_at_once{% endif %}

    - name: Report deployment strategy
      ansible.builtin.debug:
        msg: "Using deployment strategy: {{ deploy_strategy | trim }}"
```

## Handling Hosts Not in Any Specific Group

Sometimes you need to catch hosts that do not belong to any expected group.

```yaml
# Handle ungrouped or uncategorized hosts
---
- name: Catch-all for hosts
  hosts: all
  gather_facts: false

  vars:
    known_roles:
      - webservers
      - dbservers
      - cacheservers
      - monitoring
      - loadbalancers

  tasks:
    - name: Warn about hosts without a role group
      ansible.builtin.debug:
        msg: >
          WARNING: {{ inventory_hostname }} is not in any known role group.
          Current groups: {{ group_names }}
      when: known_roles | intersect(group_names) | length == 0
```

Group-based conditionals are the backbone of scalable Ansible automation. They let you write a single playbook that does the right thing for every host in your infrastructure. The patterns shown here cover the common scenarios, from simple group checks to complex multi-group intersections. Use them to keep your playbooks organized and your infrastructure consistent.
