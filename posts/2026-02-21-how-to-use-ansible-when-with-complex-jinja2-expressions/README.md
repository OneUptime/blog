# How to Use Ansible when with Complex Jinja2 Expressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Conditionals, Advanced Automation

Description: Learn how to write complex Jinja2 expressions in Ansible when conditionals using filters, tests, ternary operators, and nested logic.

---

Ansible's `when` directive accepts Jinja2 expressions, which means you have the full power of Jinja2's templating language available in your conditionals. Beyond simple variable checks and boolean operators, you can use filters, tests, list comprehensions, math operations, and inline conditionals to build sophisticated decision logic. This guide covers the advanced patterns that let you handle real-world complexity in your playbooks.

## Jinja2 Filters in when Conditions

Any Jinja2 filter can be used inside a `when` condition to transform values before testing them.

```yaml
# Using Jinja2 filters in when conditions
---
- name: Filter-based conditionals
  hosts: all
  gather_facts: true

  tasks:
    # Use the default filter for safe undefined variable handling
    - name: Deploy if feature is enabled (with safe default)
      ansible.builtin.debug:
        msg: "Feature X is enabled"
      when: (feature_x_enabled | default(false)) | bool

    # Use int/float filters for numeric comparison
    - name: Check if port variable is in valid range
      ansible.builtin.fail:
        msg: "Invalid port: {{ app_port }}"
      when: app_port | int < 1 or app_port | int > 65535

    # Use length filter for collection size checks
    - name: Fail if no DNS servers configured
      ansible.builtin.fail:
        msg: "At least one DNS server must be configured"
      when: (dns_servers | default([])) | length == 0

    # Use type_debug for type checking
    - name: Validate that servers variable is a list
      ansible.builtin.fail:
        msg: "servers must be a list, got {{ servers | type_debug }}"
      when:
        - servers is defined
        - servers | type_debug != 'list'
```

## Select and Reject Filters

The `select`, `selectattr`, `reject`, and `rejectattr` filters are powerful for filtering lists before testing.

```yaml
# Using select/reject filters in conditions
---
- name: List filtering in conditionals
  hosts: localhost
  gather_facts: false

  vars:
    services:
      - name: api
        critical: true
        port: 8080
        status: running
      - name: worker
        critical: false
        port: 9090
        status: stopped
      - name: scheduler
        critical: true
        port: 7070
        status: running
      - name: metrics
        critical: false
        port: 9100
        status: stopped

  tasks:
    # Check if any critical service is stopped
    - name: Fail if any critical service is stopped
      ansible.builtin.fail:
        msg: >
          Critical services are stopped:
          {{ services | selectattr('critical') | selectattr('status', 'equalto', 'stopped') | map(attribute='name') | list | join(', ') }}
      when: services | selectattr('critical') | selectattr('status', 'equalto', 'stopped') | list | length > 0

    # Check if all services are running
    - name: Report if all services are healthy
      ansible.builtin.debug:
        msg: "All services are running"
      when: services | rejectattr('status', 'equalto', 'running') | list | length == 0

    # Check if we have enough running services
    - name: Verify minimum service count
      ansible.builtin.debug:
        msg: "{{ services | selectattr('status', 'equalto', 'running') | list | length }} services running"
      when: services | selectattr('status', 'equalto', 'running') | list | length >= 2
```

## Map Filter for Data Extraction

Use the `map` filter to extract specific fields before comparing.

```yaml
# Using map filter in conditions
---
- name: Map-based conditionals
  hosts: all
  become: true
  gather_facts: true

  vars:
    required_packages:
      - nginx
      - postgresql
      - redis-server

  tasks:
    - name: Get installed packages
      ansible.builtin.command:
        cmd: dpkg --get-selections
      register: installed_pkgs
      changed_when: false

    - name: Check for missing required packages
      ansible.builtin.set_fact:
        installed_package_names: "{{ installed_pkgs.stdout_lines | map('split', '\t') | map('first') | list }}"

    - name: Report missing packages
      ansible.builtin.debug:
        msg: "Missing package: {{ item }}"
      loop: "{{ required_packages }}"
      when: item not in installed_package_names

    # Check using mount facts
    - name: Verify data partition has enough space
      ansible.builtin.fail:
        msg: "Data partition has insufficient space"
      when: >
        ansible_mounts
        | selectattr('mount', 'equalto', '/data')
        | map(attribute='size_available')
        | first
        | default(0) < 10737418240
```

