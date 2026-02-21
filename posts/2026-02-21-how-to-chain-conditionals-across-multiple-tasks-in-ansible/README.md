# How to Chain Conditionals Across Multiple Tasks in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Task Chaining, Workflow

Description: Learn how to chain conditionals across multiple Ansible tasks using registered variables to build sequential decision-making workflows.

---

Individual task conditionals are useful, but the real power comes from chaining them together. When Task B depends on the outcome of Task A, and Task C depends on both, you need to pass information forward through the task chain. Ansible's `register` directive combined with `when` conditions lets you build these multi-step decision workflows where each task's conditional references the results of previous tasks.

## Basic Task Chaining

The simplest chain is two tasks where the second depends on the first.

```yaml
# Basic two-task chain
---
- name: Sequential task chaining
  hosts: all
  become: true

  tasks:
    - name: Check if configuration is valid
      ansible.builtin.command:
        cmd: /opt/app/validate-config.sh
      register: config_validation
      changed_when: false
      failed_when: false

    - name: Apply configuration if valid
      ansible.builtin.command:
        cmd: /opt/app/apply-config.sh
      when: config_validation.rc == 0
      register: config_apply

    - name: Restart service if configuration was applied
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      when:
        - config_validation.rc == 0
        - config_apply is defined
        - config_apply is changed
```

Each task builds on the information from the previous one. The restart only happens if the config was valid AND the apply actually changed something.

## Multi-Step Decision Pipeline

Here is a more realistic pipeline where multiple decisions chain together.

```yaml
# Multi-step deployment pipeline
---
- name: Deployment pipeline with chained decisions
  hosts: app_servers
  become: true

  tasks:
    # Step 1: Check current state
    - name: Get current application version
      ansible.builtin.command:
        cmd: /opt/app/bin/app --version
      register: current_version
      changed_when: false
      failed_when: false

    # Step 2: Decide if update is needed (depends on step 1)
    - name: Determine if update is needed
      ansible.builtin.set_fact:
        needs_update: "{{ current_version is failed or current_version.stdout | trim != target_version }}"
        is_fresh_install: "{{ current_version is failed }}"

    # Step 3: Download if update needed (depends on step 2)
    - name: Download new version
      ansible.builtin.get_url:
        url: "https://releases.example.com/app/{{ target_version }}/app.tar.gz"
        dest: /tmp/app-{{ target_version }}.tar.gz
      register: download_result
      when: needs_update | bool

    # Step 4: Backup if updating existing install (depends on steps 2 and 3)
    - name: Create backup of current installation
      ansible.builtin.archive:
        path: /opt/app/
        dest: "/var/backups/app-{{ current_version.stdout | default('unknown') | trim }}.tar.gz"
      register: backup_result
      when:
        - needs_update | bool
        - not (is_fresh_install | bool)
        - download_result is success

    # Step 5: Install (depends on steps 3 and 4)
    - name: Stop application before update
      ansible.builtin.systemd:
        name: app
        state: stopped
      when:
        - needs_update | bool
        - not (is_fresh_install | bool)
        - download_result is success

    - name: Extract new version
      ansible.builtin.unarchive:
        src: /tmp/app-{{ target_version }}.tar.gz
        dest: /opt/app/
        remote_src: true
      register: install_result
      when:
        - needs_update | bool
        - download_result is defined
        - download_result is success

    # Step 6: Post-install (depends on step 5)
    - name: Run migrations for upgrades
      ansible.builtin.command:
        cmd: /opt/app/bin/app migrate
      register: migration_result
      when:
        - needs_update | bool
        - not (is_fresh_install | bool)
        - install_result is defined
        - install_result is success

    - name: Run initial setup for fresh installs
      ansible.builtin.command:
        cmd: /opt/app/bin/app setup
      register: setup_result
      when:
        - is_fresh_install | bool
        - install_result is defined
        - install_result is success

    # Step 7: Start and verify (depends on steps 5 and 6)
    - name: Start application
      ansible.builtin.systemd:
        name: app
        state: started
      when:
        - needs_update | bool
        - install_result is defined
        - install_result is success

    - name: Verify application health
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 5
      delay: 3
      when: needs_update | bool
```

