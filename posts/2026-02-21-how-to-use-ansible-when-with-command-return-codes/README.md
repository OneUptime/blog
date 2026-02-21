# How to Use Ansible when with Command Return Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Shell Commands, Return Codes

Description: Learn how to use command and shell module return codes in Ansible when conditionals to make decisions based on command exit status.

---

Every command you run on a Linux system exits with a return code (also called an exit code). Zero means success, and anything non-zero means some kind of failure or alternative result. Many system tools use specific non-zero codes to communicate different states. For example, `grep` returns 0 when it finds a match and 1 when it does not. Ansible's `command` and `shell` modules capture these return codes, and you can use them in `when` conditionals to build logic around what commands report about the system.

## Basic Return Code Checking

By default, Ansible treats a non-zero return code as a failure and stops the playbook. To use return codes in conditionals, you need to override this behavior with `failed_when`.

```yaml
# Basic return code conditional
---
- name: Return code basics
  hosts: all
  become: true

  tasks:
    - name: Check if a process is running
      ansible.builtin.command:
        cmd: pgrep -x nginx
      register: nginx_check
      failed_when: false  # Do not fail on non-zero exit
      changed_when: false  # This is a read-only check

    # pgrep returns 0 if process found, 1 if not found
    - name: Start nginx if not running
      ansible.builtin.systemd:
        name: nginx
        state: started
      when: nginx_check.rc != 0

    - name: Report nginx is already running
      ansible.builtin.debug:
        msg: "nginx is already running (PID: {{ nginx_check.stdout | trim }})"
      when: nginx_check.rc == 0
```

The `.rc` attribute of the registered variable contains the return code. The `failed_when: false` directive prevents Ansible from treating a non-zero return code as a failure.

## Common Return Code Patterns

Different tools use return codes in different ways. Here are patterns for the most common ones.

```yaml
# grep: 0 = found, 1 = not found, 2 = error
---
- name: Grep return code patterns
  hosts: all
  become: true

  tasks:
    - name: Check if string exists in config
      ansible.builtin.command:
        cmd: grep -q "max_connections" /etc/postgresql/14/main/postgresql.conf
      register: grep_result
      failed_when: grep_result.rc > 1  # Only fail on actual errors (rc=2)
      changed_when: false

    - name: Add max_connections if missing
      ansible.builtin.lineinfile:
        path: /etc/postgresql/14/main/postgresql.conf
        line: "max_connections = 200"
      when: grep_result.rc == 1  # Not found
```

```yaml
# systemctl is-active: 0 = active, 3 = inactive, 4 = not found
---
- name: Systemctl return code patterns
  hosts: all
  become: true

  tasks:
    - name: Check service status
      ansible.builtin.command:
        cmd: systemctl is-active myapp
      register: service_status
      failed_when: false
      changed_when: false

    - name: Handle based on service state
      ansible.builtin.debug:
        msg: >
          {% if service_status.rc == 0 %}Service is active
          {% elif service_status.rc == 3 %}Service is inactive
          {% elif service_status.rc == 4 %}Service not found
          {% else %}Unknown state (rc={{ service_status.rc }}){% endif %}

    - name: Install and start service if not found
      block:
        - name: Install service
          ansible.builtin.copy:
            src: myapp.service
            dest: /etc/systemd/system/myapp.service

        - name: Enable and start service
          ansible.builtin.systemd:
            name: myapp
            state: started
            enabled: true
            daemon_reload: true
      when: service_status.rc == 4
```

```yaml
# diff: 0 = identical, 1 = different, 2 = error
---
- name: Diff return code patterns
  hosts: all
  become: true

  tasks:
    - name: Compare running config with expected config
      ansible.builtin.command:
        cmd: diff -q /etc/nginx/nginx.conf /tmp/expected_nginx.conf
      register: config_diff
      failed_when: config_diff.rc > 1  # Only fail on actual errors
      changed_when: false

    - name: Apply new config if different
      ansible.builtin.copy:
        src: /tmp/expected_nginx.conf
        dest: /etc/nginx/nginx.conf
        remote_src: true
      when: config_diff.rc == 1
      notify: reload nginx

    - name: Report config is already correct
      ansible.builtin.debug:
        msg: "nginx configuration is already up to date"
      when: config_diff.rc == 0
```

