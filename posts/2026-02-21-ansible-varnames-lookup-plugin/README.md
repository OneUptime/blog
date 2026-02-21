# How to Use the Ansible varnames Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Variables, Dynamic Configuration

Description: Learn how to use the Ansible varnames lookup plugin to find variable names matching a pattern and build dynamic, data-driven playbooks.

---

In complex Ansible projects, you might define variables that follow a naming convention, like `app_db_host`, `app_cache_host`, `app_queue_host`, or `feature_flag_dark_mode`, `feature_flag_beta_ui`. The `varnames` lookup plugin lets you search for variable names that match a regex pattern, returning a list of matching names. This enables dynamic, convention-based automation where you do not need to maintain explicit lists of variable names.

## What the varnames Lookup Does

The `varnames` lookup plugin searches through all currently defined variables and returns the names (not values) of variables whose names match a given regular expression. You can then use the returned names to look up their values dynamically.

## Basic Usage

The simplest form finds variables matching a pattern.

This playbook finds all variables that start with `myapp_`:

```yaml
# playbook.yml - Find variables matching a pattern
---
- name: Discover variables by name pattern
  hosts: localhost
  vars:
    myapp_port: 8080
    myapp_host: "0.0.0.0"
    myapp_workers: 4
    myapp_log_level: info
    other_variable: "not matched"
  tasks:
    - name: Find all myapp variables
      ansible.builtin.debug:
        msg: "Found variable: {{ item }}"
      loop: "{{ lookup('varnames', 'myapp_.*', wantlist=True) }}"

    - name: Show all myapp variables with their values
      ansible.builtin.debug:
        msg: "{{ item }} = {{ lookup('vars', item) }}"
      loop: "{{ lookup('varnames', 'myapp_.*', wantlist=True) }}"
```

## Combining varnames with vars Lookup

The real power comes from combining `varnames` (to find names) with `vars` (to get values). Together, they let you build fully dynamic configuration.

This playbook collects all feature flags and acts on them:

```yaml
# playbook.yml - Dynamic feature flag processing
---
- name: Process feature flags dynamically
  hosts: appservers
  vars:
    feature_flag_dark_mode: true
    feature_flag_beta_ui: false
    feature_flag_new_api: true
    feature_flag_v2_search: true
    feature_flag_legacy_compat: false
  tasks:
    - name: Discover all feature flags
      ansible.builtin.set_fact:
        all_feature_flags: "{{ lookup('varnames', 'feature_flag_.*', wantlist=True) }}"

    - name: Build feature flag dictionary
      ansible.builtin.set_fact:
        features: "{{ features | default({}) | combine({item | regex_replace('^feature_flag_', ''): lookup('vars', item)}) }}"
      loop: "{{ all_feature_flags }}"

    - name: Display all features
      ansible.builtin.debug:
        var: features

    - name: Template feature configuration
      ansible.builtin.copy:
        content: |
          # Auto-generated feature flags
          {% for flag_name in all_feature_flags %}
          {{ flag_name | regex_replace('^feature_flag_', '') }}={{ lookup('vars', flag_name) | lower }}
          {% endfor %}
        dest: /etc/myapp/features.conf
        mode: '0644'
```

## Practical Example: Multi-Service Configuration

Suppose you define configuration for multiple services using a naming convention.

```yaml
# playbook.yml - Configure multiple services from naming convention
---
- name: Configure services from variable naming convention
  hosts: all
  vars:
    # Service definitions follow the pattern: svc_<name>_<property>
    svc_web_port: 80
    svc_web_package: nginx
    svc_web_enabled: true

    svc_api_port: 9090
    svc_api_package: myapi
    svc_api_enabled: true

    svc_worker_port: null
    svc_worker_package: myworker
    svc_worker_enabled: false
  tasks:
    # Find all unique service names
    - name: Extract service names from variable naming pattern
      ansible.builtin.set_fact:
        service_names: "{{ lookup('varnames', 'svc_.*_port', wantlist=True) | map('regex_replace', '^svc_(.*)_port$', '\\1') | list }}"

    - name: Show discovered services
      ansible.builtin.debug:
        msg: "Discovered service: {{ item }}"
      loop: "{{ service_names }}"

    # Install packages for enabled services
    - name: Install enabled services
      ansible.builtin.package:
        name: "{{ lookup('vars', 'svc_' + item + '_package') }}"
        state: present
      loop: "{{ service_names }}"
      when: lookup('vars', 'svc_' + item + '_enabled') | bool
```

## Environment Variable Discovery

You can use `varnames` to find all environment-related variables and build a comprehensive env file.

```yaml
# playbook.yml - Build environment file from variable conventions
---
- name: Generate environment file from variables
  hosts: appservers
  vars:
    env_DATABASE_URL: "postgresql://localhost:5432/mydb"
    env_REDIS_URL: "redis://localhost:6379"
    env_SECRET_KEY: "{{ vault_secret_key }}"
    env_LOG_LEVEL: "info"
    env_PORT: "8080"
    env_WORKERS: "4"
  tasks:
    - name: Find all env_ prefixed variables
      ansible.builtin.set_fact:
        env_var_names: "{{ lookup('varnames', 'env_.*', wantlist=True) }}"

    - name: Generate .env file
      ansible.builtin.copy:
        content: |
          # Generated by Ansible on {{ ansible_date_time.iso8601 }}
          {% for var_name in env_var_names | sort %}
          {{ var_name | regex_replace('^env_', '') }}={{ lookup('vars', var_name) }}
          {% endfor %}
        dest: /etc/myapp/.env
        mode: '0600'
        owner: myapp
        group: myapp
```

