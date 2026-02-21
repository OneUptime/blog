# How to Use Ansible vars Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, vars, Dynamic Variables, Jinja2

Description: Learn how to use the Ansible vars lookup plugin to dynamically reference variables by name and build flexible automation playbooks.

---

Most of the time you reference Ansible variables directly by name: `{{ my_variable }}`. But what if the variable name itself is dynamic? What if you need to look up a variable whose name is constructed at runtime from other variables? The `vars` lookup plugin solves this by letting you reference variables indirectly, using a string that contains the variable name.

## The Problem: Dynamic Variable Names

Consider this scenario. You have environment-specific settings stored in separate variables:

```yaml
database_host_production: db-prod.internal
database_host_staging: db-staging.internal
database_host_development: db-dev.internal
```

And you want to select the right one based on a `deploy_env` variable. Without the `vars` lookup, you would need a chain of `when` clauses or a dictionary mapping. With it, you can construct the variable name dynamically.

## Basic vars Lookup Syntax

The `vars` lookup takes one or more variable names as strings and returns their values:

```yaml
# vars-lookup-basic.yml - Dynamic variable reference
---
- name: Demonstrate vars lookup
  hosts: localhost
  gather_facts: false
  vars:
    deploy_env: staging
    database_host_production: db-prod.internal
    database_host_staging: db-staging.internal
    database_host_development: db-dev.internal
  tasks:
    - name: Get database host for current environment
      ansible.builtin.debug:
        msg: "Database host: {{ lookup('vars', 'database_host_' + deploy_env) }}"
    # Output: Database host: db-staging.internal
```

The expression `'database_host_' + deploy_env` constructs the string `database_host_staging`, and the `vars` lookup resolves that string to the variable's value.

## Fallback Values with default

You can chain the `default` filter with the `vars` lookup to handle cases where the dynamically named variable might not exist:

```yaml
# vars-lookup-default.yml - Fallback when variable does not exist
---
- name: vars lookup with fallback
  hosts: localhost
  gather_facts: false
  vars:
    deploy_env: testing  # No database_host_testing defined
    database_host_production: db-prod.internal
    database_host_staging: db-staging.internal
    default_database_host: db-default.internal
  tasks:
    - name: Get database host with fallback
      ansible.builtin.debug:
        msg: >
          Database host: {{ lookup('vars', 'database_host_' + deploy_env,
                                   default=default_database_host) }}
    # Output: Database host: db-default.internal
```

## Looking Up Multiple Variables

The `vars` lookup can take multiple variable names and returns them all:

```yaml
# vars-lookup-multiple.yml - Look up multiple variables at once
---
- name: Look up multiple variables
  hosts: localhost
  gather_facts: false
  vars:
    app_name: myapp
    app_version: "2.1.0"
    app_port: 8080
  tasks:
    - name: Get multiple variable values
      ansible.builtin.debug:
        msg: "{{ lookup('vars', 'app_name', 'app_version', 'app_port') }}"
    # Output: myapp,2.1.0,8080
```

## Practical Example: Per-Host Configuration

When different hosts need different values but you want to keep them all in group_vars:

```yaml
# group_vars/all.yml - Per-host settings with a naming convention
nginx_worker_count_web1: 4
nginx_worker_count_web2: 8
nginx_worker_count_web3: 2
nginx_worker_count_default: 4
```

```yaml
# configure-nginx.yml - Select the right value per host
---
- name: Configure nginx with per-host settings
  hosts: webservers
  gather_facts: false
  tasks:
    - name: Set worker count from host-specific variable
      ansible.builtin.set_fact:
        nginx_workers: >-
          {{ lookup('vars', 'nginx_worker_count_' + inventory_hostname,
                    default=lookup('vars', 'nginx_worker_count_default')) }}

    - name: Apply nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        mode: '0644'
      become: true
      notify: reload nginx
```

## Using vars Lookup with Loops

Combine the `vars` lookup with loops to process a series of dynamically named variables:

```yaml
# vars-lookup-loop.yml - Loop through dynamically named variables
---
- name: Process multiple config sections
  hosts: localhost
  gather_facts: false
  vars:
    config_sections:
      - database
      - cache
      - queue
    config_database:
      host: db.internal
      port: 5432
    config_cache:
      host: redis.internal
      port: 6379
    config_queue:
      host: rabbitmq.internal
      port: 5672
  tasks:
    - name: Show configuration for each section
      ansible.builtin.debug:
        msg: "{{ item }}: {{ lookup('vars', 'config_' + item) }}"
      loop: "{{ config_sections }}"
```

## Dynamic Role Configuration

The `vars` lookup is particularly useful in roles that need to adapt based on the operating system or other runtime conditions:

```yaml
# roles/packages/tasks/main.yml - OS-specific package lists
---
- name: Set OS-specific variables
  ansible.builtin.set_fact:
    packages_to_install: >-
      {{ lookup('vars', 'packages_' + ansible_os_family | lower,
                default=[]) }}

- name: Install OS-specific packages
  ansible.builtin.package:
    name: "{{ packages_to_install }}"
    state: present
  become: true
  when: packages_to_install | length > 0
```

```yaml
# roles/packages/defaults/main.yml
---
packages_debian:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg

packages_redhat:
  - yum-utils
  - device-mapper-persistent-data
  - lvm2

packages_suse:
  - zypper
  - curl
```

## vars Lookup vs hostvars

People sometimes confuse the `vars` lookup with `hostvars`. They serve different purposes:

```yaml
# vars-vs-hostvars.yml - Understanding the difference
---
- name: vars lookup vs hostvars
  hosts: webservers
  gather_facts: true
  tasks:
    # vars lookup: resolves a variable by name in the current host's scope
    - name: Get a variable by dynamic name
      ansible.builtin.debug:
        msg: "{{ lookup('vars', 'ansible_os_family') }}"
    # This gets ansible_os_family for the CURRENT host

    # hostvars: access variables from a DIFFERENT host
    - name: Get a variable from another host
      ansible.builtin.debug:
        msg: "{{ hostvars['db1']['ansible_os_family'] }}"
    # This gets ansible_os_family for db1
```

## Building Configuration Matrices

When you have a matrix of settings across environments and tiers:

```yaml
# config-matrix.yml - Environment x Tier configuration
---
- name: Configuration matrix with vars lookup
  hosts: all
  gather_facts: false
  vars:
    deploy_env: production
    app_tier: web

    # Memory settings: {env}_{tier}_memory
    production_web_memory: 4096
    production_api_memory: 8192
    staging_web_memory: 2048
    staging_api_memory: 4096

    # Thread pool settings: {env}_{tier}_threads
    production_web_threads: 200
    production_api_threads: 100
    staging_web_threads: 50
    staging_api_threads: 25
  tasks:
    - name: Build configuration from matrix
      ansible.builtin.set_fact:
        app_memory: "{{ lookup('vars', deploy_env + '_' + app_tier + '_memory') }}"
        app_threads: "{{ lookup('vars', deploy_env + '_' + app_tier + '_threads') }}"

    - name: Show resolved configuration
      ansible.builtin.debug:
        msg:
          - "Memory: {{ app_memory }}MB"
          - "Threads: {{ app_threads }}"
```

## Error Handling

When the variable name does not exist and you do not provide a default, the lookup raises an error:

```yaml
# error-handling.yml - Handle missing dynamic variables
---
- name: Handle missing variables gracefully
  hosts: localhost
  gather_facts: false
  vars:
    var_prefix: "config"
    sections:
      - known_section
      - unknown_section
    config_known_section:
      enabled: true
  tasks:
    - name: Safely look up each section
      ansible.builtin.set_fact:
        section_config: >-
          {{ lookup('vars', var_prefix + '_' + item, default={'enabled': false}) }}
      loop: "{{ sections }}"
      register: section_results

    - name: Show results
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.ansible_facts.section_config }}"
      loop: "{{ section_results.results }}"
      loop_control:
        label: "{{ item.item }}"
```

## The varnames Lookup (Finding Variables by Pattern)

Related to `vars`, the `varnames` lookup finds variable names matching a regex pattern:

```yaml
# varnames-lookup.yml - Find variables by pattern
---
- name: Find and process variables by pattern
  hosts: localhost
  gather_facts: false
  vars:
    firewall_rule_ssh: { port: 22, proto: tcp }
    firewall_rule_http: { port: 80, proto: tcp }
    firewall_rule_https: { port: 443, proto: tcp }
    unrelated_var: "something else"
  tasks:
    - name: Find all firewall_rule variables
      ansible.builtin.set_fact:
        rule_names: "{{ lookup('varnames', 'firewall_rule_') }}"

    - name: Show discovered rule names
      ansible.builtin.debug:
        msg: "Found rules: {{ rule_names }}"

    - name: Process each discovered rule
      ansible.builtin.debug:
        msg: "Rule {{ item }}: {{ lookup('vars', item) }}"
      loop: "{{ rule_names.split(',') }}"
      when: rule_names | length > 0
```

## Best Practices

Use the `vars` lookup when you genuinely need dynamic variable names, not as a general replacement for direct variable references. Always provide a `default` parameter to handle cases where the dynamically named variable might not exist. Keep naming conventions consistent when using pattern-based variable lookup. Document the naming convention so other team members know how to add new entries. Consider whether a dictionary structure might be cleaner than multiple individually named variables. For simple cases, a dictionary with key access is usually more readable than a `vars` lookup.

The `vars` lookup is a power tool for building flexible automation. It shines in roles that need to adapt to different environments, operating systems, or host characteristics without hardcoding every variation.