## Using failed_when for Custom Failure Logic

The `failed_when` directive lets you define exactly which return codes count as failures.

```yaml
# Custom failure logic with return codes
---
- name: Custom failure definitions
  hosts: all
  become: true

  tasks:
    # curl returns various codes: 0=success, 7=connection refused, 28=timeout
    - name: Check API endpoint
      ansible.builtin.command:
        cmd: curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
      register: health_check
      failed_when: false
      changed_when: false

    - name: Handle based on curl result
      block:
        - name: API is healthy
          ansible.builtin.debug:
            msg: "API returned HTTP {{ health_check.stdout }}"
          when: health_check.rc == 0 and health_check.stdout == "200"

        - name: API returned error
          ansible.builtin.debug:
            msg: "API is reachable but returned HTTP {{ health_check.stdout }}"
          when: health_check.rc == 0 and health_check.stdout != "200"

        - name: API is not reachable
          ansible.builtin.debug:
            msg: "API is not reachable (curl exit code: {{ health_check.rc }})"
          when: health_check.rc != 0

    # pg_isready returns: 0=accepting, 1=rejecting, 2=no response
    - name: Check PostgreSQL readiness
      ansible.builtin.command:
        cmd: pg_isready -h localhost -p 5432
      register: pg_ready
      failed_when: false
      changed_when: false

    - name: Wait for PostgreSQL if it is starting up
      ansible.builtin.wait_for:
        port: 5432
        delay: 5
        timeout: 60
      when: pg_ready.rc == 2  # No response, might be starting

    - name: Report PostgreSQL rejecting connections
      ansible.builtin.fail:
        msg: "PostgreSQL is rejecting connections. Check pg_hba.conf"
      when: pg_ready.rc == 1
```

## Return Codes in Conditional Chains

Building chains where each step checks the return code of the previous step.

```yaml
# Chained return code checking
---
- name: Build and deploy pipeline
  hosts: build_servers
  become: true

  tasks:
    - name: Pull latest code
      ansible.builtin.command:
        cmd: git pull origin main
        chdir: /opt/source/myapp
      register: git_pull
      failed_when: false

    - name: Run linting (only if pull succeeded)
      ansible.builtin.command:
        cmd: npm run lint
        chdir: /opt/source/myapp
      register: lint_result
      when: git_pull.rc == 0
      failed_when: false

    - name: Run tests (only if lint passed)
      ansible.builtin.command:
        cmd: npm test
        chdir: /opt/source/myapp
      register: test_result
      when:
        - git_pull.rc == 0
        - lint_result is defined
        - lint_result.rc == 0
      failed_when: false

    - name: Build production bundle (only if tests passed)
      ansible.builtin.command:
        cmd: npm run build
        chdir: /opt/source/myapp
      register: build_result
      when:
        - git_pull.rc == 0
        - lint_result is defined and lint_result.rc == 0
        - test_result is defined and test_result.rc == 0
      failed_when: false

    - name: Report pipeline results
      ansible.builtin.debug:
        msg: |
          Build Pipeline Results:
          Git Pull: {{ 'PASS (rc=0)' if git_pull.rc == 0 else 'FAIL (rc=' + git_pull.rc | string + ')' }}
          Lint:     {{ 'PASS' if (lint_result is defined and lint_result.rc == 0) else 'FAIL/SKIP' }}
          Tests:    {{ 'PASS' if (test_result is defined and test_result.rc == 0) else 'FAIL/SKIP' }}
          Build:    {{ 'PASS' if (build_result is defined and build_result.rc == 0) else 'FAIL/SKIP' }}
```

## Using changed_when with Return Codes

The `changed_when` directive uses return codes to determine whether a command actually changed something.