## Using set_fact for Decision Points

When the chain gets complex, `set_fact` creates named decision points that make the logic easier to follow.

```yaml
# Named decision points with set_fact
---
- name: Clean decision chain
  hosts: all
  become: true
  gather_facts: true

  tasks:
    # Gather information
    - name: Check disk space
      ansible.builtin.command:
        cmd: df --output=avail -BG /
      register: disk_info
      changed_when: false

    - name: Check memory
      ansible.builtin.set_fact:
        has_enough_memory: "{{ ansible_memtotal_mb >= 4096 }}"

    - name: Check disk space
      ansible.builtin.set_fact:
        has_enough_disk: "{{ disk_info.stdout_lines[-1] | regex_search('(\\d+)', '\\1') | first | int >= 10 }}"

    - name: Check if app is installed
      ansible.builtin.stat:
        path: /opt/app/bin/app
      register: app_binary

    - name: Set installation type
      ansible.builtin.set_fact:
        app_installed: "{{ app_binary.stat.exists }}"

    # Make decisions based on gathered information
    - name: Determine action
      ansible.builtin.set_fact:
        action: >-
          {% if not has_enough_memory | bool or not has_enough_disk | bool %}skip_insufficient_resources
          {% elif not app_installed | bool %}fresh_install
          {% else %}upgrade{% endif %}

    - name: Report planned action
      ansible.builtin.debug:
        msg: "Action for {{ inventory_hostname }}: {{ action | trim }}"

    # Execute based on decision
    - name: Skip with warning
      ansible.builtin.debug:
        msg: >
          Skipping {{ inventory_hostname }}: insufficient resources
          (memory={{ has_enough_memory }}, disk={{ has_enough_disk }})
      when: action | trim == 'skip_insufficient_resources'

    - name: Fresh install
      ansible.builtin.include_tasks:
        file: tasks/fresh-install.yml
      when: action | trim == 'fresh_install'

    - name: Upgrade existing installation
      ansible.builtin.include_tasks:
        file: tasks/upgrade.yml
      when: action | trim == 'upgrade'
```

## Chaining Across Loops

When tasks in a chain involve loops, you need to handle the registered results list.

```yaml
# Chaining conditionals with loop results
---
- name: Service health chain
  hosts: all
  become: true

  vars:
    services:
      - name: nginx
        port: 80
        config: /etc/nginx/nginx.conf
      - name: postgresql
        port: 5432
        config: /etc/postgresql/14/main/postgresql.conf
      - name: redis
        port: 6379
        config: /etc/redis/redis.conf

  tasks:
    # Step 1: Check config files exist
    - name: Verify config files exist
      ansible.builtin.stat:
        path: "{{ item.config }}"
      loop: "{{ services }}"
      register: config_checks
      loop_control:
        label: "{{ item.name }}"

    # Step 2: Validate configs that exist (chained from step 1)
    - name: Validate service configurations
      ansible.builtin.command:
        cmd: "{{ item.item.name }} -t"
      loop: "{{ config_checks.results }}"
      when: item.stat.exists
      register: config_validations
      changed_when: false
      failed_when: false
      loop_control:
        label: "{{ item.item.name }}"

    # Step 3: Start services with valid configs (chained from steps 1 and 2)
    - name: Start services with valid configurations
      ansible.builtin.systemd:
        name: "{{ item.0.item.name }}"
        state: started
      loop: "{{ config_checks.results | zip(config_validations.results | default([])) | list }}"
      when:
        - item.0.stat.exists
        - item.1 is defined
        - item.1 is not skipped
        - item.1.rc == 0
      loop_control:
        label: "{{ item.0.item.name }}"
```

## Error-Aware Chains

Building chains that account for failures at any step requires careful use of `failed_when`, `ignore_errors`, and conditional checks.