## Inline Conditional Expressions (Ternary)

Jinja2 supports inline if/else expressions, which are useful for building dynamic condition values.

```yaml
# Inline conditional expressions
---
- name: Ternary and inline conditionals
  hosts: all
  become: true
  gather_facts: true

  vars:
    environment: production

  tasks:
    # Use ternary for setting values based on conditions
    - name: Set configuration based on environment
      ansible.builtin.set_fact:
        log_level: "{{ 'WARNING' if environment == 'production' else 'DEBUG' }}"
        replicas: "{{ 3 if environment == 'production' else 1 }}"
        ssl_enabled: "{{ true if environment == 'production' else false }}"

    # Complex inline conditional in when
    - name: Apply rate limiting in production
      ansible.builtin.template:
        src: rate-limit.conf.j2
        dest: /etc/nginx/conf.d/rate-limit.conf
      when: >
        (environment == 'production' and ansible_memtotal_mb >= 4096) or
        (environment == 'staging' and (enable_rate_limit | default(false) | bool))

    # Nested ternary for multi-level decisions
    - name: Determine deployment strategy
      ansible.builtin.set_fact:
        strategy: >-
          {{ 'canary' if environment == 'production' and use_canary | default(false) | bool
          else 'rolling' if environment == 'production'
          else 'recreate' }}

    - name: Show chosen strategy
      ansible.builtin.debug:
        msg: "Deployment strategy: {{ strategy | trim }}"
```

## Math Operations in Conditions

You can perform calculations directly in `when` expressions.

```yaml
# Mathematical expressions in conditions
---
- name: Math-based conditionals
  hosts: all
  become: true
  gather_facts: true

  tasks:
    # Calculate memory percentage
    - name: Warn if memory usage is above 80%
      ansible.builtin.debug:
        msg: >
          Memory usage on {{ inventory_hostname }}:
          {{ ((ansible_memtotal_mb - ansible_memfree_mb) / ansible_memtotal_mb * 100) | round(1) }}%
      when: ((ansible_memtotal_mb - ansible_memfree_mb) / ansible_memtotal_mb * 100) > 80

    # Use arithmetic for resource calculations
    - name: Set JVM heap to 50% of available memory
      ansible.builtin.set_fact:
        jvm_heap_mb: "{{ (ansible_memtotal_mb * 0.5) | int }}"

    - name: Fail if calculated heap is too small
      ansible.builtin.fail:
        msg: "JVM heap ({{ jvm_heap_mb }}MB) is below minimum 512MB"
      when: jvm_heap_mb | int < 512

    # Modulo for even/odd distribution
    - name: Apply to even-numbered hosts only
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} is an even-numbered host"
      when: >
        inventory_hostname | regex_search('\d+$') | default('0') | int is divisibleby 2
```

## Complex String Operations

Combine string filters for advanced text processing in conditions.

```yaml
# Complex string operations in conditions
---
- name: String processing conditionals
  hosts: all
  gather_facts: true

  tasks:
    - name: Get application log tail
      ansible.builtin.command:
        cmd: tail -50 /var/log/app/application.log
      register: app_log
      changed_when: false
      failed_when: false

    # Count error occurrences
    - name: Alert if too many errors in recent logs
      ansible.builtin.debug:
        msg: "High error rate detected in application logs"
      when:
        - app_log is success
        - app_log.stdout_lines | select('search', 'ERROR') | list | length > 10

    # Parse structured log entries
    - name: Check for specific error patterns
      ansible.builtin.debug:
        msg: "Database connection errors detected"
      when:
        - app_log is success
        - app_log.stdout_lines | select('search', 'ConnectionRefused.*database') | list | length > 0

    # Split and analyze hostname
    - name: Parse hostname components
      ansible.builtin.set_fact:
        host_parts: "{{ inventory_hostname.split('-') }}"

    - name: Apply tier-specific config
      ansible.builtin.debug:
        msg: "Applying {{ host_parts[0] }} tier configuration for {{ host_parts[1] | default('unknown') }} environment"
      when:
        - host_parts | length >= 2
        - host_parts[0] in ['web', 'api', 'worker']
```

## Combining Multiple Complex Conditions

For very complex logic, use YAML multi-line strings or lists to keep things readable.

