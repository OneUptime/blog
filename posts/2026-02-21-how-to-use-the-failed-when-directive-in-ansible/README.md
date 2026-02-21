# How to Use the failed_when Directive in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, DevOps, Playbooks

Description: Learn how to use the failed_when directive in Ansible to define custom failure conditions and handle non-standard exit codes properly.

---

Not every non-zero exit code is a failure. Some commands return exit code 1 when they find no matches (like grep), exit code 2 when they make changes (like custom scripts), or produce error messages on stderr even when they succeed. Ansible, by default, considers any non-zero return code a failure. The `failed_when` directive lets you redefine what "failure" means for each task.

## The Problem

Consider this scenario: you run `grep` to check if a string exists in a config file. If the string is not found, grep returns exit code 1. Ansible sees the non-zero exit code and marks the task as failed. But you did not want to fail; you wanted to know whether the string was there.

```yaml
# This fails when the pattern is not found, even though that's a valid outcome
- name: Check if feature flag is enabled
  command: grep "FEATURE_X=true" /etc/myapp/config.env
  # If FEATURE_X is not in the file, this task FAILS
```

## Basic Usage

The `failed_when` directive accepts a Jinja2 expression that evaluates to true or false. When the expression is true, Ansible treats the task as failed. When false, the task succeeds regardless of the return code.

```yaml
# basic-failed-when.yml - Custom failure conditions
---
- name: Check configuration with custom failure handling
  hosts: all

  tasks:
    # Grep returns 0 (found), 1 (not found), or 2 (error)
    # We only want to fail on actual errors (rc=2), not "not found" (rc=1)
    - name: Check if feature flag exists in config
      command: grep "FEATURE_X" /etc/myapp/config.env
      register: grep_result
      failed_when: grep_result.rc == 2

    - name: Report feature flag status
      debug:
        msg: "{{ 'Feature X is configured' if grep_result.rc == 0 else 'Feature X is not configured' }}"
```

## failed_when with Return Codes

Many command-line tools use different return codes to communicate different states:

```yaml
# return-codes.yml - Handle scripts with multiple return codes
---
- name: Run health checks with specific failure conditions
  hosts: app_servers

  tasks:
    # Custom health check script:
    # rc=0: healthy
    # rc=1: degraded (warnings, but functional)
    # rc=2: critical failure
    # rc=3: configuration error
    - name: Run application health check
      command: /opt/myapp/bin/healthcheck
      register: health
      failed_when: health.rc >= 2

    - name: Show health status
      debug:
        msg: >
          Health status: {{ 'healthy' if health.rc == 0 else 'degraded' }}

    # Diff returns 0 (identical), 1 (different), 2 (error)
    - name: Compare current and expected configuration
      command: diff /etc/myapp/current.conf /etc/myapp/expected.conf
      register: config_diff
      failed_when: config_diff.rc > 1

    - name: Apply configuration if different
      copy:
        src: /etc/myapp/expected.conf
        dest: /etc/myapp/current.conf
        remote_src: yes
      when: config_diff.rc == 1
```

## failed_when with Output Content

Sometimes the return code is fine, but the output contains error messages:

```yaml
# output-based-failure.yml - Detect failures from command output
---
- name: Run database operations with output-based failure detection
  hosts: db_servers
  become: yes

  tasks:
    # Some tools return 0 but write errors to stderr
    - name: Run database optimization
      command: mysqlcheck --optimize --all-databases
      register: optimize_result
      failed_when: "'error' in optimize_result.stderr | lower"

    # API calls that return 200 but with error in the body
    - name: Check API endpoint health
      uri:
        url: http://localhost:8080/api/health
        return_content: yes
      register: api_health
      failed_when: "'error' in api_health.content | lower or api_health.json.status != 'ok'"

    # Terraform plan that should have no changes
    - name: Verify no infrastructure drift
      command: terraform plan -detailed-exitcode
      args:
        chdir: /opt/terraform/production
      register: tf_plan
      failed_when: tf_plan.rc == 1  # 0=no changes, 1=error, 2=changes pending
      changed_when: tf_plan.rc == 2
```

## Combining failed_when with changed_when

These two directives work well together to give you complete control over task status reporting:

```yaml
# combined-directives.yml - Full status control
---
- name: Deploy with precise status tracking
  hosts: webservers
  become: yes

  tasks:
    # Custom deploy script:
    # stdout contains "DEPLOYED" if changes were made
    # stdout contains "NO_CHANGE" if already up to date
    # stderr contains "FATAL" on actual errors
    - name: Deploy application via script
      shell: /opt/scripts/deploy.sh --version={{ app_version }}
      register: deploy_result
      changed_when: "'DEPLOYED' in deploy_result.stdout"
      failed_when: "'FATAL' in deploy_result.stderr"

    # Apt update that might have warnings but still works
    - name: Update apt cache
      command: apt-get update
      register: apt_update
      changed_when: "'packages can be upgraded' in apt_update.stdout"
      failed_when:
        - apt_update.rc != 0
        - "'W:' not in apt_update.stderr"  # Warnings are ok
```