```yaml
# Error-aware task chain
---
- name: Resilient deployment chain
  hosts: app_servers
  become: true

  tasks:
    - name: Pull latest code
      ansible.builtin.git:
        repo: "{{ app_repo }}"
        dest: /opt/app
        version: "{{ app_branch }}"
      register: git_pull
      ignore_errors: true

    - name: Install dependencies (only if code was pulled)
      ansible.builtin.command:
        cmd: pip install -r /opt/app/requirements.txt
      register: deps_install
      when: git_pull is success
      ignore_errors: true

    - name: Run tests (only if dependencies installed)
      ansible.builtin.command:
        cmd: python -m pytest /opt/app/tests/
      register: test_run
      when:
        - git_pull is success
        - deps_install is defined
        - deps_install is success
      ignore_errors: true

    - name: Deploy (only if tests passed)
      ansible.builtin.command:
        cmd: /opt/app/deploy.sh
      register: deployment
      when:
        - git_pull is success
        - deps_install is defined and deps_install is success
        - test_run is defined and test_run is success

    # Build a summary of what happened
    - name: Generate chain status report
      ansible.builtin.debug:
        msg: |
          Deployment Chain Report for {{ inventory_hostname }}:
          1. Git Pull:    {{ 'SUCCESS' if git_pull is success else 'FAILED: ' + (git_pull.msg | default('unknown error')) }}
          2. Dependencies: {{ 'SUCCESS' if (deps_install is defined and deps_install is success) else ('SKIPPED' if deps_install is not defined or deps_install is skipped else 'FAILED') }}
          3. Tests:       {{ 'SUCCESS' if (test_run is defined and test_run is success) else ('SKIPPED' if test_run is not defined or test_run is skipped else 'FAILED') }}
          4. Deployment:  {{ 'SUCCESS' if (deployment is defined and deployment is success) else ('SKIPPED' if deployment is not defined or deployment is skipped else 'FAILED') }}
```

## Cross-Host Chaining

Sometimes a task on one host depends on results from another host. Use `hostvars` to access cross-host data.

```yaml
# Cross-host conditional chain
---
- name: Database-dependent deployment
  hosts: all
  become: true

  tasks:
    - name: Run database migration (only on db servers)
      ansible.builtin.command:
        cmd: /opt/app/migrate.sh
      register: migration
      when: "'dbservers' in group_names"

    - name: Wait for migration on all db servers
      ansible.builtin.set_fact:
        db_migration_success: >-
          {{
            groups['dbservers'] | default([])
            | map('extract', hostvars)
            | selectattr('migration', 'defined')
            | selectattr('migration.rc', 'defined')
            | selectattr('migration.rc', 'equalto', 0)
            | list
            | length == groups['dbservers'] | default([]) | length
          }}
      run_once: true

    - name: Deploy application (only if all migrations succeeded)
      ansible.builtin.copy:
        src: app.jar
        dest: /opt/app/app.jar
      when:
        - "'appservers' in group_names"
        - db_migration_success | default(false) | bool
```

## Chaining with include_tasks

For complex chains, break them into separate task files and use include_tasks with conditionals.

```yaml
# Chain with included task files
---
- name: Modular deployment chain
  hosts: all
  become: true

  tasks:
    - name: Pre-flight checks
      ansible.builtin.include_tasks:
        file: tasks/preflight.yml
      register: preflight

    - name: Deployment
      ansible.builtin.include_tasks:
        file: tasks/deploy.yml
      when: preflight_passed | default(false) | bool

    - name: Post-deployment verification
      ansible.builtin.include_tasks:
        file: tasks/verify.yml
      when: deployment_done | default(false) | bool

    - name: Rollback if verification failed
      ansible.builtin.include_tasks:
        file: tasks/rollback.yml
      when:
        - deployment_done | default(false) | bool
        - not (verification_passed | default(true) | bool)
```

Each included task file sets facts that the next file's conditions check. This keeps each file focused and the chain logic clear.

Chaining conditionals across tasks is how you build intelligent automation workflows. The key principles are: register every task result you might need later, use `set_fact` to create clear decision points, always handle the case where a previous task was skipped or failed, and keep the chain readable by using meaningful variable names. When chains get too complex to follow in a single file, break them into included task files with facts as the communication mechanism.
