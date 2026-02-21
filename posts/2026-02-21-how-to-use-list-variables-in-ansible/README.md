# How to Use List Variables in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Lists, Data Structures, DevOps

Description: Learn how to define, iterate over, filter, transform, and combine list variables in Ansible playbooks for managing packages, users, and configurations.

---

Lists are one of the most commonly used data structures in Ansible playbooks. You use them to define packages to install, users to create, ports to open, directories to make, and just about any collection of things that need the same action applied. In this post, I will cover everything from basic list definition to advanced operations like filtering, transforming, flattening, and computing intersections.

## Defining List Variables

YAML supports two formats for lists:

```yaml
---
# list-definitions.yml
# Different ways to define list variables

- hosts: localhost
  vars:
    # Block style (one item per line with a dash)
    packages:
      - nginx
      - python3
      - python3-pip
      - curl
      - jq
      - htop

    # Inline/flow style (comma-separated in brackets)
    ports: [80, 443, 8080, 9090]

    # List of dictionaries (very common pattern)
    users:
      - name: alice
        role: admin
        shell: /bin/bash
      - name: bob
        role: developer
        shell: /bin/zsh
      - name: charlie
        role: viewer
        shell: /bin/bash

    # Nested lists
    firewall_rules:
      - ports: [80, 443]
        protocol: tcp
        source: 0.0.0.0/0
      - ports: [22]
        protocol: tcp
        source: 10.0.0.0/8

  tasks:
    - name: Show packages list
      debug:
        var: packages
```

## Iterating Over Lists

The most basic list operation is looping:

```yaml
---
# list-looping.yml
# Different ways to iterate over lists

- hosts: webservers
  become: yes
  vars:
    packages:
      - nginx
      - python3
      - curl

    directories:
      - /opt/myapp
      - /opt/myapp/config
      - /opt/myapp/logs
      - /opt/myapp/data

  tasks:
    # Loop over a simple list with the loop keyword
    - name: Install packages
      apt:
        name: "{{ item }}"
        state: present
      loop: "{{ packages }}"

    # Many modules accept a list directly (preferred for apt/yum/dnf)
    - name: Install packages directly (more efficient)
      apt:
        name: "{{ packages }}"
        state: present

    # Loop over a list to create directories
    - name: Create application directories
      file:
        path: "{{ item }}"
        state: directory
        owner: appuser
        mode: '0755'
      loop: "{{ directories }}"

    # Loop over a list of dictionaries
    - name: Create users
      user:
        name: "{{ item.name }}"
        shell: "{{ item.shell }}"
        state: present
      loop: "{{ users }}"
      loop_control:
        label: "{{ item.name }}"    # Show only the name in output, not the full dict
```

## List Operations and Filters

Ansible provides many Jinja2 filters for working with lists:

```yaml
---
# list-operations.yml
# Common list operations and transformations

- hosts: localhost
  vars:
    numbers: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
    names: [charlie, alice, bob, alice, dave]
    fruits: [apple, banana, cherry]
    more_fruits: [date, elderberry, fig]

  tasks:
    # Get list length
    - name: Count items
      debug:
        msg: "Number count: {{ numbers | length }}"
    # Output: 11

    # Sort a list
    - name: Sort numbers
      debug:
        msg: "Sorted: {{ numbers | sort }}"
    # Output: [1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]

    # Get unique values
    - name: Unique values
      debug:
        msg: "Unique: {{ numbers | unique }}"
    # Output: [3, 1, 4, 5, 9, 2, 6]

    # Sorted unique
    - name: Sorted unique values
      debug:
        msg: "Sorted unique: {{ numbers | unique | sort }}"

    # Reverse a list
    - name: Reverse list
      debug:
        msg: "Reversed: {{ names | reverse | list }}"

    # First and last elements
    - name: First and last
      debug:
        msg: "First: {{ names | first }}, Last: {{ names | last }}"

    # Flatten nested lists
    - name: Flatten
      debug:
        msg: "Flat: {{ [[1, 2], [3, 4], [5]] | flatten }}"
    # Output: [1, 2, 3, 4, 5]

    # Concatenate lists
    - name: Combine lists
      debug:
        msg: "Combined: {{ fruits + more_fruits }}"
    # Output: [apple, banana, cherry, date, elderberry, fig]

    # Min and max
    - name: Min and max values
      debug:
        msg: "Min: {{ numbers | min }}, Max: {{ numbers | max }}"

    # Sum
    - name: Sum of numbers
      debug:
        msg: "Sum: {{ numbers | sum }}"

    # Join list items into a string
    - name: Join with separator
      debug:
        msg: "Joined: {{ fruits | join(', ') }}"
    # Output: "apple, banana, cherry"
```

## Filtering Lists

```yaml
---
# list-filtering.yml
# Filter lists based on conditions

- hosts: localhost
  vars:
    servers:
      - name: web01
        role: web
        environment: production
        cpu_count: 4
      - name: web02
        role: web
        environment: production
        cpu_count: 8
      - name: dev01
        role: web
        environment: development
        cpu_count: 2
      - name: db01
        role: database
        environment: production
        cpu_count: 16
      - name: db02
        role: database
        environment: staging
        cpu_count: 4

  tasks:
    # Filter by attribute value
    - name: Get only production servers
      set_fact:
        prod_servers: "{{ servers | selectattr('environment', 'eq', 'production') | list }}"

    - name: Show production servers
      debug:
        msg: "{{ prod_servers | map(attribute='name') | list }}"
    # Output: [web01, web02, db01]

    # Filter by multiple conditions
    - name: Get production web servers
      set_fact:
        prod_web: "{{ servers | selectattr('environment', 'eq', 'production') | selectattr('role', 'eq', 'web') | list }}"

    # Reject (inverse of select)
    - name: Get non-production servers
      set_fact:
        non_prod: "{{ servers | rejectattr('environment', 'eq', 'production') | list }}"

    # Filter by numeric condition
    - name: Get servers with more than 4 CPUs
      set_fact:
        big_servers: "{{ servers | selectattr('cpu_count', 'gt', 4) | list }}"

    - name: Show big servers
      debug:
        msg: "{{ big_servers | map(attribute='name') | list }}"
    # Output: [web02, db01]

    # Extract specific attribute from filtered list
    - name: Get names of all database servers
      set_fact:
        db_names: "{{ servers | selectattr('role', 'eq', 'database') | map(attribute='name') | list }}"
```

