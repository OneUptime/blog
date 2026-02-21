# How to Skip Tasks Based on Environment in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Environment, Conditionals, DevOps

Description: Learn how to skip or run Ansible tasks based on the deployment environment using variables, groups, and conditional logic.

---

Running the same playbook across development, staging, and production environments is a fundamental practice in infrastructure automation. But not every task should run in every environment. You might want to skip SSL certificate installation in development, skip database seeding in production, or skip performance testing in staging. Ansible gives you several patterns for environment-based task selection, and choosing the right one depends on how your environments are organized.

## Pattern 1: Environment Variable

The simplest approach is passing an environment variable and checking it in `when` conditions.

```yaml
# Environment-based task skipping with a variable
---
- name: Deploy application
  hosts: app_servers
  become: true

  vars:
    env: "{{ deploy_env | default('development') }}"

  tasks:
    - name: Show target environment
      ansible.builtin.debug:
        msg: "Deploying to {{ env }} environment"

    # Only in production
    - name: Create database backup before deployment
      ansible.builtin.command:
        cmd: /opt/scripts/backup-db.sh
      when: env == 'production'

    # Runs everywhere
    - name: Deploy application code
      ansible.builtin.copy:
        src: "app-{{ version }}.tar.gz"
        dest: /opt/app/

    # Skip in development
    - name: Configure SSL certificates
      ansible.builtin.include_role:
        name: ssl_certificates
      when: env != 'development'

    # Only in development and staging
    - name: Seed test data
      ansible.builtin.command:
        cmd: /opt/app/seed-data.sh
      when: env in ['development', 'staging']

    # Only in production
    - name: Notify monitoring system
      ansible.builtin.uri:
        url: "{{ monitoring_webhook }}"
        method: POST
        body_format: json
        body:
          event: deployment
          version: "{{ version }}"
          environment: "{{ env }}"
      when: env == 'production'
```

Run it with:

```bash
ansible-playbook deploy.yml -e "deploy_env=production"
ansible-playbook deploy.yml -e "deploy_env=staging"
ansible-playbook deploy.yml  # defaults to development
```

## Pattern 2: Inventory Groups

Organizing hosts into environment-based groups lets you use group membership for conditional logic.

```ini
# inventory/hosts.ini
[development]
dev-app-01

[staging]
stg-app-01
stg-app-02

[production]
prod-app-01
prod-app-02
prod-app-03

[app_servers:children]
development
staging
production
```

```yaml
# Group-based environment conditionals
---
- name: Environment-aware deployment
  hosts: app_servers
  become: true

  tasks:
    - name: Determine environment from groups
      ansible.builtin.set_fact:
        env: >-
          {% if 'production' in group_names %}production
          {% elif 'staging' in group_names %}staging
          {% else %}development{% endif %}

    - name: Enable debug mode (non-production only)
      ansible.builtin.lineinfile:
        path: /etc/app/config.ini
        regexp: '^DEBUG='
        line: 'DEBUG=true'
      when: "'production' not in group_names"

    - name: Disable debug mode (production only)
      ansible.builtin.lineinfile:
        path: /etc/app/config.ini
        regexp: '^DEBUG='
        line: 'DEBUG=false'
      when: "'production' in group_names"

    - name: Apply production security hardening
      ansible.builtin.include_role:
        name: security_hardening
      when: "'production' in group_names"

    - name: Install development tools
      ansible.builtin.apt:
        name:
          - vim
          - htop
          - strace
          - tcpdump
        state: present
      when: "'development' in group_names"
```

## Pattern 3: Environment-Specific Variable Files

Load different variable files based on the environment. This keeps environment-specific configuration out of the playbook.