```yaml
# Complex multi-condition logic
---
- name: Advanced conditional logic
  hosts: all
  become: true
  gather_facts: true

  vars:
    deploy_config:
      min_memory_mb: 4096
      min_cpu: 2
      allowed_os:
        - Ubuntu
        - Debian
      allowed_versions:
        Ubuntu: ['20.04', '22.04', '24.04']
        Debian: ['11', '12']
      max_load_per_cpu: 2.0

  tasks:
    - name: Get system load
      ansible.builtin.command:
        cmd: cat /proc/loadavg
      register: loadavg
      changed_when: false

    - name: Parse load value
      ansible.builtin.set_fact:
        current_load: "{{ loadavg.stdout.split()[0] | float }}"
        load_per_cpu: "{{ loadavg.stdout.split()[0] | float / ansible_processor_vcpus }}"

    # Complex validation using list format for readability
    - name: Validate all deployment prerequisites
      ansible.builtin.assert:
        that:
          # Hardware requirements
          - ansible_memtotal_mb >= deploy_config.min_memory_mb
          - ansible_processor_vcpus >= deploy_config.min_cpu

          # OS requirements
          - ansible_distribution in deploy_config.allowed_os
          - ansible_distribution_version in deploy_config.allowed_versions[ansible_distribution]

          # Load requirements
          - load_per_cpu | float <= deploy_config.max_load_per_cpu
        fail_msg: |
          Deployment prerequisites not met on {{ inventory_hostname }}:
          Memory: {{ ansible_memtotal_mb }}MB (need {{ deploy_config.min_memory_mb }}MB)
          CPUs: {{ ansible_processor_vcpus }} (need {{ deploy_config.min_cpu }})
          OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
          Load per CPU: {{ load_per_cpu }} (max {{ deploy_config.max_load_per_cpu }})

    # Complex when with block-style YAML
    - name: Deploy with environment-specific settings
      ansible.builtin.template:
        src: "app.conf.j2"
        dest: "/etc/app/app.conf"
      when: >-
        (ansible_distribution == 'Ubuntu' and
         ansible_distribution_version is version('22.04', '>=') and
         ansible_memtotal_mb >= 4096) or
        (ansible_distribution == 'Debian' and
         ansible_distribution_version is version('12', '>=') and
         ansible_memtotal_mb >= 2048)
```

## Working with Dictionaries

Complex conditions often involve checking dictionary structures.

```yaml
# Dictionary-based complex conditions
---
- name: Dictionary conditionals
  hosts: all
  gather_facts: false

  vars:
    host_config: "{{ hostvars[inventory_hostname].config | default({}) }}"

  tasks:
    - name: Check nested dictionary values safely
      ansible.builtin.debug:
        msg: "Database SSL is enabled"
      when:
        - host_config.database is defined
        - host_config.database.ssl is defined
        - host_config.database.ssl.enabled | default(false) | bool

    # Use combine filter for merging defaults
    - name: Apply configuration with defaults
      ansible.builtin.set_fact:
        effective_config: >-
          {{
            {'port': 8080, 'workers': 4, 'debug': false}
            | combine(host_config | default({}))
          }}

    - name: Validate effective configuration
      ansible.builtin.assert:
        that:
          - effective_config.port | int > 0
          - effective_config.workers | int > 0
          - effective_config.workers | int <= ansible_processor_vcpus | default(4)
```

## Using zip and zip_longest

For parallel iteration checks.

```yaml
# Parallel comparison with zip
---
- name: Parallel list comparison
  hosts: localhost
  gather_facts: false

  vars:
    expected_services: ['nginx', 'postgresql', 'redis']
    expected_ports: [80, 5432, 6379]

  tasks:
    - name: Check each service on its expected port
      ansible.builtin.command:
        cmd: "nc -z localhost {{ item.1 }}"
      loop: "{{ expected_services | zip(expected_ports) | list }}"
      register: port_checks
      changed_when: false
      failed_when: false

    - name: Report services not on expected ports
      ansible.builtin.debug:
        msg: "{{ item.item.0 }} is not listening on port {{ item.item.1 }}"
      loop: "{{ port_checks.results }}"
      when: item.rc != 0
      loop_control:
        label: "{{ item.item.0 }}:{{ item.item.1 }}"
```

Complex Jinja2 expressions in `when` conditions give you the power to encode sophisticated business logic directly in your playbooks. The key to keeping them maintainable is using YAML multi-line strings for readability, breaking complex conditions into `set_fact` steps, and using descriptive assertion messages. When a condition becomes hard to read at a glance, it is usually a sign that you should extract parts of it into separate facts or variables.