## Set Operations on Lists

```yaml
---
# list-sets.yml
# Set operations: intersection, difference, union

- hosts: localhost
  vars:
    installed_packages: [nginx, python3, curl, vim, git, htop]
    required_packages: [nginx, python3, curl, jq, tree]
    deprecated_packages: [vim, htop]

  tasks:
    # Intersection: packages that are both installed and required
    - name: Already installed required packages
      debug:
        msg: "{{ installed_packages | intersect(required_packages) }}"
    # Output: [nginx, python3, curl]

    # Difference: required but not installed
    - name: Packages that need to be installed
      set_fact:
        to_install: "{{ required_packages | difference(installed_packages) }}"

    - name: Show packages to install
      debug:
        msg: "Need to install: {{ to_install }}"
    # Output: [jq, tree]

    # Union: all unique packages from both lists
    - name: All packages combined
      debug:
        msg: "{{ installed_packages | union(required_packages) }}"

    # Symmetric difference: in one list but not both
    - name: Packages in only one list
      debug:
        msg: "{{ installed_packages | symmetric_difference(required_packages) }}"
    # Output: [vim, git, htop, jq, tree]
```

## Building Lists Dynamically

```yaml
---
# dynamic-lists.yml
# Build lists during playbook execution

- hosts: webservers
  tasks:
    # Initialize an empty list and append to it
    - name: Initialize deploy steps list
      set_fact:
        deploy_steps: []

    - name: Add backup step
      set_fact:
        deploy_steps: "{{ deploy_steps + ['backup_database'] }}"
      when: database_enabled | default(true)

    - name: Add migration step
      set_fact:
        deploy_steps: "{{ deploy_steps + ['run_migrations'] }}"
      when: has_migrations | default(false)

    - name: Add deploy step
      set_fact:
        deploy_steps: "{{ deploy_steps + ['deploy_application', 'restart_services'] }}"

    - name: Add cache clear step
      set_fact:
        deploy_steps: "{{ deploy_steps + ['clear_cache'] }}"
      when: cache_enabled | default(false)

    - name: Show deployment plan
      debug:
        msg: "Deploy steps: {{ deploy_steps }}"
```

## Practical Example: Managing Firewall Rules

```yaml
---
# firewall-rules.yml
# Use lists to manage iptables/firewalld rules

- hosts: webservers
  become: yes
  vars:
    # Define firewall rules as a list of dictionaries
    firewall_rules:
      - port: 22
        protocol: tcp
        source: 10.0.0.0/8
        comment: SSH from internal network

      - port: 80
        protocol: tcp
        source: 0.0.0.0/0
        comment: HTTP from anywhere

      - port: 443
        protocol: tcp
        source: 0.0.0.0/0
        comment: HTTPS from anywhere

      - port: 8080
        protocol: tcp
        source: 10.0.0.0/8
        comment: Application port from internal

      - port: 9090
        protocol: tcp
        source: 10.0.1.0/24
        comment: Monitoring from management subnet

  tasks:
    - name: Open firewall ports
      ufw:
        rule: allow
        port: "{{ item.port | string }}"
        proto: "{{ item.protocol }}"
        from_ip: "{{ item.source }}"
        comment: "{{ item.comment }}"
      loop: "{{ firewall_rules }}"
      loop_control:
        label: "{{ item.comment }}"

    # Get just the port numbers for verification
    - name: List all open ports
      debug:
        msg: "Open ports: {{ firewall_rules | map(attribute='port') | list | sort }}"
```

## List Slicing and Indexing

```yaml
---
# list-slicing.yml
# Access specific elements and ranges in lists

- hosts: localhost
  vars:
    items: [a, b, c, d, e, f, g, h]

  tasks:
    # Access by index (0-based)
    - debug:
        msg: "First: {{ items[0] }}, Third: {{ items[2] }}, Last: {{ items[-1] }}"

    # Slice a list
    - debug:
        msg: "First 3: {{ items[:3] }}"
    # Output: [a, b, c]

    - debug:
        msg: "Last 3: {{ items[-3:] }}"
    # Output: [f, g, h]

    - debug:
        msg: "Middle: {{ items[2:5] }}"
    # Output: [c, d, e]

    # Batch processing with batch filter
    - name: Process in batches of 3
      debug:
        msg: "Batch: {{ item }}"
      loop: "{{ items | batch(3) | list }}"
    # Output: Batch [a, b, c], then [d, e, f], then [g, h]
```

## Wrapping Up

Lists are everywhere in Ansible. Whether you are defining packages to install, directories to create, users to manage, or firewall rules to apply, lists keep your playbooks organized and your loops clean. Master the core filters like `select`, `map`, `unique`, `sort`, `flatten`, and the set operations (`intersect`, `difference`, `union`), and you will be able to handle any data manipulation task that comes up in your automation work. The key insight is that most complex list operations can be accomplished by chaining filters together, keeping your playbooks readable without resorting to custom Python code.