## Role Variable Aggregation

When multiple roles define variables with a shared prefix, `varnames` can aggregate them.

```yaml
# roles/base/defaults/main.yml
---
monitoring_check_cpu: true
monitoring_check_memory: true
monitoring_check_disk: true

# roles/database/defaults/main.yml
---
monitoring_check_pg_connections: true
monitoring_check_pg_replication: true

# roles/webserver/defaults/main.yml
---
monitoring_check_nginx_status: true
monitoring_check_ssl_expiry: true
```

```yaml
# playbook.yml - Aggregate monitoring checks from all roles
---
- name: Configure monitoring from role variables
  hosts: all
  roles:
    - base
    - database
    - webserver
  tasks:
    - name: Discover all monitoring checks
      ansible.builtin.set_fact:
        all_checks: "{{ lookup('varnames', 'monitoring_check_.*', wantlist=True) }}"

    - name: Build enabled checks list
      ansible.builtin.set_fact:
        enabled_checks: "{{ all_checks | select('match', '.*') | map('regex_replace', '^monitoring_check_', '') | list }}"

    - name: Show enabled monitoring checks
      ansible.builtin.debug:
        msg: "Enabled checks: {{ enabled_checks }}"

    - name: Template monitoring configuration
      ansible.builtin.template:
        src: monitoring.conf.j2
        dest: /etc/monitoring/checks.conf
        mode: '0644'
      notify: restart monitoring agent
```

## Validation and Auditing

Use `varnames` to validate that all required variables are defined.

```yaml
# playbook.yml - Validate required variables exist
---
- name: Validate deployment variables
  hosts: localhost
  vars:
    deploy_app_name: myapp
    deploy_version: "1.2.3"
    # deploy_target_env is intentionally missing for this example
  tasks:
    - name: Find all deploy_ variables that are defined
      ansible.builtin.set_fact:
        defined_deploy_vars: "{{ lookup('varnames', 'deploy_.*', wantlist=True) }}"

    - name: Check for required variables
      ansible.builtin.assert:
        that:
          - "'deploy_app_name' in defined_deploy_vars"
          - "'deploy_version' in defined_deploy_vars"
          - "'deploy_target_env' in defined_deploy_vars"
        fail_msg: |
          Missing required deploy variables!
          Required: deploy_app_name, deploy_version, deploy_target_env
          Found: {{ defined_deploy_vars | join(', ') }}
        success_msg: "All required deployment variables are defined"
```

## Dynamic Template Generation

Here is a pattern for generating configuration files where the schema is driven entirely by variable naming.

```yaml
# playbook.yml - Generate config sections from variable patterns
---
- name: Generate application configuration dynamically
  hosts: appservers
  vars:
    cfg_database_host: "db.internal"
    cfg_database_port: 5432
    cfg_database_name: "myapp"
    cfg_cache_host: "redis.internal"
    cfg_cache_port: 6379
    cfg_cache_ttl: 300
    cfg_logging_level: "info"
    cfg_logging_file: "/var/log/myapp/app.log"
  tasks:
    # Extract unique section names
    - name: Discover configuration sections
      ansible.builtin.set_fact:
        config_sections: "{{ lookup('varnames', 'cfg_.*', wantlist=True) | map('regex_replace', '^cfg_([^_]+)_.*$', '\\1') | unique | list }}"

    - name: Show discovered sections
      ansible.builtin.debug:
        msg: "Configuration sections: {{ config_sections }}"

    - name: Generate configuration file
      ansible.builtin.copy:
        content: |
          # Auto-generated configuration
          {% for section in config_sections %}
          [{{ section }}]
          {% for var_name in lookup('varnames', 'cfg_' + section + '_.*', wantlist=True) | sort %}
          {{ var_name | regex_replace('^cfg_' + section + '_', '') }} = {{ lookup('vars', var_name) }}
          {% endfor %}

          {% endfor %}
        dest: /etc/myapp/config.ini
        mode: '0644'
```

This produces an INI file like:

```ini
# Auto-generated configuration
[cache]
host = redis.internal
port = 6379
ttl = 300

[database]
host = db.internal
name = myapp
port = 5432

[logging]
file = /var/log/myapp/app.log
level = info
```

## Tips and Considerations

1. **Regex patterns**: The `varnames` lookup uses Python regular expressions, not glob patterns. `myapp_.*` is correct; `myapp_*` will not match as expected.

2. **Performance**: The lookup iterates over all defined variables in the current scope. In playbooks with thousands of variables, this is still fast, but keep it in mind.

3. **Scope awareness**: The lookup sees variables from all sources: defaults, vars files, host_vars, group_vars, registered variables, and set_fact results. This is powerful but means you need unique prefixes to avoid collisions.

4. **Pair with vars lookup**: `varnames` gives you names; `vars` gives you values. Almost every `varnames` use case involves pairing it with the `vars` lookup.

5. **Variable naming discipline**: This plugin works best when your team follows a consistent variable naming convention. Without discipline, the regex matching becomes unreliable.

The `varnames` lookup is a building block for convention-over-configuration patterns in Ansible. Instead of maintaining explicit lists of variables, you establish a naming convention and let the lookup discover everything dynamically.
