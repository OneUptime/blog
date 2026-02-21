# How to Use set_fact to Create Variables Dynamically in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, set_fact, DevOps, Automation

Description: Learn how to use the Ansible set_fact module to create and modify variables dynamically during playbook execution based on runtime conditions.

---

Static variables in Ansible get you pretty far, but eventually you hit situations where the value of a variable needs to be computed at runtime. Maybe you need to calculate a port number based on the host's position in a group. Maybe you need to transform data from one format to another. Or maybe you need to build a complex data structure from multiple sources. The `set_fact` module lets you create new variables on the fly during playbook execution, and those variables persist for the rest of the play on that host.

## Basic set_fact Usage

At its simplest, `set_fact` assigns a value to a new variable:

```yaml
---
# basic-setfact.yml
# Create simple variables with set_fact

- hosts: webservers
  tasks:
    - name: Set a simple string fact
      set_fact:
        deployment_timestamp: "{{ ansible_date_time.iso8601 }}"

    - name: Set multiple facts at once
      set_fact:
        app_url: "https://{{ ansible_fqdn }}:{{ app_port | default(8080) }}"
        server_label: "{{ ansible_hostname }}-{{ ansible_os_family | lower }}"
        is_production: "{{ 'prod' in group_names }}"

    - name: Use the new facts
      debug:
        msg: |
          Deploy time: {{ deployment_timestamp }}
          App URL: {{ app_url }}
          Label: {{ server_label }}
          Production: {{ is_production }}
```

## Computing Values from Other Variables

`set_fact` shines when you need to derive values:

```yaml
---
# computed-facts.yml
# Calculate values based on system facts and other variables

- hosts: webservers
  vars:
    base_port: 8000

  tasks:
    # Calculate a unique port for each host in the group
    - name: Assign unique port based on host index
      set_fact:
        app_port: "{{ base_port | int + groups['webservers'].index(inventory_hostname) }}"

    # Calculate worker count based on available CPUs
    - name: Calculate optimal worker count
      set_fact:
        worker_count: "{{ [ansible_processor_vcpus | int * 2, 16] | min }}"

    # Calculate memory allocation (75% of total memory)
    - name: Calculate application memory limit
      set_fact:
        app_memory_mb: "{{ (ansible_memtotal_mb * 0.75) | int }}"
        cache_memory_mb: "{{ (ansible_memtotal_mb * 0.15) | int }}"

    - name: Display computed values
      debug:
        msg: |
          Host: {{ inventory_hostname }}
          Port: {{ app_port }}
          Workers: {{ worker_count }}
          App Memory: {{ app_memory_mb }}MB
          Cache Memory: {{ cache_memory_mb }}MB
```

## Building Data Structures

`set_fact` can create lists and dictionaries:

```yaml
---
# data-structures.yml
# Build complex data structures dynamically

- hosts: webservers
  tasks:
    # Build a list
    - name: Create a list of backend URLs
      set_fact:
        backend_urls: "{{ groups['webservers'] | map('extract', hostvars, 'ansible_host') | map('regex_replace', '(.*)', 'http://\\1:8080') | list }}"

    - name: Show backend URLs
      debug:
        var: backend_urls

    # Build a dictionary
    - name: Create server info dictionary
      set_fact:
        server_info:
          hostname: "{{ ansible_hostname }}"
          ip: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          cpus: "{{ ansible_processor_vcpus }}"
          memory_gb: "{{ (ansible_memtotal_mb / 1024) | round(1) }}"

    - name: Show server info
      debug:
        var: server_info
```

## Conditional set_fact

Use `when` to set different values based on conditions:

```yaml
---
# conditional-facts.yml
# Set different values based on runtime conditions

- hosts: all
  become: yes
  tasks:
    # Set package manager based on OS
    - name: Set Java package name for Debian
      set_fact:
        java_package: openjdk-17-jdk
        java_home: /usr/lib/jvm/java-17-openjdk-amd64
      when: ansible_os_family == "Debian"

    - name: Set Java package name for RedHat
      set_fact:
        java_package: java-17-openjdk-devel
        java_home: /usr/lib/jvm/java-17
      when: ansible_os_family == "RedHat"

    # Set resource limits based on server role
    - name: Set limits for production servers
      set_fact:
        max_open_files: 65536
        max_processes: 32768
        connection_pool_size: 50
      when: "'production' in group_names"

    - name: Set limits for development servers
      set_fact:
        max_open_files: 4096
        max_processes: 2048
        connection_pool_size: 5
      when: "'development' in group_names"

    - name: Install Java
      package:
        name: "{{ java_package }}"
        state: present
```

## Accumulating Data Across Loops

A common pattern is building up a list or dictionary across loop iterations:

