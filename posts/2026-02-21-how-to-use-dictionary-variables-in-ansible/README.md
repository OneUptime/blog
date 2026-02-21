# How to Use Dictionary Variables in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Dictionaries, Data Structures, DevOps

Description: Learn how to define, access, iterate over, filter, and transform dictionary variables in Ansible playbooks with practical real-world examples.

---

Dictionaries (also called maps or hashes) are one of the most useful data structures in Ansible. They let you group related key-value pairs together, represent structured configurations, and model real-world entities like servers, applications, and users. In this post, I will walk through everything you need to know about working with dictionaries in Ansible, from basic definition to advanced filtering and transformation.

## Defining Dictionary Variables

There are several ways to define dictionaries in YAML:

```yaml
---
# dict-definitions.yml
# Different ways to define dictionary variables

- hosts: localhost
  vars:
    # Standard block style (most common in Ansible)
    database:
      host: db.example.com
      port: 5432
      name: myapp_production
      user: myapp
      password: "{{ vault_db_password }}"

    # Inline/flow style (good for simple dictionaries)
    cache: {host: redis.example.com, port: 6379, db: 0}

    # Nested dictionaries
    application:
      frontend:
        port: 3000
        workers: 4
        static_dir: /opt/frontend/public
      backend:
        port: 8080
        workers: 8
        data_dir: /opt/backend/data
      scheduler:
        interval: 60
        max_retries: 3

  tasks:
    - name: Show database config
      debug:
        var: database

    - name: Access nested dictionary
      debug:
        msg: "Frontend port: {{ application.frontend.port }}"
```

## Accessing Dictionary Values

```yaml
---
# dict-access.yml
# All the ways to access dictionary values

- hosts: localhost
  vars:
    server:
      hostname: web01
      ip: 10.0.1.10
      os: Ubuntu
      role: webserver

  tasks:
    # Dot notation
    - name: Dot notation access
      debug:
        msg: "Hostname: {{ server.hostname }}"

    # Bracket notation
    - name: Bracket notation access
      debug:
        msg: "IP: {{ server['ip'] }}"

    # Dynamic key access using a variable
    - name: Dynamic key access
      debug:
        msg: "Value: {{ server[key_name] }}"
      vars:
        key_name: os

    # Get all keys
    - name: List all keys
      debug:
        msg: "Keys: {{ server.keys() | list }}"

    # Get all values
    - name: List all values
      debug:
        msg: "Values: {{ server.values() | list }}"

    # Get key-value pairs
    - name: List all items
      debug:
        msg: "Items: {{ server.items() | list }}"

    # Check if a key exists
    - name: Check for key existence
      debug:
        msg: "Has 'role' key: {{ 'role' in server }}"
```

## Iterating Over Dictionaries

There are multiple ways to loop through dictionary contents:

```yaml
---
# dict-iteration.yml
# Looping over dictionary variables

- hosts: localhost
  vars:
    env_vars:
      DATABASE_URL: postgresql://localhost/myapp
      REDIS_URL: redis://localhost:6379
      SECRET_KEY: supersecret123
      LOG_LEVEL: info
      PORT: "8080"

  tasks:
    # Iterate using dict2items filter (recommended approach)
    - name: Loop with dict2items
      debug:
        msg: "{{ item.key }}={{ item.value }}"
      loop: "{{ env_vars | dict2items }}"

    # Iterate using the legacy with_dict
    - name: Loop with with_dict
      debug:
        msg: "{{ item.key }}={{ item.value }}"
      with_dict: "{{ env_vars }}"

    # Use dict2items to set environment variables
    - name: Create env file from dictionary
      lineinfile:
        path: /opt/myapp/.env
        regexp: "^{{ item.key }}="
        line: "{{ item.key }}={{ item.value }}"
        create: yes
      loop: "{{ env_vars | dict2items }}"
```

## Using Dictionaries for Configuration Management

A practical pattern is using dictionaries to define service configurations:

```yaml
---
# service-config.yml
# Use dictionaries to manage multiple service configurations

- hosts: webservers
  become: yes
  vars:
    # Define all system limits in a dictionary
    sysctl_settings:
      net.core.somaxconn: 65535
      net.ipv4.tcp_max_syn_backlog: 65535
      net.ipv4.ip_local_port_range: "1024 65535"
      vm.swappiness: 10
      vm.max_map_count: 262144
      fs.file-max: 2097152

    # Define users as a dictionary
    system_users:
      webapp:
        uid: 1001
        shell: /bin/bash
        groups: [www-data]
        home: /opt/webapp
      worker:
        uid: 1002
        shell: /bin/bash
        groups: [www-data]
        home: /opt/worker
      deployer:
        uid: 1003
        shell: /bin/bash
        groups: [sudo, www-data]
        home: /home/deployer

  tasks:
    # Apply sysctl settings from dictionary
    - name: Apply kernel parameters
      sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: yes
        reload: yes
      loop: "{{ sysctl_settings | dict2items }}"

    # Create users from dictionary
    - name: Create system users
      user:
        name: "{{ item.key }}"
        uid: "{{ item.value.uid }}"
        shell: "{{ item.value.shell }}"
        groups: "{{ item.value.groups }}"
        home: "{{ item.value.home }}"
        create_home: yes
      loop: "{{ system_users | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
```