```yaml
# Load environment-specific vars
---
- name: Deploy with environment-specific config
  hosts: app_servers
  become: true

  vars:
    env: "{{ deploy_env | default('development') }}"

  pre_tasks:
    - name: Load environment defaults
      ansible.builtin.include_vars:
        file: "vars/defaults.yml"

    - name: Load environment-specific variables
      ansible.builtin.include_vars:
        file: "vars/{{ env }}.yml"

  tasks:
    - name: Deploy application with environment settings
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
```

```yaml
# vars/defaults.yml
---
app_debug: false
app_log_level: INFO
app_replicas: 1
enable_ssl: false
enable_monitoring: false
run_db_seed: false
run_backup: false
```

```yaml
# vars/development.yml
---
app_debug: true
app_log_level: DEBUG
app_replicas: 1
enable_ssl: false
enable_monitoring: false
run_db_seed: true
run_backup: false
```

```yaml
# vars/production.yml
---
app_debug: false
app_log_level: WARNING
app_replicas: 3
enable_ssl: true
enable_monitoring: true
run_db_seed: false
run_backup: true
```

Then your tasks use these variables:

```yaml
  tasks:
    - name: Seed database
      ansible.builtin.command:
        cmd: /opt/app/seed.sh
      when: run_db_seed | bool

    - name: Configure SSL
      ansible.builtin.include_role:
        name: ssl
      when: enable_ssl | bool

    - name: Setup monitoring
      ansible.builtin.include_role:
        name: monitoring
      when: enable_monitoring | bool

    - name: Pre-deployment backup
      ansible.builtin.command:
        cmd: /opt/scripts/backup.sh
      when: run_backup | bool
```

## Pattern 4: Block-Level Environment Conditions

Use blocks to group multiple tasks under a single environment condition.

```yaml
# Block-level environment grouping
---
- name: Environment-scoped task blocks
  hosts: app_servers
  become: true

  vars:
    env: "{{ deploy_env | default('development') }}"

  tasks:
    - name: Common tasks (all environments)
      block:
        - name: Install base packages
          ansible.builtin.apt:
            name:
              - curl
              - wget
              - git
            state: present
            update_cache: true

        - name: Deploy application
          ansible.builtin.copy:
            src: "app-{{ version }}.tar.gz"
            dest: /opt/app/

    - name: Production-only tasks
      block:
        - name: Configure log rotation
          ansible.builtin.template:
            src: logrotate-production.conf.j2
            dest: /etc/logrotate.d/app

        - name: Enable firewall rules
          ansible.builtin.include_role:
            name: firewall

        - name: Configure backup schedule
          ansible.builtin.cron:
            name: "app backup"
            minute: "0"
            hour: "2"
            job: "/opt/scripts/backup.sh"

        - name: Send deployment notification
          ansible.builtin.uri:
            url: "{{ slack_webhook }}"
            method: POST
            body_format: json
            body:
              text: "Deployed {{ version }} to production"
      when: env == 'production'

    - name: Development-only tasks
      block:
        - name: Enable hot reload
          ansible.builtin.lineinfile:
            path: /etc/app/config.ini
            regexp: '^HOT_RELOAD='
            line: 'HOT_RELOAD=true'

        - name: Mount development tools volume
          ansible.posix.mount:
            path: /opt/dev-tools
            src: "nfs.dev.example.com:/tools"
            fstype: nfs
            state: mounted

        - name: Configure permissive CORS
          ansible.builtin.template:
            src: cors-permissive.conf.j2
            dest: /etc/nginx/conf.d/cors.conf
      when: env == 'development'
```

## Pattern 5: Role-Based Environment Handling

Handle environment differences inside roles using default variables.

```yaml
# Playbook
---
- name: Deploy application
  hosts: app_servers
  become: true

  roles:
    - role: app_deploy
      vars:
        app_env: "{{ deploy_env | default('development') }}"
```

```yaml
# roles/app_deploy/defaults/main.yml
---
app_env: development

# Environment-based defaults
env_settings:
  development:
    debug: true
    workers: 1
    ssl: false
    backup_before_deploy: false
  staging:
    debug: false
    workers: 2
    ssl: true
    backup_before_deploy: false
  production:
    debug: false
    workers: 4
    ssl: true
    backup_before_deploy: true
```

