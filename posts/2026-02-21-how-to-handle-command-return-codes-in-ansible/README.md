# How to Handle Command Return Codes in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Return Codes, Automation

Description: Master return code handling in Ansible with failed_when, changed_when, ignore_errors, and rescue blocks to build resilient automation playbooks.

---

Every command returns an exit code. Zero means success, and anything else usually means failure. Ansible uses these return codes to decide whether a task succeeded or failed. But not all non-zero codes are actual errors, and sometimes a zero exit code does not mean everything is fine. Understanding how to handle return codes in Ansible gives you precise control over task success, failure, and change reporting.

## Default Behavior

By default, Ansible treats any non-zero return code as a failure and stops executing further tasks on that host.

```yaml
# default_behavior.yml - Default return code handling
---
- name: Default return code behavior
  hosts: all
  become: yes

  tasks:
    - name: This succeeds (rc=0)
      ansible.builtin.command:
        cmd: echo "hello"
      # rc=0, task succeeds, marked as changed

    - name: This fails (rc=1) and stops the play
      ansible.builtin.command:
        cmd: "false"
      # rc=1, task fails, play stops for this host

    - name: This never runs because the previous task failed
      ansible.builtin.debug:
        msg: "You won't see this"
```

## Using failed_when to Override Failure Detection

The `failed_when` directive lets you define custom failure conditions based on the return code, stdout, or stderr.

```yaml
# custom_failure.yml - Custom failure conditions
---
- name: Custom failure detection with failed_when
  hosts: all
  become: yes

  tasks:
    - name: grep returns 1 when no match found - that's not an error
      ansible.builtin.command:
        cmd: "grep 'pattern' /var/log/syslog"
      register: grep_result
      # grep returns 0=match found, 1=no match, 2=error
      failed_when: grep_result.rc > 1

    - name: diff returns 1 when files differ - that's expected
      ansible.builtin.command:
        cmd: "diff /etc/hosts /etc/hosts.bak"
      register: diff_result
      # diff returns 0=identical, 1=different, 2=error
      failed_when: diff_result.rc == 2

    - name: Custom application with specific error codes
      ansible.builtin.command:
        cmd: /opt/myapp/bin/healthcheck
      register: health
      # 0=healthy, 1=degraded (OK), 2=unhealthy (fail), 3=critical (fail)
      failed_when: health.rc >= 2

    - name: Fail based on output content, not return code
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/validate"
      register: validate_result
      failed_when: "'ERROR' in validate_result.stdout or 'CRITICAL' in validate_result.stderr"

    - name: Multiple failure conditions
      ansible.builtin.command:
        cmd: /opt/myapp/bin/process-data
      register: process_result
      failed_when:
        - process_result.rc != 0
        - "'already processed' not in process_result.stderr"
      # Fails unless rc=0 OR stderr contains "already processed"
```

## Using changed_when to Control Change Reporting

By default, `command` and `shell` always report "changed". Use `changed_when` to make it accurate.

```yaml
# accurate_changes.yml - Accurate change reporting
---
- name: Accurate change detection
  hosts: all
  become: yes

  tasks:
    - name: Read-only commands should never report changed
      ansible.builtin.command:
        cmd: "df -h /"
      register: disk_usage
      changed_when: false

    - name: Command that reports whether it made changes
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate
      register: migrate_result
      # Our migrate tool prints "Applied N migrations" or "No pending migrations"
      changed_when: "'Applied' in migrate_result.stdout"

    - name: Change detection based on return code
      ansible.builtin.command:
        cmd: /opt/myapp/bin/update-config
      register: config_result
      # Tool returns 0=no changes needed, 2=changes applied
      changed_when: config_result.rc == 2
      failed_when: config_result.rc not in [0, 2]

    - name: Shell command with explicit change tracking
      ansible.builtin.shell: |
        if ! grep -q 'net.core.somaxconn = 65535' /etc/sysctl.conf; then
          echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
          sysctl -p
          echo "CHANGED"
        else
          echo "OK"
        fi
      register: sysctl_result
      changed_when: "'CHANGED' in sysctl_result.stdout"
```