## Multiple Conditions

You can combine multiple failure conditions:

```yaml
# multi-condition.yml - Complex failure detection
---
- name: Complex failure scenarios
  hosts: all

  tasks:
    # Fail only when specific combinations of conditions are true
    - name: Run data validation
      command: /opt/scripts/validate-data.sh
      register: validation
      failed_when:
        - validation.rc != 0
        - "'RECOVERABLE' not in validation.stdout"
        # Fails only if rc is non-zero AND the error is not recoverable

    # Alternative: using 'or' logic with a single expression
    - name: Check service status with multiple failure criteria
      shell: systemctl status myapp
      register: svc_status
      failed_when: >
        svc_status.rc != 0 and
        svc_status.rc != 3 and
        'inactive' not in svc_status.stdout
```

Note that when you provide a list of conditions (like the first example), they are combined with AND logic. All conditions must be true for the task to fail. If you need OR logic, use a single expression with `or`.

## Practical Example: Database Migration Workflow

Here is a real-world playbook for running database migrations with proper failure handling:

```yaml
# db-migration.yml - Database migration with custom failure conditions
---
- name: Run database migrations safely
  hosts: db_servers
  become: yes
  become_user: postgres

  vars:
    app_db: myapp_production
    migration_dir: /opt/myapp/migrations

  tasks:
    - name: Check database connectivity
      command: psql -d {{ app_db }} -c "SELECT 1"
      register: db_check
      changed_when: false
      failed_when:
        - db_check.rc != 0
        - "'connection refused' in db_check.stderr | lower"

    - name: Check for pending migrations
      command: /opt/myapp/bin/migrate --pending
      register: pending
      changed_when: false
      # Script returns 0 if no pending, 1 if pending, 2+ if error
      failed_when: pending.rc > 1

    - name: Create pre-migration backup
      shell: pg_dump {{ app_db }} | gzip > /backups/pre-migration-$(date +%Y%m%d%H%M%S).sql.gz
      register: backup
      failed_when: >
        backup.rc != 0 or
        'error' in backup.stderr | lower
      when: pending.rc == 1

    - name: Apply pending migrations
      command: /opt/myapp/bin/migrate --apply --verbose
      register: migration
      # Migration tool: rc=0 success, rc=1 partial failure, rc=2 total failure
      failed_when: migration.rc == 2
      when: pending.rc == 1

    - name: Handle partial migration failure
      block:
        - name: Log partial failure details
          debug:
            msg: "Partial migration failure detected. Review: {{ migration.stdout_lines[-10:] }}"

        - name: Notify team about partial failure
          uri:
            url: "{{ slack_webhook }}"
            method: POST
            body_format: json
            body:
              text: "Partial migration failure on {{ inventory_hostname }}. Manual review needed."
      when:
        - pending.rc == 1
        - migration.rc == 1

    - name: Verify migration status
      command: /opt/myapp/bin/migrate --verify
      register: verify
      changed_when: false
      failed_when: "'VERIFICATION FAILED' in verify.stdout"
```

## failed_when: false

Setting `failed_when: false` means the task will never be considered failed, regardless of what happens. This is more explicit than `ignore_errors` because it changes the task state itself rather than just ignoring the failure:

```yaml
# never-fail.yml - Tasks that should never fail the playbook
---
- name: Best-effort cleanup tasks
  hosts: all
  become: yes

  tasks:
    - name: Attempt to remove old temporary files
      command: find /tmp -name "myapp_*" -mtime +7 -delete
      failed_when: false  # Cleanup is nice-to-have, never critical

    - name: Try to rotate logs
      command: logrotate -f /etc/logrotate.d/myapp
      failed_when: false
```

The difference between `failed_when: false` and `ignore_errors: yes` is subtle but important. With `failed_when: false`, the task is reported as "ok" in the output. With `ignore_errors: yes`, the task is reported as "failed (ignored)". This affects how the task appears in logs and callback plugins.

## Summary

The `failed_when` directive gives you full control over what Ansible considers a task failure. Use it to handle commands with non-standard exit codes, detect errors from command output, and build precise failure conditions for complex scripts. Pair it with `changed_when` and `register` for complete task status control. The key principle is: define failure based on what actually went wrong, not just the return code.