```yaml
# roles/app_deploy/tasks/main.yml
---
- name: Set environment settings
  ansible.builtin.set_fact:
    current_settings: "{{ env_settings[app_env] }}"

- name: Backup database before deployment
  ansible.builtin.command:
    cmd: /opt/scripts/backup.sh
  when: current_settings.backup_before_deploy | bool

- name: Deploy application
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/app.conf
  vars:
    debug_mode: "{{ current_settings.debug }}"
    worker_count: "{{ current_settings.workers }}"

- name: Configure SSL
  ansible.builtin.include_tasks:
    file: ssl.yml
  when: current_settings.ssl | bool
```

## Pattern 6: Environment from Ansible Facts

Detect the environment automatically from system facts or hostname conventions.

```yaml
# Auto-detect environment
---
- name: Auto-detect and configure
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Detect environment from hostname
      ansible.builtin.set_fact:
        detected_env: >-
          {% if inventory_hostname.startswith('prod-') or inventory_hostname.startswith('prd-') %}production
          {% elif inventory_hostname.startswith('stg-') or inventory_hostname.startswith('staging-') %}staging
          {% elif inventory_hostname.startswith('dev-') %}development
          {% else %}unknown{% endif %}

    - name: Fail on unknown environment
      ansible.builtin.fail:
        msg: "Cannot detect environment from hostname {{ inventory_hostname }}"
      when: detected_env | trim == 'unknown'

    - name: Show detected environment
      ansible.builtin.debug:
        msg: "Detected environment: {{ detected_env | trim }}"

    - name: Apply environment-specific configuration
      ansible.builtin.template:
        src: "config-{{ detected_env | trim }}.j2"
        dest: /etc/app/config.yml
```

## Pattern 7: Tags for Environment Selection

Use Ansible tags to let operators choose which environment-specific tasks to run.

```yaml
# Tag-based environment selection
---
- name: Tagged deployment
  hosts: app_servers
  become: true

  tasks:
    - name: Common deployment tasks
      ansible.builtin.copy:
        src: app.tar.gz
        dest: /opt/app/
      tags: [always]

    - name: Production security scan
      ansible.builtin.command:
        cmd: /opt/security/scan.sh
      tags: [production]

    - name: Staging load test
      ansible.builtin.command:
        cmd: /opt/testing/load-test.sh
      tags: [staging]

    - name: Development mock services
      ansible.builtin.command:
        cmd: /opt/dev/start-mocks.sh
      tags: [development]
```

Run with: `ansible-playbook deploy.yml --tags "production"` to only run production-tagged tasks plus tasks marked `always`.

## Combining Patterns

In practice, you often combine multiple patterns for maximum flexibility.

```yaml
# Combined approach
---
- name: Comprehensive environment handling
  hosts: app_servers
  become: true

  vars:
    env: "{{ deploy_env | default('development') }}"

  pre_tasks:
    - name: Load environment variables
      ansible.builtin.include_vars:
        file: "vars/{{ env }}.yml"

    - name: Validate environment
      ansible.builtin.assert:
        that:
          - env in ['development', 'staging', 'production']
        fail_msg: "Invalid environment: {{ env }}"

  tasks:
    - name: Deploy with environment-aware config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      # Template uses vars loaded from environment-specific file

    - name: Run environment-specific post-deploy
      ansible.builtin.include_tasks:
        file: "tasks/post-deploy-{{ env }}.yml"
```

Environment-based task selection is at the core of writing reusable playbooks. Choose the pattern that fits your team's workflow: variables for simple setups, groups for inventory-based environments, variable files for complex per-environment configuration, and blocks for grouping related environment-specific tasks. The goal is to have one playbook that works correctly everywhere, reducing the risk of environment-specific playbooks drifting apart over time.
