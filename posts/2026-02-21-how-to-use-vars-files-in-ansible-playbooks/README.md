# How to Use vars_files in Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Playbooks, Configuration Management

Description: A practical guide to using vars_files in Ansible playbooks to organize and load variables from external YAML files at the play level.

---

The `vars_files` directive in Ansible lets you load variables from external files at the play level. Unlike `include_vars` which runs as a task, `vars_files` loads variables before any tasks execute, making them available to all tasks, handlers, templates, and roles in the play. This is the standard way to separate your variable definitions from your playbook logic.

## Basic vars_files Usage

Add `vars_files` at the play level to load one or more YAML files.

```yaml
# basic-vars-files.yml
# Loads variables from external files at play level
---
- name: Deploy application
  hosts: appservers
  become: yes
  vars_files:
    - vars/app-config.yml
    - vars/secrets.yml
  tasks:
    - name: Show loaded variables
      ansible.builtin.debug:
        msg:
          - "App: {{ app_name }} v{{ app_version }}"
          - "DB: {{ db_host }}:{{ db_port }}"
```

```yaml
# vars/app-config.yml
# Application configuration
app_name: mywebapp
app_version: "2.4.1"
app_port: 8080
workers: 4

# vars/secrets.yml
# Sensitive configuration (should be ansible-vault encrypted)
db_host: db.internal.example.com
db_port: 5432
db_user: appuser
db_password: "s3cret_p@ss"
```

Variables from all listed files are available throughout the entire play, including in tasks, handlers, templates, and roles.

## vars_files vs vars vs include_vars

These three approaches to defining variables have different behaviors. Understanding the differences helps you pick the right one for each situation.

```yaml
# comparison.yml
# Demonstrates the three variable loading approaches
---
- name: Variable loading comparison
  hosts: all

  # vars - inline variables, evaluated at play parse time
  vars:
    inline_var: "defined inline"

  # vars_files - loaded before tasks, evaluated at play parse time
  vars_files:
    - vars/from-file.yml

  tasks:
    # include_vars - loaded at task execution time
    - name: Load variables dynamically
      ansible.builtin.include_vars:
        file: vars/dynamic.yml

    - name: All three types are now available
      ansible.builtin.debug:
        msg:
          - "Inline: {{ inline_var }}"
          - "From file: {{ file_var }}"
          - "Dynamic: {{ dynamic_var }}"
```

The key differences:

| Feature | vars | vars_files | include_vars |
|---------|------|------------|--------------|
| Loaded when | Play parse | Play parse | Task execution |
| Available to | Entire play | Entire play | After the task |
| Dynamic paths | No | Limited | Yes |
| Conditional | No | No | Yes (with when) |
| Precedence | Lower | Higher than vars | Highest |

## Loading Multiple Files

You can list as many files as you need. They are loaded in order, and later files override earlier ones.

```yaml
# multiple-files.yml
# Loads multiple variable files in order of precedence
---
- name: Load layered configuration
  hosts: all
  vars_files:
    - vars/defaults.yml        # Base defaults
    - vars/app.yml             # Application-specific
    - vars/environment.yml     # Environment overrides
  tasks:
    - name: Show final variable values
      ansible.builtin.debug:
        msg:
          - "Log level: {{ log_level }}"
          - "Workers: {{ worker_count }}"
          - "Debug: {{ debug_mode }}"
```

```yaml
# vars/defaults.yml
# Base defaults - lowest priority
log_level: info
worker_count: 2
debug_mode: false
cache_ttl: 3600

# vars/app.yml
# Application settings - overrides defaults
worker_count: 4
cache_ttl: 1800

# vars/environment.yml
# Environment overrides - highest priority
log_level: debug
debug_mode: true
```

The final values are: `log_level: debug`, `worker_count: 4`, `debug_mode: true`, `cache_ttl: 1800`.

## Using Variables in File Paths

You can use variables in `vars_files` paths, but they must be defined before `vars_files` is evaluated. This means they need to come from the inventory, command line, or the `vars` section.

```yaml
# dynamic-vars-files.yml
# Uses a variable in the vars_files path
---
- name: Load environment-specific variables
  hosts: all
  vars:
    env: "{{ deploy_env | default('development') }}"
  vars_files:
    - "vars/environments/{{ env }}.yml"
  tasks:
    - name: Show environment config
      ansible.builtin.debug:
        msg: "Deploying to {{ env }} with {{ replicas }} replicas"
```

Run it with different environments:

```bash
# Development deployment
ansible-playbook dynamic-vars-files.yml

# Production deployment
ansible-playbook dynamic-vars-files.yml -e deploy_env=production
```

## Optional vars_files

If a variable file might not exist, you need to handle that. Standard `vars_files` fails if a file is missing. Use a list of lists for fallback behavior.