## Using ignore_errors

When you want a task to continue regardless of failure.

```yaml
# ignore_errors.yml - Continue despite failures
---
- name: Continue on failure with ignore_errors
  hosts: all
  become: yes

  tasks:
    - name: Try to stop a service that might not exist
      ansible.builtin.command:
        cmd: systemctl stop myapp-legacy
      register: stop_result
      ignore_errors: yes

    - name: Check if the service was actually stopped
      ansible.builtin.debug:
        msg: "Service stop {{ 'succeeded' if stop_result.rc == 0 else 'failed (probably not installed)' }}"

    - name: This runs regardless of the previous task
      ansible.builtin.command:
        cmd: systemctl start myapp-new
```

The difference between `ignore_errors: yes` and `failed_when: false` is important. With `ignore_errors`, the task is still marked as failed but execution continues. With `failed_when: false`, the task is never marked as failed at all.

## Using block/rescue/always for Error Handling

For structured error handling, use the `block`/`rescue`/`always` pattern.

```yaml
# block_rescue.yml - Structured error handling
---
- name: Structured error handling with block/rescue
  hosts: all
  become: yes

  tasks:
    - name: Deploy with rollback on failure
      block:
        - name: Pull latest code
          ansible.builtin.command:
            cmd: git pull origin main
            chdir: /opt/myapp
          register: git_result

        - name: Install dependencies
          ansible.builtin.command:
            cmd: npm install --production
            chdir: /opt/myapp
          register: npm_result

        - name: Run database migrations
          ansible.builtin.command:
            cmd: npm run migrate
            chdir: /opt/myapp
          register: migrate_result

        - name: Restart service
          ansible.builtin.systemd:
            name: myapp
            state: restarted

      rescue:
        - name: Log which step failed
          ansible.builtin.debug:
            msg: |
              Deployment failed!
              Git pull: rc={{ git_result.rc | default('skipped') }}
              NPM install: rc={{ npm_result.rc | default('skipped') }}
              Migration: rc={{ migrate_result.rc | default('skipped') }}

        - name: Roll back to previous version
          ansible.builtin.command:
            cmd: git checkout HEAD~1
            chdir: /opt/myapp

        - name: Restart with previous version
          ansible.builtin.systemd:
            name: myapp
            state: restarted

      always:
        - name: Record deployment attempt
          ansible.builtin.shell:
            cmd: |
              echo "$(date): Deploy {{ 'SUCCEEDED' if ansible_failed_task is not defined else 'FAILED' }}" >> /var/log/deployments.log
```

## Handling Specific Return Codes

Different programs use different return codes. Here are common patterns.

```yaml
# specific_codes.yml - Handle program-specific return codes
---
- name: Handle specific return codes
  hosts: all
  become: yes

  tasks:
    # wget return codes: 0=success, 1=generic error, 4=network failure, 8=server error
    - name: Download file with wget
      ansible.builtin.command:
        cmd: "wget -q https://example.com/file.tar.gz -O /tmp/file.tar.gz"
      register: wget_result
      failed_when: wget_result.rc not in [0]
      # Or be more specific: failed_when: wget_result.rc in [4, 8]

    # curl with --fail returns 22 for HTTP errors
    - name: Check API endpoint
      ansible.builtin.command:
        cmd: "curl --fail -s -o /dev/null -w '%{http_code}' https://api.example.com/health"
      register: api_check
      failed_when: api_check.rc != 0
      changed_when: false

    # rsync return codes: 0=success, 23=partial transfer, 24=source vanished
    - name: Sync files with rsync (tolerate partial transfers)
      ansible.builtin.command:
        cmd: "rsync -avz /opt/myapp/data/ backup:/backup/myapp/"
      register: rsync_result
      failed_when: rsync_result.rc not in [0, 23, 24]

    # apt-get return codes: 0=success, 100=error
    - name: Check if package is installed
      ansible.builtin.command:
        cmd: "dpkg -s nginx"
      register: pkg_check
      changed_when: false
      failed_when: false
      # rc=0 means installed, rc=1 means not installed
```