## Filtering Dictionary Contents

```yaml
---
# dict-filtering.yml
# Filter dictionaries based on various criteria

- hosts: localhost
  vars:
    services:
      nginx:
        port: 80
        enabled: true
        type: web
      redis:
        port: 6379
        enabled: true
        type: cache
      memcached:
        port: 11211
        enabled: false
        type: cache
      postgresql:
        port: 5432
        enabled: true
        type: database

  tasks:
    # Convert to items, filter, and show enabled services
    - name: Show only enabled services
      debug:
        msg: "{{ item.key }}: port {{ item.value.port }}"
      loop: "{{ services | dict2items | selectattr('value.enabled', 'eq', true) | list }}"

    # Get only cache services
    - name: Show only cache services
      debug:
        msg: "Cache service: {{ item.key }} on port {{ item.value.port }}"
      loop: "{{ services | dict2items | selectattr('value.type', 'eq', 'cache') | list }}"

    # Build a filtered dictionary
    - name: Create dict of only enabled services
      set_fact:
        enabled_services: "{{ dict(services | dict2items | selectattr('value.enabled') | map(attribute='key') | zip(services | dict2items | selectattr('value.enabled') | map(attribute='value'))) }}"

    - name: Show enabled services dictionary
      debug:
        var: enabled_services
```

## Merging Dictionaries

The `combine` filter merges dictionaries:

```yaml
---
# dict-merge.yml
# Merge dictionaries together

- hosts: localhost
  vars:
    default_config:
      port: 8080
      workers: 4
      log_level: info
      debug: false
      timeout: 30

    environment_overrides:
      workers: 16
      log_level: warn
      timeout: 60

    host_overrides:
      workers: 32

  tasks:
    # Simple merge (later dict wins on conflicts)
    - name: Merge default with environment config
      set_fact:
        effective_config: "{{ default_config | combine(environment_overrides) }}"

    - name: Show merged config
      debug:
        var: effective_config
    # Result: {port: 8080, workers: 16, log_level: warn, debug: false, timeout: 60}

    # Chain multiple merges
    - name: Merge all three levels
      set_fact:
        final_config: "{{ default_config | combine(environment_overrides) | combine(host_overrides) }}"

    - name: Show final config
      debug:
        var: final_config
    # Result: {port: 8080, workers: 32, log_level: warn, debug: false, timeout: 60}
```

## Converting Between Dictionaries and Other Structures

```yaml
---
# dict-conversion.yml
# Convert dictionaries to and from other formats

- hosts: localhost
  vars:
    users_dict:
      alice: {role: admin, email: alice@example.com}
      bob: {role: developer, email: bob@example.com}
      charlie: {role: viewer, email: charlie@example.com}

  tasks:
    # Dictionary to list of items
    - name: Convert dict to list of key-value items
      set_fact:
        users_list: "{{ users_dict | dict2items }}"

    - name: Show list format
      debug:
        var: users_list
    # Output: [{key: alice, value: {role: admin, email: ...}}, ...]

    # Convert back from list to dictionary
    - name: Convert list back to dictionary
      set_fact:
        users_dict_again: "{{ users_list | items2dict }}"

    # Create a flat list of emails from the dictionary
    - name: Extract all email addresses
      set_fact:
        all_emails: "{{ users_dict.values() | map(attribute='email') | list }}"

    - name: Show emails
      debug:
        var: all_emails
    # Output: [alice@example.com, bob@example.com, charlie@example.com]

    # Create a lookup dictionary by role
    - name: Get admins
      set_fact:
        admins: "{{ users_dict | dict2items | selectattr('value.role', 'eq', 'admin') | map(attribute='key') | list }}"

    - name: Show admin users
      debug:
        var: admins
    # Output: [alice]
```

## Dictionaries in Templates

Dictionaries are commonly used in Jinja2 templates:

```ini
# templates/app-env.j2
# Generate environment file from a dictionary variable

{% for key, value in env_vars.items() | sort %}
{{ key }}={{ value }}
{% endfor %}
```

```yaml
# templates/nginx-upstreams.conf.j2
# Generate nginx upstream blocks from a dictionary of services

{% for name, config in services.items() %}
{% if config.enabled %}
upstream {{ name }} {
    server 127.0.0.1:{{ config.port }};
}
{% endif %}
{% endfor %}
```

```json
// templates/config.json.j2
// Generate JSON config from nested dictionaries
{{ application | to_nice_json }}
```

## Wrapping Up

Dictionaries are the backbone of structured data in Ansible. Use them to group related configuration values, define entities like users and services, and pass structured data to templates. The `dict2items` and `items2dict` filters let you convert between dictionary and list formats for iteration and filtering. The `combine` filter handles merging dictionaries at different precedence levels. When you model your configuration as dictionaries, your playbooks become more organized and your templates become more powerful.