```yaml
# optional-vars-files.yml
# Handles optional variable files with fallback
---
- name: Load vars with fallback
  hosts: all
  vars_files:
    # This always loads
    - vars/base.yml
    # This tries files in order, uses the first one found
    - - "vars/overrides/{{ inventory_hostname }}.yml"
      - "vars/overrides/{{ group_names[0] | default('default') }}.yml"
      - "vars/overrides/default.yml"
  tasks:
    - name: Show final config
      ansible.builtin.debug:
        msg: "Config: {{ app_config | default('using defaults') }}"
```

The nested list (list of lists) syntax tells Ansible to try each file in order and use the first one that exists. If none exist, the play fails.

## Organizing Variables with vars_files

Here is a practical project structure that uses `vars_files` effectively.

```
project/
  playbook.yml
  vars/
    common.yml          # Variables shared across all environments
    packages.yml        # Package lists
    users.yml           # User definitions
    environments/
      development.yml
      staging.yml
      production.yml
    secrets/
      development.yml   # Vault-encrypted
      production.yml    # Vault-encrypted
```

```yaml
# playbook.yml
# A well-organized playbook using vars_files
---
- name: Configure application servers
  hosts: appservers
  become: yes
  vars:
    env: "{{ deploy_env | default('development') }}"
  vars_files:
    - vars/common.yml
    - vars/packages.yml
    - vars/users.yml
    - "vars/environments/{{ env }}.yml"
    - "vars/secrets/{{ env }}.yml"
  tasks:
    - name: Install required packages
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      loop: "{{ packages }}"

    - name: Create application users
      ansible.builtin.user:
        name: "{{ item.name }}"
        groups: "{{ item.groups | join(',') }}"
        state: present
      loop: "{{ users }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Deploy application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        mode: '0640'
```

## Using vars_files with Vault-Encrypted Files

Vault-encrypted files work seamlessly with `vars_files`. Ansible decrypts them automatically when the vault password is provided.

```yaml
# vault-vars-files.yml
# Loads both plain and vault-encrypted variable files
---
- name: Deploy with secrets
  hosts: appservers
  vars_files:
    - vars/app-config.yml            # Plain text config
    - vars/secrets-encrypted.yml     # Vault-encrypted secrets
  tasks:
    - name: Deploy config with secrets
      ansible.builtin.template:
        src: app-config.j2
        dest: /etc/myapp/config.yml
        owner: myapp
        group: myapp
        mode: '0600'
```

```bash
# Create the encrypted secrets file
ansible-vault create vars/secrets-encrypted.yml

# Run the playbook (prompts for vault password)
ansible-playbook vault-vars-files.yml --ask-vault-pass

# Or use a vault password file
ansible-playbook vault-vars-files.yml --vault-password-file ~/.vault_pass
```

## vars_files in Roles

Roles have their own `vars/` and `defaults/` directories, but you can still use `vars_files` to load additional variable files when applying roles.

```yaml
# roles-with-vars-files.yml
# Combines vars_files with role includes
---
- name: Apply roles with custom variables
  hosts: webservers
  become: yes
  vars_files:
    - vars/site-config.yml
    - vars/ssl-certificates.yml
  roles:
    - role: nginx
      vars:
        nginx_port: "{{ site_port }}"
    - role: certbot
      vars:
        domains: "{{ site_domains }}"
```

## Complex Variable Structures in vars_files

Variable files can contain complex data structures, not just simple key-value pairs.

```yaml
# vars/infrastructure.yml
# Complex variable structures
load_balancers:
  - name: lb-frontend
    algorithm: round_robin
    backends:
      - host: web-01
        port: 8080
        weight: 5
      - host: web-02
        port: 8080
        weight: 5

databases:
  primary:
    host: db-primary.internal
    port: 5432
    replicas:
      - db-replica-01.internal
      - db-replica-02.internal
  cache:
    host: redis.internal
    port: 6379
    cluster_mode: true

monitoring:
  enabled: true
  endpoints:
    prometheus: "http://monitor:9090"
    grafana: "http://monitor:3000"
  alert_channels:
    - type: slack
      webhook: "https://hooks.slack.com/services/xxx"
    - type: email
      recipients:
        - ops@example.com
```

```yaml
# use-complex-vars.yml
# Uses the complex variable structures
---
- name: Configure infrastructure
  hosts: all
  vars_files:
    - vars/infrastructure.yml
  tasks:
    - name: Show database primary host
      ansible.builtin.debug:
        msg: "Primary DB: {{ databases.primary.host }}"

    - name: Show all replicas
      ansible.builtin.debug:
        msg: "Replica: {{ item }}"
      loop: "{{ databases.primary.replicas }}"

    - name: Show monitoring status
      ansible.builtin.debug:
        msg: "Monitoring {{ 'enabled' if monitoring.enabled else 'disabled' }}"
```

## Summary

The `vars_files` directive is the standard way to load variables from external files at the play level. Variables are available before any tasks run, making them accessible to everything in the play. Use multiple files for layered configuration, variables in paths for environment-specific loading, and nested lists for fallback behavior. Combined with Ansible Vault for secrets, `vars_files` provides a clean separation between your playbook logic and configuration data. For cases where you need to load variables dynamically based on conditions or facts, use `include_vars` as a task instead.