```yaml
# Smart change detection with return codes
---
- name: Idempotent command execution
  hosts: all
  become: true

  tasks:
    # Custom script that returns 0 for "changed" and 2 for "no change needed"
    - name: Apply database schema
      ansible.builtin.command:
        cmd: /opt/app/apply-schema.sh
      register: schema_result
      changed_when: schema_result.rc == 0
      failed_when: schema_result.rc not in [0, 2]
      # rc=0: changes applied
      # rc=2: already up to date (no changes)
      # anything else: actual error

    - name: Restart app if schema changed
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      when: schema_result is changed

    # apt-get returns 0 whether or not it installed anything
    # Use a two-step approach for accurate change detection
    - name: Check if package needs installation
      ansible.builtin.command:
        cmd: dpkg-query -W -f='${Status}' mypackage
      register: pkg_check
      failed_when: false
      changed_when: false

    - name: Install package if not present
      ansible.builtin.apt:
        name: mypackage
        state: present
      when: "'install ok installed' not in pkg_check.stdout"
```

## Multiple Return Codes for Multiple Meanings

Some scripts use different return codes to communicate different outcomes.

```yaml
# Script with multiple meaningful return codes
# The backup script returns:
#   0 = backup succeeded, files changed
#   1 = backup succeeded, no changes since last backup
#   2 = backup failed, recoverable
#   3 = backup failed, critical
---
- name: Smart backup handling
  hosts: db_servers
  become: true

  tasks:
    - name: Run database backup
      ansible.builtin.command:
        cmd: /opt/backup/db-backup.sh
      register: backup_result
      failed_when: backup_result.rc >= 3  # Only fail on critical errors

    - name: Upload backup to offsite storage (only if new data)
      ansible.builtin.command:
        cmd: /opt/backup/upload.sh
      when: backup_result.rc == 0  # New backup with changes

    - name: Log unchanged backup
      ansible.builtin.debug:
        msg: "Backup completed but no data changes since last backup"
      when: backup_result.rc == 1

    - name: Handle recoverable backup failure
      block:
        - name: Retry backup with safe mode
          ansible.builtin.command:
            cmd: /opt/backup/db-backup.sh --safe-mode
          register: retry_result
          failed_when: retry_result.rc >= 2

        - name: Upload retry backup
          ansible.builtin.command:
            cmd: /opt/backup/upload.sh
          when: retry_result.rc == 0
      when: backup_result.rc == 2

    - name: Send alert on any backup issues
      ansible.builtin.uri:
        url: "{{ alert_webhook }}"
        method: POST
        body_format: json
        body:
          message: "Backup issue on {{ inventory_hostname }}: exit code {{ backup_result.rc }}"
          severity: "{{ 'warning' if backup_result.rc == 2 else 'info' }}"
      when: backup_result.rc > 0
      ignore_errors: true
```

## Testing Return Codes in Loops

When running commands in a loop, each iteration has its own return code.

```yaml
# Return code checking in loops
---
- name: Port availability checks
  hosts: all
  become: true

  vars:
    required_ports:
      - { port: 80, service: "nginx" }
      - { port: 443, service: "nginx-ssl" }
      - { port: 5432, service: "postgresql" }
      - { port: 6379, service: "redis" }

  tasks:
    - name: Check if ports are in use
      ansible.builtin.command:
        cmd: "ss -tlnp | grep -q ':{{ item.port }} '"
      loop: "{{ required_ports }}"
      register: port_checks
      failed_when: false
      changed_when: false
      loop_control:
        label: "{{ item.service }}:{{ item.port }}"

    - name: Report ports not listening
      ansible.builtin.debug:
        msg: "WARNING: {{ item.item.service }} is not listening on port {{ item.item.port }}"
      loop: "{{ port_checks.results }}"
      when: item.rc != 0
      loop_control:
        label: "{{ item.item.service }}:{{ item.item.port }}"

    - name: Start services for ports that are not listening
      ansible.builtin.systemd:
        name: "{{ item.item.service }}"
        state: started
      loop: "{{ port_checks.results }}"
      when: item.rc != 0
      ignore_errors: true
      loop_control:
        label: "{{ item.item.service }}"
```

## Best Practices

When working with return codes in Ansible:

1. Always use `failed_when: false` or a specific `failed_when` expression when you intend to check the return code yourself
2. Always use `changed_when: false` for commands that only check state without modifying anything
3. Document what each return code means in a comment above the task
4. Be explicit about which return codes indicate failure versus alternative success states

Return codes are the native language that system commands use to communicate their results. By capturing and testing these codes in Ansible conditionals, you can write playbooks that truly understand what is happening on the system and respond accordingly, rather than just running commands and hoping for the best.