```yaml
---
# accumulate-facts.yml
# Build up a list by appending in a loop

- hosts: webservers
  tasks:
    # Initialize the list
    - name: Initialize healthy services list
      set_fact:
        healthy_services: []

    # Check each service and accumulate healthy ones
    - name: Check service health
      command: "systemctl is-active {{ item }}"
      loop:
        - nginx
        - postgresql
        - redis-server
        - myapp
      register: service_checks
      failed_when: false
      changed_when: false

    # Build the list of healthy services
    - name: Collect healthy services
      set_fact:
        healthy_services: "{{ healthy_services + [item.item] }}"
      loop: "{{ service_checks.results }}"
      when: item.rc == 0

    - name: Show healthy services
      debug:
        msg: "Healthy services: {{ healthy_services }}"
```

A more concise way to do the same thing:

```yaml
    # One-liner alternative using select and map filters
    - name: Collect healthy services (concise)
      set_fact:
        healthy_services: "{{ service_checks.results | selectattr('rc', 'eq', 0) | map(attribute='item') | list }}"
```

## Building Dictionaries Incrementally

```yaml
---
# build-dict.yml
# Build a dictionary incrementally

- hosts: webservers
  tasks:
    - name: Initialize the config dictionary
      set_fact:
        app_config: {}

    # Add entries based on conditions
    - name: Add database config
      set_fact:
        app_config: "{{ app_config | combine({'database': {'host': db_host, 'port': db_port}}) }}"
      when: db_host is defined

    - name: Add cache config
      set_fact:
        app_config: "{{ app_config | combine({'cache': {'host': redis_host, 'port': 6379}}) }}"
      when: redis_host is defined

    - name: Add monitoring config
      set_fact:
        app_config: "{{ app_config | combine({'monitoring': {'enabled': true, 'port': 9090}}) }}"
      when: monitoring_enabled | default(false) | bool

    - name: Show final config
      debug:
        var: app_config
```

## set_fact with cacheable

By default, facts created with `set_fact` last only for the current play. The `cacheable` parameter persists them to the fact cache, so they survive across playbook runs:

```yaml
---
# cacheable-facts.yml
# Create facts that persist across playbook runs

- hosts: webservers
  tasks:
    # This fact will be available in future playbook runs
    - name: Record last deployment version
      set_fact:
        last_deployed_version: "{{ deploy_version }}"
        last_deploy_time: "{{ ansible_date_time.iso8601 }}"
        cacheable: yes

    # On subsequent runs, you can check the cached value
    - name: Check if version changed since last deploy
      debug:
        msg: "Previously deployed: {{ last_deployed_version | default('never') }}"
```

You need to enable fact caching in `ansible.cfg` for this to work:

```ini
# ansible.cfg
[defaults]
# Enable JSON file fact caching
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_fact_cache
fact_caching_timeout = 86400
```

## Transforming Data with set_fact

Combine `set_fact` with Jinja2 filters for data transformation:

```yaml
---
# transform-data.yml
# Transform data from one format to another

- hosts: webservers
  vars:
    raw_users:
      - name: alice
        role: admin
        teams: ["platform", "security"]
      - name: bob
        role: developer
        teams: ["backend"]
      - name: charlie
        role: developer
        teams: ["frontend", "backend"]

  tasks:
    # Extract all unique teams
    - name: Get unique team list
      set_fact:
        all_teams: "{{ raw_users | map(attribute='teams') | flatten | unique | sort }}"

    # Create a mapping of team to members
    - name: Build team membership map
      set_fact:
        team_members: >-
          {{
            dict(
              all_teams | zip(
                all_teams | map('regex_replace', '(.*)', '\\1') |
                map('community.general.json_query', 'raw_users[?contains(teams, `' ~ item ~ '`)].name') |
                list
              )
            )
          }}
      # Note: This is complex. A simpler approach with a loop:

    # Simpler approach: filter admins
    - name: Get admin users
      set_fact:
        admin_users: "{{ raw_users | selectattr('role', 'eq', 'admin') | map(attribute='name') | list }}"

    # Get developer users
    - name: Get developer users
      set_fact:
        developer_users: "{{ raw_users | selectattr('role', 'eq', 'developer') | map(attribute='name') | list }}"

    - name: Show results
      debug:
        msg: |
          All teams: {{ all_teams }}
          Admins: {{ admin_users }}
          Developers: {{ developer_users }}
```

## Wrapping Up

The `set_fact` module bridges the gap between static configuration and dynamic runtime logic in Ansible. Use it to compute values from system facts, transform data between formats, build up complex structures through loops, and make conditional assignments. Remember that `set_fact` variables are scoped to the current host and last for the rest of the play unless you use `cacheable: yes` for persistence. When your expressions get complex, consider breaking them into multiple `set_fact` tasks for readability rather than cramming everything into a single Jinja2 expression.