## Conditional Logic Based on Return Codes

Use return codes to drive workflow decisions.

```yaml
# conditional_flow.yml - Branching based on return codes
---
- name: Conditional workflow based on return codes
  hosts: all
  become: yes

  tasks:
    - name: Check if database needs migration
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate --check
      register: migration_check
      # 0 = up to date, 1 = migrations pending, 2 = error
      failed_when: migration_check.rc == 2
      changed_when: false

    - name: Run migrations if pending
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate --apply
      when: migration_check.rc == 1
      register: migration_apply

    - name: Report migration status
      ansible.builtin.debug:
        msg: >
          {{ 'Migrations applied successfully' if migration_check.rc == 1
             else 'Database already up to date' }}

    - name: Check application health
      ansible.builtin.command:
        cmd: /opt/myapp/bin/health
      register: health
      failed_when: false
      changed_when: false

    - name: Handle different health states
      ansible.builtin.debug:
        msg: >
          Health status: {{
            'HEALTHY' if health.rc == 0 else
            'DEGRADED - some checks failing' if health.rc == 1 else
            'UNHEALTHY - critical failures' if health.rc == 2 else
            'UNKNOWN - unexpected code ' + health.rc | string
          }}

    - name: Restart if unhealthy
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      when: health.rc >= 2
```

## Combining Return Code Handling with Retries

Retry tasks that fail with transient errors.

```yaml
# retry_on_codes.yml - Retry based on specific return codes
---
- name: Retry on transient failures
  hosts: all
  become: yes

  tasks:
    - name: Download with retry on network errors
      ansible.builtin.command:
        cmd: "curl -f -o /tmp/package.tar.gz https://releases.example.com/package.tar.gz"
      register: download
      retries: 5
      delay: 10
      until: download.rc == 0

    - name: Wait for database to accept connections
      ansible.builtin.command:
        cmd: "pg_isready -h localhost"
      register: pg_ready
      retries: 30
      delay: 2
      until: pg_ready.rc == 0
      changed_when: false

    - name: Run flaky integration test with retries
      ansible.builtin.command:
        cmd: /opt/myapp/bin/integration-test
      register: test_result
      retries: 3
      delay: 30
      until: test_result.rc == 0
      # Report whether it passed on first try or needed retries
      changed_when: false
```

## Aggregating Return Codes Across Hosts

Use `assert` to enforce conditions across your fleet.

```yaml
# aggregate_checks.yml - Check return codes across hosts
---
- name: Pre-deployment checks across fleet
  hosts: app_servers
  become: yes

  tasks:
    - name: Check disk space
      ansible.builtin.shell:
        cmd: "df / | tail -1 | awk '{print $5}' | tr -d '%'"
      register: disk_percent
      changed_when: false

    - name: Check memory availability
      ansible.builtin.shell:
        cmd: "free -m | grep Mem | awk '{print $4}'"
      register: free_mem
      changed_when: false

    - name: Assert all hosts meet deployment requirements
      ansible.builtin.assert:
        that:
          - disk_percent.stdout | int < 85
          - free_mem.stdout | int > 512
        fail_msg: |
          Host {{ inventory_hostname }} does not meet requirements:
          Disk: {{ disk_percent.stdout }}% used (max 85%)
          Free memory: {{ free_mem.stdout }}MB (min 512MB)
        success_msg: "Host {{ inventory_hostname }} passes all pre-deployment checks"
```

## Summary

Return code handling in Ansible centers on three directives: `failed_when` for custom failure conditions, `changed_when` for accurate change reporting, and `ignore_errors` for continuing despite failures. Always set `changed_when: false` on read-only commands. Use `failed_when` to handle programs that use non-zero codes for non-error conditions (like `grep`, `diff`, or custom health checks). Use `block`/`rescue` for structured error handling with rollback capability. And combine return code checks with `retries`/`until` for resilient operations against flaky services. The key principle is that Ansible's default behavior (non-zero = failure, always changed) is rarely what you want for `command` and `shell` tasks, so always add explicit `failed_when` and `changed_when` directives.
